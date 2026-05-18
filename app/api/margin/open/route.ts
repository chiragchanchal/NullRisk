import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarketPrice, AssetType } from '@/lib/api/market'

const DAILY_INTEREST_RATE = 0.0005 // 0.05%

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { symbol, assetType, quantity, leverage } = body

    if (!symbol || !assetType || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const leverageRatio = Math.max(2, Math.min(50, Number(leverage) || 2))

    // 1. Fetch current price
    const currentPrice = await getMarketPrice(symbol, assetType as AssetType)
    const totalPositionValue = currentPrice * quantity

    // 2. Calculate collateral (user pays collateralRequired based on leverage)
    const collateralRequired = totalPositionValue / leverageRatio
    const loanAmount = totalPositionValue - collateralRequired

    // 3. Check user has enough collateral
    const { data: profile } = await supabase
      .from('profiles')
      .select('mock_balance')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (profile.mock_balance < collateralRequired) {
      return NextResponse.json({
        error: `Insufficient balance. Need ₹${collateralRequired.toFixed(2)} as collateral for this margin trade.`
      }, { status: 400 })
    }

    // 4. Deduct collateral from balance
    await supabase
      .from('profiles')
      .update({ mock_balance: profile.mock_balance - collateralRequired })
      .eq('id', user.id)

    // 5. Open margin position
    const { data: position, error: posError } = await supabase
      .from('margin_positions')
      .insert({
        user_id: user.id,
        symbol,
        asset_type: assetType,
        collateral_amount: collateralRequired,
        margin_amount: loanAmount,
        leverage_ratio: leverageRatio,
        daily_interest_rate: DAILY_INTEREST_RATE,
        entry_price: currentPrice,
        quantity,
        status: 'open'
      })
      .select()
      .single()

    if (posError) throw posError

    // 6. Log transaction
    await supabase.from('transactions').insert({
      user_id: user.id,
      symbol,
      asset_type: assetType,
      order_type: 'buy',
      order_class: 'market',
      status: 'completed',
      quantity,
      price: currentPrice,
      total: totalPositionValue
    })

    return NextResponse.json({
      success: true,
      message: `Margin position opened: ${quantity} ${symbol} @ ₹${currentPrice.toFixed(2)} with ${leverageRatio}x leverage`,
      position,
      collateralUsed: collateralRequired,
      loanAmount
    })
  } catch (error: any) {
    console.error('Margin open error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

