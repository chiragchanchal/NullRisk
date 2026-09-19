'use client'

import useSWR from 'swr'
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Briefcase,
  Zap,
  X,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Layers,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  Tooltip,
} from 'recharts'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import { AssetLogo } from '@/components/ui/asset-logo'

interface MarginPositionItem {
  id: string
  symbol: string
  asset_type: string
  quantity: number
  collateral_amount: number
  margin_amount: number
  leverage_ratio: number
  entry_price: number
  currentPrice?: number
  unrealisedPnL: number
  unrealisedPnLPct?: number
  marginRatio: number
  liquidationPrice: number
}

interface PortfolioHolding {
  id: string
  symbol: string
  asset_type: string
  quantity: number
  avg_buy_price: number
  currentPrice: number
  currentValue?: number
  value: number
  unrealisedPnL: number
  unrealisedPnLPct: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
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

export default function PortfolioPage() {
  const router = useRouter()
  const [closingPositionId, setClosingPositionId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'holdings' | 'margin'>('holdings')

  const { data: summary, error, isLoading } = useSWR('/api/portfolio/summary', fetcher, {
    refreshInterval: 15000,
  })
  const { data: marginData, mutate: mutateMargin } = useSWR('/api/margin/positions', fetcher, {
    refreshInterval: 15000,
  })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(value)

  const handleCloseMarginPosition = async (positionId: string) => {
    setClosingPositionId(positionId)
    try {
      const res = await fetch('/api/margin/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId }),
      })
      if (res.ok) {
        mutateMargin()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to close position.')
      }
    } catch {
      alert('Network error while closing position.')
    } finally {
      setClosingPositionId(null)
    }
  }

  const initialBalance = summary?.initialBalance || 500000
  const totalPortfolioValue = summary?.totalPortfolioValue || 500000

  const chartData = useMemo(() => {
    const data = []
    const start = initialBalance
    const end = totalPortfolioValue
    const steps = 12
    const diff = end - start
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps
      const noise = i > 0 && i < steps ? Math.sin(i * 997) * 0.5 * (Math.abs(diff) * 0.15) : 0
      data.push({
        time: `T+${i}`,
        value: Math.round(start + diff * progress + noise),
      })
    }
    data[data.length - 1].value = end
    return data
  }, [initialBalance, totalPortfolioValue])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-zinc-500 gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
        <span className="text-xs font-mono tracking-wider uppercase">Aggregating Portfolio Assets...</span>
      </div>
    )
  }

  if (error || !summary || summary.error) {
    return (
      <div className="p-6 text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-2xl max-w-xl mx-auto mt-8 font-mono text-xs">
        <h3 className="font-bold text-sm mb-1 text-rose-300">Portfolio Aggregation Offline</h3>
        <p className="opacity-90">{error?.message || summary?.error || 'Invalid portfolio summary data.'}</p>
      </div>
    )
  }

  const isPositiveTotal = summary.totalPnLPct >= 0
  const returnProgress = Math.min(100, Math.max(0, summary.totalPnLPct * 10))

  // Margin data
  const exposurePct = marginData?.exposurePct || 0
  const openPositions = marginData?.positions || []
  const exposureColor = exposurePct > 150 ? '#f43f5e' : exposurePct > 80 ? '#eab308' : '#10b981'

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
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">Asset Ledger & Exposure</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-white/[0.06]">
              MULTI-ASSET
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Track spot holdings, leveraged margin positions, and liquidation risk thresholds
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-zinc-900/80 border border-white/[0.08] rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('holdings')}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'holdings'
                ? 'text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {activeTab === 'holdings' && (
              <motion.div
                layoutId="portfolioActiveTab"
                className="absolute inset-0 rounded-lg bg-zinc-800 border border-white/[0.08] shadow-sm z-0"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5" />
              <span>Spot Holdings ({summary.holdings?.length || 0})</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('margin')}
            className={`relative px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'margin'
                ? 'text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {activeTab === 'margin' && (
              <motion.div
                layoutId="portfolioActiveTab"
                className="absolute inset-0 rounded-lg bg-zinc-800 border border-white/[0.08] shadow-sm z-0"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Margin Positions ({openPositions.length})</span>
            </span>
          </button>
        </div>
      </div>

      {/* Row 1: Equity Curve Hero & Health Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area Chart Card */}
        <div className="col-span-1 lg:col-span-2 rounded-2xl bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-white/[0.08] p-6 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)] flex flex-col justify-between">
          <div className="flex items-start justify-between pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                Portfolio Net Asset Value
              </span>
              <div className="text-3xl font-bold font-mono text-zinc-100 tabular-nums mt-1">
                {formatCurrency(summary.totalPortfolioValue)}
              </div>
              <div
                className={`flex items-center text-xs font-mono font-bold mt-1 tabular-nums ${
                  isPositiveTotal ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositiveTotal ? (
                  <TrendingUp className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 mr-1" />
                )}
                {isPositiveTotal ? '+' : ''}
                {formatCurrency(summary.totalPnL)} ({summary.totalPnLPct.toFixed(2)}% Return)
              </div>
            </div>

            <div className="flex items-center gap-1 bg-zinc-900/80 border border-white/[0.06] p-1 rounded-lg text-[10px] font-mono text-zinc-400">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold">ALL</span>
              <span className="px-2 py-0.5">1M</span>
              <span className="px-2 py-0.5">1W</span>
              <span className="px-2 py-0.5">1D</span>
            </div>
          </div>

          <div className="h-56 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isPositiveTotal ? '#10b981' : '#f43f5e'}
                      stopOpacity={0.25}
                    />
                    <stop
                      offset="95%"
                      stopColor={isPositiveTotal ? '#10b981' : '#f43f5e'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#101114',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                  }}
                  itemStyle={{
                    color: isPositiveTotal ? '#10b981' : '#f43f5e',
                    fontWeight: 'bold',
                  }}
                  formatter={(val?: number | string | readonly (number | string)[]) => [
                    `₹${Number(val || 0).toLocaleString('en-IN')}`,
                    'Portfolio NAV',
                  ]}
                  labelStyle={{ display: 'none' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositiveTotal ? '#10b981' : '#f43f5e'}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorVal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column: Milestone & Margin Exposure stack */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Milestone Target Card */}
          <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                Milestone Bonus
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                ₹10,00,000
              </span>
            </div>
            <p className="text-xs text-zinc-400 mb-3 font-mono">
              Earn +10% total profit to credit ₹10L liquid mock bonus
            </p>

            <div className="relative h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden mb-2 border border-white/[0.06]">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${returnProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>0% Start</span>
              <span className="text-zinc-300 font-bold tabular-nums">{summary.totalPnLPct.toFixed(2)}%</span>
              <span className="text-emerald-400">+10% Goal</span>
            </div>
          </div>

          {/* Margin Exposure Health Card */}
          <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                  Leverage Exposure
                </span>
              </div>
              <span
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                style={{
                  color: exposureColor,
                  borderColor: `${exposureColor}40`,
                  backgroundColor: `${exposureColor}15`,
                }}
              >
                {exposurePct > 150 ? 'CRITICAL' : exposurePct > 80 ? 'MODERATE' : 'HEALTHY'}
              </span>
            </div>

            {openPositions.length === 0 ? (
              <p className="text-xs text-zinc-500 font-mono py-2">
                No active margin positions. Leverage exposure is 0.00%.
              </p>
            ) : (
              <>
                <div className="text-2xl font-black font-mono tabular-nums mt-1" style={{ color: exposureColor }}>
                  {exposurePct.toFixed(1)}%
                </div>
                <div className="text-[11px] text-zinc-500 font-mono mb-2">Debt-to-Collateral Ratio</div>

                <div className="relative h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/[0.06]">
                  <motion.div
                    className="absolute top-0 left-0 h-full rounded-full transition-all"
                    style={{ backgroundColor: exposureColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, exposurePct / 2)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>

                {exposurePct > 150 && (
                  <div className="mt-3 p-2.5 bg-rose-950/30 border border-rose-900/40 rounded-lg text-xs text-rose-300 font-mono flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    <span>High Risk: Collateral liquidation triggered at 80% loss.</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area Based on Active Tab */}
      {activeTab === 'holdings' ? (
        /* Spot Holdings Section */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2 font-sans">
              <Briefcase className="h-4 w-4 text-zinc-400" />
              Spot Portfolio Assets
            </h2>
            <span className="text-xs font-mono text-zinc-500">
              {summary.holdings?.length || 0} Assets Held
            </span>
          </div>

          {!summary.holdings || summary.holdings.length === 0 ? (
            <div className="border border-dashed border-white/[0.1] rounded-2xl p-12 text-center bg-zinc-950/40">
              <Layers className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-mono font-bold text-zinc-300 mb-1">No Spot Assets Found</h3>
              <p className="text-xs text-zinc-500 font-mono mb-4 max-w-sm mx-auto">
                Your portfolio currently holds only unallocated cash. Visit Market Explorer to place orders.
              </p>
              <button
                type="button"
                onClick={() => router.push('/market')}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs transition-all shadow-md"
              >
                Browse Markets
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {summary.holdings.map((holding: PortfolioHolding) => {
                const isPositive = holding.unrealisedPnLPct >= 0
                return (
                  <motion.div
                    key={holding.id}
                    variants={cardVariants}
                    whileHover={{ y: -3, transition: { type: 'spring', stiffness: 450, damping: 25 } }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => router.push(`/market/${holding.asset_type}/${holding.symbol}`)}
                    className="p-5 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900/90 border border-white/[0.08] hover:border-zinc-700 transition-colors cursor-pointer group shadow-[0_2px_12px_-2px_rgba(0,0,0,0.5)] flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <AssetLogo symbol={holding.symbol} type={holding.asset_type} size={40} />
                        <div>
                          <h3 className="font-mono font-bold text-base text-zinc-100 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            {holding.symbol}
                            <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                          </h3>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase">
                            {holding.asset_type}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`px-2 py-0.5 rounded text-xs font-mono font-bold tabular-nums border ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {holding.unrealisedPnLPct.toFixed(2)}%
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono border-t border-white/[0.05] pt-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Market Value</span>
                        <span className="font-bold text-zinc-200 tabular-nums">
                          {formatCurrency(holding.value)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Units Held</span>
                        <span className="text-zinc-300 tabular-nums">{holding.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Average Basis</span>
                        <span className="text-zinc-400 tabular-nums">
                          {formatCurrency(holding.avg_buy_price)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* Margin Positions Section */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2 font-sans">
              <Zap className="h-4 w-4 text-amber-400" />
              Active Margin Contracts
            </h2>
            <span className="text-xs font-mono text-zinc-500">
              {openPositions.length} Open Positions
            </span>
          </div>

          {openPositions.length === 0 ? (
            <div className="border border-dashed border-white/[0.1] rounded-2xl p-12 text-center bg-zinc-950/40">
              <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-mono font-bold text-zinc-300 mb-1">No Active Margin Exposure</h3>
              <p className="text-xs text-zinc-500 font-mono mb-4 max-w-sm mx-auto">
                No borrowed margin positions currently open. Open 2x-5x leveraged trades from any asset detail page.
              </p>
              <button
                type="button"
                onClick={() => router.push('/market')}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.08] font-mono font-bold text-xs transition-all"
              >
                Explore Margin Assets
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openPositions.map((pos: MarginPositionItem) => {
                const isProfit = pos.unrealisedPnL >= 0
                const marginRatio = pos.marginRatio || 0
                const liquidationPrice = pos.liquidationPrice || 0
                const leverage = pos.leverage_ratio || 2

                return (
                  <motion.div
                    key={pos.id}
                    layout
                    variants={cardVariants}
                    whileHover={{ y: -2, transition: { type: 'spring', stiffness: 450, damping: 25 } }}
                    className={`rounded-2xl p-5 relative border bg-zinc-950/80 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.5)] transition-all ${
                      marginRatio >= 70 ? 'border-rose-500/40' : 'border-white/[0.08]'
                    }`}
                  >
                    {/* Close Position Button */}
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                      onClick={() => handleCloseMarginPosition(pos.id)}
                      disabled={closingPositionId === pos.id}
                      className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-900/80 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-white/[0.06] transition-colors disabled:opacity-50 cursor-pointer"
                      title="Liquidate / Close Position"
                    >
                      {closingPositionId === pos.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-400" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </motion.button>

                    <div className="flex items-start justify-between mb-4 pr-8">
                      <div className="flex items-center gap-3">
                        <AssetLogo symbol={pos.symbol} type={pos.asset_type} size={40} />
                        <div>
                          <h3 className="font-mono font-bold text-base text-zinc-100 leading-tight">
                            {pos.symbol}
                          </h3>
                          <p className="text-[10px] font-mono text-zinc-500 uppercase">
                            {pos.asset_type} · {leverage}x Leverage
                          </p>
                        </div>
                      </div>
                      <div
                        className={`px-2 py-0.5 rounded text-xs font-mono font-bold tabular-nums border ${
                          isProfit
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {pos.unrealisedPnLPct?.toFixed(2)}%
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono border-t border-white/[0.05] pt-3">
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Entry Price</span>
                        <span className="text-zinc-300 tabular-nums">
                          {formatCurrency(pos.entry_price)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Mark Price</span>
                        <span className="text-zinc-200 font-semibold tabular-nums">
                          {formatCurrency(pos.currentPrice || pos.entry_price)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Floating P&L</span>
                        <span
                          className={`font-bold tabular-nums ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}
                          {formatCurrency(pos.unrealisedPnL)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Collateral Locked</span>
                        <span className="text-zinc-300 tabular-nums">
                          {formatCurrency(pos.collateral_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-rose-400 font-semibold">Liquidation Floor</span>
                        <span className="text-rose-400 font-bold tabular-nums">
                          {formatCurrency(liquidationPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Risk Calibration Bar */}
                    <div className="mt-4 pt-3 border-t border-white/[0.05]">
                      <div className="flex justify-between text-[10px] font-mono mb-1.5">
                        <span className="text-zinc-500 uppercase tracking-wider">Margin Health Risk</span>
                        <span
                          className={`font-bold tabular-nums ${
                            marginRatio >= 90
                              ? 'text-rose-400'
                              : marginRatio >= 70
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {marginRatio.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/[0.06]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, marginRatio)}%`,
                            backgroundColor:
                              marginRatio >= 90
                                ? '#f43f5e'
                                : marginRatio >= 70
                                ? '#f59e0b'
                                : '#10b981',
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}
