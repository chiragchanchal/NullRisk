import { NextRequest, NextResponse } from 'next/server'
import { getMarketOHLC } from '@/lib/api/market'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })

  try {
    const data = await getMarketOHLC(symbol)
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
