import { NextRequest, NextResponse } from 'next/server'
import { getMarketPrice } from '@/lib/api/market'
import { getMarketOHLC } from '@/lib/api/market'
import { calculateBSM } from '@/lib/engine/black-scholes'
import { calculateHistoricalVolatility } from '@/lib/engine/volatility'

const RISK_FREE_RATE = 0.05 // 5% annualised

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const strike = parseFloat(searchParams.get('strike') || '0')
  const T = parseFloat(searchParams.get('T') || '0')         // time to expiry in years
  const optionType = searchParams.get('type') as 'call' | 'put'

  if (!symbol || !strike || T <= 0 || !optionType) {
    return NextResponse.json({ error: 'Missing required params: symbol, strike, T, type' }, { status: 400 })
  }

  try {
    // 1. Fetch spot price
    const S = await getMarketPrice(symbol, 'stock')

    // 2. Fetch OHLC for historical vol calculation (30 days)
    const ohlc = await getMarketOHLC(symbol, '1day', 35)
    const sigma = calculateHistoricalVolatility(ohlc)

    // 3. Calculate BSM price + Greeks
    const result = calculateBSM({ S, K: strike, T, r: RISK_FREE_RATE, sigma, type: optionType })

    return NextResponse.json({
      symbol,
      spotPrice: S,
      strike,
      expiry: T,
      optionType,
      sigma: parseFloat((sigma * 100).toFixed(2)), // return as %
      riskFreeRate: RISK_FREE_RATE,
      ...result
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
