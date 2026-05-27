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

    if (!targetUserId || targetUserId === user.id) {
      return NextResponse.json({ error: 'Invalid target user' }, { status: 400 })
    }

    // Step 1: Fetch Current User Profile & Holdings
    const { data: myProfile } = await supabase.from('profiles').select('mock_balance').eq('id', user.id).single()
    const { data: myHoldings } = await supabase.from('holdings').select('*').eq('user_id', user.id)
    
    if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    let myTotalCash = myProfile.mock_balance

    // Step 2: Liquidate Current User's Holdings (Sell all at market price)
    if (myHoldings && myHoldings.length > 0) {
      for (const holding of myHoldings) {
        const currentPrice = await getMarketPrice(holding.symbol, holding.asset_type as AssetType)
        const totalSellValue = currentPrice * holding.quantity
        myTotalCash += totalSellValue

        // Log transaction
        await supabase.from('transactions').insert({
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
      // Delete old holdings
      await supabase.from('holdings').delete().eq('user_id', user.id)
    }

    // Update balance to full cash
    await supabase.from('profiles').update({ mock_balance: myTotalCash }).eq('id', user.id)

    // Step 3: Fetch Target User Profile & Holdings (Bypassing RLS since target user details are private by default)
    const adminSupabase = createAdminClient()
    const { data: targetProfile } = await adminSupabase.from('profiles').select('mock_balance').eq('id', targetUserId).single()
    const { data: targetHoldings } = await adminSupabase.from('holdings').select('*').eq('user_id', targetUserId)

    if (!targetProfile) {
      return NextResponse.json({ error: 'Target profile not found' }, { status: 404 })
    }

    // Step 4: Calculate Target Portfolio Composition
    let targetTotalValue = targetProfile.mock_balance
    const targetAssetValues: Record<string, { type: string, value: number, price: number }> = {}

    if (targetHoldings && targetHoldings.length > 0) {
      for (const holding of targetHoldings) {
        const currentPrice = await getMarketPrice(holding.symbol, holding.asset_type as AssetType)
        const value = currentPrice * holding.quantity
        targetTotalValue += value
        targetAssetValues[holding.symbol] = { type: holding.asset_type, value, price: currentPrice }
      }
    }

    if (targetTotalValue <= 0) {
      return NextResponse.json({ error: 'Target trader portfolio has no assets or balance to copy.' }, { status: 400 })
    }

    // Step 5: Buy Assets Proportionally
    let remainingCash = myTotalCash

    for (const symbol in targetAssetValues) {
      const asset = targetAssetValues[symbol]
      const allocationPct = asset.value / targetTotalValue
      const amountToInvest = myTotalCash * allocationPct
      
      const quantityToBuy = amountToInvest / asset.price

      if (quantityToBuy > 0) {
        // Deduct from remaining cash
        remainingCash -= amountToInvest

        // Log transaction
        await supabase.from('transactions').insert({
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

        // Insert holding
        await supabase.from('holdings').insert({
          user_id: user.id,
          symbol: symbol,
          asset_type: asset.type,
          quantity: quantityToBuy,
          avg_buy_price: asset.price
        })
      }
    }

    // Update final balance
    await supabase.from('profiles').update({ mock_balance: remainingCash }).eq('id', user.id)

    return NextResponse.json({ success: true, message: 'Successfully copied portfolio!' })
  } catch (error: any) {
    console.error('Copy trader error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
