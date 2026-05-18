'use client'

import useSWR from 'swr'
import { TrendingUp, RefreshCw } from 'lucide-react'

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function DashboardPage() {
  // Poll every 15 seconds
  const { data: summary, error, isLoading, isValidating } = useSWR('/api/portfolio/summary', fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value)
  }

  if (error) {
    return (
      <div className="p-6 text-loss bg-loss/10 rounded-xl">
        Failed to load portfolio summary.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground flex items-center gap-2">
            Welcome back to NullRisk. Live market data connected.
            {isValidating && <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />}
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Portfolio Value */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Portfolio Value</h3>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary?.totalPortfolioValue || 0)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            <span className={`font-medium ${summary?.totalPnLPct >= 0 ? 'text-gain' : 'text-loss'}`}>
              {summary?.totalPnLPct >= 0 ? '+' : ''}{summary?.totalPnLPct?.toFixed(2)}%
            </span> All Time
          </p>
          <div className="absolute right-[-10%] bottom-[-10%] opacity-5 pointer-events-none">
            <TrendingUp className="h-32 w-32" />
          </div>
        </div>

        {/* Available Cash */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Available Cash</h3>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(summary?.cashBalance || 0)}</div>
          <p className="text-xs text-muted-foreground mt-1">
             Ready to deploy
          </p>
        </div>

        {/* Unrealised P&L */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Unrealised P&L</h3>
          </div>
          <div className={`text-2xl font-bold ${summary?.totalUnrealisedPnL >= 0 ? 'text-gain' : 'text-loss'}`}>
            {summary?.totalUnrealisedPnL >= 0 ? '+' : ''}{formatCurrency(summary?.totalUnrealisedPnL || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
             From open positions
          </p>
        </div>

        {/* Realised P&L */}
        <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Realised P&L</h3>
          </div>
          <div className={`text-2xl font-bold ${summary?.realisedPnL >= 0 ? 'text-gain' : 'text-loss'}`}>
            {summary?.realisedPnL >= 0 ? '+' : ''}{formatCurrency(summary?.realisedPnL || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
             Locked in profits
          </p>
        </div>
      </div>
    </div>
  )
}
