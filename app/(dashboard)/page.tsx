'use client'

import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Award,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Layers,
  ArrowRight,
  Briefcase,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { AssetLogo } from '@/components/ui/asset-logo'
import { RiskGlobeCanvas } from '@/components/3d/risk-globe-canvas'

// SWR fetcher
const fetcher = (url: string) => fetch(url).then((res) => res.json())

const QUICK_ASSETS = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: '₹72,40,000', change: '+3.8%' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: '₹2,95,000', change: '+2.1%' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Ind.', type: 'stock', price: '₹2,980.50', change: '+0.9%' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock', price: '₹98,400', change: '+4.2%' },
  { symbol: 'USDINR', name: 'USD / INR', type: 'forex', price: '₹83.45', change: '+0.05%' },
]

interface DashboardHolding {
  id: string
  symbol: string
  asset_type: string
  quantity: number
  avg_buy_price: number
  currentPrice?: number
  unrealisedPnL?: number
  unrealisedPnLPct?: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 360,
      damping: 26,
    },
  },
}

export default function DashboardPage() {
  const router = useRouter()
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
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-rose-400 font-mono text-xs">
        ⚠️ Failed to load portfolio summary. Please verify your connection or reload.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-zinc-500 gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
        <span className="text-xs font-mono tracking-wider uppercase">Loading Real-Time Portfolio...</span>
      </div>
    )
  }

  const totalPnLPct = summary?.totalPnLPct || 0
  const totalPnL = summary?.totalPnL || 0
  const isPositive = totalPnLPct >= 0

  // Standardize percent display between -10% and +10% for visual mapping
  const displayPct = Math.max(-10, Math.min(10, totalPnLPct))
  const percentagePosition = ((displayPct + 10) / 20) * 100

  // Milestone bonus calculation
  const milestoneTarget = Math.ceil((totalPnLPct + 0.01) / 10) * 10
  const pctToMilestone = Math.max(0, (milestoneTarget || 10) - totalPnLPct)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">Portfolio Terminal</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-white/[0.06]">
              REAL-TIME
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2 font-mono">
            <span>Aggregated multi-asset paper trading engine</span>
            {isValidating && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Syncing
              </span>
            )}
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex items-center gap-2">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          >
            <Link
              href="/market"
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <span>Explore Markets</span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
          >
            <Link
              href="/options"
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Options Chain</span>
            </Link>
          </motion.div>
        </div>
      </div>

      {/* 4-Card Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Portfolio Value */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { type: 'spring', stiffness: 450, damping: 25 } }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/70 to-zinc-950/90 border border-white/[0.08] p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)] group hover:border-zinc-700/80 transition-colors"
        >
          <div className="flex items-center justify-between pb-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              Total Net Worth
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                isPositive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? '+' : ''}
              {summary?.totalPnLPct?.toFixed(2)}%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 tabular-nums">
            {formatCurrency(summary?.totalPortfolioValue || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>Base Capital</span>
            <span className="text-zinc-300 tabular-nums">{formatCurrency(summary?.initialBalance || 500000)}</span>
          </div>
          {/* Subtle Background Accent */}
          <div
            className={`absolute -right-10 -bottom-10 h-32 w-32 rounded-full blur-3xl pointer-events-none opacity-15 ${
              isPositive ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        </motion.div>

        {/* Card 2: Available Cash */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { type: 'spring', stiffness: 450, damping: 25 } }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/70 to-zinc-950/90 border border-white/[0.08] p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)] group hover:border-zinc-700/80 transition-colors"
        >
          <div className="flex items-center justify-between pb-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              Deployable Cash
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800/80 text-zinc-300 border border-white/[0.06]">
              READY
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 tabular-nums">
            {formatCurrency(summary?.cashBalance || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>Collateral Status</span>
            <span className="text-emerald-400 font-medium">Unencumbered</span>
          </div>
        </motion.div>

        {/* Card 3: Unrealised P&L (Clickable to open trade) */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { type: 'spring' as const, stiffness: 450, damping: 25 } }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            if (summary?.holdings && summary.holdings.length === 1) {
              const h = summary.holdings[0]
              const cleanSym = h.symbol.replace(/^(stock|crypto|forex)\//i, '').replace(/^(stock|crypto|forex)\//i, '').trim()
              router.push(`/market/${cleanSym}?type=${h.asset_type}`)
            } else if (summary?.holdings && summary.holdings.length > 1) {
              router.push('/portfolio')
            } else {
              router.push('/market')
            }
          }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/70 to-zinc-950/90 border border-white/[0.08] p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)] group hover:border-emerald-500/50 hover:shadow-emerald-500/5 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between pb-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              Floating P&L
            </span>
            <span className="text-[10px] font-mono text-emerald-400 group-hover:underline flex items-center gap-1 font-semibold">
              OPEN TRADES <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
              (summary?.totalUnrealisedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {(summary?.totalUnrealisedPnL || 0) >= 0 ? '+' : ''}
            {formatCurrency(summary?.totalUnrealisedPnL || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>Active Holdings</span>
            <span className="text-zinc-300 tabular-nums group-hover:text-emerald-400 transition-colors">
              {summary?.holdings?.length || 0} Assets • Click to Trade →
            </span>
          </div>
        </motion.div>

        {/* Card 4: Realised P&L */}
        <motion.div
          variants={cardVariants}
          whileHover={{ y: -3, transition: { type: 'spring' as const, stiffness: 450, damping: 25 } }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-zinc-900/70 to-zinc-950/90 border border-white/[0.08] p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)] group hover:border-zinc-700/80 transition-colors"
        >
          <div className="flex items-center justify-between pb-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
              Realised Gain/Loss
            </span>
            <span className="text-[10px] font-mono text-zinc-500">LOCKED</span>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
              (summary?.realisedPnL || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {(summary?.realisedPnL || 0) >= 0 ? '+' : ''}
            {formatCurrency(summary?.realisedPnL || 0)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 font-mono">
            <span>Settled Ledger</span>
            <span className="text-zinc-300 font-medium">Secured</span>
          </div>
        </motion.div>
      </div>

      {/* 3D Risk Hologram & Terminal Calibrated Performance Dual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Terminal Calibrated Performance Meter */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-2 rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/[0.08] p-6 shadow-[0_4px_30px_-6px_rgba(0,0,0,0.7)] relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h2 className="text-base font-bold text-zinc-100 tracking-tight font-sans">
                    Performance Calibration & Risk Gauge
                  </h2>
                </div>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Live dual-axis return meter mapped between -10.00% drawdown and +10.00% milestone unlock
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono text-xs font-bold tabular-nums ${
                    isPositive
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  <span>{isPositive ? 'Net Surplus:' : 'Net Deficit:'}</span>
                  <span>
                    {isPositive ? '+' : ''}
                    {formatCurrency(totalPnL)}
                  </span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-black/40">
                    {isPositive ? '+' : ''}
                    {totalPnLPct.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Gauge Container */}
            <div className="relative py-7 px-4 rounded-xl bg-zinc-950/60 border border-white/[0.05]">
              {/* Top Scale Legend */}
              <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-zinc-500 pb-3">
                <span className="text-rose-400 flex items-center gap-1 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Drawdown Limit (-10%)
                </span>
                <span className="text-zinc-400 font-semibold">Breakeven (0.00%)</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <Award className="h-3 w-3 text-amber-400 animate-pulse" /> Milestone Bonus (+10%)
                </span>
              </div>

              {/* Precision Dual-Sided Track */}
              <div className="relative h-3 w-full rounded-full bg-zinc-900 border border-white/[0.08] overflow-hidden shadow-inner">
                {/* Center tick */}
                <div className="absolute left-1/2 top-0 h-full w-[2px] bg-white/20 z-10 -translate-x-1/2" />

                {/* Left Loss Bar */}
                {!isPositive && (
                  <motion.div
                    className="absolute right-1/2 top-0 h-full bg-gradient-to-l from-rose-500 to-rose-600/40 rounded-l-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(Math.abs(displayPct) / 20) * 100}%` }}
                    transition={{ type: 'spring' as const, stiffness: 180, damping: 24 }}
                  />
                )}

                {/* Right Gain Bar */}
                {isPositive && (
                  <motion.div
                    className="absolute left-1/2 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400/80 rounded-r-full shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${(displayPct / 20) * 100}%` }}
                    transition={{ type: 'spring' as const, stiffness: 180, damping: 24 }}
                  />
                )}
              </div>

              {/* Dynamic Needle & Badge Indicator */}
              <motion.div
                className="absolute top-[32px] -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
                initial={{ left: '50%' }}
                animate={{ left: `${percentagePosition}%` }}
                transition={{ type: 'spring' as const, stiffness: 180, damping: 20, mass: 0.8 }}
              >
                <div
                  className={`h-5 w-5 rounded-full border-2 bg-zinc-950 flex items-center justify-center shadow-lg ${
                    isPositive ? 'border-emerald-400 shadow-emerald-500/20' : 'border-rose-400 shadow-rose-500/20'
                  }`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      isPositive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                    }`}
                  />
                </div>
                <div className={`w-[1px] h-2 ${isPositive ? 'bg-emerald-400/70' : 'bg-rose-400/70'}`} />
                <div
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border whitespace-nowrap shadow-md ${
                    isPositive
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {isPositive ? '+' : ''}
                  {totalPnLPct.toFixed(2)}%
                </div>
              </motion.div>

              {/* Scale Labels */}
              <div className="mt-6 flex justify-between text-[10px] font-mono text-zinc-500 px-1">
                <span>-10.00%</span>
                <span>-5.00%</span>
                <span className="font-bold text-zinc-400">0.00%</span>
                <span>+5.00%</span>
                <span>+10.00%</span>
              </div>
            </div>
          </div>

          {/* Milestone & Security Footer Strip */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-zinc-950/60 p-3.5 rounded-xl border border-white/[0.06]">
            <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Paper Trading Protocol: Positions do not risk real capital. Simulated ledger active.</span>
            </div>
            {totalPnLPct >= 10 ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono font-semibold text-xs shrink-0">
                <Award className="h-4 w-4 text-amber-400 animate-bounce" />
                <span>Milestone Unlocked! ₹10,00,000 Bonus Credited.</span>
              </div>
            ) : (
              <div className="text-zinc-400 font-mono text-[11px] shrink-0">
                Targeting Milestone: Need{' '}
                <span className="text-emerald-400 font-bold tabular-nums">+{pctToMilestone.toFixed(2)}%</span> return for ₹10L bonus.
              </div>
            )}
          </div>
        </motion.div>

        {/* Right 1 Col: 3D Viz-Pro Risk & Liquidity Hologram */}
        <motion.div
          variants={cardVariants}
          className="lg:col-span-1 rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/[0.08] p-4 shadow-[0_4px_30px_-6px_rgba(0,0,0,0.7)] relative overflow-hidden flex flex-col items-center justify-between min-h-[340px]"
        >
          <RiskGlobeCanvas
            pnlPct={totalPnLPct}
            totalValue={summary?.totalPortfolioValue || 500000}
          />
        </motion.div>
      </div>

      {/* Active Holdings & Open Positions Ledger */}
      {summary?.holdings && summary.holdings.length > 0 && (
        <motion.div
          variants={cardVariants}
          className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)]"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Briefcase className="h-3.5 w-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-zinc-100">
                  Active Spot Holdings ({summary.holdings.length})
                </h2>
                <p className="text-[11px] font-mono text-zinc-500">
                  Click any holding to open instant trade execution or position liquidation
                </p>
              </div>
            </div>
            <Link
              href="/portfolio"
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
            >
              <span>View Portfolio Ledger</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[550px]">
              <thead>
                <tr className="border-b border-white/[0.04] text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  <th className="py-2.5 px-3">Asset</th>
                  <th className="py-2.5 px-3 text-right">Units Held</th>
                  <th className="py-2.5 px-3 text-right">Avg Basis</th>
                  <th className="py-2.5 px-3 text-right">Current Mark</th>
                  <th className="py-2.5 px-3 text-right">Floating P&L</th>
                  <th className="py-2.5 px-3 text-right">Instant Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {summary.holdings.map((holding: DashboardHolding) => {
                  const cleanSym = holding.symbol.replace(/^(stock|crypto|forex)\//i, '').replace(/^(stock|crypto|forex)\//i, '').trim()
                  const isPos = (holding.unrealisedPnL ?? 0) >= 0
                  return (
                    <tr
                      key={holding.id}
                      onClick={() => router.push(`/market/${cleanSym}?type=${holding.asset_type}`)}
                      className="hover:bg-zinc-900/50 transition-colors font-mono cursor-pointer group"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <AssetLogo symbol={cleanSym} type={holding.asset_type} size={28} />
                          <div>
                            <span className="font-bold text-xs text-zinc-100 group-hover:text-emerald-400 transition-colors">
                              {cleanSym}
                            </span>
                            <span className="block text-[9px] text-zinc-500 uppercase">{holding.asset_type}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-zinc-300 tabular-nums font-semibold">
                        {holding.quantity}
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-zinc-400 tabular-nums">
                        ₹{Number(holding.avg_buy_price || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-xs text-zinc-200 tabular-nums">
                        ₹{Number(holding.currentPrice || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right text-xs tabular-nums">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          isPos
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {isPos ? '+' : ''}₹{Number(holding.unrealisedPnL || 0).toFixed(2)} ({isPos ? '+' : ''}{Number(holding.unrealisedPnLPct || 0).toFixed(2)}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-[11px] font-bold transition-all shadow-sm">
                          <span>Trade / Sell</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Quick Trade Strip (Top Assets) */}
      <motion.div
        variants={cardVariants}
        className="rounded-2xl bg-zinc-950/70 border border-white/[0.08] p-5"
      >
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-zinc-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-300">
              Market Shortcuts
            </h3>
          </div>
          <Link
            href="/market"
            className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
          >
            <span>View All 150 Assets</span>
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_ASSETS.map((asset) => (
            <motion.div
              key={asset.symbol}
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            >
              <Link
                href={`/market/${asset.symbol}?type=${asset.type}`}
                className="p-3 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-white/[0.06] hover:border-zinc-700 transition-colors flex flex-col justify-between group h-full"
              >
                <div className="flex items-center justify-between pb-2">
                  <span className="text-xs font-mono font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                    {asset.symbol}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    {asset.change}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-mono text-zinc-400 tabular-nums">{asset.price}</span>
                  <span className="block text-[9px] font-mono text-zinc-600 truncate">{asset.name}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
