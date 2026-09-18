import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getMarketPrice, AssetType } from '@/lib/api/market'

const DAILY_INTEREST_RATE = 0.0005 // 0.05%

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { symbol, assetType, quantity: rawQuantity, leverage } = body

    const quantity = Number(rawQuantity)

    if (
      !symbol ||
      typeof symbol !== 'string' ||
      !/^[A-Za-z0-9.\/]{1,15}$/.test(symbol) ||
      !assetType ||
      !['stock', 'crypto', 'forex'].includes(assetType) ||
      typeof quantity !== 'number' ||
      isNaN(quantity) ||
      !isFinite(quantity) ||
      quantity <= 0 ||
      quantity > 1000000
    ) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const leverageRatio = Math.max(2, Math.min(50, Number(leverage) || 2))
    const adminClient = createAdminClient()

    // 1. Fetch current price
    const currentPrice = await getMarketPrice(symbol, assetType as AssetType)
    const totalPositionValue = currentPrice * quantity

    // 2. Calculate collateral
    const collateralRequired = totalPositionValue / leverageRatio
    const loanAmount = totalPositionValue - collateralRequired

    // 3. Fetch user profile
    const { data: profile } = await adminClient
      .from('profiles')
      .select('mock_balance')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (Number(profile.mock_balance) < collateralRequired) {
      return NextResponse.json({
        error: `Insufficient balance. Need ₹${collateralRequired.toFixed(2)} as collateral for this margin trade.`
      }, { status: 400 })
    }

    // 4. Deduct collateral from balance atomically
    const { data: updatedProfile, error: balError } = await adminClient
      .from('profiles')
      .update({ mock_balance: Number(profile.mock_balance) - collateralRequired })
      .eq('id', user.id)
      .gte('mock_balance', collateralRequired)
      .select('mock_balance')
      .single()

    if (balError || !updatedProfile) {
      return NextResponse.json({ error: 'Failed to reserve collateral. Check available balance.' }, { status: 400 })
    }

    // 5. Open margin position
    const { data: position, error: posError } = await adminClient
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

    if (posError) {
      // Rollback balance deduction on position insert failure
      await adminClient
        .from('profiles')
        .update({ mock_balance: Number(profile.mock_balance) })
        .eq('id', user.id)

      throw posError
    }

    // 6. Log transaction
    await adminClient.from('transactions').insert({
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Margin open error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
