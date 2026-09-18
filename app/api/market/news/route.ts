import { NextRequest, NextResponse } from 'next/server'
import { getMarketNews } from '@/lib/api/market'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 })

  try {
    const data = await getMarketNews(symbol)
    return NextResponse.json(data)
  } catch (error: unknown) {
    const err = error as Error
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
