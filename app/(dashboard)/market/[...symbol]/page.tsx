'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { createChart, ColorType, CandlestickSeries, UTCTimestamp } from 'lightweight-charts'
import { ArrowLeft, Clock, AlertTriangle, Zap, RefreshCw, Radio } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AIAnalystCard } from '@/components/ui/ai-analyst-card'
import { AssetLogo } from '@/components/ui/asset-logo'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function AssetDetail({ params }: { params: Promise<{ symbol: string[] }> }) {
  const resolvedParams = use(params)
  const symbol = Array.isArray(resolvedParams.symbol)
    ? resolvedParams.symbol.map(decodeURIComponent).join('/')
    : decodeURIComponent(resolvedParams.symbol || '')
  const searchParams = useSearchParams()
  const assetType = searchParams.get('type') || 'stock'
  const router = useRouter()

  const [orderType, setOrderType] = useState<'buy' | 'sell'>('buy')
  const [orderClass, setOrderClass] = useState<'market' | 'limit'>('market')
  const [isMarginMode, setIsMarginMode] = useState(false)
  const [leverage, setLeverage] = useState<number>(2)
  const [quantity, setQuantity] = useState('1')
  const [limitPrice, setLimitPrice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tradeMessage, setTradeMessage] = useState('')
  const [tradeSuccess, setTradeSuccess] = useState(false)

  const chartContainerRef = useRef<HTMLDivElement>(null)

  const { data: quote } = useSWR(
    `/api/market/quote?symbol=${encodeURIComponent(symbol)}&assetType=${assetType}`,
    fetcher,
    { refreshInterval: 15000 }
  )
  const currentPrice = quote?.price || 0

  const { data: ohlc } = useSWR(`/api/market/ohlc?symbol=${encodeURIComponent(symbol)}`, fetcher)
  const { data: news } = useSWR(`/api/market/news?symbol=${encodeURIComponent(symbol)}`, fetcher)

  // Chart initialization
  useEffect(() => {
    if (!chartContainerRef.current || !ohlc || ohlc.length === 0) return

    const container = chartContainerRef.current
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      width: container.clientWidth,
      height: 400,
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: 'rgba(255, 255, 255, 0.08)' },
    })

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    })

    const formattedData = [...ohlc]
      .reverse()
      .map((d: { time: string; open: number; high: number; low: number; close: number }) => ({
        time: (new Date(d.time).getTime() / 1000) as UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))

    candlestickSeries.setData(formattedData)

    const handleResize = () => {
      chart.applyOptions({ width: container.clientWidth })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [ohlc])

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setTradeMessage('')
    setTradeSuccess(false)

    try {
      const endpoint = isMarginMode ? '/api/margin/open' : '/api/trade/execute'
      const body = isMarginMode
        ? { symbol, assetType, quantity: parseFloat(quantity), leverage }
        : {
            symbol,
            assetType,
            quantity: parseFloat(quantity),
            orderType,
            orderClass,
            limitPrice: orderClass === 'limit' ? parseFloat(limitPrice) : undefined,
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (res.ok) {
        setTradeMessage(data.message)
        setTradeSuccess(true)
      } else {
        setTradeMessage(data.error || 'Trade failed.')
        setTradeSuccess(false)
      }
    } catch {
      setTradeMessage('An unexpected error occurred.')
      setTradeSuccess(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const qty = parseFloat(quantity) || 0
  const execPrice = orderClass === 'limit' && limitPrice ? parseFloat(limitPrice) : currentPrice
  const estimatedTotal = qty * execPrice
  const collateralRequired = isMarginMode ? estimatedTotal / leverage : estimatedTotal
  const borrowedAmount = isMarginMode ? estimatedTotal - collateralRequired : 0
  const buyingPower = currentPrice > 0 ? estimatedTotal : 0

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Navigation Breadcrumb */}
      <motion.button
        type="button"
        whileHover={{ x: -2 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
        onClick={() => router.back()}
        className="inline-flex items-center text-xs font-mono text-zinc-400 hover:text-zinc-100 transition-colors group cursor-pointer"
      >
        <ArrowLeft className="mr-2 h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
        <span>Return to Market Explorer</span>
      </motion.button>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Chart, AI Analysis, News */}
        <div className="flex-1 space-y-6">
          {/* Instrument Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-5 rounded-2xl bg-zinc-950/80 border border-white/[0.08] shadow-sm">
            <div className="flex items-center gap-3.5">
              <AssetLogo symbol={symbol} type={assetType} size={48} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold font-mono tracking-tight text-zinc-100">{symbol}</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-zinc-900 border border-white/[0.06] text-zinc-400">
                    {assetType}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs font-mono text-zinc-500">
                  <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                  <span>Interactive Candlestick Feed</span>
                </div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Live Quote</div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-zinc-100 tabular-nums">
                {currentPrice
                  ? `₹${currentPrice.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : 'Syncing...'}
              </div>
            </div>
          </div>

          {/* Interactive Chart Container */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/90 p-4 h-[440px] shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)]">
            {!ohlc || ohlc.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2 font-mono text-xs">
                <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
                <span>Generating OHLC Candlestick Engine...</span>
              </div>
            ) : (
              <div ref={chartContainerRef} className="w-full h-full" />
            )}
          </div>

          {/* AI Analyst Card */}
          <AIAnalystCard symbol={symbol} />

          {/* Latest News Feed */}
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-200">
                Financial News Feed
              </h2>
              <span className="text-[10px] font-mono text-zinc-500">REUTERS / FINNHUB</span>
            </div>

            <div className="space-y-3 pt-1">
              {news && news.length > 0 ? (
                news.map((item: { id: string | number; url: string; headline: string; summary: string; datetime: number; source: string }) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3.5 rounded-xl bg-zinc-900/50 hover:bg-zinc-900 border border-white/[0.04] hover:border-zinc-700 transition-all group"
                  >
                    <h3 className="font-semibold text-xs sm:text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors">
                      {item.headline}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2 font-sans leading-relaxed">
                      {item.summary}
                    </p>
                    <div className="flex items-center text-[10px] font-mono text-zinc-500 mt-2.5">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{new Date(item.datetime * 1000).toLocaleString()}</span>
                      <span className="ml-auto font-medium text-zinc-400">{item.source}</span>
                    </div>
                  </a>
                ))
              ) : (
                <p className="text-zinc-500 text-xs font-mono py-4 text-center">
                  No active news dispatches for this symbol.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Order Entry Terminal */}
        <div className="w-full lg:w-96 space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-6 sticky top-20 shadow-[0_4px_30px_-6px_rgba(0,0,0,0.8)] space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h2 className="text-base font-bold font-mono uppercase tracking-wider text-zinc-100">
                Order Ticket
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-900 border border-white/[0.06] text-zinc-400">
                INSTANT FILL
              </span>
            </div>

            {/* Buy / Sell Toggle */}
            <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-white/[0.06] relative">
              <button
                type="button"
                onClick={() => setOrderType('buy')}
                className={`relative py-2 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                  orderType === 'buy'
                    ? 'text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {orderType === 'buy' && (
                  <motion.div
                    layoutId="orderTypeIndicator"
                    className="absolute inset-0 rounded-lg bg-emerald-500 shadow-md z-0"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-10">BUY / LONG</span>
              </button>
              <button
                type="button"
                onClick={() => setOrderType('sell')}
                className={`relative py-2 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                  orderType === 'sell'
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {orderType === 'sell' && (
                  <motion.div
                    layoutId="orderTypeIndicator"
                    className="absolute inset-0 rounded-lg bg-rose-500 shadow-md z-0"
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  />
                )}
                <span className="relative z-10">SELL / SHORT</span>
              </button>
            </div>

            {/* Leveraged Margin Mode Card */}
            {orderType === 'buy' && (
              <motion.div
                layout
                className={`rounded-xl p-3.5 border transition-all ${
                  isMarginMode
                    ? 'border-amber-500/40 bg-amber-500/10'
                    : 'border-white/[0.06] bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={`h-4 w-4 ${isMarginMode ? 'text-amber-400' : 'text-zinc-500'}`} />
                    <span className="text-xs font-mono font-bold text-zinc-200">Leverage Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMarginMode((v) => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                      isMarginMode ? 'bg-amber-400' : 'bg-zinc-800'
                    }`}
                  >
                    <motion.span
                      layout
                      className="inline-block h-4 w-4 rounded-full bg-white shadow-md"
                      animate={{ x: isMarginMode ? 16 : 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                    />
                  </button>
                </div>

                <AnimatePresence>
                  {isMarginMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2.5 overflow-hidden"
                    >
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400/80">
                          Multiplier Ratio
                        </label>
                        <div className="grid grid-cols-5 gap-1 bg-zinc-950 p-1 rounded-lg border border-white/[0.06]">
                          {[2, 5, 10, 25, 50].map((lvl) => (
                            <motion.button
                              key={lvl}
                              type="button"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.94 }}
                              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                              onClick={() => setLeverage(lvl)}
                              className={`py-1 text-xs font-mono font-bold rounded transition-colors cursor-pointer ${
                                leverage === lvl
                                  ? 'bg-amber-400 text-zinc-950 shadow-sm'
                                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                              }`}
                            >
                              {lvl}x
                            </motion.button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] font-mono text-amber-300/80 leading-relaxed">
                        {leverage}x leverage: ₹{collateralRequired.toLocaleString('en-IN', { maximumFractionDigits: 0 })}{' '}
                        collateral controls ₹{buyingPower.toLocaleString('en-IN', { maximumFractionDigits: 0 })} buying power.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Order Form */}
            <form onSubmit={handleTrade} className="space-y-4">
              {!isMarginMode && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                    Execution Type
                  </label>
                  <select
                    value={orderClass}
                    onChange={(e) => setOrderClass(e.target.value as 'market' | 'limit')}
                    className="w-full h-10 bg-zinc-900 border border-white/[0.08] focus:border-emerald-500/40 rounded-xl px-3 text-xs font-mono text-zinc-200 outline-none transition-all"
                  >
                    <option value="market">Market Order (Immediate Fill)</option>
                    <option value="limit">Limit Order (Target Price)</option>
                  </select>
                </div>
              )}

              {!isMarginMode && orderClass === 'limit' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                    Target Limit Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={limitPrice}
                    onChange={(e) => setLimitPrice(e.target.value)}
                    placeholder={currentPrice ? currentPrice.toString() : '0.00'}
                    className="w-full h-10 bg-zinc-900 border border-white/[0.08] focus:border-emerald-500/40 rounded-xl px-3 text-xs font-mono text-zinc-200 outline-none transition-all"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">
                  Order Quantity
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full h-10 bg-zinc-900 border border-white/[0.08] focus:border-emerald-500/40 rounded-xl px-3 text-xs font-mono text-zinc-200 outline-none transition-all"
                />
              </div>

              {/* Order Cost Breakdown */}
              <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06] space-y-1.5 text-xs font-mono">
                {isMarginMode ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total Notional</span>
                      <span className="font-bold text-zinc-200 tabular-nums">
                        ₹{estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Required Collateral</span>
                      <span className="font-bold text-amber-400 tabular-nums">
                        ₹{collateralRequired.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Borrowed Margin</span>
                      <span className="text-zinc-400 tabular-nums">
                        ₹{borrowedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Estimated Total</span>
                    <span className="text-sm font-bold font-mono text-zinc-100 tabular-nums">
                      ₹{estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                disabled={isSubmitting || !quantity || (!isMarginMode && orderClass === 'limit' && !limitPrice)}
                className={`w-full h-11 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-40 shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                  isMarginMode
                    ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-amber-500/10'
                    : orderType === 'buy'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-500/10'
                    : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/10'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Executing Order...
                  </>
                ) : isMarginMode ? (
                  `⚡ Execute Margin Contract`
                ) : (
                  `${orderType === 'buy' ? 'Execute Buy' : 'Execute Sell'} ${symbol}`
                )}
              </motion.button>

              <AnimatePresence>
                {tradeMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-xl text-xs font-mono font-semibold text-center border ${
                      tradeSuccess
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {tradeMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Education Risk Note */}
          <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-white/[0.06] flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] font-mono text-zinc-500 leading-relaxed">
              Paper orders execute against live market marks without capital risk. Settlement balances update immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
