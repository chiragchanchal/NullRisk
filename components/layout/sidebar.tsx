'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Briefcase, TrendingUp, Star, LogOut, Settings, Trophy, Zap, BarChart2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { name: 'Market', href: '/market', icon: TrendingUp },
  { name: 'Options', href: '/options', icon: BarChart2 },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { name: 'Watchlist', href: '/watchlist', icon: Star },
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
    <aside className="w-64 border-r border-border bg-card flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">NullRisk</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
      <div className="p-4 border-t border-border space-y-2">
        <button
          className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => {}} // settings modal or route
        >
          <Settings className="h-5 w-5" />
          Settings
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full text-left rounded-md transition-colors text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-5 w-5" />
          Log Out
        </button>
      </div>
    </aside>
  )
}
