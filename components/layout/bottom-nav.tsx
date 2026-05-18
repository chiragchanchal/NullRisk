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
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around px-2 z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        const Icon = item.icon

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className={`h-5 w-5 ${isActive ? 'fill-primary/20' : ''}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
