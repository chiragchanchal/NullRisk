import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { calculatePortfolioValue } from '@/lib/engine/pnl'
import { getMarketPrice, AssetType } from '@/lib/api/market'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()

    // 1. Evaluation and Execution of Pending Limit Orders
    const { data: pendingOrders } = await adminClient
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')

    if (pendingOrders && pendingOrders.length > 0) {
      for (const order of pendingOrders) {
        try {
          const currentPrice = await getMarketPrice(order.symbol, order.asset_type as AssetType)
          
          let execute = false
          if (order.order_type === 'buy' && currentPrice <= order.limit_price) {
            execute = true
          } else if (order.order_type === 'sell' && currentPrice >= order.limit_price) {
            execute = true
          }

          if (execute) {
            const total = currentPrice * Number(order.quantity)

            if (order.order_type === 'buy') {
              const { data: profile } = await adminClient
                .from('profiles')
                .select('mock_balance')
                .eq('id', user.id)
                .single()

              if (profile && Number(profile.mock_balance) >= total) {
                // Deduct balance atomically
                const { data: updatedProfile } = await adminClient
                  .from('profiles')
                  .update({ mock_balance: Number(profile.mock_balance) - total })
                  .eq('id', user.id)
                  .gte('mock_balance', total)
                  .select('mock_balance')
                  .single()

                if (updatedProfile) {
                  // Credit holding
                  const { data: existingHolding } = await adminClient
                    .from('holdings')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('symbol', order.symbol)
                    .single()

                  if (existingHolding) {
                    const newQty = Number(existingHolding.quantity) + Number(order.quantity)
                    const oldCost = Number(existingHolding.quantity) * Number(existingHolding.avg_buy_price)
                    const newAvg = (oldCost + total) / newQty

                    await adminClient
                      .from('holdings')
                      .update({
                        quantity: newQty,
                        avg_buy_price: newAvg,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', existingHolding.id)
                  } else {
                    await adminClient.from('holdings').insert({
                      user_id: user.id,
                      symbol: order.symbol,
                      asset_type: order.asset_type,
                      quantity: order.quantity,
                      avg_buy_price: currentPrice
                    })
                  }

                  await adminClient
                    .from('transactions')
                    .update({ status: 'completed', price: currentPrice, total, executed_at: new Date().toISOString() })
                    .eq('id', order.id)
                }
              } else {
                // Cancel if insufficient funds upon limit trigger
                await adminClient
                  .from('transactions')
                  .update({ status: 'cancelled' })
                  .eq('id', order.id)
              }
            } else if (order.order_type === 'sell') {
              const { data: existingHolding } = await adminClient
                .from('holdings')
                .select('*')
                .eq('user_id', user.id)
                .eq('symbol', order.symbol)
                .single()

              if (existingHolding && Number(existingHolding.quantity) >= Number(order.quantity)) {
                const remainingQty = Number(existingHolding.quantity) - Number(order.quantity)
                const { data: updatedHolding } = await adminClient
                  .from('holdings')
                  .update({
                    quantity: remainingQty,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', existingHolding.id)
                  .gte('quantity', order.quantity)
                  .select('quantity')
                  .single()

                if (updatedHolding) {
                  if (remainingQty === 0) {
                    await adminClient.from('holdings').delete().eq('id', existingHolding.id)
                  }

                  // Credit proceeds to cash balance
                  const { data: profile } = await adminClient
                    .from('profiles')
                    .select('mock_balance')
                    .eq('id', user.id)
                    .single()

                  if (profile) {
                    await adminClient
                      .from('profiles')
                      .update({ mock_balance: Number(profile.mock_balance) + total })
                      .eq('id', user.id)
                  }

                  await adminClient
                    .from('transactions')
                    .update({ status: 'completed', price: currentPrice, total, executed_at: new Date().toISOString() })
                    .eq('id', order.id)
                }
              } else {
                // Cancel if user sold assets prior to limit order trigger
                await adminClient
                  .from('transactions')
                  .update({ status: 'cancelled' })
                  .eq('id', order.id)
              }
            }
          }
        } catch (e) {
          console.error('Failed to evaluate pending order:', e)
        }
      }
    }

    // 2. Calculate Portfolio Value
    const summary = await calculatePortfolioValue(supabase, user.id)

    // 3. Trigger Bonus via Postgres RPC (service role)
    if (summary.totalPnLPct > 0) {
      await adminClient.rpc('grant_milestone_bonus', {
        p_user_id: user.id,
        p_total_return_pct: summary.totalPnLPct
      })
    }

    return NextResponse.json(summary)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Portfolio summary error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
