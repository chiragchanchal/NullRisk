'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Play,
  RotateCcw,
  Sliders,
  Check,
  Copy,
  Code2,
  Zap,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { runBacktest, generateSyntheticOHLC, BacktestResult, OHLCBar } from '@/lib/engine/backtest'
import { AssetLogo } from '@/components/ui/asset-logo'

type StrategyType = 'ema_cross' | 'rsi_reversion' | 'bb_breakout' | 'macd_trend'

interface StrategyConfig {
  id: StrategyType
  name: string
  shortDesc: string
  description: string
  defaultFast: number
  defaultSlow: number
  fastLabel: string
  slowLabel: string
}

const STRATEGIES: StrategyConfig[] = [
  {
    id: 'ema_cross',
    name: 'Dual EMA Dynamic Trend Follower',
    shortDesc: 'Golden Cross / Death Cross moving average crossover',
    description: 'Enters long when Fast EMA crosses above Slow EMA. Exits when Fast EMA drops below Slow EMA. Highly effective in sustained trend regimes.',
    defaultFast: 9,
    defaultSlow: 21,
    fastLabel: 'Fast EMA Period',
    slowLabel: 'Slow EMA Period',
  },
  {
    id: 'rsi_reversion',
    name: 'RSI Statistical Mean Reversion',
    shortDesc: 'Oversold bounce (< 30) with overbought take-profit (> 70)',
    description: 'Identifies statistically stretched price action using 14-period Relative Strength Index. Buys on oversold capitulation and takes profit at exhaustion.',
    defaultFast: 14,
    defaultSlow: 70,
    fastLabel: 'RSI Period',
    slowLabel: 'Overbought Threshold',
  },
  {
    id: 'bb_breakout',
    name: 'Bollinger Bands Volatility Expansion',
    shortDesc: 'Lower envelope bounce with upper envelope target',
    description: 'Exploits 2.0-sigma volatility bands around a 20-period moving average. Capitalizes on mean-reverting elastic price swings.',
    defaultFast: 20,
    defaultSlow: 2,
    fastLabel: 'SMA Period',
    slowLabel: 'StdDev Multiplier',
  },
  {
    id: 'macd_trend',
    name: 'MACD Momentum Divergence Engine',
    shortDesc: '12/26 Exponential momentum divergence system',
    description: 'Captures sustained momentum shifts using MACD histogram and zero-line crossovers, filtering out sideways chop.',
    defaultFast: 12,
    defaultSlow: 26,
    fastLabel: 'Fast Period',
    slowLabel: 'Slow Period',
  },
]

const POPULAR_SYMBOLS = [
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Ind.', type: 'stock' },
  { symbol: 'USD/INR', name: 'US Dollar / INR', type: 'forex' },
]

export default function BacktestPage() {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>('ema_cross')
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC')
  const [initialCapital, setInitialCapital] = useState<number>(500000)
  const [fastPeriod, setFastPeriod] = useState<number>(9)
  const [slowPeriod, setSlowPeriod] = useState<number>(21)
  const barsCount = 90

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [backtestResult, setBacktestResult] = useState<BacktestResult>(() => {
    return runBacktest({
      strategyId: 'ema_cross',
      symbol: 'BTC',
      bars: generateSyntheticOHLC('BTC', 90),
      initialCapital: 500000,
      fastPeriod: 9,
      slowPeriod: 21,
      slippagePct: 0.0005,
    })
  })
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false)
  const [copiedTab, setCopiedTab] = useState<string | null>(null)
  const [codeTab, setCodeTab] = useState<'python' | 'tradingview' | 'curl'>('python')
  const [webhookTestStatus, setWebhookTestStatus] = useState<string | null>(null)
  const [isTestingWebhook, setIsTestingWebhook] = useState<boolean>(false)

  // Sync default parameters when strategy changes
  const currentStrategyConfig = useMemo(() => {
    return STRATEGIES.find((s) => s.id === selectedStrategy) || STRATEGIES[0]
  }, [selectedStrategy])

  const handleStrategyChange = (strat: StrategyType) => {
    setSelectedStrategy(strat)
    const cfg = STRATEGIES.find((s) => s.id === strat)
    if (cfg) {
      setFastPeriod(cfg.defaultFast)
      setSlowPeriod(cfg.defaultSlow)
    }
  }

  // Execute backtest
  const executeSimulation = async () => {
    setIsLoading(true)
    try {
      // 1. Try fetching real historical OHLC from /api/market/ohlc
      let bars: OHLCBar[] = []
      try {
        const res = await fetch(`/api/market/ohlc?symbol=${encodeURIComponent(selectedSymbol)}`)
        if (res.ok) {
          const raw = await res.json()
          if (Array.isArray(raw) && raw.length >= 15) {
            // Check if Twelve Data returned descending; if so, reverse for chronological order
            const isDescending = new Date(raw[0].time).getTime() > new Date(raw[raw.length - 1].time).getTime()
            bars = isDescending ? [...raw].reverse() : raw
          }
        }
      } catch (err) {
        console.warn('Market OHLC fetch fallback triggered:', err)
      }

      // 2. If API was rate limited or empty, generate high-fidelity synthetic brownian motion
      if (bars.length < 15) {
        bars = generateSyntheticOHLC(selectedSymbol, barsCount)
      }

      // 3. Run quantitative backtesting simulation
      const result = runBacktest({
        strategyId: selectedStrategy,
        symbol: selectedSymbol,
        bars,
        initialCapital,
        fastPeriod,
        slowPeriod,
        slippagePct: 0.0005,
      })

      setBacktestResult(result)
    } catch (err) {
      console.error('Simulation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string, tab: string) => {
    navigator.clipboard.writeText(text)
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  const testLiveWebhook = async () => {
    setIsTestingWebhook(true)
    setWebhookTestStatus(null)
    try {
      const res = await fetch('/api/trade/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': 'nullrisk_algo_v1_live',
        },
        body: JSON.stringify({
          action: 'BUY',
          symbol: selectedSymbol,
          asset_type: selectedSymbol.includes('BTC') || selectedSymbol.includes('ETH') ? 'crypto' : 'stock',
          quantity: 1,
          strategy: currentStrategyConfig.name,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setWebhookTestStatus(`Order routed! Status: ${data.status} | Order ID: ${data.order?.id || 'simulated'}`)
      } else {
        setWebhookTestStatus(`Failed: ${data.error || 'Webhook execution error'}`)
      }
    } catch (e: unknown) {
      const err = e as Error
      setWebhookTestStatus(`Connection error: ${err.message}`)
    } finally {
      setIsTestingWebhook(false)
    }
  }

  const pythonCode = `import requests
import json

WEBHOOK_URL = "http://localhost:3000/api/trade/webhook"
API_SECRET = "nullrisk_algo_v1_live"

def dispatch_signal(action: str, symbol: str, quantity: float, price: float = None):
    payload = {
        "action": action,         # "BUY" or "SELL"
        "symbol": symbol,         # e.g. "${selectedSymbol}"
        "asset_type": "${selectedSymbol.includes('BTC') || selectedSymbol.includes('ETH') ? 'crypto' : 'stock'}",
        "quantity": quantity,
        "price": price,
        "strategy": "${currentStrategyConfig.name}"
    }
    
    headers = {
        "Content-Type": "application/json",
        "x-webhook-secret": API_SECRET
    }
    
    response = requests.post(WEBHOOK_URL, json=payload, headers=headers, timeout=5)
    print(f"[{action}] {symbol} Status: {response.status_code}")
    print(response.json())

# Example Trigger
dispatch_signal("BUY", "${selectedSymbol}", 1.0)
`

  const pineScriptCode = `//@version=5
strategy("${currentStrategyConfig.name}", overlay=true)

// NullRisk Webhook Alert Template
// Configure Alert Webhook URL: http://localhost:3000/api/trade/webhook
// Alert Message JSON Payload:
/*
{
  "action": "{{strategy.order.action}}",
  "symbol": "${selectedSymbol}",
  "asset_type": "crypto",
  "quantity": {{strategy.order.contracts}},
  "price": {{close}},
  "strategy": "${selectedStrategy}"
}
*/
fast = ta.ema(close, ${fastPeriod})
slow = ta.ema(close, ${slowPeriod})

if ta.crossover(fast, slow)
    strategy.entry("Long", strategy.long, alert_message='{"action":"BUY","symbol":"${selectedSymbol}","asset_type":"crypto","quantity":1}')

if ta.crossunder(fast, slow)
    strategy.close("Long", alert_message='{"action":"SELL","symbol":"${selectedSymbol}","asset_type":"crypto","quantity":1}')
`

  const curlCode = `curl -X POST http://localhost:3000/api/trade/webhook \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: nullrisk_algo_v1_live" \\
  -d '{
    "action": "BUY",
    "symbol": "${selectedSymbol}",
    "asset_type": "crypto",
    "quantity": 1,
    "strategy": "${currentStrategyConfig.name}"
  }'`

  const isProfit = (backtestResult?.totalReturnPct || 0) >= 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none pb-12">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">
                  Backtest Lab & Algo Playground
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PHASE 6 QUANT
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-800 text-zinc-400 border border-white/[0.06] hidden sm:inline">
                  SLIPPAGE: 0.05%
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Stress-test systematic trading strategies against historical tick & daily price action with sub-second execution logic
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDeployModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-zinc-900/90 text-zinc-200 border border-white/[0.12] hover:bg-zinc-800 hover:border-white/20 transition-all cursor-pointer shadow-sm group"
          >
            <Code2 className="h-3.5 w-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Deploy Webhook API</span>
          </button>

          <button
            type="button"
            onClick={executeSimulation}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_20px_-3px_rgba(16,185,129,0.4)]"
          >
            <Play className={`h-3.5 w-3.5 fill-current ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Simulating...' : 'Run Backtest'}</span>
          </button>
        </div>
      </div>

      {/* Strategy Selector Bento & Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Strategy Selection Cards (Span 3) */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {STRATEGIES.map((strat) => {
            const isSelected = selectedStrategy === strat.id
            return (
              <motion.div
                key={strat.id}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleStrategyChange(strat.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                  isSelected
                    ? 'bg-zinc-900/90 border-emerald-500/50 shadow-[0_0_25px_-5px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                    : 'bg-zinc-950/60 border-white/[0.06] hover:bg-zinc-900/50 hover:border-white/[0.12]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-7 w-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-zinc-900 text-zinc-400 border border-white/[0.06]'
                        }`}
                      >
                        {strat.id === 'ema_cross'
                          ? 'EMA'
                          : strat.id === 'rsi_reversion'
                          ? 'RSI'
                          : strat.id === 'bb_breakout'
                          ? 'BB'
                          : 'MACD'}
                      </div>
                      <span className="font-semibold text-sm text-zinc-100 font-sans tracking-tight">
                        {strat.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed font-sans">
                    {strat.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/[0.04] flex items-center justify-between text-[11px] font-mono text-zinc-500">
                  <span>
                    Preset: {strat.defaultFast} / {strat.defaultSlow}
                  </span>
                  <span className="text-emerald-400/80 font-medium">{strat.shortDesc}</span>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Hyperparameter Controls (Span 1) */}
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-white/[0.08] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-zinc-200">
              <Sliders className="h-3.5 w-3.5 text-emerald-400" />
              <span>Hyperparameters</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFastPeriod(currentStrategyConfig.defaultFast)
                setSlowPeriod(currentStrategyConfig.defaultSlow)
                setInitialCapital(500000)
              }}
              title="Reset parameters to default"
              className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            {/* Symbol Picker */}
            <div>
              <label className="text-[10px] uppercase text-zinc-400 block mb-1">Target Asset</label>
              <div className="grid grid-cols-3 gap-1.5">
                {POPULAR_SYMBOLS.slice(0, 6).map((sym) => (
                  <button
                    key={sym.symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(sym.symbol)}
                    className={`px-2 py-1 rounded text-center transition-colors cursor-pointer text-[11px] font-bold ${
                      selectedSymbol === sym.symbol
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-zinc-900/80 text-zinc-400 border border-white/[0.06] hover:text-zinc-200'
                    }`}
                  >
                    {sym.symbol.replace('.NS', '')}
                  </button>
                ))}
              </div>
            </div>

            {/* Fast Parameter */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-zinc-400">{currentStrategyConfig.fastLabel}</span>
                <span className="font-bold text-emerald-400">{fastPeriod}</span>
              </div>
              <input
                type="range"
                min="2"
                max="50"
                value={fastPeriod}
                onChange={(e) => setFastPeriod(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Slow Parameter */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-zinc-400">{currentStrategyConfig.slowLabel}</span>
                <span className="font-bold text-emerald-400">{slowPeriod}</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                value={slowPeriod}
                onChange={(e) => setSlowPeriod(Number(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Capital Allocation */}
            <div>
              <label className="text-[10px] uppercase text-zinc-400 block mb-1">Starting Capital</label>
              <div className="flex items-center gap-1.5">
                {[100000, 500000, 1000000].map((cap) => (
                  <button
                    key={cap}
                    type="button"
                    onClick={() => setInitialCapital(cap)}
                    className={`flex-1 py-1 rounded text-center transition-colors cursor-pointer text-[10px] font-bold ${
                      initialCapital === cap
                        ? 'bg-zinc-800 text-zinc-100 border border-white/20'
                        : 'bg-zinc-900 text-zinc-500 border border-white/[0.04] hover:text-zinc-300'
                    }`}
                  >
                    ₹{(cap / 100000).toFixed(0)}L
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Execution Model</span>
            <span className="text-zinc-400">95% Margin / Spot</span>
          </div>
        </div>
      </div>

      {/* Quantitative Performance Metrics (Bento Grid) */}
      {backtestResult && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Net Return */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.08] relative overflow-hidden">
            <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-medium">
              Net Strategy Return
            </span>
            <div
              className={`text-xl font-bold font-mono mt-1 tabular-nums flex items-center gap-1 ${
                isProfit ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isProfit ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <span>
                {isProfit ? '+' : ''}
                {backtestResult.totalReturnPct.toFixed(2)}%
              </span>
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-1">
              ₹{(backtestResult.finalCapital - backtestResult.initialCapital).toLocaleString('en-IN')} Net P&L
            </div>
          </div>

          {/* 2. Alpha vs Benchmark */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-medium">
              Strategy Alpha
            </span>
            <div
              className={`text-xl font-bold font-mono mt-1 tabular-nums ${
                backtestResult.alphaPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {backtestResult.alphaPct >= 0 ? '+' : ''}
              {backtestResult.alphaPct.toFixed(2)}%
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-1">
              B&H: {backtestResult.benchmarkReturnPct.toFixed(2)}%
            </div>
          </div>

          {/* 3. Sharpe Ratio */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-medium">
              Sharpe Ratio
            </span>
            <div className="text-xl font-bold font-mono text-zinc-100 mt-1 tabular-nums">
              {backtestResult.sharpeRatio.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-1">
              {backtestResult.sharpeRatio > 1.5 ? 'Excellent Risk-Adj' : 'Acceptable Variance'}
            </div>
          </div>

          {/* 4. Win Rate */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-medium">
              Win Rate %
            </span>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1 tabular-nums">
              {backtestResult.winRatePct.toFixed(1)}%
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-1">
              {backtestResult.winningTrades}W / {backtestResult.losingTrades}L ({backtestResult.totalTrades} Total)
            </div>
          </div>

          {/* 5. Max Drawdown */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-medium">
              Max Drawdown
            </span>
            <div className="text-xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
              -{backtestResult.maxDrawdownPct.toFixed(2)}%
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-1">Peak-to-Trough Loss</div>
          </div>

          {/* 6. Profit Factor */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider font-medium">
              Profit Factor
            </span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
              {backtestResult.profitFactor >= 99 ? '∞' : backtestResult.profitFactor.toFixed(2)}
            </div>
            <div className="text-[10px] font-mono text-zinc-500 mt-1">Gross Win / Gross Loss</div>
          </div>
        </div>
      )}

      {/* Dual Equity Curve Chart Card */}
      <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <AssetLogo symbol={selectedSymbol} type={selectedSymbol.includes('BTC') ? 'crypto' : 'stock'} size={32} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold font-sans text-zinc-100">
                  {selectedSymbol} Strategy NAV vs Buy & Hold Benchmark
                </span>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Simulated Equity
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-500">
                Initial Capital: ₹{initialCapital.toLocaleString('en-IN')} | Terminal Capital: ₹
                {backtestResult ? backtestResult.finalCapital.toLocaleString('en-IN') : '...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>Strategy Equity</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-zinc-500" />
              <span>Buy & Hold Benchmark</span>
            </div>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="h-72 w-full mt-4">
          {backtestResult && backtestResult.equityCurve.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={backtestResult.equityCurve} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStrategy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="time"
                  stroke="#52525b"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis
                  stroke="#52525b"
                  fontSize={10}
                  fontFamily="monospace"
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: 'rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    boxShadow: '0 10px 30px -5px rgba(0,0,0,0.8)',
                  }}
                  formatter={(val, name) => [
                    `₹${Number(val || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`,
                    String(name) === 'strategyEquity' ? 'Strategy NAV' : 'Benchmark NAV',
                  ]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="strategyEquity"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorStrategy)"
                />
                <Area
                  type="monotone"
                  dataKey="benchmarkEquity"
                  stroke="#71717a"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorBenchmark)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs font-mono text-zinc-500">
              No historical bars available to chart
            </div>
          )}
        </div>
      </div>

      {/* Trade Execution Journal */}
      <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-zinc-100 font-sans">Simulated Trade Journal</h3>
            <span className="text-xs font-mono text-zinc-500">
              ({backtestResult?.trades.length || 0} executed signals)
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">
            Slippage: <span className="text-emerald-400">0.05% applied</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-white/[0.06] bg-zinc-900/40 text-[10px] text-zinc-400 uppercase tracking-wider">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Side</th>
                <th className="px-4 py-3">Entry Date</th>
                <th className="px-4 py-3">Exit Date</th>
                <th className="px-4 py-3 text-right">Entry (₹)</th>
                <th className="px-4 py-3 text-right">Exit (₹)</th>
                <th className="px-4 py-3 text-right">Units</th>
                <th className="px-4 py-3 text-right">Net P&L</th>
                <th className="px-4 py-3 text-right">Duration</th>
                <th className="px-4 py-3">Signal Trigger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {backtestResult && backtestResult.trades.length > 0 ? (
                backtestResult.trades.map((trade) => {
                  const isTradeProfit = trade.pnl >= 0
                  return (
                    <tr key={trade.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="px-4 py-3 text-zinc-400">{trade.id}</td>
                      <td className="px-4 py-3">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          LONG
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{trade.entryTime}</td>
                      <td className="px-4 py-3 text-zinc-300">{trade.exitTime}</td>
                      <td className="px-4 py-3 text-right text-zinc-200 tabular-nums">
                        {trade.entryPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-200 tabular-nums">
                        {trade.exitPrice.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400 tabular-nums">{trade.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div className={`font-bold ${isTradeProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isTradeProfit ? '+' : ''}₹{trade.pnl.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] opacity-75">
                          {isTradeProfit ? '+' : ''}
                          {trade.pnlPct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500">{trade.holdingBars} bars</td>
                      <td className="px-4 py-3 text-zinc-400 max-w-xs truncate text-[11px]">{trade.reason}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-500 font-mono">
                    No trades executed with current parameters. Try adjusting period sliders.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook API Deployment Modal */}
      <AnimatePresence>
        {isDeployModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-white/[0.12] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Code2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-zinc-100 font-sans">
                      Deploy Strategy via Automated Webhook
                    </h3>
                    <p className="text-xs text-zinc-400 font-mono">
                      Connect TradingView alerts or Python scripts to execute programmatic orders on NullRisk
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDeployModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Endpoint & Secret Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/[0.06]">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                      Endpoint URI
                    </span>
                    <span className="text-emerald-400 select-all font-semibold">
                      /api/trade/webhook
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/[0.06]">
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider block mb-1">
                      Header Secret (x-webhook-secret)
                    </span>
                    <span className="text-zinc-200 select-all font-semibold">
                      nullrisk_algo_v1_live
                    </span>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-2 border-b border-white/[0.08] pb-2 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setCodeTab('python')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      codeTab === 'python'
                        ? 'bg-zinc-800 text-zinc-100 font-bold border border-white/10'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    Python (requests)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeTab('tradingview')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      codeTab === 'tradingview'
                        ? 'bg-zinc-800 text-zinc-100 font-bold border border-white/10'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    TradingView PineScript
                  </button>
                  <button
                    type="button"
                    onClick={() => setCodeTab('curl')}
                    className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                      codeTab === 'curl'
                        ? 'bg-zinc-800 text-zinc-100 font-bold border border-white/10'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    cURL Command
                  </button>
                </div>

                {/* Code Box */}
                <div className="relative rounded-xl bg-zinc-900/90 border border-white/[0.08] p-4 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      const text =
                        codeTab === 'python'
                          ? pythonCode
                          : codeTab === 'tradingview'
                          ? pineScriptCode
                          : curlCode
                      copyToClipboard(text, codeTab)
                    }}
                    className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 flex items-center gap-1 text-[11px] cursor-pointer transition-colors"
                  >
                    {copiedTab === codeTab ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <pre className="text-zinc-300 overflow-x-auto pr-16 max-h-56">
                    {codeTab === 'python' ? pythonCode : codeTab === 'tradingview' ? pineScriptCode : curlCode}
                  </pre>
                </div>

                {/* Live Test Action */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block font-sans">
                      Test Live Webhook Dispatch
                    </span>
                    <span className="text-[11px] font-mono text-zinc-500">
                      Dispatches a live simulated BUY signal for 1 {selectedSymbol} directly to your account
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={testLiveWebhook}
                    disabled={isTestingWebhook}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>{isTestingWebhook ? 'Routing...' : 'Send Test Signal'}</span>
                  </button>
                </div>

                {webhookTestStatus && (
                  <div
                    className={`p-3 rounded-xl border text-xs font-mono ${
                      webhookTestStatus.includes('routed')
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-400'
                        : 'bg-rose-950/20 border-rose-800/40 text-rose-400'
                    }`}
                  >
                    {webhookTestStatus}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/[0.08] flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDeployModalOpen(false)}
                  className="px-4 py-1.5 rounded-xl text-xs font-mono font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
