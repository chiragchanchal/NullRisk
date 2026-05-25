'use client'

import useSWR from 'swr'
import { TrendingUp, TrendingDown, RefreshCw, BarChart3, Award, HelpCircle } from 'lucide-react'
import { motion } from 'framer-motion'

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

  const totalPnLPct = summary?.totalPnLPct || 0
  const totalPnL = summary?.totalPnL || 0
  const isPositive = totalPnLPct >= 0

  // Standardize percent display between -10% and +10% for visual mapping
  const displayPct = Math.max(-10, Math.min(10, totalPnLPct))
  const percentagePosition = ((displayPct + 10) / 20) * 100

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

      {/* Visual Profit & Loss Performance Meter */}
      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm p-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              All-Time Performance Meter
            </h3>
            <p className="text-xs text-muted-foreground">
              Real-time visualization of negative losses versus positive profits
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`text-lg font-mono font-black px-3 py-1 rounded-lg border ${
              isPositive 
                ? 'bg-gain/10 border-gain/20 text-gain' 
                : 'bg-loss/10 border-loss/20 text-loss'
            }`}>
              {isPositive ? '+' : ''}{formatCurrency(totalPnL)} ({totalPnLPct >= 0 ? '+' : ''}{totalPnLPct.toFixed(2)}%)
            </div>
          </div>
        </div>

        {/* Center-aligned profit/loss bar */}
        <div className="relative py-8 px-4 bg-muted/20 border border-border/50 rounded-xl">
          {/* Legend and scale markers */}
          <div className="absolute top-2 left-4 right-4 flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <span className="text-loss">Loss Zone (-10%)</span>
            <span>Breakeven (0%)</span>
            <span className="text-gain flex items-center gap-1">
              <Award className="h-3 w-3 text-yellow-400 animate-pulse" />
              Milestone Bonus (+10%)
            </span>
          </div>

          {/* The Slider Track */}
          <div className="relative h-4 w-full rounded-full bg-gradient-to-r from-loss/30 via-background to-gain/30 border border-border/60 overflow-hidden shadow-inner">
            {/* Center tick line */}
            <div className="absolute left-1/2 top-0 h-full w-[2px] bg-border/80 z-10" />
            
            {/* Left Fill for Losses */}
            {!isPositive && (
              <motion.div 
                className="absolute right-1/2 top-0 h-full bg-gradient-to-l from-loss/60 to-loss/10 rounded-l-full"
                initial={{ width: 0 }}
                animate={{ width: `${(Math.abs(displayPct) / 20) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            )}

            {/* Right Fill for Profits */}
            {isPositive && (
              <motion.div 
                className="absolute left-1/2 top-0 h-full bg-gradient-to-r from-gain/60 to-gain/10 rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: `${(displayPct / 20) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            )}
          </div>

          {/* Glowing dynamic pointer slider */}
          <motion.div
            className="absolute top-[28px] -translate-x-1/2 flex flex-col items-center z-20 cursor-pointer"
            initial={{ left: '50%' }}
            animate={{ left: `${percentagePosition}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
          >
            {/* Pointer Dot */}
            <div className={`h-6 w-6 rounded-full border-2 bg-background flex items-center justify-center shadow-lg transition-all ${
              isPositive 
                ? 'border-gain shadow-gain/20' 
                : 'border-loss shadow-loss/20'
            }`}>
              <div className={`h-2 .w-2 rounded-full ${isPositive ? 'bg-gain animate-pulse' : 'bg-loss'}`} />
            </div>
            
            {/* Little stem */}
            <div className={`w-[2px] h-2 ${isPositive ? 'bg-gain/50' : 'bg-loss/50'}`} />

            {/* Float value badge */}
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border whitespace-nowrap shadow-md ${
              isPositive 
                ? 'bg-gain/15 border-gain/30 text-gain' 
                : 'bg-loss/15 border-loss/30 text-loss'
            }`}>
              {isPositive ? '+' : ''}{totalPnLPct.toFixed(2)}%
            </div>
          </motion.div>

          {/* Scale Labels below the bar */}
          <div className="mt-5 flex justify-between text-[11px] font-mono text-muted-foreground px-1">
            <span>-10.00%</span>
            <span>-5.00%</span>
            <span className="font-bold text-foreground/80">0.00%</span>
            <span>+5.00%</span>
            <span>+10.00%</span>
          </div>
        </div>

        {/* Milestone info banner */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-muted/40 p-3 rounded-lg border border-border/40">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HelpCircle className="h-4 w-4 text-primary shrink-0" />
            <span>Open spot, margin, and options trades do not deduct cash permanently. P&L reflects current price movements.</span>
          </div>
          {totalPnLPct >= 10 ? (
            <span className="text-gain font-semibold animate-bounce shrink-0">🎉 Milestone Unlocked! ₹10L bonus is yours.</span>
          ) : (
            <span className="text-muted-foreground shrink-0">
              Need <span className="text-primary font-bold">{(10 - totalPnLPct).toFixed(2)}%</span> more to reach milestone bonus.
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
