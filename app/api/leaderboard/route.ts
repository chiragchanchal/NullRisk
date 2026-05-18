import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('get_leaderboard')

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Leaderboard fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
