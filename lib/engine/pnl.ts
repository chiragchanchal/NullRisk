import { getMarketPrice, AssetType } from '@/lib/api/market'
import { SupabaseClient } from '@supabase/supabase-js'

export async function calculatePortfolioValue(supabase: SupabaseClient, userId: string) {
  // 1. Get user profile for balances
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('mock_balance, initial_balance')
    .eq('id', userId)
    .single()

  if (profileError || !profile) {
    throw new Error('User profile not found')
  }

  // 2. Get user holdings
  const { data: holdings, error: holdingsError } = await supabase
    .from('holdings')
    .select('symbol, asset_type, quantity, avg_buy_price')
    .eq('user_id', userId)
    .gt('quantity', 0)

  if (holdingsError) {
    throw new Error('Failed to fetch holdings')
  }

  let totalUnrealisedPnL = 0
  let totalHoldingsValue = 0

  // 3. Fetch current prices and calculate PnL
  const holdingsPromises = (holdings || []).map(async (holding) => {
    const currentPrice = await getMarketPrice(holding.symbol, holding.asset_type as AssetType)
    
    const value = currentPrice * holding.quantity
    const costBasis = holding.avg_buy_price * holding.quantity
    const unrealisedPnL = value - costBasis

    totalHoldingsValue += value
    totalUnrealisedPnL += unrealisedPnL

    return {
      ...holding,
      currentPrice,
      value,
      unrealisedPnL,
      unrealisedPnLPct: (currentPrice - holding.avg_buy_price) / holding.avg_buy_price * 100
    }
  })

  const enrichedHoldings = await Promise.all(holdingsPromises)

  const realisedPnL = profile.mock_balance - profile.initial_balance
  const totalPortfolioValue = profile.mock_balance + totalHoldingsValue
  const totalPnL = realisedPnL + totalUnrealisedPnL
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
