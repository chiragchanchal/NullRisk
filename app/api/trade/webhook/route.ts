import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getMarketPrice, AssetType } from '@/lib/api/market'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Webhook Secret / Bearer Token
    const authHeader = req.headers.get('authorization') || ''
    const customHeader = req.headers.get('x-webhook-secret') || ''
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    const providedSecret = customHeader || bearerToken || req.nextUrl.searchParams.get('secret')

    const expectedSecret = process.env.WEBHOOK_SECRET || 'nullrisk_algo_v1_live'

    if (!providedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json(
        {
          error: 'Unauthorized webhook access. Provide valid x-webhook-secret or Authorization: Bearer token.',
          hint: 'Use the default test key: nullrisk_algo_v1_live or set WEBHOOK_SECRET in .env.local',
        },
        { status: 401 }
      )
    }

    const body = await req.json()
    const {
      action,
      symbol: rawSymbol,
      assetType: rawAssetType,
      quantity: rawQuantity,
      orderType: rawOrderType = 'market',
      strategy = 'Algo Strategy Bot',
      signalComment = '',
    } = body

    if (!rawSymbol || typeof rawSymbol !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid symbol' }, { status: 400 })
    }

    const cleanSymbol = rawSymbol
      .replace(/^(stock|crypto|forex)\//i, '')
      .replace(/^(stock|crypto|forex)\//i, '')
      .trim()

    const assetType: AssetType = ['stock', 'crypto', 'forex'].includes(rawAssetType)
      ? rawAssetType
      : 'stock'

    const quantity = Number(rawQuantity)
    if (isNaN(quantity) || !isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 })
    }

    const normalizedAction = (action || '').toLowerCase().trim()
    if (normalizedAction !== 'buy' && normalizedAction !== 'sell') {
      return NextResponse.json({ error: 'Action must be "buy" or "sell"' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 2. Select Active User Profile (Target specific user_id if passed, or default to first active profile)
    let userId = body.userId
    if (!userId) {
      const { data: firstProfile } = await adminClient
        .from('profiles')
        .select('id, mock_balance')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!firstProfile) {
        return NextResponse.json({ error: 'No active profile found for simulation' }, { status: 404 })
      }
      userId = firstProfile.id
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('mock_balance, initial_balance')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // 3. Fetch exact market price
    const executionPrice = await getMarketPrice(cleanSymbol, assetType)
    const total = executionPrice * quantity

    // 4. Check existing holding
    let existingHolding: Record<string, unknown> | null = null
    const { data: exactHolding } = await adminClient
      .from('holdings')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', cleanSymbol)
      .maybeSingle()

    if (exactHolding) {
      existingHolding = exactHolding
    } else {
      const { data: userHoldings } = await adminClient.from('holdings').select('*').eq('user_id', userId)
      if (userHoldings && userHoldings.length > 0) {
        existingHolding =
          userHoldings.find((h: Record<string, unknown>) => {
            const symStr = String(h.symbol || '')
            const hClean = symStr.replace(/^(stock|crypto|forex)\//i, '').replace(/^(stock|crypto|forex)\//i, '').trim().toLowerCase()
            return hClean === cleanSymbol.toLowerCase()
          }) || null
      }
    }

    // 5. Pre-validation
    if (normalizedAction === 'buy') {
      if (Number(profile.mock_balance) < total) {
        return NextResponse.json({ error: 'Insufficient simulated cash balance' }, { status: 400 })
      }
    } else if (normalizedAction === 'sell') {
      if (!existingHolding || Number(existingHolding.quantity) < quantity) {
        return NextResponse.json({ error: 'Insufficient holdings to execute sell order' }, { status: 400 })
      }
    }

    // 6. Record Transaction
    const { data: tx, error: txError } = await adminClient
      .from('transactions')
      .insert({
        user_id: userId,
        symbol: cleanSymbol,
        asset_type: assetType,
        order_type: normalizedAction,
        order_class: rawOrderType,
        status: 'completed',
        quantity,
        price: executionPrice,
        total,
      })
      .select()
      .single()

    if (txError) {
      return NextResponse.json({ error: 'Failed to record webhook transaction', details: txError.message }, { status: 500 })
    }

    // 7. Atomic Balance & Holdings Mutation
    if (normalizedAction === 'buy') {
      await adminClient
        .from('profiles')
        .update({ mock_balance: Number(profile.mock_balance) - total })
        .eq('id', userId)

      if (existingHolding) {
        const newQty = Number(existingHolding.quantity) + quantity
        const oldCost = Number(existingHolding.quantity) * Number(existingHolding.avg_buy_price)
        const newAvg = (oldCost + total) / newQty

        await adminClient
          .from('holdings')
          .update({
            quantity: newQty,
            avg_buy_price: newAvg,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingHolding.id)
      } else {
        await adminClient.from('holdings').insert({
          user_id: userId,
          symbol: cleanSymbol,
          asset_type: assetType,
          quantity,
          avg_buy_price: executionPrice,
        })
      }
    } else if (normalizedAction === 'sell' && existingHolding) {
      const remainingQty = Number(existingHolding.quantity) - quantity

      if (remainingQty <= 0.000001) {
        await adminClient.from('holdings').delete().eq('id', existingHolding.id)
      } else {
        await adminClient
          .from('holdings')
          .update({
            quantity: remainingQty,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingHolding.id)
      }

      await adminClient
        .from('profiles')
        .update({ mock_balance: Number(profile.mock_balance) + total })
        .eq('id', userId)
    }

    return NextResponse.json({
      success: true,
      message: `🤖 Webhook order executed: ${normalizedAction.toUpperCase()} ${quantity} ${cleanSymbol} @ ₹${executionPrice.toFixed(2)}`,
      strategy,
      signalComment,
      execution: {
        transactionId: tx?.id,
        symbol: cleanSymbol,
        action: normalizedAction,
        quantity,
        executionPrice,
        total,
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    console.error('Webhook execution failed:', error)
    return NextResponse.json({ error: 'Internal webhook execution error' }, { status: 500 })
  }
}
