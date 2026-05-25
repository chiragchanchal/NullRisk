'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { createChart, ColorType, CandlestickSeries, UTCTimestamp } from 'lightweight-charts'
import { ArrowLeft, Clock, AlertTriangle, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AIAnalystCard } from '@/components/ui/ai-analyst-card'
import { AssetLogo } from '@/components/ui/asset-logo'

const fetcher = (url: string) => fetch(url).then(res => res.json())

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

  const { data: quote } = useSWR(`/api/market/quote?symbol=${symbol}&assetType=${assetType}`, fetcher, { refreshInterval: 15000 })
  const currentPrice = quote?.price || 0

  const { data: ohlc } = useSWR(`/api/market/ohlc?symbol=${symbol}`, fetcher)
  const { data: news } = useSWR(`/api/market/news?symbol=${symbol}`, fetcher)

  // Chart
  useEffect(() => {
    if (!chartContainerRef.current || !ohlc || ohlc.length === 0) return

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth })
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.9)',
      },
      grid: {
        vertLines: { color: 'rgba(197, 203, 206, 0.1)' },
        horzLines: { color: 'rgba(197, 203, 206, 0.1)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: { timeVisible: true, secondsVisible: false }
    })

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#00C896', downColor: '#FF4D4D',
      borderVisible: false, wickUpColor: '#00C896', wickDownColor: '#FF4D4D',
    })

    const formattedData = [...ohlc].reverse().map((d: any) => ({
      time: (new Date(d.time).getTime() / 1000) as UTCTimestamp,
      open: d.open, high: d.high, low: d.low, close: d.close,
    }))

    candlestickSeries.setData(formattedData)
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
            symbol, assetType,
            quantity: parseFloat(quantity),
            orderType, orderClass,
            limitPrice: orderClass === 'limit' ? parseFloat(limitPrice) : undefined
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
  // In margin mode, user collateral = estimatedTotal / leverage
  const collateralRequired = isMarginMode ? estimatedTotal / leverage : estimatedTotal
  const borrowedAmount = isMarginMode ? estimatedTotal - collateralRequired : 0
  const buyingPower = currentPrice > 0 ? estimatedTotal : 0

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Market
      </button>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Left: Chart + News */}
        <div className="flex-1 space-y-6">
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-4">
              <AssetLogo symbol={symbol} type={assetType} size={48} />
              <div>
                <h1 className="text-4xl font-bold tracking-tight leading-tight">{symbol}</h1>
                <p className="text-muted-foreground uppercase">{assetType}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold font-mono">
                {currentPrice ? `₹${currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl bg-card p-4 h-[432px]">
            {(!ohlc || ohlc.length === 0) ? (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Loading chart data...</div>
            ) : (
              <div ref={chartContainerRef} className="w-full h-full" />
            )}
          </div>

          {/* AI Analyst Card */}
          <AIAnalystCard symbol={symbol} />

          {/* News */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Latest News</h3>
            <div className="space-y-4">
              {news && news.length > 0 ? news.map((item: any) => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="block border border-border bg-card p-4 rounded-xl hover:bg-muted/50 transition-colors">
                  <h4 className="font-medium text-foreground">{item.headline}</h4>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                  <div className="flex items-center text-xs text-muted-foreground mt-3">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(item.datetime * 1000).toLocaleString()}
                    <span className="ml-auto font-medium">{item.source}</span>
                  </div>
                </a>
              )) : (
                <p className="text-muted-foreground text-sm">No recent news available.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Order Panel */}
        <div className="w-full md:w-80 space-y-4">
          <div className="border border-border bg-card rounded-xl p-6 sticky top-6 space-y-5">
            <h3 className="text-lg font-bold">Place Order</h3>

            {/* Buy / Sell toggle */}
            <div className="flex bg-muted rounded-md p-1">
              <button onClick={() => setOrderType('buy')}
                className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${orderType === 'buy' ? 'bg-background text-gain shadow-sm' : 'text-muted-foreground'}`}>
                Buy
              </button>
              <button onClick={() => setOrderType('sell')}
                className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${orderType === 'sell' ? 'bg-background text-loss shadow-sm' : 'text-muted-foreground'}`}>
                Sell
              </button>
            </div>

            {/* Margin Mode Toggle — only on buy */}
            {orderType === 'buy' && (
              <motion.div
                layout
                className={`rounded-xl p-4 border transition-colors ${isMarginMode ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className={`h-4 w-4 ${isMarginMode ? 'text-yellow-400' : 'text-muted-foreground'}`} />
                    <span className="text-sm font-semibold">Margin Mode</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsMarginMode(v => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${isMarginMode ? 'bg-yellow-500' : 'bg-muted'}`}
                  >
                    <motion.span
                      layout
                      className="inline-block h-5 w-5 transform rounded-full bg-white shadow-md"
                      animate={{ x: isMarginMode ? 20 : 0 }}
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
                      className="mt-3 space-y-3 overflow-hidden"
                    >
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-wider">Leverage</label>
                        <div className="grid grid-cols-5 gap-1 bg-muted/50 p-0.5 rounded-lg border border-border/50">
                          {[2, 5, 10, 25, 50].map((level) => (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setLeverage(level)}
                              className={`py-1 text-xs font-mono font-bold rounded transition-all ${
                                leverage === level
                                  ? 'bg-yellow-500 text-black shadow-sm scale-[1.03]'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              }`}
                            >
                              {level}x
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-yellow-400/80">
                        {leverage}x leverage: Your ₹{(collateralRequired).toLocaleString('en-IN', { maximumFractionDigits: 0 })} collateral controls ₹{buyingPower.toLocaleString('en-IN', { maximumFractionDigits: 0 })} buying power. 0.05% daily interest applies.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            <form onSubmit={handleTrade} className="space-y-4">
              {/* Order Class (hidden in margin mode) */}
              {!isMarginMode && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Order Type</label>
                  <select value={orderClass} onChange={e => setOrderClass(e.target.value as any)}
                    className="w-full h-10 bg-background rounded-md px-3 text-sm border border-input focus:ring-1 focus:ring-primary outline-none">
                    <option value="market">Market</option>
                    <option value="limit">Limit</option>
                  </select>
                </div>
              )}

              {!isMarginMode && orderClass === 'limit' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Limit Price (₹)</label>
                  <input type="number" step="0.01" min="0" required value={limitPrice}
                    onChange={e => setLimitPrice(e.target.value)}
                    className="w-full h-10 bg-background rounded-md px-3 text-sm border border-input focus:ring-1 focus:ring-primary outline-none font-mono" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase">Quantity</label>
                <input type="number" step="0.0001" min="0.0001" required value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="w-full h-10 bg-background rounded-md px-3 text-sm border border-input focus:ring-1 focus:ring-primary outline-none font-mono" />
              </div>

              <div className="pt-3 border-t border-border space-y-1.5">
                {isMarginMode ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Position</span>
                      <span className="font-mono font-bold">₹{estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your Collateral ({Math.round(100 / leverage)}%)</span>
                      <span className="font-mono font-bold text-yellow-400">₹{collateralRequired.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Borrowed ({Math.round(100 - (100 / leverage))}%)</span>
                      <span className="font-mono text-muted-foreground">₹{borrowedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Estimated Total</span>
                    <span className="font-bold font-mono text-lg">₹{estimatedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              <button type="submit"
                disabled={isSubmitting || !quantity || (!isMarginMode && orderClass === 'limit' && !limitPrice)}
                className={`w-full h-12 rounded-md font-bold text-white transition-opacity disabled:opacity-50 ${
                  isMarginMode ? 'bg-yellow-500 hover:bg-yellow-500/90' :
                  orderType === 'buy' ? 'bg-gain hover:bg-gain/90' : 'bg-loss hover:bg-loss/90'
                }`}
              >
                {isSubmitting ? 'Processing...' : isMarginMode
                  ? `⚡ Open Margin Position`
                  : `${orderType === 'buy' ? 'Buy' : 'Sell'} ${symbol}`}
              </button>

              <AnimatePresence>
                {tradeMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`p-3 rounded-md text-sm font-medium text-center ${tradeSuccess ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'}`}
                  >
                    {tradeMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* Disclaimer Banner */}
          <div className="border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-400/80 leading-relaxed">
              <strong className="text-yellow-400">Simulated leverage only</strong> — for educational purposes. No real funds are at risk. Margin positions may be automatically liquidated.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

