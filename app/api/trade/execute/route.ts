import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarketPrice, AssetType } from '@/lib/api/market'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { symbol, assetType, quantity, orderType, orderClass = 'market', limitPrice } = body

    if (!symbol || !assetType || !quantity || !orderType || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    if (orderType !== 'buy' && orderType !== 'sell') {
      return NextResponse.json({ error: 'Invalid order type' }, { status: 400 })
    }

    if (orderClass === 'limit' && (!limitPrice || limitPrice <= 0)) {
      return NextResponse.json({ error: 'Limit orders require a valid limit price' }, { status: 400 })
    }

    // 1. Fetch exact current price
    const currentPrice = await getMarketPrice(symbol, assetType as AssetType)
    
    // Determine execution price
    // If market order, price = currentPrice
    // If limit order and criteria met, price = currentPrice or limitPrice (depending on logic, let's use limitPrice for simplicity if it fills immediately)
    // If limit order and criteria NOT met, price = limitPrice but status is pending
    
    let isFillsImmediately = false
    let executionPrice = currentPrice

    if (orderClass === 'limit') {
      if (orderType === 'buy' && currentPrice <= limitPrice) {
        isFillsImmediately = true
        executionPrice = currentPrice // better price than limit
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
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('mock_balance, initial_balance')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 3. Get existing Holding
    const { data: existingHolding } = await supabase
      .from('holdings')
      .select('*')
      .eq('user_id', user.id)
      .eq('symbol', symbol)
      .single()

    // 4. Handle BUY Validation
    if (orderType === 'buy') {
      if (profile.mock_balance < total) {
        return NextResponse.json({ error: 'Insufficient funds' }, { status: 400 })
      }
    } 
    // 5. Handle SELL Validation
    else if (orderType === 'sell') {
      if (!existingHolding || existingHolding.quantity < quantity) {
        return NextResponse.json({ error: 'Insufficient holdings to sell' }, { status: 400 })
      }
    }

    // 6. Insert transaction
    await supabase.from('transactions').insert({
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

    // 7. Perform Deductions/Updates ONLY if filled immediately
    if (isFillsImmediately) {
      if (orderType === 'buy') {
        // Deduct balance
        await supabase
          .from('profiles')
          .update({ mock_balance: profile.mock_balance - total })
          .eq('id', user.id)

        // Update or create holding
        if (existingHolding) {
          const newQty = existingHolding.quantity + quantity
          const oldCost = existingHolding.quantity * existingHolding.avg_buy_price
          const newAvg = (oldCost + total) / newQty

          await supabase
            .from('holdings')
            .update({
              quantity: newQty,
              avg_buy_price: newAvg,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingHolding.id)
        } else {
          await supabase.from('holdings').insert({
            user_id: user.id,
            symbol,
            asset_type: assetType,
            quantity,
            avg_buy_price: executionPrice
          })
        }
      } else if (orderType === 'sell') {
        // Add balance
        await supabase
          .from('profiles')
          .update({ mock_balance: profile.mock_balance + total })
          .eq('id', user.id)

        // Update or delete holding
        const newQty = existingHolding.quantity - quantity
        if (newQty === 0) {
          await supabase.from('holdings').delete().eq('id', existingHolding.id)
        } else {
          await supabase
            .from('holdings')
            .update({
              quantity: newQty,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingHolding.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: isFillsImmediately 
        ? `Successfully ${orderType === 'buy' ? 'bought' : 'sold'} ${quantity} ${symbol} at ₹${executionPrice.toFixed(2)}`
        : `Limit order placed to ${orderType} ${quantity} ${symbol} at ₹${executionPrice.toFixed(2)}`,
      status
    })

  } catch (error: any) {
    console.error('Trade execution error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
