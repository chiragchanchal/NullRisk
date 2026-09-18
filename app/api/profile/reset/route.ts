import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminClient = createAdminClient()

    // 1. Reset user balance to 500,000 in profiles
    const { error: profileError } = await adminClient
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

    // 2. Clear all positions, transactions, holdings, watchlist, and bonus events
    await Promise.all([
      adminClient.from('options_positions').delete().eq('user_id', user.id),
      adminClient.from('margin_positions').delete().eq('user_id', user.id),
      adminClient.from('holdings').delete().eq('user_id', user.id),
      adminClient.from('transactions').delete().eq('user_id', user.id),
      adminClient.from('watchlist').delete().eq('user_id', user.id),
      adminClient.from('bonus_events').delete().eq('user_id', user.id)
    ])

    return NextResponse.json({
      success: true,
      message: 'Account reset successful! Your balance has been restored to ₹5,00,000.00 and all positions have been cleared.'
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    console.error('Account reset error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
