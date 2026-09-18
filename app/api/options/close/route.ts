import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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
    if (!positionId || typeof positionId !== 'string') {
      return NextResponse.json({ error: 'Valid positionId required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Fetch position details
    const { data: pos, error: fetchError } = await adminClient
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
    const sigma = Number(pos.iv_at_entry)

    // 3. Compute BSM premium to determine current value
    const bsm = calculateBSM({
      S, K: Number(pos.strike), T, r: RISK_FREE_RATE, sigma,
      type: pos.option_type as 'call' | 'put'
    })

    const currentPremium = bsm.price
    const currentValue = currentPremium * CONTRACT_SIZE * Number(pos.contracts)
    const pnl = currentValue - Number(pos.premium_paid)

    // 4. Atomically transition status from 'open' to 'closed' to prevent double-close race condition
    const { data: updatedPos, error: posUpdateError } = await adminClient
      .from('options_positions')
      .update({
        status: 'closed',
        profit_loss: pnl,
        settled_at: now.toISOString()
      })
      .eq('id', positionId)
      .eq('user_id', user.id)
      .eq('status', 'open')
      .select()
      .single()

    if (posUpdateError || !updatedPos) {
      return NextResponse.json({ error: 'Position already closed or concurrently modified' }, { status: 400 })
    }

    // 5. Credit refund to user mock_balance
    const { data: profile } = await adminClient
      .from('profiles')
      .select('mock_balance')
      .eq('id', user.id)
      .single()

    const currentBal = profile ? Number(profile.mock_balance) : 0
    const newBalance = currentBal + currentValue

    await adminClient
      .from('profiles')
      .update({ mock_balance: newBalance })
      .eq('id', user.id)

    // 6. Log transaction
    await adminClient.from('transactions').insert({
      user_id: user.id,
      symbol: pos.symbol,
      asset_type: 'stock',
      order_type: 'sell',
      order_class: 'market',
      status: 'completed',
      quantity: pos.contracts,
      price: currentPremium * CONTRACT_SIZE,
      total: currentValue
    })

    return NextResponse.json({
      success: true,
      refundAmount: currentValue,
      newBalance,
      pnl
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Close option position error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
