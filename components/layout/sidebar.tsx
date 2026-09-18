'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Star,
  LogOut,
  Settings,
  Trophy,
  BarChart2,
  Shield,
  Radio,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, shortcut: '⌘1' },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase, shortcut: '⌘2' },
  { name: 'Market', href: '/market', icon: TrendingUp, shortcut: '⌘3' },
  { name: 'Options', href: '/options', icon: BarChart2, shortcut: '⌘4' },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy, shortcut: '⌘5' },
  { name: 'Watchlist', href: '/watchlist', icon: Star, shortcut: '⌘6' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-64 border-r border-white/[0.08] bg-zinc-950/80 backdrop-blur-xl flex flex-col h-full select-none z-30">
      {/* Brand Header */}
      <div className="p-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]">
              <Shield className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-zinc-100 flex items-center gap-1.5 font-sans">
                NullRisk
              </span>
              <span className="text-[10px] font-mono font-medium text-zinc-500 tracking-wider uppercase">
                Institutional Paper
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold">
            <Radio className="h-2.5 w-2.5 animate-pulse" />
            <span>LIVE</span>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
          Platform
        </div>
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-zinc-800/80 text-zinc-100 ring-1 ring-white/10 shadow-[0_1px_10px_-2px_rgba(0,0,0,0.5)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-300'
                  }`}
                />
                <span className="tracking-wide">{item.name}</span>
              </div>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded transition-colors ${
                  isActive
                    ? 'text-zinc-400 bg-zinc-900/80 border border-white/[0.06]'
                    : 'text-zinc-600 group-hover:text-zinc-400'
                }`}
              >
                {item.shortcut}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Bottom Profile & Actions */}
      <div className="p-3 border-t border-white/[0.06] space-y-1 bg-zinc-950/40">
        <button
          type="button"
          className="flex items-center justify-between px-3 py-2 w-full rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 transition-colors group"
          onClick={() => window.dispatchEvent(new Event('open-settings'))}
        >
          <div className="flex items-center gap-3">
            <Settings className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300" />
            <span className="tracking-wide">Settings</span>
          </div>
          <span className="text-[9px] font-mono text-zinc-600 group-hover:text-zinc-400">⌘,</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-xs text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors group"
        >
          <LogOut className="h-4 w-4 text-zinc-600 group-hover:text-rose-400" />
          <span className="tracking-wide">Log Out</span>
        </button>
      </div>
    </aside>
  )
}
