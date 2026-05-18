import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarketPrice } from '@/lib/api/market'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: watchlist, error } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)

    if (error) throw error

    // Enrich with current prices
    const enriched = await Promise.all(
      (watchlist || []).map(async (item) => {
        try {
          const price = await getMarketPrice(item.symbol, item.asset_type as any)
          return { ...item, price }
        } catch (e) {
          return { ...item, price: null }
        }
      })
    )

    return NextResponse.json(enriched)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { symbol, assetType } = await req.json()

    if (!symbol || !assetType) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Toggle watchlist logic: check if exists
    const { data: existing } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', user.id)
      .eq('symbol', symbol)
      .maybeSingle()

    if (existing) {
      // Remove it
      const { error: deleteError } = await supabase
        .from('watchlist')
        .delete()
        .eq('user_id', user.id)
        .eq('symbol', symbol)

      if (deleteError) throw deleteError
      return NextResponse.json({ success: true, action: 'removed' })
    } else {
      // Add it
      const { error: insertError } = await supabase
        .from('watchlist')
        .insert({ user_id: user.id, symbol, asset_type: assetType })

      if (insertError) throw insertError
      return NextResponse.json({ success: true, action: 'added' })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
