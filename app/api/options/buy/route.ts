import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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
    const { symbol, optionType, strike: rawStrike, expiryDate, contracts: rawContracts = 1 } = body

    const strike = Number(rawStrike)
    const contracts = Number(rawContracts)

    if (
      !symbol ||
      typeof symbol !== 'string' ||
      !/^[A-Za-z0-9.\/]{1,15}$/.test(symbol) ||
      (optionType !== 'call' && optionType !== 'put') ||
      typeof strike !== 'number' ||
      isNaN(strike) ||
      !isFinite(strike) ||
      strike <= 0 ||
      !expiryDate ||
      typeof contracts !== 'number' ||
      isNaN(contracts) ||
      !isFinite(contracts) ||
      contracts < 1 ||
      contracts > 1000 ||
      !Number.isInteger(contracts)
    ) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    // 1. Calculate time to expiry
    const now = new Date()
    const expiry = new Date(expiryDate)
    const T = Math.max(0, (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365))

    if (T <= 0 || isNaN(T)) {
      return NextResponse.json({ error: 'Expiry date must be in the future' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 2. Fetch spot price and compute sigma
    const S = await getMarketPrice(symbol, 'stock')
    const ohlc = await getMarketOHLC(symbol, '1day', 35)
    const sigma = calculateHistoricalVolatility(ohlc)

    // 3. Calculate premium via BSM
    const bsm = calculateBSM({ S, K: strike, T, r: RISK_FREE_RATE, sigma, type: optionType })
    const premiumPerShare = bsm.price
    const totalPremium = premiumPerShare * CONTRACT_SIZE * contracts

    // 4. Check balance with self-healing auto-creation
    let profile = null
    const { data: fetchProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('mock_balance')
      .eq('id', user.id)
      .single()

    if (profileError || !fetchProfile) {
      const email = user.email || `user_${user.id.substring(0, 8)}@tradelab.com`
      const username = `user_${user.id.substring(0, 8)}`

      const { data: newProfile, error: insertError } = await adminClient
        .from('profiles')
        .insert({
          id: user.id,
          email,
          username,
          mock_balance: 500000,
          initial_balance: 500000,
          weekly_start_balance: 500000
        })
        .select('mock_balance')
        .single()

      if (insertError || !newProfile) {
        return NextResponse.json({ error: `Profile auto-creation failed: ${insertError?.message || profileError?.message}` }, { status: 404 })
      }
      profile = newProfile
    } else {
      profile = fetchProfile
    }

    if (Number(profile.mock_balance) < totalPremium) {
      return NextResponse.json({
        error: `Insufficient balance. Premium required: ₹${totalPremium.toFixed(2)} for ${contracts} contract(s).`
      }, { status: 400 })
    }

    // 5. Deduct premium atomically
    const { data: updatedProfile, error: balError } = await adminClient
      .from('profiles')
      .update({ mock_balance: Number(profile.mock_balance) - totalPremium })
      .eq('id', user.id)
      .gte('mock_balance', totalPremium)
      .select('mock_balance')
      .single()

    if (balError || !updatedProfile) {
      return NextResponse.json({ error: 'Failed to reserve premium funds. Please try again.' }, { status: 400 })
    }

    // 6. Create options position
    const { data: position, error: posError } = await adminClient
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

    if (posError) {
      // Rollback balance deduction
      await adminClient
        .from('profiles')
        .update({ mock_balance: Number(profile.mock_balance) })
        .eq('id', user.id)

      throw posError
    }

    // 7. Log options transaction into transactions table
    await adminClient.from('transactions').insert({
      user_id: user.id,
      symbol,
      asset_type: 'stock',
      order_type: 'buy',
      order_class: 'market',
      status: 'completed',
      quantity: contracts,
      price: premiumPerShare * CONTRACT_SIZE,
      total: totalPremium
    })

    return NextResponse.json({
      success: true,
      position,
      premiumPerShare: premiumPerShare.toFixed(4),
      totalPremium: totalPremium.toFixed(2),
      contracts,
      message: `Bought ${contracts} ${symbol} ${strike} ${optionType.toUpperCase()} @ ₹${premiumPerShare.toFixed(4)}/share. Total cost: ₹${totalPremium.toFixed(2)}`
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Options buy error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
