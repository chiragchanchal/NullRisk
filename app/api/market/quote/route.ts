import { NextRequest, NextResponse } from 'next/server'
import { getMarketPrice, AssetType } from '@/lib/api/market'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get('symbol')
  const assetType = searchParams.get('assetType') as AssetType

  if (!symbol || !assetType) {
    return NextResponse.json({ error: 'Missing symbol or assetType' }, { status: 400 })
  }

  try {
    const price = await getMarketPrice(symbol, assetType)
    return NextResponse.json({ symbol, price })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
