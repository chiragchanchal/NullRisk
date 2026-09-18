import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface LeaderboardEntry {
  user_id: string
  username: string
  total_return_pct: number
  weekly_return_pct: number
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let leaderboardData: LeaderboardEntry[] | null = null

    try {
      const { data, error } = await supabase.rpc('get_leaderboard')
      if (!error && data) {
        leaderboardData = data as LeaderboardEntry[]
      }
    } catch (rpcError) {
      console.warn('RPC get_leaderboard failed, using JS fallback:', rpcError)
    }

    if (!leaderboardData) {
      // Fallback: Query profiles and holdings and calculate manually
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, mock_balance, initial_balance, weekly_start_balance')

      if (profileError) {
        throw profileError
      }

      const { data: holdings } = await supabase
        .from('holdings')
        .select('user_id, quantity, avg_buy_price')

      leaderboardData = (profiles || []).map(p => {
        const userHoldings = (holdings || []).filter(h => h.user_id === p.id)
        const holdingsValue = userHoldings.reduce((sum, h) => sum + (Number(h.quantity) * Number(h.avg_buy_price)), 0)
        
        const currentTotalValue = Number(p.mock_balance) + holdingsValue
        const initial = Number(p.initial_balance) || 500000
        const weekly = Number(p.weekly_start_balance) || 500000

        const total_return_pct = ((currentTotalValue - initial) / initial) * 100
        const weekly_return_pct = ((currentTotalValue - weekly) / weekly) * 100

        return {
          user_id: p.id,
          username: p.username || `user_${p.id.substring(0, 8)}`,
          total_return_pct,
          weekly_return_pct
        }
      })

      // Sort by total_return_pct desc
      leaderboardData.sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.total_return_pct - a.total_return_pct)
    }

    return NextResponse.json(leaderboardData)
  } catch (error: unknown) {
    const err = error as Error
    console.error('Leaderboard fetch error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
