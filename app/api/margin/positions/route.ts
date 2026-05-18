import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarketPrice, AssetType } from '@/lib/api/market'

const MARGIN_CALL_THRESHOLD = 0.8 // 80% of collateral lost → trigger margin call

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
        const lossAsCollateralPct = Math.abs(Math.min(0, unrealisedPnL)) / pos.collateral_amount

        totalExposure += pos.margin_amount
        totalCollateral += pos.collateral_amount

        const isMarginCall = unrealisedPnL < 0 && lossAsCollateralPct >= MARGIN_CALL_THRESHOLD

        if (isMarginCall) {
          // Auto-liquidate via API call (calling close route with forceClose=true)
          await supabase.rpc('liquidate_margin_position', {
            p_position_id: pos.id,
            p_user_id: user.id,
            p_close_price: currentPrice
          })
          marginCallPositions.push({ ...pos, currentPrice, unrealisedPnL })
        }

        return {
          ...pos,
          currentPrice,
          currentValue,
          unrealisedPnL,
          unrealisedPnLPct,
          lossAsCollateralPct,
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
