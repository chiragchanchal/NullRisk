import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getMarketPrice, AssetType } from '@/lib/api/market'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { symbol: rawSymbol, assetType, quantity: rawQuantity, orderType, orderClass = 'market', limitPrice: rawLimitPrice } = body

    const quantity = Number(rawQuantity)
    const limitPrice = rawLimitPrice !== undefined ? Number(rawLimitPrice) : undefined

    if (
      !rawSymbol ||
      typeof rawSymbol !== 'string' ||
      !/^[A-Za-z0-9.\/_\-]{1,35}$/.test(rawSymbol) ||
      !assetType ||
      !['stock', 'crypto', 'forex'].includes(assetType) ||
      typeof quantity !== 'number' ||
      isNaN(quantity) ||
      !isFinite(quantity) ||
      quantity <= 0 ||
      quantity > 1000000 ||
      (orderType !== 'buy' && orderType !== 'sell') ||
      (orderClass !== 'market' && orderClass !== 'limit')
    ) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // Clean any accidental redundant category prefixes like 'stock/crypto/BTC' or 'crypto/BTC'
    const cleanSymbol = rawSymbol
      .replace(/^(stock|crypto|forex)\//i, '')
      .replace(/^(stock|crypto|forex)\//i, '')
      .trim()
    const symbol = cleanSymbol || rawSymbol.trim()

    if (orderClass === 'limit' && (!limitPrice || isNaN(limitPrice) || !isFinite(limitPrice) || limitPrice <= 0)) {
      return NextResponse.json({ error: 'Limit orders require a valid positive limit price' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Fetch exact current price
    const currentPrice = await getMarketPrice(symbol, assetType as AssetType)
    
    let isFillsImmediately = false
    let executionPrice = currentPrice

    if (orderClass === 'limit' && limitPrice !== undefined) {
      if (orderType === 'buy' && currentPrice <= limitPrice) {
        isFillsImmediately = true
        executionPrice = currentPrice
      } else if (orderType === 'sell' && currentPrice >= limitPrice) {
        isFillsImmediately = true
        executionPrice = currentPrice
      } else {
        executionPrice = limitPrice
      }
    } else {
      isFillsImmediately = true
    }

    const total = executionPrice * quantity
    const status = isFillsImmediately ? 'completed' : 'pending'

    // 2. Get User Profile
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('mock_balance, initial_balance')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 3. Get existing Holding (supports exact symbol and legacy prefixes)
    let existingHolding: Record<string, unknown> | null = null
    const { data: exactHolding } = await adminClient
      .from('holdings')
      .select('*')
      .eq('user_id', user.id)
      .eq('symbol', symbol)
      .maybeSingle()

    if (exactHolding) {
      existingHolding = exactHolding
    } else {
      // Fallback: check if the user has a holding with the raw symbol or legacy prefix (e.g. 'crypto/BTC')
      const { data: userHoldings } = await adminClient
        .from('holdings')
        .select('*')
        .eq('user_id', user.id)

      if (userHoldings && userHoldings.length > 0) {
        existingHolding = userHoldings.find((h: Record<string, unknown>) => {
          const symStr = String(h.symbol || '')
          const hClean = symStr.replace(/^(stock|crypto|forex)\//i, '').replace(/^(stock|crypto|forex)\//i, '').trim().toLowerCase()
          return hClean === symbol.toLowerCase() || symStr === rawSymbol || symStr.toLowerCase() === symbol.toLowerCase()
        }) || null
      }
    }

    // 4. Handle Pre-Validation
    if (orderType === 'buy') {
      if (profile.mock_balance < total) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
      }
    } else if (orderType === 'sell') {
      if (!existingHolding || Number(existingHolding.quantity) < quantity) {
        return NextResponse.json({ error: 'Insufficient holdings to sell' }, { status: 400 })
      }
    }

    // 5. Insert transaction log
    const { error: txError } = await adminClient.from('transactions').insert({
      user_id: user.id,
      symbol,
      asset_type: assetType,
      order_type: orderType,
      order_class: orderClass,
      limit_price: orderClass === 'limit' ? limitPrice : null,
      status,
      quantity,
      price: executionPrice,
      total
    })

    if (txError) {
      return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 })
    }

    // 6. Perform Deductions/Updates ONLY if filled immediately
    if (isFillsImmediately) {
      if (orderType === 'buy') {
        // Atomic balance deduction
        const { data: updatedProfile, error: balanceError } = await adminClient
          .from('profiles')
          .update({ mock_balance: profile.mock_balance - total })
          .eq('id', user.id)
          .gte('mock_balance', total)
          .select('mock_balance')
          .single()

        if (balanceError || !updatedProfile) {
          return NextResponse.json({ error: 'Insufficient funds or concurrent update conflict.' }, { status: 400 })
        }

        // Update or create holding
        if (existingHolding) {
          const newQty = Number(existingHolding.quantity) + quantity
          const oldCost = Number(existingHolding.quantity) * Number(existingHolding.avg_buy_price)
          const newAvg = (oldCost + total) / newQty

          await adminClient
            .from('holdings')
            .update({
              quantity: newQty,
              avg_buy_price: newAvg,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingHolding.id)
        } else {
          await adminClient.from('holdings').insert({
            user_id: user.id,
            symbol,
            asset_type: assetType,
            quantity,
            avg_buy_price: executionPrice
          })
        }
      } else if (orderType === 'sell') {
        if (!existingHolding) {
          return NextResponse.json({ error: 'Holding not found' }, { status: 400 })
        }

        // Atomic holding deduction
        const remainingQty = Number(existingHolding.quantity) - quantity
        const { data: updatedHolding, error: holdingError } = await adminClient
          .from('holdings')
          .update({
            quantity: remainingQty,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingHolding.id)
          .gte('quantity', quantity)
          .select('quantity')
          .single()

        if (holdingError || !updatedHolding) {
          return NextResponse.json({ error: 'Insufficient holdings to sell or concurrent update conflict.' }, { status: 400 })
        }

        if (remainingQty === 0) {
          await adminClient.from('holdings').delete().eq('id', existingHolding.id)
        }

        // Add proceeds to cash balance
        await adminClient
          .from('profiles')
          .update({ mock_balance: Number(profile.mock_balance) + total })
          .eq('id', user.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: isFillsImmediately 
        ? `Successfully ${orderType === 'buy' ? 'bought' : 'sold'} ${quantity} ${symbol} at ₹${executionPrice.toFixed(2)}`
        : `Limit order placed to ${orderType} ${quantity} ${symbol} at ₹${executionPrice.toFixed(2)}`,
      status
    })

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Trade execution error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
