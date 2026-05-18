'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Star, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'

// Hardcoded popular assets for MVP
const POPULAR_ASSETS = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Ind.', type: 'stock' },
  { symbol: 'NIFTY', name: 'Nifty 50', type: 'stock' },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto' },
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'forex' },
  { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', type: 'forex' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', type: 'forex' }
]

const getStableMockChange = (symbol: string) => {
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  // Map hash to a value between -5.0 and +5.0
  const pct = ((Math.abs(hash) % 1000) / 100) - 5
  return pct === 0 ? 1.25 : pct
}

export default function MarketExplorer() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'stock' | 'crypto' | 'forex'>('all')
  const [prices, setPrices] = useState<Record<string, number>>({})

  // Fetch prices for all displayed assets
  useEffect(() => {
    const fetchPrices = async () => {
      const newPrices: Record<string, number> = {}
      await Promise.all(
        POPULAR_ASSETS.map(async (asset) => {
          try {
            const res = await fetch(`/api/market/quote?symbol=${asset.symbol}&assetType=${asset.type}`)
            const data = await res.json()
            if (data.price) {
              newPrices[asset.symbol] = data.price
            }
          } catch (e) {
            console.error(`Failed to fetch ${asset.symbol}`)
          }
        })
      )
      setPrices(newPrices)
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 15000)
    return () => clearInterval(interval)
  }, [])

  const filteredAssets = POPULAR_ASSETS.filter((asset) => {
    const matchesSearch = asset.symbol.toLowerCase().includes(search.toLowerCase()) || 
                          asset.name.toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === 'all' || asset.type === activeTab
    return matchesSearch && matchesTab
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Market Explorer</h2>
        <p className="text-muted-foreground">Discover and trade stocks, crypto, and forex.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          {['all', 'stock', 'crypto', 'forex'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-background rounded-md pl-10 pr-4 text-sm outline-none focus:ring-1 focus:ring-primary border border-input"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium">Asset</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium text-right">Price</th>
              <th className="px-6 py-4 font-medium text-right">24h Change</th>
              <th className="px-6 py-4 font-medium text-center">Watchlist</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.map((asset) => {
              const price = prices[asset.symbol]
              // Deterministic stable mock change to prevent hydration errors
              const mockChange = getStableMockChange(asset.symbol)
              const isPositive = mockChange >= 0

              return (
                <tr key={asset.symbol} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-foreground">{asset.symbol}</div>
                    <div className="text-xs text-muted-foreground">{asset.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary capitalize">
                      {asset.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    {price ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Loading...'}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${isPositive ? 'text-gain' : 'text-loss'}`}>
                    <div className="flex items-center justify-end gap-1">
                      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isPositive ? '+' : ''}{mockChange.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-muted-foreground hover:text-primary transition-colors">
                      <Star className="h-5 w-5 mx-auto" />
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => router.push(`/market/${asset.symbol}?type=${asset.type}`)}
                      className="inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3"
                    >
                      Trade
                      <ArrowRight className="ml-1.5 h-3 w-3" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
