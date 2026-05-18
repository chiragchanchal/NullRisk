import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarketPrice } from '@/lib/api/market'
import { getMarketOHLC } from '@/lib/api/market'
import { calculateBSM } from '@/lib/engine/black-scholes'
import { calculateHistoricalVolatility } from '@/lib/engine/volatility'

const RISK_FREE_RATE = 0.05
const CONTRACT_SIZE = 100 // 1 contract = 100 shares

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { symbol, optionType, strike, expiryDate, contracts = 1 } = body

    if (!symbol || !optionType || !strike || !expiryDate || contracts < 1) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    if (optionType !== 'call' && optionType !== 'put') {
      return NextResponse.json({ error: 'optionType must be call or put' }, { status: 400 })
    }

    // 1. Calculate time to expiry
    const now = new Date()
    const expiry = new Date(expiryDate)
    const T = Math.max(0, (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365))

    if (T <= 0) {
      return NextResponse.json({ error: 'Expiry date must be in the future' }, { status: 400 })
    }

    // 2. Fetch spot price and compute sigma
    const S = await getMarketPrice(symbol, 'stock')
    const ohlc = await getMarketOHLC(symbol, '1day', 35)
    const sigma = calculateHistoricalVolatility(ohlc)

    // 3. Calculate premium via BSM
    const bsm = calculateBSM({ S, K: strike, T, r: RISK_FREE_RATE, sigma, type: optionType })
    const premiumPerShare = bsm.price
    const totalPremium = premiumPerShare * CONTRACT_SIZE * contracts

    // 4. Check balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('mock_balance')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (profile.mock_balance < totalPremium) {
      return NextResponse.json({
        error: `Insufficient balance. Premium required: ₹${totalPremium.toFixed(2)} for ${contracts} contract(s).`
      }, { status: 400 })
    }

    // 5. Deduct premium
    await supabase
      .from('profiles')
      .update({ mock_balance: profile.mock_balance - totalPremium })
      .eq('id', user.id)

    // 6. Create options position
    const { data: position } = await supabase
      .from('options_positions')
      .insert({
        user_id: user.id,
        symbol,
        asset_type: 'stock',
        option_type: optionType,
        strike,
        expiry: expiryDate,
        premium_paid: totalPremium,
        contracts,
        spot_at_entry: S,
        iv_at_entry: sigma,
        status: 'open'
      })
      .select()
      .single()

    return NextResponse.json({
      success: true,
      position,
      premiumPerShare: premiumPerShare.toFixed(4),
      totalPremium: totalPremium.toFixed(2),
      contracts,
      message: `Bought ${contracts} ${symbol} ${strike} ${optionType.toUpperCase()} @ ₹${premiumPerShare.toFixed(4)}/share. Total cost: ₹${totalPremium.toFixed(2)}`
    })
  } catch (error: any) {
    console.error('Options buy error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
