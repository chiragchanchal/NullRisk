'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Star, TrendingUp, TrendingDown, ArrowRight, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useSWR from 'swr'
import { AssetLogo } from '@/components/ui/asset-logo'

interface WatchlistItem {
  id: string
  symbol: string
  asset_type: 'stock' | 'crypto' | 'forex'
  price: number | null
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const getStableMockChange = (symbol: string) => {
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  const pct = ((Math.abs(hash) % 1000) / 100) - 5
  return pct === 0 ? 1.25 : pct
}

export default function WatchlistPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  const { data: rawWatchlist, error, isLoading, mutate } = useSWR<WatchlistItem[]>(
    '/api/watchlist',
    fetcher,
    { refreshInterval: 15000 }
  )

  const watchlist = Array.isArray(rawWatchlist) ? rawWatchlist : []

  const handleRemove = async (symbol: string, assetType: string) => {
    setToggling(symbol)
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, assetType }),
      })
      if (res.ok) {
        mutate((prev) => (prev || []).filter((item) => item.symbol !== symbol), false)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setToggling(null)
    }
  }

  const filteredList = watchlist.filter((item) =>
    item.symbol.toLowerCase().includes(search.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-zinc-500 gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
        <span className="text-xs font-mono tracking-wider uppercase">Loading Watchlisted Assets...</span>
      </div>
    )
  }

  const errorMessage = error ? error.message || 'Connection error' : null

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">Priority Watchlist</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-white/[0.06]">
              SAVED
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Fast access terminal for pinned market instruments and volatility monitoring
          </p>
        </div>

        {watchlist.length > 0 && (
          <div className="relative w-full sm:w-72 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              placeholder="Filter watchlist..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 bg-zinc-950 border border-white/[0.08] focus:border-emerald-500/40 rounded-xl pl-10 pr-4 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition-all"
            />
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="p-4 text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-2xl font-mono text-xs">
          ⚠️ {errorMessage}
        </div>
      )}

      {!errorMessage && watchlist.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-dashed border-white/[0.1] bg-zinc-950/40 rounded-2xl p-12 text-center max-w-lg mx-auto mt-12"
        >
          <Star className="h-10 w-10 text-amber-400/40 mx-auto mb-3" />
          <h2 className="text-base font-bold font-sans text-zinc-200 mb-1">Watchlist is Empty</h2>
          <p className="text-xs text-zinc-500 font-mono mb-5 leading-relaxed">
            Star assets from the Market Explorer to pin them here for fast execution and live price tracking.
          </p>
          <button
            type="button"
            onClick={() => router.push('/market')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-mono font-bold text-xs transition-all shadow-md"
          >
            <span>Explore 150 Assets</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/80 overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-zinc-900/40 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                  <th className="py-3.5 px-5 font-semibold">Instrument</th>
                  <th className="py-3.5 px-4 font-semibold">Asset Class</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Live Mark Price</th>
                  <th className="py-3.5 px-4 font-semibold text-right">24h Volatility</th>
                  <th className="py-3.5 px-5 font-semibold text-right">Execution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                <AnimatePresence>
                  {filteredList.map((item) => {
                    const mockChange = getStableMockChange(item.symbol)
                    const isPositive = mockChange >= 0

                    return (
                      <motion.tr
                        key={item.symbol}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -16 }}
                        className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                        onClick={() => router.push(`/market/${item.symbol}?type=${item.asset_type}`)}
                      >
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <AssetLogo symbol={item.symbol} type={item.asset_type} size={36} />
                            <div className="font-mono font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors">
                              {item.symbol}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-zinc-900 border border-white/[0.06] text-zinc-400">
                            {item.asset_type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-zinc-100 tabular-nums">
                          {item.price !== null
                            ? `₹${item.price.toLocaleString('en-IN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : <span className="text-zinc-600 font-normal">Syncing...</span>}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div
                            className={`inline-flex items-center justify-end gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold tabular-nums border ${
                              isPositive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isPositive ? '+' : ''}
                            {mockChange.toFixed(2)}%
                          </div>
                        </td>

                        <td className="py-3.5 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              disabled={toggling === item.symbol}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemove(item.symbol, item.asset_type)
                              }}
                              className="p-1.5 rounded-lg hover:bg-zinc-800 text-amber-400 transition-colors"
                              title="Unpin from Watchlist"
                            >
                              <Star className="h-4 w-4 fill-amber-400" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/market/${item.symbol}?type=${item.asset_type}`)
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-300 border border-white/[0.08] hover:border-emerald-400 text-xs font-mono font-bold transition-all shadow-sm"
                            >
                              <span>Trade</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
