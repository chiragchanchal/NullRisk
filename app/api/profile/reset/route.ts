import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Reset user balance to 500,000 in profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        mock_balance: 500000,
        initial_balance: 500000,
        weekly_start_balance: 500000
      })
      .eq('id', user.id)

    if (profileError) {
      return NextResponse.json({ error: 'Failed to reset profile balance' }, { status: 500 })
    }

    // 2. Clear all positions, transactions, and holdings
    await Promise.all([
      supabase.from('options_positions').delete().eq('user_id', user.id),
      supabase.from('margin_positions').delete().eq('user_id', user.id),
      supabase.from('holdings').delete().eq('user_id', user.id),
      supabase.from('transactions').delete().eq('user_id', user.id),
      supabase.from('watchlist').delete().eq('user_id', user.id)
    ])

    return NextResponse.json({
      success: true,
      message: 'Account reset successful! Your balance has been restored to ₹5,00,000.00 and all positions have been cleared.'
    })
  } catch (error: any) {
    console.error('Account reset error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
