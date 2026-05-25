import { getMarketPrice, AssetType } from '@/lib/api/market'
import { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/server'
import { calculateBSM } from '@/lib/engine/black-scholes'

const RISK_FREE_RATE = 0.05
const CONTRACT_SIZE = 100

export async function calculatePortfolioValue(supabase: SupabaseClient, userId: string) {
  // 1. Get user profile for balances with self-healing auto-creation
  let profile = null
  const { data: fetchProfile, error: profileError } = await supabase
    .from('profiles')
    .select('mock_balance, initial_balance')
    .eq('id', userId)
    .single()

  if (profileError || !fetchProfile) {
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email || `user_${userId.substring(0, 8)}@tradelab.com`
    const username = `user_${userId.substring(0, 8)}`

    const adminClient = createAdminClient()
    const { data: newProfile, error: insertError } = await adminClient
      .from('profiles')
      .insert({
        id: userId,
        email,
        username,
        mock_balance: 500000,
        initial_balance: 500000,
        weekly_start_balance: 500000
      })
      .select('mock_balance, initial_balance')
      .single()

    if (insertError || !newProfile) {
      throw new Error('User profile not found and auto-creation failed: ' + (insertError?.message || profileError?.message))
    }
    profile = newProfile
  } else {
    profile = fetchProfile
  }

  // 2. Get user spot holdings
  const { data: holdings, error: holdingsError } = await supabase
    .from('holdings')
    .select('symbol, asset_type, quantity, avg_buy_price')
    .eq('user_id', userId)
    .gt('quantity', 0)

  if (holdingsError) {
    throw new Error('Failed to fetch holdings')
  }

  let totalHoldingsValue = 0
  let totalHoldingsCost = 0
  let totalHoldingsUnrealisedPnL = 0

  // 3. Fetch current prices and calculate Spot Holdings PnL
  const holdingsPromises = (holdings || []).map(async (holding) => {
    try {
      const currentPrice = await getMarketPrice(holding.symbol, holding.asset_type as AssetType)
      const value = currentPrice * holding.quantity
      const costBasis = holding.avg_buy_price * holding.quantity
      const unrealisedPnL = value - costBasis

      totalHoldingsValue += value
      totalHoldingsCost += costBasis
      totalHoldingsUnrealisedPnL += unrealisedPnL

      return {
        ...holding,
        currentPrice,
        value,
        unrealisedPnL,
        unrealisedPnLPct: (currentPrice - holding.avg_buy_price) / holding.avg_buy_price * 100
      }
    } catch (e) {
      console.error(`Failed to calculate PnL for holding ${holding.symbol}:`, e)
      const costBasis = holding.avg_buy_price * holding.quantity
      totalHoldingsValue += costBasis
      totalHoldingsCost += costBasis
      return {
        ...holding,
        currentPrice: holding.avg_buy_price,
        value: costBasis,
        unrealisedPnL: 0,
        unrealisedPnLPct: 0
      }
    }
  })

  const enrichedHoldings = await Promise.all(holdingsPromises)

  // 4. Get open options positions and value them
  const { data: optionsPositions } = await supabase
    .from('options_positions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')

  let totalOptionsValue = 0
  let totalOptionsCost = 0
  let totalOptionsUnrealisedPnL = 0

  if (optionsPositions && optionsPositions.length > 0) {
    const now = new Date()
    const optionsPromises = optionsPositions.map(async (pos) => {
      try {
        const expiry = new Date(pos.expiry)
        const T = Math.max(0, (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365))
        const S = await getMarketPrice(pos.symbol, 'stock')
        const sigma = pos.iv_at_entry

        const bsm = calculateBSM({
          S, K: pos.strike, T, r: RISK_FREE_RATE, sigma,
          type: pos.option_type as 'call' | 'put'
        })

        const currentValue = bsm.price * CONTRACT_SIZE * pos.contracts
        const costBasis = pos.premium_paid
        const unrealisedPnL = currentValue - costBasis

        totalOptionsValue += currentValue
        totalOptionsCost += costBasis
        totalOptionsUnrealisedPnL += unrealisedPnL
      } catch (e) {
        console.error(`Failed to calculate PnL for option ${pos.symbol}:`, e)
        totalOptionsValue += pos.premium_paid
        totalOptionsCost += pos.premium_paid
      }
    })
    await Promise.all(optionsPromises)
  }

  // 5. Get open margin positions and value them
  const { data: marginPositions } = await supabase
    .from('margin_positions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')

  let totalMarginValue = 0
  let totalMarginCost = 0
  let totalMarginUnrealisedPnL = 0

  if (marginPositions && marginPositions.length > 0) {
    const marginPromises = marginPositions.map(async (pos) => {
      try {
        const currentPrice = await getMarketPrice(pos.symbol, pos.asset_type as AssetType)
        const currentValue = currentPrice * pos.quantity
        const totalInvested = pos.collateral_amount + pos.margin_amount
        const unrealisedPnL = currentValue - totalInvested

        const marginBalance = pos.collateral_amount + unrealisedPnL
        const costBasis = pos.collateral_amount

        totalMarginValue += Math.max(0, marginBalance)
        totalMarginCost += costBasis
        totalMarginUnrealisedPnL += unrealisedPnL
      } catch (e) {
        console.error(`Failed to calculate PnL for margin ${pos.symbol}:`, e)
        totalMarginValue += pos.collateral_amount
        totalMarginCost += pos.collateral_amount
      }
    })
    await Promise.all(marginPromises)
  }

  // 6. Aggregate global totals
  const totalUnrealisedPnL = totalHoldingsUnrealisedPnL + totalOptionsUnrealisedPnL + totalMarginUnrealisedPnL
  const totalPortfolioValue = profile.mock_balance + totalHoldingsValue + totalOptionsValue + totalMarginValue
  const totalPnL = totalPortfolioValue - profile.initial_balance
  const realisedPnL = totalPnL - totalUnrealisedPnL
  const totalPnLPct = (totalPnL / profile.initial_balance) * 100

  return {
    cashBalance: profile.mock_balance,
    initialBalance: profile.initial_balance,
    totalPortfolioValue,
    realisedPnL,
    totalUnrealisedPnL,
    totalPnL,
    totalPnLPct,
    holdings: enrichedHoldings
  }
}
