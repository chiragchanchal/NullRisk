'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Star, TrendingUp, TrendingDown, ArrowRight, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface WatchlistItem {
  id: string
  symbol: string
  asset_type: 'stock' | 'crypto' | 'forex'
  price: number | null
}

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
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/watchlist')
      const data = await res.json()
      if (res.ok) {
        setWatchlist(data)
        setError(null)
      } else {
        setError(data.error || 'Failed to load watchlist')
      }
    } catch (e: any) {
      setError(e.message || 'Connection error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWatchlist()
    const interval = setInterval(fetchWatchlist, 15000)
    return () => clearInterval(interval)
  }, [])

  const handleRemove = async (symbol: string, assetType: string) => {
    setToggling(symbol)
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, assetType })
      })
      if (res.ok) {
        setWatchlist(prev => prev.filter(item => item.symbol !== symbol))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setToggling(null)
    }
  }

  const filteredList = watchlist.filter(item =>
    item.symbol.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh] text-muted-foreground">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Your Watchlist</h2>
        <p className="text-muted-foreground">Monitor and quickly access your favorite assets.</p>
      </div>

      {error && (
        <div className="p-4 text-loss bg-loss/10 border border-loss/20 rounded-xl">
          {error}
        </div>
      )}

      {!error && watchlist.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border border-dashed border-border bg-card rounded-xl p-12 text-center max-w-lg mx-auto mt-12"
        >
          <Star className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Watchlist is empty</h3>
          <p className="text-sm text-muted-foreground mb-6">
            You haven&apos;t added any assets to your watchlist yet. Browse popular assets and click the star to save them.
          </p>
          <button
            onClick={() => router.push('/market')}
            className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-all bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4"
          >
            Explore Markets
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </motion.div>
      ) : (
        <>
          <div className="flex justify-end">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search watchlisted assets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 bg-background rounded-md pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary border border-input"
              />
            </div>
          </div>

          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Asset</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium text-right">Price</th>
                  <th className="px-6 py-4 font-medium text-right">24h Change</th>
                  <th className="px-6 py-4 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredList.map((item) => {
                    const mockChange = getStableMockChange(item.symbol)
                    const isPositive = mockChange >= 0

                    return (
                      <motion.tr
                        key={item.symbol}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="font-bold text-foreground">{item.symbol}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                            {item.asset_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium">
                          {item.price !== null
                            ? `₹${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : 'Loading...'}
                        </td>
                        <td className={`px-6 py-4 text-right font-medium ${isPositive ? 'text-gain' : 'text-loss'}`}>
                          <div className="flex items-center justify-end gap-1">
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {isPositive ? '+' : ''}{mockChange.toFixed(2)}%
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              disabled={toggling === item.symbol}
                              onClick={() => handleRemove(item.symbol, item.asset_type)}
                              className="text-muted-foreground hover:text-loss transition-colors p-1"
                              title="Remove from Watchlist"
                            >
                              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500 hover:scale-110 transition-transform" />
                            </button>
                            <button
                              onClick={() => router.push(`/market/${item.symbol}?type=${item.asset_type}`)}
                              className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3"
                            >
                              Trade
                              <ArrowRight className="ml-1.5 h-3 w-3" />
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
        </>
      )}
    </div>
  )
}
