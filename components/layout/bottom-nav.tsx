'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, LineChart, Briefcase, Trophy, BarChart2 } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/market', label: 'Market', icon: LineChart },
  { href: '/options', label: 'Options', icon: BarChart2 },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-zinc-950/85 backdrop-blur-xl border-t border-white/[0.08] flex items-center justify-around px-2 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center justify-center w-full h-full py-1 transition-all ${
              isActive ? 'text-emerald-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className={`p-1 rounded-lg transition-all ${isActive ? 'bg-emerald-500/10' : ''}`}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-mono tracking-tight">{item.label}</span>
            {isActive && (
              <span className="absolute bottom-1 w-6 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
