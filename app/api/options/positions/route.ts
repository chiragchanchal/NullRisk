import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarketPrice } from '@/lib/api/market'
import { getMarketOHLC } from '@/lib/api/market'
import { calculateBSM } from '@/lib/engine/black-scholes'
import { calculateHistoricalVolatility } from '@/lib/engine/volatility'

const RISK_FREE_RATE = 0.05
const CONTRACT_SIZE = 100

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Fetch all option positions
    const { data: positions } = await supabase
      .from('options_positions')
      .select('*')
      .eq('user_id', user.id)
      .order('opened_at', { ascending: false })

    if (!positions || positions.length === 0) {
      return NextResponse.json({ positions: [] })
    }

    const now = new Date()

    // 2. Enrich with live pricing and settle expired ones
    const enriched = await Promise.all(
      positions.map(async (pos) => {
        if (pos.status !== 'open') return { ...pos, currentPremium: 0, currentValue: 0, pnl: pos.profit_loss || 0 }

        const expiry = new Date(pos.expiry)
        const T = Math.max(0, (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365))
        const isExpired = expiry < now

        try {
          const S = await getMarketPrice(pos.symbol, 'stock')
          const sigma = pos.iv_at_entry // Use IV at entry for current valuation

          // Current premium via BSM
          const bsm = calculateBSM({
            S, K: pos.strike, T, r: RISK_FREE_RATE, sigma,
            type: pos.option_type as 'call' | 'put'
          })

          const currentPremium = bsm.price
          const currentValue = currentPremium * CONTRACT_SIZE * pos.contracts
          const pnl = currentValue - pos.premium_paid

          // Auto-settle expired positions with live price
          if (isExpired) {
            const intrinsic = pos.option_type === 'call'
              ? Math.max(0, S - pos.strike)
              : Math.max(0, pos.strike - S)

            const settlePayout = intrinsic * CONTRACT_SIZE * pos.contracts
            const settlePnl = settlePayout - pos.premium_paid
            const newStatus = intrinsic > 0 ? 'exercised' : 'expired'

            // Return payout to user if ITM
            if (intrinsic > 0) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('mock_balance')
                .eq('id', user.id)
                .single()

              if (profile) {
                await supabase
                  .from('profiles')
                  .update({ mock_balance: profile.mock_balance + settlePayout })
                  .eq('id', user.id)
              }
            }

            // Mark settled
            await supabase
              .from('options_positions')
              .update({ status: newStatus, profit_loss: settlePnl, settled_at: now.toISOString() })
              .eq('id', pos.id)

            return {
              ...pos,
              status: newStatus,
              currentSpot: S,
              currentPremium: intrinsic,
              currentValue: settlePayout,
              pnl: settlePnl,
              // Merge bsm but skip its intrinsicValue (we use our live one above)
              delta: bsm.delta, gamma: bsm.gamma, theta: bsm.theta, vega: bsm.vega,
              impliedMoneyness: bsm.impliedMoneyness
            }
          }

          return { ...pos, currentSpot: S, currentPremium, currentValue, pnl, ...bsm }
        } catch {
          return { ...pos, currentPremium: 0, currentValue: 0, pnl: -pos.premium_paid }
        }
      })
    )

    return NextResponse.json({ positions: enriched })
  } catch (error: any) {
    console.error('Options positions error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
