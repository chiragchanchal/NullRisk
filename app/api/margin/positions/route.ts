import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarketPrice, AssetType } from '@/lib/api/market'

function getMMR(leverage: number): number {
  if (leverage >= 50) return 0.01
  if (leverage >= 25) return 0.02
  if (leverage >= 10) return 0.05
  if (leverage >= 5) return 0.10
  return 0.15
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Fetch all open margin positions
    const { data: positions } = await supabase
      .from('margin_positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open')

    if (!positions || positions.length === 0) {
      return NextResponse.json({ positions: [], marginCallTriggered: false, totalExposure: 0 })
    }

    // 2. Enrich each position with live data and check for margin calls
    const marginCallPositions: any[] = []
    let totalExposure = 0
    let totalCollateral = 0

    const enriched = await Promise.all(
      positions.map(async (pos) => {
        const currentPrice = await getMarketPrice(pos.symbol, pos.asset_type as AssetType)
        const currentValue = currentPrice * pos.quantity
        const totalInvested = pos.collateral_amount + pos.margin_amount
        const unrealisedPnL = currentValue - totalInvested
        const unrealisedPnLPct = (unrealisedPnL / totalInvested) * 100

        totalExposure += pos.margin_amount
        totalCollateral += pos.collateral_amount

        // Binance-Style Calculations
        const mm = getMMR(pos.leverage_ratio)
        const marginBalance = pos.collateral_amount + unrealisedPnL
        const maintenanceMargin = currentValue * mm
        
        // Margin Ratio: (Maintenance Margin / Margin Balance) * 100. If >= 100%, liquidate.
        const marginRatio = marginBalance > 0 ? (maintenanceMargin / marginBalance) * 100 : 100
        
        // Precise Liquidation Price: (EntryPrice * Qty - Collateral) / (Qty * (1 - MMR))
        const liquidationPrice = Math.max(0, (pos.entry_price * pos.quantity - pos.collateral_amount) / (pos.quantity * (1 - mm)))

        const isMarginCall = marginBalance <= maintenanceMargin

        if (isMarginCall) {
          // Auto-liquidate via API call
          try {
            await supabase.rpc('liquidate_margin_position', {
              p_position_id: pos.id,
              p_user_id: user.id,
              p_close_price: currentPrice
            })
          } catch (rpcErr) {
            console.error('RPC liquidation failed, falling back to manual update:', rpcErr)
            // Manual fallback: close the position and set status to liquidated
            await supabase
              .from('margin_positions')
              .update({
                status: 'liquidated',
                closed_at: new Date().toISOString(),
                close_price: currentPrice
              })
              .eq('id', pos.id)
            
            // Refund any remaining collateral (marginBalance) if > 0
            if (marginBalance > 0) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('mock_balance')
                .eq('id', user.id)
                .single()
              if (profile) {
                await supabase
                  .from('profiles')
                  .update({ mock_balance: profile.mock_balance + marginBalance })
                  .eq('id', user.id)
              }
            }
          }
          marginCallPositions.push({ ...pos, currentPrice, unrealisedPnL, liquidationPrice, marginRatio })
        }

        return {
          ...pos,
          currentPrice,
          currentValue,
          unrealisedPnL,
          unrealisedPnLPct,
          marginBalance,
          maintenanceMargin,
          marginRatio,
          liquidationPrice,
          isMarginCall
        }
      })
    )

    // 3. Calculate total margin exposure %
    const exposurePct = totalCollateral > 0 ? (totalExposure / totalCollateral) * 100 : 0

    return NextResponse.json({
      positions: enriched.filter(p => !p.isMarginCall), // exclude just-liquidated ones
      marginCallTriggered: marginCallPositions.length > 0,
      marginCallPositions,
      totalExposure,
      totalCollateral,
      exposurePct
    })
  } catch (error: any) {
    console.error('Margin positions error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

