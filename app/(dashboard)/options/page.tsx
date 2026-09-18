'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, AlertTriangle, RefreshCw, Zap, TrendingUp, TrendingDown, Layers } from 'lucide-react'
import useSWR from 'swr'
import { generateStrikes, getExpiryDates } from '@/lib/engine/black-scholes'
import { AssetLogo } from '@/components/ui/asset-logo'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface PricingGreeks {
  price: number
  sigma: number
  intrinsicValue: number
  timeValue: number
  delta: number
  gamma: number
  theta: number
  vega: number
  d1: number
  d2: number
  impliedMoneyness: string
  error?: string
}

interface OptionPositionItem {
  id: string
  symbol: string
  option_type: 'call' | 'put'
  strike: number
  expiry: string
  contracts: number
  status: string
  premium_paid: number
  currentValue?: number
  pnl?: number
  delta?: number
  gamma?: number
  theta?: number
  vega?: number
}

// Bloomberg Pulse Micro-Metric
function BloombergValue({
  label,
  value,
  unit = '',
  color = 'text-emerald-400',
  decimals = 4,
}: {
  label: string
  value: number
  unit?: string
  color?: string
  decimals?: number
}) {
  const [prev, setPrev] = useState(value)
  const [pulse, setPulse] = useState(false)

  if (value !== prev) {
    setPrev(value)
    setPulse(true)
  }

  useEffect(() => {
    if (pulse) {
      const t = setTimeout(() => setPulse(false), 500)
      return () => clearTimeout(t)
    }
  }, [pulse])

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <motion.span
        animate={pulse ? { opacity: [1, 0.4, 1] } : {}}
        transition={{ duration: 0.3 }}
        className={`font-mono text-xs sm:text-sm font-bold tabular-nums ${color} ${
          pulse ? 'text-white' : ''
        }`}
      >
        {value >= 0 ? '' : '-'}
        {Math.abs(value).toFixed(decimals)}
        {unit}
      </motion.span>
    </div>
  )
}

// Greeks Terminal Box
function GreeksPanel({ pricing }: { pricing: PricingGreeks | null }) {
  if (!pricing) return null

  return (
    <div className="rounded-2xl bg-zinc-950 border border-white/[0.08] p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)]">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
        <span className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase flex items-center gap-1.5">
          <Zap className="h-3 w-3 text-amber-400" /> BSM Greeks Matrix
        </span>
        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            pricing.impliedMoneyness === 'ITM'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : pricing.impliedMoneyness === 'OTM'
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
          }`}
        >
          {pricing.impliedMoneyness}
        </span>
      </div>

      {/* Theoretical Price & IV */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-3 border-b border-white/[0.06]">
        <BloombergValue label="THEO PREMIUM" value={pricing.price} color="text-emerald-400" decimals={4} />
        <BloombergValue label="VOLATILITY (IV)" value={pricing.sigma} unit="%" color="text-amber-400" decimals={2} />
        <BloombergValue label="INTRINSIC VAL" value={pricing.intrinsicValue} color="text-zinc-200" decimals={4} />
        <BloombergValue label="TIME VALUE" value={pricing.timeValue} color="text-zinc-400" decimals={4} />
      </div>

      {/* Primary Greeks */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-3 border-b border-white/[0.06]">
        <BloombergValue
          label="Δ DELTA"
          value={pricing.delta}
          color={pricing.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          decimals={4}
        />
        <BloombergValue label="Γ GAMMA" value={pricing.gamma} color="text-blue-400" decimals={6} />
        <BloombergValue label="Θ THETA (1D)" value={pricing.theta} color="text-orange-400" decimals={4} />
        <BloombergValue label="ν VEGA (1%)" value={pricing.vega} color="text-purple-400" decimals={4} />
      </div>

      {/* Normal Quantiles */}
      <div className="grid grid-cols-2 gap-3">
        <BloombergValue label="d1 NORMAL" value={pricing.d1} color="text-zinc-500" decimals={4} />
        <BloombergValue label="d2 NORMAL" value={pricing.d2} color="text-zinc-500" decimals={4} />
      </div>
    </div>
  )
}

// Position Card
function PositionCard({
  pos,
  onClose,
}: {
  pos: OptionPositionItem
  onClose?: (id: string) => Promise<void>
}) {
  const [isClosing, setIsClosing] = useState(false)
  const isProfit = (pos.pnl ?? 0) >= 0
  const statusColor =
    pos.status === 'exercised'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : pos.status === 'expired'
      ? 'text-zinc-500 bg-zinc-900 border-white/[0.06]'
      : 'text-blue-400 bg-blue-500/10 border-blue-500/20'

  const handleClose = async () => {
    if (!onClose) return
    setIsClosing(true)
    try {
      await onClose(pos.id)
    } finally {
      setIsClosing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-5 shadow-sm space-y-3 font-mono"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <AssetLogo symbol={pos.symbol} type="stock" size={28} />
            <span className="font-bold text-zinc-100">{pos.symbol}</span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                pos.option_type === 'call'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {pos.option_type.toUpperCase()}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Strike ₹{pos.strike} · Exp {pos.expiry} · {pos.contracts} ctr.
          </div>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${statusColor}`}>
          {pos.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs border-t border-white/[0.06] pt-3">
        <div>
          <div className="text-zinc-500 text-[9px] uppercase">Paid Prem</div>
          <div className="text-zinc-200 font-bold tabular-nums">₹{pos.premium_paid.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-zinc-500 text-[9px] uppercase">Mark Val</div>
          <div className="text-zinc-200 font-bold tabular-nums">₹{(pos.currentValue || 0).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-zinc-500 text-[9px] uppercase">Net P&L</div>
          <div
            className={`font-bold tabular-nums ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}
          >
            {isProfit ? '+' : ''}₹{(pos.pnl || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {pos.status === 'open' && (
        <>
          <div className="grid grid-cols-4 gap-2 text-[10px] border-t border-white/[0.06] pt-2 text-zinc-500">
            <div>Δ {(pos.delta || 0).toFixed(3)}</div>
            <div>Γ {(pos.gamma || 0).toFixed(4)}</div>
            <div>Θ {(pos.theta || 0).toFixed(4)}</div>
            <div>ν {(pos.vega || 0).toFixed(4)}</div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isClosing}
            className="w-full mt-2 h-8 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {isClosing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                Closing Contract...
              </>
            ) : (
              '⚡ Settle Position'
            )}
          </button>
        </>
      )}
    </motion.div>
  )
}

export default function OptionsPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [symbolInput, setSymbolInput] = useState('AAPL')
  const [optionType, setOptionType] = useState<'call' | 'put'>('call')
  const [selectedExpiry, setSelectedExpiry] = useState<{ label: string; date: Date; T: number } | null>(() => {
    const dates = getExpiryDates()
    return dates.length > 0 ? dates[0] : null
  })
  const expiryDates = useMemo(() => getExpiryDates(), [])
  const [contracts, setContracts] = useState(1)
  const [isBuying, setIsBuying] = useState(false)
  const [buyMessage, setBuyMessage] = useState('')
  const [buySuccess, setBuySuccess] = useState(false)

  const { data: spotData, isLoading: spotLoading } = useSWR(
    symbol ? `/api/market/quote?symbol=${encodeURIComponent(symbol)}&assetType=stock` : null,
    fetcher,
    { refreshInterval: 15000 }
  )
  const spotPrice = spotData?.price || 0

  const strikes = useMemo(() => {
    return spotPrice > 0 ? generateStrikes(spotPrice, 5, spotPrice > 1000 ? 50 : spotPrice > 100 ? 5 : 1) : []
  }, [spotPrice])

  const defaultStrike = useMemo(() => {
    if (strikes.length === 0 || spotPrice <= 0) return null
    return strikes.reduce((prev, curr) =>
      Math.abs(curr - spotPrice) < Math.abs(prev - spotPrice) ? curr : prev
    )
  }, [strikes, spotPrice])

  const [chosenStrike, setChosenStrike] = useState<number | null>(null)
  const selectedStrike = chosenStrike ?? defaultStrike

  const pricingUrl =
    selectedStrike && selectedExpiry && symbol
      ? `/api/options/price?symbol=${encodeURIComponent(symbol)}&strike=${selectedStrike}&T=${selectedExpiry.T.toFixed(
          6
        )}&type=${optionType}`
      : null

  const { data: pricing, isLoading: pricingLoading } = useSWR(pricingUrl, fetcher, {
    refreshInterval: 10000,
  })

  const { data: positionsData, mutate: mutatePositions } = useSWR(
    '/api/options/positions',
    fetcher,
    { refreshInterval: 30000 }
  )
  const positions = positionsData?.positions || []

  const handleClosePosition = async (positionId: string) => {
    try {
      const res = await fetch('/api/options/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId }),
      })
      if (res.ok) {
        mutatePositions()
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to close position.')
      }
    } catch {
      alert('An unexpected error occurred.')
    }
  }

  const handleBuy = async () => {
    if (!selectedStrike || !selectedExpiry || !symbol || !pricing) return
    setIsBuying(true)
    setBuyMessage('')
    setBuySuccess(false)

    try {
      const res = await fetch('/api/options/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          optionType,
          strike: selectedStrike,
          expiryDate: selectedExpiry.date.toISOString().split('T')[0],
          contracts,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setBuyMessage(data.message)
        setBuySuccess(true)
        mutatePositions()
      } else {
        setBuyMessage(data.error)
        setBuySuccess(false)
      }
    } catch {
      setBuyMessage('An unexpected error occurred.')
    } finally {
      setIsBuying(false)
    }
  }

  const totalPremium = pricing ? pricing.price * 100 * contracts : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">Options Analytics Terminal</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-white/[0.06]">
              BLACK-SCHOLES-MERTON
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            High-order analytical Greeks calculation & European-style simulated contract trading
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Simulated Paper Contracts</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left 2 Columns: Underlying & Strike Matrix */}
        <div className="xl:col-span-2 space-y-5">
          {/* Symbol Lookup Box */}
          <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-5 shadow-sm space-y-3">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold block">
              Underlying Equity Symbol
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 group">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
                <input
                  type="text"
                  value={symbolInput}
                  onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setChosenStrike(null)
                      setSymbol(symbolInput)
                    }
                  }}
                  placeholder="AAPL, TSLA, NVDA, RELIANCE..."
                  className="w-full h-10 bg-zinc-900 border border-white/[0.08] focus:border-emerald-500/40 rounded-xl pl-10 pr-4 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition-all"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setChosenStrike(null)
                  setSymbol(symbolInput)
                }}
                className="h-10 px-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-mono font-bold rounded-xl border border-white/[0.08] transition-all"
              >
                Inspect
              </button>
            </div>

            {spotPrice > 0 && (
              <div className="flex items-center gap-3 pt-1 text-xs font-mono">
                <span className="text-xl font-bold text-zinc-100 tabular-nums">
                  ₹{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
                <span className="text-zinc-500">{symbol} Live Mark</span>
                {spotLoading && <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />}
              </div>
            )}
          </div>

          {/* Option Type Switcher */}
          <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setOptionType('call')}
              className={`py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                optionType === 'call'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>CALL (BULLISH)</span>
            </button>
            <button
              type="button"
              onClick={() => setOptionType('put')}
              className={`py-2 text-xs font-mono font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                optionType === 'put'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TrendingDown className="h-3.5 w-3.5" />
              <span>PUT (BEARISH)</span>
            </button>
          </div>

          {/* Strike Price Chain */}
          {strikes.length > 0 && (
            <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold block">
                  Strike Price Ladder
                </label>
                <span className="text-[9px] font-mono text-zinc-500">ATM/ITM Calibrated</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
                {strikes.map((strike) => {
                  const isSelected = selectedStrike === strike
                  const tol = spotPrice * 0.01
                  const isATM = Math.abs(strike - spotPrice) <= tol
                  const isITM = optionType === 'call' ? spotPrice > strike : spotPrice < strike

                  return (
                    <button
                      key={strike}
                      type="button"
                      onClick={() => setChosenStrike(strike)}
                      className={`py-2 px-3.5 text-xs font-mono font-bold rounded-xl border transition-all text-center shrink-0 min-w-[90px] ${
                        isSelected
                          ? optionType === 'call'
                            ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md scale-105'
                            : 'bg-rose-500 text-white border-rose-400 shadow-md scale-105'
                          : isATM
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                          : isITM
                          ? 'border-white/[0.1] bg-zinc-900 text-zinc-200 hover:border-zinc-600'
                          : 'border-white/[0.04] bg-zinc-950 text-zinc-500 hover:border-zinc-800'
                      }`}
                    >
                      <div className="tabular-nums">₹{strike}</div>
                      {isATM && <div className="text-[8px] uppercase tracking-wider font-extrabold text-amber-400">ATM</div>}
                      {isITM && !isATM && <div className="text-[8px] uppercase tracking-wider font-extrabold text-emerald-400">ITM</div>}
                      {!isATM && !isITM && <div className="text-[8px] uppercase tracking-wider opacity-40">OTM</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Expiry Selector */}
          <div className="rounded-2xl bg-zinc-950/80 border border-white/[0.08] p-5 shadow-sm space-y-3">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold block">
              Contract Expiration Maturity
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {expiryDates.map((exp) => (
                <button
                  key={exp.label}
                  type="button"
                  onClick={() => setSelectedExpiry(exp)}
                  className={`text-left p-3.5 rounded-xl border text-xs font-mono transition-all ${
                    selectedExpiry?.label === exp.label
                      ? 'border-emerald-500/40 bg-zinc-900 text-zinc-100 ring-1 ring-emerald-500/20'
                      : 'border-white/[0.06] bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold text-zinc-200">{exp.label.split(' — ')[0]}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{exp.label.split(' — ')[1]}</div>
                  <div className="text-[10px] text-emerald-400 font-medium mt-1">
                    {(exp.T * 365).toFixed(0)} Days To Expiry
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Greeks & Order Ticket */}
        <div className="space-y-4">
          {pricingLoading && (
            <div className="rounded-2xl bg-zinc-950 border border-white/[0.08] p-8 text-center text-zinc-500 text-xs font-mono flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
              <span>Computing Theoretical Greeks...</span>
            </div>
          )}
          {pricing && !pricing.error && <GreeksPanel pricing={pricing} />}

          {/* Buy Ticket */}
          <div className="rounded-2xl bg-zinc-950 border border-white/[0.08] p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)] space-y-4 font-mono">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                Options Ticket
              </span>
              <span className="text-[10px] text-zinc-500">100x Multiplier</span>
            </div>

            {selectedStrike && selectedExpiry && (
              <div className="text-xs text-zinc-400 bg-zinc-900/60 rounded-xl p-3.5 space-y-1.5 border border-white/[0.04]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Target Asset</span>
                  <span className="text-zinc-200 font-bold">{symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Option Type</span>
                  <span
                    className={`font-bold ${
                      optionType === 'call' ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {optionType.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Strike Target</span>
                  <span className="text-zinc-100 font-bold tabular-nums">₹{selectedStrike}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Maturity Date</span>
                  <span className="text-zinc-300">{selectedExpiry.date.toLocaleDateString()}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                Contract Volume
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={contracts}
                onChange={(e) => setContracts(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-10 bg-zinc-900 border border-white/[0.08] focus:border-emerald-500/40 rounded-xl px-3 text-xs font-mono text-zinc-200 outline-none"
              />
              <p className="text-[10px] text-zinc-500">1 contract = 100 shares representation</p>
            </div>

            {pricing && !pricing.error && (
              <div className="border-t border-white/[0.06] pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Premium / Share</span>
                  <span className="text-zinc-200 tabular-nums">₹{pricing.price?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Notional Cost ({contracts} ctr.)</span>
                  <span className="text-sm font-bold text-zinc-100 tabular-nums">
                    ₹{totalPremium.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleBuy}
              disabled={isBuying || !pricing || !!pricing?.error || !selectedStrike || !selectedExpiry}
              className={`w-full h-11 rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 shadow-lg flex items-center justify-center gap-2 ${
                optionType === 'call'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              {isBuying ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Routing Order...
                </>
              ) : (
                `Buy ${contracts} ${optionType.toUpperCase()} — ₹${totalPremium.toFixed(2)}`
              )}
            </button>

            <AnimatePresence>
              {buyMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-xs p-3 rounded-xl font-mono text-center border ${
                    buySuccess
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}
                >
                  {buyMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Positions Section */}
      <div className="space-y-4 pt-4 border-t border-white/[0.06]">
        <h2 className="text-base font-bold font-sans tracking-tight text-zinc-100 flex items-center gap-2">
          <Layers className="h-4 w-4 text-zinc-400" />
          Active Options Positions ({positions.length})
        </h2>

        {positions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/[0.08] p-12 text-center bg-zinc-950/40 text-zinc-500 text-xs font-mono">
            No derivative options positions open. Calibrate strikes and enter a contract above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {positions.map((pos: OptionPositionItem) => (
              <PositionCard key={pos.id} pos={pos} onClose={handleClosePosition} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
