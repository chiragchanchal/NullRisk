import { SupabaseClient } from '@supabase/supabase-js'

const BONUS_MILESTONE_PCT = 10 // 10% profit triggers bonus
const BONUS_AMOUNT = 1000000 // ₹10,00,000

export async function checkAndTriggerBonus(
  supabase: SupabaseClient, 
  userId: string, 
  totalPortfolioValue: number, 
  initialBalance: number
) {
  const profitPct = ((totalPortfolioValue - initialBalance) / initialBalance) * 100

  if (profitPct >= BONUS_MILESTONE_PCT) {
    // Check if the user already received this milestone bonus
    // For simplicity, we assume they only get the "10% milestone" bonus once.
    // A robust system would log the specific milestone thresholds (e.g., 10%, 20%, etc.)
    
    const { data: existingBonus } = await supabase
      .from('bonus_events')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    // If they haven't received a bonus yet
    if (!existingBonus || existingBonus.length === 0) {
      
      // 1. Insert Bonus Event
      const { error: insertError } = await supabase
        .from('bonus_events')
        .insert({
          user_id: userId,
          bonus_amount: BONUS_AMOUNT,
          profit_pct_at_trigger: profitPct
        })

      if (insertError) {
        console.error('Failed to log bonus event:', insertError)
        return false
      }

      // 2. Add bonus to mock_balance
      // Note: In Supabase Postgres, you can't easily increment a value in a standard update via JS without 
      // a stored procedure if you worry about race conditions. We'll read the latest balance and add.
      const { data: profile } = await supabase
        .from('profiles')
        .select('mock_balance')
        .eq('id', userId)
        .single()

      if (profile) {
        await supabase
          .from('profiles')
          .update({ mock_balance: profile.mock_balance + BONUS_AMOUNT })
          .eq('id', userId)
        
        return true
      }
    }
  }

  return false
}
