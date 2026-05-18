'use client'

import useSWR from 'swr'
import { TrendingUp, TrendingDown, RefreshCw, Briefcase, Zap, X } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from 'recharts'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function PortfolioPage() {
  const router = useRouter()
  const [closingPositionId, setClosingPositionId] = useState<string | null>(null)

  const { data: summary, error, isLoading } = useSWR('/api/portfolio/summary', fetcher, { refreshInterval: 15000 })
  const { data: marginData, mutate: mutateMargin } = useSWR('/api/margin/positions', fetcher, { refreshInterval: 15000 })

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value)

  const handleCloseMarginPosition = async (positionId: string) => {
    setClosingPositionId(positionId)
    try {
      const res = await fetch('/api/margin/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId })
      })
      const data = await res.json()
      if (res.ok) {
        mutateMargin()
        alert(data.message)
      } else {
        alert(data.error)
      }
    } finally {
      setClosingPositionId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !summary || summary.error) {
    return (
      <div className="p-6 text-loss bg-loss/10 border border-loss/20 rounded-xl max-w-xl mx-auto mt-8">
        <h3 className="font-bold text-lg mb-1">Failed to load portfolio</h3>
        <p className="text-sm opacity-90">{error?.message || summary?.error || 'Invalid portfolio summary data.'}</p>
      </div>
    )
  }

  const generateChartData = () => {
    const data = []
    const start = summary.initialBalance
    const end = summary.totalPortfolioValue
    const steps = 10
    const diff = end - start
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps
      const noise = i > 0 && i < steps ? (Math.random() - 0.5) * (Math.abs(diff) * 0.2) : 0
      data.push({ time: `Day ${i}`, value: start + (diff * progress) + noise })
    }
    data[data.length - 1].value = end
    return data
  }

  const chartData = generateChartData()
  const isPositiveTotal = summary.totalPnLPct >= 0
  const returnProgress = Math.min(100, Math.max(0, summary.totalPnLPct * 10))

  // Margin data
  const exposurePct = marginData?.exposurePct || 0
  const openPositions = marginData?.positions || []
  const exposureColor = exposurePct > 150 ? '#FF4D4D' : exposurePct > 80 ? '#f59e0b' : '#00C896'

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Your Portfolio</h2>
        <p className="text-muted-foreground">Track your holdings, margins, and performance milestones.</p>
      </div>

      {/* Row 1: Chart, Milestone Meter, Margin Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="col-span-2 border border-border bg-card rounded-xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Total Value</h3>
            <div className="text-3xl font-bold font-mono mt-1">{formatCurrency(summary.totalPortfolioValue)}</div>
            <div className={`flex items-center text-sm font-medium mt-1 ${isPositiveTotal ? 'text-gain' : 'text-loss'}`}>
              {isPositiveTotal ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
              {isPositiveTotal ? '+' : ''}{formatCurrency(summary.totalPnL)} ({summary.totalPnLPct.toFixed(2)}%)
            </div>
          </div>
          <div className="h-64 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <YAxis domain={['auto', 'auto']} hide />
                <Tooltip
                  contentStyle={{ backgroundColor: 'oklch(0.15 0 0)', borderColor: 'oklch(1 0 0 / 10%)', borderRadius: '8px' }}
                  itemStyle={{ color: isPositiveTotal ? '#00C896' : '#FF4D4D', fontWeight: 'bold' }}
                  formatter={(val: any) => [`₹${Number(val).toFixed(2)}`, 'Value']}
                  labelStyle={{ display: 'none' }}
                />
                <Line type="monotone" dataKey="value"
                  stroke={isPositiveTotal ? '#00C896' : '#FF4D4D'} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column: Milestone + Margin meters stacked */}
        <div className="space-y-4">
          {/* Milestone Meter */}
          <div className="border border-border bg-card rounded-xl p-5 shadow-sm text-center">
            <h3 className="text-sm font-bold mb-1">Bonus Milestone</h3>
            <p className="text-xs text-muted-foreground mb-4">Reach +10% to unlock ₹10L bonus!</p>
            <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden mb-2">
              <motion.div
                className="absolute top-0 left-0 h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${returnProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mb-3">
              <span>0%</span><span>10%</span>
            </div>
            <div className="text-3xl font-black text-primary">{summary.totalPnLPct.toFixed(2)}%</div>
            <div className="text-xs text-muted-foreground uppercase tracking-widest">Current Return</div>
          </div>

          {/* Margin Exposure Meter */}
          <div className="border border-border bg-card rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-yellow-400" />
              <h3 className="text-sm font-bold">Margin Exposure</h3>
            </div>

            {openPositions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No open margin positions.</p>
            ) : (
              <>
                {/* Exposure arc-style bar */}
                <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="absolute top-0 left-0 h-full rounded-full transition-colors"
                    style={{ backgroundColor: exposureColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, exposurePct / 2)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Safe</span><span>High Risk</span>
                </div>
                <div className="text-2xl font-black mt-2" style={{ color: exposureColor }}>
                  {exposurePct.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Debt / Collateral ratio</div>

                {/* Warning */}
                {exposurePct > 150 && (
                  <div className="mt-3 p-2 bg-loss/10 rounded-lg text-xs text-loss font-medium">
                    ⚠️ High exposure — positions may be liquidated if losses exceed 80% of collateral.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Margin Positions */}
      <AnimatePresence>
        {openPositions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <h3 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" /> Open Margin Positions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openPositions.map((pos: any) => {
                const isProfit = pos.unrealisedPnL >= 0
                const dangerPct = pos.lossAsCollateralPct * 100

                return (
                  <motion.div
                    key={pos.id}
                    layout
                    className={`border rounded-xl p-5 relative ${
                      dangerPct > 60 ? 'border-loss/50 bg-loss/5' : 'border-yellow-500/30 bg-yellow-500/5'
                    }`}
                  >
                    {/* Close button */}
                    <button
                      onClick={() => handleCloseMarginPosition(pos.id)}
                      disabled={closingPositionId === pos.id}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-loss transition-colors disabled:opacity-50"
                    >
                      {closingPositionId === pos.id
                        ? <RefreshCw className="h-4 w-4 animate-spin" />
                        : <X className="h-4 w-4" />}
                    </button>

                    <div className="flex items-start justify-between mb-3 pr-6">
                      <div>
                        <h4 className="font-bold text-lg">{pos.symbol}</h4>
                        <p className="text-xs text-muted-foreground uppercase">{pos.asset_type} · 2x Leverage</p>
                      </div>
                      <div className={`px-2.5 py-1 rounded-md text-xs font-bold ${isProfit ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'}`}>
                        {isProfit ? '+' : ''}{pos.unrealisedPnLPct?.toFixed(2)}%
                      </div>
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entry Price</span>
                        <span className="font-mono">{formatCurrency(pos.entry_price)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Price</span>
                        <span className="font-mono">{formatCurrency(pos.currentPrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unrealised P&L</span>
                        <span className={`font-mono font-bold ${isProfit ? 'text-gain' : 'text-loss'}`}>
                          {isProfit ? '+' : ''}{formatCurrency(pos.unrealisedPnL)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Collateral</span>
                        <span className="font-mono">{formatCurrency(pos.collateral_amount)}</span>
                      </div>
                    </div>

                    {/* Danger bar */}
                    {dangerPct > 0 && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Collateral consumed</span>
                          <span className={dangerPct > 60 ? 'text-loss font-bold' : ''}>{dangerPct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, dangerPct)}%`,
                              backgroundColor: dangerPct > 60 ? '#FF4D4D' : '#f59e0b'
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regular Holdings */}
      <div>
        <h3 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
          <Briefcase className="h-5 w-5" /> Current Holdings
        </h3>
        {(!summary.holdings || summary.holdings.length === 0) ? (
          <div className="border border-border border-dashed rounded-xl p-12 text-center text-muted-foreground">
            You don't own any assets yet. Head over to the Market Explorer to start trading!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.holdings.map((holding: any) => {
              const isPositive = holding.unrealisedPnLPct >= 0
              return (
                <div
                  key={holding.id}
                  onClick={() => router.push(`/market/${holding.symbol}?type=${holding.asset_type}`)}
                  className="border border-border bg-card hover:bg-muted/30 transition-colors rounded-xl p-5 cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg">{holding.symbol}</h4>
                      <p className="text-xs text-muted-foreground uppercase">{holding.asset_type}</p>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md text-xs font-bold ${isPositive ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'}`}>
                      {isPositive ? '+' : ''}{holding.unrealisedPnLPct.toFixed(2)}%
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Value</span>
                      <span className="font-bold font-mono">{formatCurrency(holding.value)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Quantity</span>
                      <span className="font-mono">{holding.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Avg Price</span>
                      <span className="font-mono">{formatCurrency(holding.avg_buy_price)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
