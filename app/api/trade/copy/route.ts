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
    const { targetUserId } = body

    if (!targetUserId || typeof targetUserId !== 'string' || !/^[0-9a-fA-F-]{36}$/.test(targetUserId) || targetUserId === user.id) {
      return NextResponse.json({ error: 'Invalid target user ID' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Step 1: Pre-validate Target User Profile & Holdings BEFORE altering caller state
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('mock_balance')
      .eq('id', targetUserId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: 'Target trader not found' }, { status: 404 })
    }

    const { data: targetHoldings } = await adminClient
      .from('holdings')
      .select('*')
      .eq('user_id', targetUserId)

    let targetTotalValue = Number(targetProfile.mock_balance)
    const targetAssetValues: Record<string, { type: string, value: number, price: number }> = {}

    if (targetHoldings && targetHoldings.length > 0) {
      for (const holding of targetHoldings) {
        const currentPrice = await getMarketPrice(holding.symbol, holding.asset_type as AssetType)
        const value = currentPrice * Number(holding.quantity)
        targetTotalValue += value
        targetAssetValues[holding.symbol] = { type: holding.asset_type, value, price: currentPrice }
      }
    }

    if (targetTotalValue <= 0 || Object.keys(targetAssetValues).length === 0) {
      return NextResponse.json({ error: 'Target trader has no active positions or portfolio value to copy.' }, { status: 400 })
    }

    // Step 2: Fetch Caller's Current Profile & Holdings
    const { data: myProfile } = await adminClient.from('profiles').select('mock_balance').eq('id', user.id).single()
    const { data: myHoldings } = await adminClient.from('holdings').select('*').eq('user_id', user.id)
    
    if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    let myTotalCash = Number(myProfile.mock_balance)

    // Step 3: Liquidate Caller's Current Holdings into cash
    if (myHoldings && myHoldings.length > 0) {
      for (const holding of myHoldings) {
        const currentPrice = await getMarketPrice(holding.symbol, holding.asset_type as AssetType)
        const totalSellValue = currentPrice * Number(holding.quantity)
        myTotalCash += totalSellValue

        await adminClient.from('transactions').insert({
          user_id: user.id,
          symbol: holding.symbol,
          asset_type: holding.asset_type,
          order_type: 'sell',
          order_class: 'market',
          status: 'completed',
          quantity: holding.quantity,
          price: currentPrice,
          total: totalSellValue
        })
      }
      await adminClient.from('holdings').delete().eq('user_id', user.id)
    }

    // Step 4: Buy Target Assets Proportionally
    let remainingCash = myTotalCash

    for (const symbol in targetAssetValues) {
      const asset = targetAssetValues[symbol]
      const allocationPct = asset.value / targetTotalValue
      const amountToInvest = myTotalCash * allocationPct
      const quantityToBuy = amountToInvest / asset.price

      if (quantityToBuy > 0) {
        remainingCash -= amountToInvest

        await adminClient.from('transactions').insert({
          user_id: user.id,
          symbol: symbol,
          asset_type: asset.type,
          order_type: 'buy',
          order_class: 'market',
          status: 'completed',
          quantity: quantityToBuy,
          price: asset.price,
          total: amountToInvest
        })

        await adminClient.from('holdings').insert({
          user_id: user.id,
          symbol: symbol,
          asset_type: asset.type,
          quantity: quantityToBuy,
          avg_buy_price: asset.price
        })
      }
    }

    // Update caller's final balance
    await adminClient.from('profiles').update({ mock_balance: remainingCash }).eq('id', user.id)

    return NextResponse.json({ success: true, message: 'Successfully copied portfolio!' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Copy trader error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
