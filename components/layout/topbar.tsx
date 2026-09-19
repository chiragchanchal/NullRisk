'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { Bell, Search, Settings, Wallet, Activity } from 'lucide-react'

export function Topbar() {
  const [balance, setBalance] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchBalance() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
    <header className="h-16 border-b border-white/[0.08] bg-zinc-950/70 backdrop-blur-xl flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      {/* Search / Command Bar */}
      <div className="flex-1 flex items-center gap-4">
        <div className="relative w-full max-w-[160px] xs:max-w-[220px] sm:max-w-xs md:w-96 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
          <input
            type="text"
            placeholder="Search markets, symbols... (⌘K)"
            className="w-full h-9 bg-zinc-900/60 hover:bg-zinc-900/90 focus:bg-zinc-900 rounded-lg pl-9 pr-8 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none border border-white/[0.08] focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20 transition-all"
          />
          <div className="hidden sm:flex absolute right-2.5 top-1/2 -translate-y-1/2 items-center pointer-events-none">
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono text-zinc-500 bg-zinc-800/80 rounded border border-white/[0.08]">
              /
            </kbd>
          </div>
        </div>

        {/* Live Market Pulse Pill */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/60 border border-white/[0.06] text-[11px] font-mono text-zinc-400">
          <Activity className="h-3 w-3 text-emerald-400" />
          <span>NSE / NASDAQ FEED</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>
      </div>

      {/* Balance & Actions */}
      <div className="flex items-center gap-2 sm:gap-4 ml-2">
        {/* Balance Card Chip */}
        <motion.div
          whileHover={{ y: -1, scale: 1.01 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-white/[0.08] shadow-[0_2px_10px_-2px_rgba(0,0,0,0.5)] cursor-default"
        >
          <div className="h-7 w-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Wallet className="h-3.5 w-3.5" />
          </div>
          <div className="flex flex-col items-end whitespace-nowrap">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest font-semibold">
              Available Cash
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-zinc-100 tabular-nums">
              {balance !== null ? formatCurrency(balance) : '₹---'}
            </span>
          </div>
        </motion.div>

        {/* Mobile Settings Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
          onClick={() => window.dispatchEvent(new Event('open-settings'))}
          className="md:hidden p-2 rounded-lg bg-zinc-900/60 border border-white/[0.06] text-zinc-400 hover:text-zinc-100 transition-colors shrink-0 cursor-pointer"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </motion.button>

        {/* Notification Bell */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 20 }}
          className="relative p-2 rounded-lg bg-zinc-900/60 border border-white/[0.06] text-zinc-400 hover:text-zinc-100 transition-colors shrink-0 group cursor-pointer"
          title="Notifications"
        >
          <Bell className="h-4 w-4 group-hover:text-zinc-200 transition-colors" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
        </motion.button>
      </div>
    </header>
  )
}
