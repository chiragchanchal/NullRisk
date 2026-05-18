'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Search } from 'lucide-react'

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
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
      <div className="flex-1 flex items-center gap-4">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbols..."
            className="w-full h-10 bg-background rounded-md pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary border border-input transition-all"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Purchasing Power</span>
          <span className="text-lg font-bold text-foreground">
            {balance !== null ? formatCurrency(balance) : '₹---'}
          </span>
        </div>
        
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
        </button>
      </div>
    </header>
  )
}
