'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Search, Settings } from 'lucide-react'

export function Topbar() {
  const [balance, setBalance] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchBalance() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('mock_balance')
          .eq('id', user.id)
          .single()
        
        if (data && !error) {
          setBalance(data.mock_balance)
        }
      }
    }
    fetchBalance()
  }, [supabase])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value)
  }

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6">
      <div className="flex-1 flex items-center gap-4">
        <div className="relative w-full max-w-[130px] xxs:max-w-[160px] xs:max-w-[200px] sm:max-w-xs md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 bg-background rounded-md pl-9 pr-3 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-primary border border-input transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-3 sm:gap-6 ml-2">
        <div className="flex flex-col items-end whitespace-nowrap">
          <span className="text-[9px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Balance</span>
          <span className="text-sm sm:text-lg font-bold text-foreground">
            {balance !== null ? formatCurrency(balance) : '₹---'}
          </span>
        </div>
        
        <button
          onClick={() => window.dispatchEvent(new Event('open-settings'))}
          className="md:hidden p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <button className="relative p-1.5 text-muted-foreground hover:text-foreground transition-colors shrink-0">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary ring-1.5 ring-card" />
        </button>
      </div>
    </header>
  )
}

