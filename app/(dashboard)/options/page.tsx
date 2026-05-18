'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react'
import useSWR from 'swr'
import { generateStrikes, getExpiryDates } from '@/lib/engine/black-scholes'

const fetcher = (url: string) => fetch(url).then(r => r.json())

// ─── Animated Number (Bloomberg pulse) ───────────────────────────────────────
function BloombergValue({
  label, value, unit = '', color = 'text-green-400', decimals = 4
}: { label: string; value: number; unit?: string; color?: string; decimals?: number }) {
  const [prev, setPrev] = useState(value)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (value !== prev) {
      setPulse(true)
      const t = setTimeout(() => { setPulse(false); setPrev(value) }, 600)
      return () => clearTimeout(t)
    }
  }, [value, prev])

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{label}</span>
      <motion.span
        animate={pulse ? { opacity: [1, 0.3, 1] } : {}}
        transition={{ duration: 0.4 }}
        className={`font-mono text-sm font-bold ${color} ${pulse ? 'text-white' : ''}`}
      >
        {value >= 0 ? '' : '-'}{Math.abs(value).toFixed(decimals)}{unit}
      </motion.span>
    </div>
  )
}

// ─── Greeks Panel ─────────────────────────────────────────────────────────────
function GreeksPanel({ pricing }: { pricing: any }) {
  if (!pricing) return null

  return (
    <div className="font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-5">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
        <span className="text-[11px] font-black tracking-widest text-zinc-400 uppercase">BLOOMBERG GREEKS TERMINAL</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
          pricing.impliedMoneyness === 'ITM' ? 'bg-green-900 text-green-300' :
          pricing.impliedMoneyness === 'OTM' ? 'bg-red-900 text-red-300' :
          'bg-yellow-900 text-yellow-300'
        }`}>{pricing.impliedMoneyness}</span>
      </div>

      {/* Price row */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b border-zinc-800">
        <BloombergValue label="THEO PRICE" value={pricing.price} color="text-cyan-400" decimals={4} />
        <BloombergValue label="IV %" value={pricing.sigma} unit="%" color="text-yellow-400" decimals={2} />
        <BloombergValue label="INTRINSIC" value={pricing.intrinsicValue} color="text-green-400" decimals={4} />
        <BloombergValue label="TIME VALUE" value={pricing.timeValue} color="text-purple-400" decimals={4} />
      </div>

      {/* Greeks grid */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-3 border-b border-zinc-800">
        <BloombergValue
          label="Δ DELTA"
          value={pricing.delta}
          color={pricing.delta >= 0 ? 'text-green-400' : 'text-red-400'}
          decimals={4}
        />
        <BloombergValue label="Γ GAMMA" value={pricing.gamma} color="text-blue-400" decimals={6} />
        <BloombergValue
          label="Θ THETA / DAY"
          value={pricing.theta}
          color="text-orange-400"
          decimals={4}
        />
        <BloombergValue label="ν VEGA / 1%" value={pricing.vega} color="text-pink-400" decimals={4} />
      </div>

      {/* d1 / d2 */}
      <div className="grid grid-cols-2 gap-4">
        <BloombergValue label="d1" value={pricing.d1} color="text-zinc-400" decimals={4} />
        <BloombergValue label="d2" value={pricing.d2} color="text-zinc-400" decimals={4} />
      </div>

      {/* Tooltip hints */}
      <div className="mt-4 pt-3 border-t border-zinc-800 space-y-1">
        <p className="text-[10px] text-zinc-600 font-mono">Δ: Change per ₹1 spot move | Γ: Delta rate of change</p>
        <p className="text-[10px] text-zinc-600 font-mono">Θ: Daily time decay | ν: Sensitivity per 1% vol change</p>
      </div>
    </div>
  )
}

// ─── Moneyness Badge ──────────────────────────────────────────────────────────
function MoneynessBadge({ strike, spot, type }: { strike: number; spot: number; type: 'call' | 'put' }) {
  const tol = spot * 0.01
  const diff = Math.abs(strike - spot)
  if (diff <= tol) return <span className="text-[10px] font-bold text-yellow-400">ATM</span>
  const itm = type === 'call' ? spot > strike : spot < strike
  return <span className={`text-[10px] font-bold ${itm ? 'text-green-400' : 'text-zinc-500'}`}>{itm ? 'ITM' : 'OTM'}</span>
}

// ─── Position Card ────────────────────────────────────────────────────────────
function PositionCard({ pos, onClose }: { pos: any; onClose?: (id: string) => Promise<void> }) {
  const [isClosing, setIsClosing] = useState(false)
  const isProfit = pos.pnl >= 0
  const statusColor = pos.status === 'exercised' ? 'text-green-400' : pos.status === 'expired' ? 'text-zinc-500' : 'text-blue-400'

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
      className="font-mono bg-zinc-950 border border-zinc-800 rounded-xl p-4"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-black text-white">{pos.symbol}</span>
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              pos.option_type === 'call' ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'
            }`}>{pos.option_type.toUpperCase()}</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            Strike ₹{pos.strike} · Exp {pos.expiry} · {pos.contracts} contract{pos.contracts > 1 ? 's' : ''}
          </div>
        </div>
        <span className={`text-[11px] font-bold uppercase ${statusColor}`}>{pos.status}</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs border-t border-zinc-800 pt-3">
        <div>
          <div className="text-zinc-600 text-[10px]">PREMIUM PAID</div>
          <div className="text-white font-bold">₹{pos.premium_paid.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-zinc-600 text-[10px]">CURR VALUE</div>
          <div className="text-white font-bold">₹{(pos.currentValue || 0).toFixed(2)}</div>
        </div>
        <div>
          <div className="text-zinc-600 text-[10px]">P&L</div>
          <div className={`font-black ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
            {isProfit ? '+' : ''}₹{(pos.pnl || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {pos.status === 'open' && (
        <>
          <div className="grid grid-cols-4 gap-2 text-[10px] border-t border-zinc-800 pt-2 mt-2 text-zinc-400 font-mono">
            <div>Δ {(pos.delta || 0).toFixed(3)}</div>
            <div>Γ {(pos.gamma || 0).toFixed(4)}</div>
            <div>Θ {(pos.theta || 0).toFixed(4)}</div>
            <div>ν {(pos.vega || 0).toFixed(4)}</div>
          </div>
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="w-full mt-3 h-8 bg-red-950/40 border border-red-950/60 hover:bg-red-900/40 text-red-400 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {isClosing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                CLOSING...
              </>
            ) : (
              '⚡ CUT POSITION'
            )}
          </button>
        </>
      )}
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function OptionsPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [symbolInput, setSymbolInput] = useState('AAPL')
  const [optionType, setOptionType] = useState<'call' | 'put'>('call')
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null)
  const [selectedExpiry, setSelectedExpiry] = useState<{ label: string; date: Date; T: number } | null>(null)
  const [contracts, setContracts] = useState(1)
  const [isBuying, setIsBuying] = useState(false)
  const [buyMessage, setBuyMessage] = useState('')
  const [buySuccess, setBuySuccess] = useState(false)

  // Expiry dates are computed once on mount
  const [expiryDates] = useState(() => getExpiryDates())

  useEffect(() => {
    if (expiryDates.length > 0 && !selectedExpiry) {
      setSelectedExpiry(expiryDates[0])
    }
  }, [expiryDates, selectedExpiry])

  // Fetch spot price + strikes whenever symbol changes
  const { data: spotData, isLoading: spotLoading } = useSWR(
    symbol ? `/api/market/quote?symbol=${symbol}&assetType=stock` : null,
    fetcher,
    { refreshInterval: 15000 }
  )
  const spotPrice = spotData?.price || 0

  // Generate strikes when spot is known
  const strikes = spotPrice > 0 ? generateStrikes(spotPrice, 5, spotPrice > 1000 ? 50 : spotPrice > 100 ? 5 : 1) : []

  // Auto-select ATM strike when strikes change
  useEffect(() => {
    if (strikes.length > 0 && spotPrice > 0) {
      const atm = strikes.reduce((prev, curr) =>
        Math.abs(curr - spotPrice) < Math.abs(prev - spotPrice) ? curr : prev
      )
      setSelectedStrike(atm)
    }
  }, [spotPrice])

  // Fetch BSM pricing whenever inputs change
  const pricingUrl = selectedStrike && selectedExpiry && symbol
    ? `/api/options/price?symbol=${symbol}&strike=${selectedStrike}&T=${selectedExpiry.T.toFixed(6)}&type=${optionType}`
    : null

  const { data: pricing, isLoading: pricingLoading } = useSWR(pricingUrl, fetcher, { refreshInterval: 10000 })

  // Options positions
  const { data: positionsData, mutate: mutatePositions } = useSWR(
    '/api/options/positions', fetcher, { refreshInterval: 30000 }
  )
  const positions = positionsData?.positions || []

  const handleClosePosition = async (positionId: string) => {
    try {
      const res = await fetch('/api/options/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId })
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
          contracts
        })
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
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Options Terminal</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Black-Scholes-Merton pricing · Paper trading only
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded-lg">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Simulated only — for educational purposes
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Left: Controls ── */}
        <div className="xl:col-span-2 space-y-5">
          {/* Symbol Search */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-2">Underlying Symbol</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  value={symbolInput}
                  onChange={e => setSymbolInput(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') setSymbol(symbolInput) }}
                  placeholder="AAPL, TSLA, NVDA..."
                  className="w-full h-10 bg-zinc-900 border border-zinc-700 rounded-md pl-10 pr-4 text-sm font-mono text-white placeholder:text-zinc-600 outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
              <button
                onClick={() => setSymbol(symbolInput)}
                className="h-10 px-5 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-md transition-colors"
              >
                Load
              </button>
            </div>

            {spotPrice > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 mt-3"
              >
                <span className="text-2xl font-black text-white">₹{spotPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span className="text-xs text-zinc-500">{symbol} live spot</span>
                {spotLoading && <RefreshCw className="h-3 w-3 animate-spin text-zinc-500" />}
              </motion.div>
            )}
          </div>

          {/* Call / Put Toggle */}
          <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1 gap-1">
            <button
              onClick={() => setOptionType('call')}
              className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all ${
                optionType === 'call'
                  ? 'bg-green-900 text-green-300 border border-green-700'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              📈 CALL
            </button>
            <button
              onClick={() => setOptionType('put')}
              className={`flex-1 py-2.5 text-sm font-black rounded-lg transition-all ${
                optionType === 'put'
                  ? 'bg-red-900 text-red-300 border border-red-700'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              📉 PUT
            </button>
          </div>

          {/* Strike Chain */}
          {strikes.length > 0 && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-3">Strike Price Chain</label>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-11 gap-2">
                {strikes.map(strike => {
                  const isSelected = selectedStrike === strike
                  const tol = spotPrice * 0.01
                  const isATM = Math.abs(strike - spotPrice) <= tol
                  const isITM = optionType === 'call' ? spotPrice > strike : spotPrice < strike

                  return (
                    <button
                      key={strike}
                      onClick={() => setSelectedStrike(strike)}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all text-center ${
                        isSelected
                          ? optionType === 'call'
                            ? 'bg-green-900 border-green-600 text-green-200'
                            : 'bg-red-900 border-red-600 text-red-200'
                          : isATM
                          ? 'border-yellow-700 bg-yellow-900/30 text-yellow-300'
                          : isITM
                          ? 'border-zinc-600 bg-zinc-800 text-zinc-200'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                      }`}
                    >
                      <div>{strike}</div>
                      {isATM && <div className="text-[8px] text-yellow-400 font-black">ATM</div>}
                      {isITM && !isATM && <div className="text-[8px] text-green-500">ITM</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Expiry Selector */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5">
            <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold block mb-3">Expiry Date</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {expiryDates.map(exp => (
                <button
                  key={exp.label}
                  onClick={() => setSelectedExpiry(exp)}
                  className={`text-left p-3 rounded-lg border text-xs transition-all ${
                    selectedExpiry?.label === exp.label
                      ? 'border-zinc-500 bg-zinc-800 text-white'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-bold">{exp.label.split(' — ')[0]}</div>
                  <div className="text-zinc-500 mt-0.5">{exp.label.split(' — ')[1]}</div>
                  <div className="text-zinc-600 mt-1">{(exp.T * 365).toFixed(0)} days</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Greeks + Buy Panel ── */}
        <div className="space-y-4">
          {/* Greeks */}
          {pricingLoading && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 text-center text-zinc-500 text-sm">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
              Calculating...
            </div>
          )}
          {pricing && !pricing.error && (
            <GreeksPanel pricing={pricing} />
          )}

          {/* Buy Panel */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Order Ticket</div>

            {selectedStrike && selectedExpiry && (
              <div className="text-xs text-zinc-400 bg-zinc-900 rounded-lg p-3 space-y-1">
                <div className="flex justify-between">
                  <span>Symbol</span><span className="text-white font-bold">{symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className={`font-bold ${optionType === 'call' ? 'text-green-400' : 'text-red-400'}`}>
                    {optionType.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Strike</span><span className="text-white font-bold">₹{selectedStrike}</span>
                </div>
                <div className="flex justify-between">
                  <span>Expiry</span><span className="text-white">{selectedExpiry.date.toLocaleDateString()}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Contracts</label>
              <input
                type="number"
                min="1"
                max="100"
                value={contracts}
                onChange={e => setContracts(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-10 bg-zinc-900 border border-zinc-700 rounded-md px-3 text-sm font-mono text-white outline-none focus:border-zinc-500"
              />
              <p className="text-[10px] text-zinc-600">1 contract = 100 shares</p>
            </div>

            {pricing && !pricing.error && (
              <div className="border-t border-zinc-800 pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Premium / share</span>
                  <span className="font-mono text-white">₹{pricing.price?.toFixed(4)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>× 100 shares/contract</span>
                  <span className="font-mono text-white">₹{(pricing.price * 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>× {contracts} contracts</span>
                  <span className="font-mono text-white font-black text-sm">₹{totalPremium.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleBuy}
              disabled={isBuying || !pricing || !!pricing?.error || !selectedStrike || !selectedExpiry}
              className={`w-full h-12 rounded-lg font-black text-sm transition-all disabled:opacity-40 ${
                optionType === 'call'
                  ? 'bg-green-700 hover:bg-green-600 text-green-100 border border-green-600'
                  : 'bg-red-800 hover:bg-red-700 text-red-100 border border-red-700'
              }`}
            >
              {isBuying ? 'Placing order...' : `BUY ${contracts} ${optionType.toUpperCase()} — ₹${totalPremium.toFixed(2)}`}
            </button>

            <AnimatePresence>
              {buyMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`text-xs p-3 rounded-lg font-mono overflow-hidden ${
                    buySuccess ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-red-900/30 text-red-300 border border-red-800'
                  }`}
                >
                  {buyMessage}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Positions Table ── */}
      <div>
        <h3 className="text-lg font-black tracking-tight mb-4 font-mono text-white">Your Options Positions</h3>
        {positions.length === 0 ? (
          <div className="bg-zinc-950 border border-zinc-800 border-dashed rounded-xl p-12 text-center text-zinc-600 font-mono text-sm">
            No options positions yet. Select a strike and buy your first contract above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {positions.map((pos: any) => (
              <PositionCard key={pos.id} pos={pos} onClose={handleClosePosition} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
