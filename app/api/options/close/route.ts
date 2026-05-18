import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarketPrice } from '@/lib/api/market'
import { calculateBSM } from '@/lib/engine/black-scholes'

const RISK_FREE_RATE = 0.05
const CONTRACT_SIZE = 100

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { positionId } = await req.json()
    if (!positionId) return NextResponse.json({ error: 'positionId required' }, { status: 400 })

    // 1. Fetch position details
    const { data: pos, error: fetchError } = await supabase
      .from('options_positions')
      .select('*')
      .eq('id', positionId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !pos) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    if (pos.status !== 'open') {
      return NextResponse.json({ error: 'Position is already closed' }, { status: 400 })
    }

    const now = new Date()
    const expiry = new Date(pos.expiry)
    const T = Math.max(0, (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365))

    // 2. Fetch current market price
    const S = await getMarketPrice(pos.symbol, 'stock')
    const sigma = pos.iv_at_entry

    // 3. Compute BSM premium to determine current value
    const bsm = calculateBSM({
      S, K: pos.strike, T, r: RISK_FREE_RATE, sigma,
      type: pos.option_type as 'call' | 'put'
    })

    const currentPremium = bsm.price
    const currentValue = currentPremium * CONTRACT_SIZE * pos.contracts
    const pnl = currentValue - pos.premium_paid

    // 4. Update user profile mock_balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('mock_balance')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const newBalance = profile.mock_balance + currentValue

    // 5. Commit balance update and mark position as closed/exercised
    const [balanceRes, positionRes] = await Promise.all([
      supabase.from('profiles').update({ mock_balance: newBalance }).eq('id', user.id),
      supabase.from('options_positions').update({
        status: 'exercised',
        profit_loss: pnl,
        settled_at: now.toISOString()
      }).eq('id', positionId)
    ])

    if (balanceRes.error || positionRes.error) {
      return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      refundAmount: currentValue,
      newBalance,
      pnl
    })
  } catch (error: any) {
    console.error('Close option position error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
