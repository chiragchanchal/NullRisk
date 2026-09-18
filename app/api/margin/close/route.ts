import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getMarketPrice, AssetType } from '@/lib/api/market'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { positionId, forceClose = false } = body

    if (!positionId || typeof positionId !== 'string') {
      return NextResponse.json({ error: 'Valid positionId required' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. Fetch the position
    const { data: pos } = await adminClient
      .from('margin_positions')
      .select('*')
      .eq('id', positionId)
      .eq('user_id', user.id)
      .eq('status', 'open')
      .single()

    if (!pos) return NextResponse.json({ error: 'Position not found or already closed' }, { status: 404 })

    // 2. Get current market price
    const currentPrice = await getMarketPrice(pos.symbol, pos.asset_type as AssetType)

    // 3. Call the appropriate Postgres RPC via adminClient (service role)
    if (forceClose) {
      // Margin call liquidation
      await adminClient.rpc('liquidate_margin_position', {
        p_position_id: positionId,
        p_user_id: user.id,
        p_close_price: currentPrice
      })

      return NextResponse.json({
        success: true,
        liquidated: true,
        message: `Margin Call — Position liquidated at ₹${currentPrice.toFixed(2)}`
      })
    } else {
      // Normal user close
      const { data: returned, error: closeError } = await adminClient.rpc('close_margin_position', {
        p_position_id: positionId,
        p_user_id: user.id,
        p_close_price: currentPrice
      })

      if (closeError) {
        throw closeError
      }

      // Log sell transaction
      await adminClient.from('transactions').insert({
        user_id: user.id,
        symbol: pos.symbol,
        asset_type: pos.asset_type,
        order_type: 'sell',
        order_class: 'market',
        status: 'completed',
        quantity: pos.quantity,
        price: currentPrice,
        total: currentPrice * pos.quantity
      })

      const pnl = (currentPrice - Number(pos.entry_price)) * Number(pos.quantity)
      return NextResponse.json({
        success: true,
        liquidated: false,
        returnedAmount: returned,
        pnl,
        message: `Position closed at ₹${currentPrice.toFixed(2)}. P&L: ₹${pnl.toFixed(2)}`
      })
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Margin close error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
