'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Star, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react'

// Comprehensive 150 assets list (50 Stocks, 50 Cryptocurrencies, 50 Forex pairs)
const POPULAR_ASSETS = [
  // ================= STOCKS (50) =================
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
  { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock' },
  { symbol: 'NFLX', name: 'Netflix Inc.', type: 'stock' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', type: 'stock' },
  { symbol: 'INTC', name: 'Intel Corp.', type: 'stock' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', type: 'stock' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', type: 'stock' },
  { symbol: 'V', name: 'Visa Inc.', type: 'stock' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', type: 'stock' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock' },
  { symbol: 'UNH', name: 'UnitedHealth Group', type: 'stock' },
  { symbol: 'HD', name: 'Home Depot Inc.', type: 'stock' },
  { symbol: 'LLY', name: 'Eli Lilly & Co.', type: 'stock' },
  { symbol: 'BAC', name: 'Bank of America', type: 'stock' },
  { symbol: 'DIS', name: 'Walt Disney Co.', type: 'stock' },
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', type: 'stock' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', type: 'stock' },
  { symbol: 'INFY.NS', name: 'Infosys Ltd.', type: 'stock' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.', type: 'stock' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.', type: 'stock' },
  { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever', type: 'stock' },
  { symbol: 'ITC.NS', name: 'ITC Ltd.', type: 'stock' },
  { symbol: 'SBIN.NS', name: 'State Bank of India', type: 'stock' },
  { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel', type: 'stock' },
  { symbol: 'KOTAKBANK.NS', name: 'Kotak Mahindra Bank', type: 'stock' },
  { symbol: 'LT.NS', name: 'Larsen & Toubro', type: 'stock' },
  { symbol: 'AXISBANK.NS', name: 'Axis Bank Ltd.', type: 'stock' },
  { symbol: 'ASIANPAINT.NS', name: 'Asian Paints', type: 'stock' },
  { symbol: 'MARUTI.NS', name: 'Maruti Suzuki', type: 'stock' },
  { symbol: 'SUNPHARMA.NS', name: 'Sun Pharmaceutical', type: 'stock' },
  { symbol: 'TITAN.NS', name: 'Titan Company Ltd.', type: 'stock' },
  { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement', type: 'stock' },
  { symbol: 'WIPRO.NS', name: 'Wipro Ltd.', type: 'stock' },
  { symbol: 'NESTLEIND.NS', name: 'Nestle India', type: 'stock' },
  { symbol: 'M&M.NS', name: 'Mahindra & Mahindra', type: 'stock' },
  { symbol: 'HCLTECH.NS', name: 'HCL Technologies', type: 'stock' },
  { symbol: 'TATASTEEL.NS', name: 'Tata Steel Ltd.', type: 'stock' },
  { symbol: 'NTPC.NS', name: 'NTPC Ltd.', type: 'stock' },
  { symbol: 'POWERGRID.NS', name: 'Power Grid Corp.', type: 'stock' },
  { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance', type: 'stock' },
  { symbol: 'BAJAJFINSV.NS', name: 'Bajaj Finserv', type: 'stock' },
  { symbol: 'ONGC.NS', name: 'Oil & Natural Gas Corp.', type: 'stock' },
  { symbol: 'ADANIENT.NS', name: 'Adani Enterprises', type: 'stock' },
  { symbol: 'JSWSTEEL.NS', name: 'JSW Steel Ltd.', type: 'stock' },
  { symbol: 'COALINDIA.NS', name: 'Coal India Ltd.', type: 'stock' },

  // ================= CRYPTOCURRENCIES (50) =================
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto' },
  { symbol: 'BNB', name: 'BNB', type: 'crypto' },
  { symbol: 'ADA', name: 'Cardano', type: 'crypto' },
  { symbol: 'XRP', name: 'Ripple', type: 'crypto' },
  { symbol: 'DOT', name: 'Polkadot', type: 'crypto' },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto' },
  { symbol: 'SHIB', name: 'Shiba Inu', type: 'crypto' },
  { symbol: 'AVAX', name: 'Avalanche', type: 'crypto' },
  { symbol: 'MATIC', name: 'Polygon', type: 'crypto' },
  { symbol: 'LTC', name: 'Litecoin', type: 'crypto' },
  { symbol: 'LINK', name: 'Chainlink', type: 'crypto' },
  { symbol: 'UNI', name: 'Uniswap', type: 'crypto' },
  { symbol: 'NEAR', name: 'NEAR Protocol', type: 'crypto' },
  { symbol: 'ATOM', name: 'Cosmos', type: 'crypto' },
  { symbol: 'XLM', name: 'Stellar', type: 'crypto' },
  { symbol: 'ALGO', name: 'Algorand', type: 'crypto' },
  { symbol: 'ICP', name: 'Internet Computer', type: 'crypto' },
  { symbol: 'FTM', name: 'Fantom', type: 'crypto' },
  { symbol: 'MANA', name: 'Decentraland', type: 'crypto' },
  { symbol: 'SAND', name: 'The Sandbox', type: 'crypto' },
  { symbol: 'AAVE', name: 'Aave', type: 'crypto' },
  { symbol: 'CRV', name: 'Curve DAO Token', type: 'crypto' },
  { symbol: 'MKR', name: 'Maker', type: 'crypto' },
  { symbol: 'COMP', name: 'Compound', type: 'crypto' },
  { symbol: 'GRT', name: 'The Graph', type: 'crypto' },
  { symbol: 'SNX', name: 'Synthetix', type: 'crypto' },
  { symbol: 'AXS', name: 'Axie Infinity', type: 'crypto' },
  { symbol: 'GALA', name: 'Gala', type: 'crypto' },
  { symbol: 'DYDX', name: 'dYdX', type: 'crypto' },
  { symbol: 'RUNE', name: 'THORChain', type: 'crypto' },
  { symbol: 'IMX', name: 'Immutable', type: 'crypto' },
  { symbol: 'ENJ', name: 'Enjin Coin', type: 'crypto' },
  { symbol: 'BAT', name: 'Basic Attention Token', type: 'crypto' },
  { symbol: 'THETA', name: 'Theta Network', type: 'crypto' },
  { symbol: 'LRC', name: 'Loopring', type: 'crypto' },
  { symbol: 'CHZ', name: 'Chiliz', type: 'crypto' },
  { symbol: 'GMT', name: 'STEPN', type: 'crypto' },
  { symbol: 'APT', name: 'Aptos', type: 'crypto' },
  { symbol: 'OP', name: 'Optimism', type: 'crypto' },
  { symbol: 'ARB', name: 'Arbitrum', type: 'crypto' },
  { symbol: 'LDO', name: 'Lido DAO', type: 'crypto' },
  { symbol: 'GMX', name: 'GMX', type: 'crypto' },
  { symbol: 'EGLD', name: 'MultiversX', type: 'crypto' },
  { symbol: 'FLOW', name: 'Flow', type: 'crypto' },
  { symbol: 'MINA', name: 'Mina', type: 'crypto' },
  { symbol: 'XTZ', name: 'Tezos', type: 'crypto' },
  { symbol: 'EOS', name: 'EOS', type: 'crypto' },
  { symbol: 'VET', name: 'VeChain', type: 'crypto' },

  // ================= FOREX (50) =================
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'forex' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', type: 'forex' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', type: 'forex' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', type: 'forex' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', type: 'forex' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', type: 'forex' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', type: 'forex' },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', type: 'forex' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', type: 'forex' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', type: 'forex' },
  { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', type: 'forex' },
  { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', type: 'forex' },
  { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', type: 'forex' },
  { symbol: 'GBP/CHF', name: 'British Pound / Swiss Franc', type: 'forex' },
  { symbol: 'GBP/CAD', name: 'British Pound / Canadian Dollar', type: 'forex' },
  { symbol: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen', type: 'forex' },
  { symbol: 'NZD/JPY', name: 'New Zealand Dollar / Japanese Yen', type: 'forex' },
  { symbol: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen', type: 'forex' },
  { symbol: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen', type: 'forex' },
  { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', type: 'forex' },
  { symbol: 'EUR/INR', name: 'Euro / Indian Rupee', type: 'forex' },
  { symbol: 'GBP/INR', name: 'British Pound / Indian Rupee', type: 'forex' },
  { symbol: 'JPY/INR', name: 'Japanese Yen / Indian Rupee', type: 'forex' },
  { symbol: 'AED/INR', name: 'UAE Dirham / Indian Rupee', type: 'forex' },
  { symbol: 'SAR/INR', name: 'Saudi Riyal / Indian Rupee', type: 'forex' },
  { symbol: 'USD/CNY', name: 'US Dollar / Chinese Yuan', type: 'forex' },
  { symbol: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar', type: 'forex' },
  { symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar', type: 'forex' },
  { symbol: 'USD/ZAR', name: 'US Dollar / South African Rand', type: 'forex' },
  { symbol: 'USD/MXN', name: 'US Dollar / Mexican Peso', type: 'forex' },
  { symbol: 'USD/TRY', name: 'US Dollar / Turkish Lira', type: 'forex' },
  { symbol: 'USD/SEK', name: 'US Dollar / Swedish Krona', type: 'forex' },
  { symbol: 'USD/NOK', name: 'US Dollar / Norwegian Krone', type: 'forex' },
  { symbol: 'USD/DKK', name: 'US Dollar / Danish Krone', type: 'forex' },
  { symbol: 'USD/THB', name: 'US Dollar / Thai Baht', type: 'forex' },
  { symbol: 'USD/MYR', name: 'US Dollar / Malaysian Ringgit', type: 'forex' },
  { symbol: 'USD/IDR', name: 'US Dollar / Indonesian Rupiah', type: 'forex' },
  { symbol: 'USD/PHP', name: 'US Dollar / Philippine Peso', type: 'forex' },
  { symbol: 'USD/KRW', name: 'US Dollar / South Korean Won', type: 'forex' },
  { symbol: 'USD/TWD', name: 'US Dollar / Taiwan Dollar', type: 'forex' },
  { symbol: 'USD/VND', name: 'US Dollar / Vietnamese Dong', type: 'forex' },
  { symbol: 'USD/BRL', name: 'US Dollar / Brazilian Real', type: 'forex' },
  { symbol: 'USD/RUB', name: 'US Dollar / Russian Ruble', type: 'forex' },
  { symbol: 'USD/PLN', name: 'US Dollar / Polish Zloty', type: 'forex' },
  { symbol: 'USD/ILS', name: 'US Dollar / Israeli Shekel', type: 'forex' },
  { symbol: 'USD/ARS', name: 'US Dollar / Argentine Peso', type: 'forex' },
  { symbol: 'USD/CLP', name: 'US Dollar / Chilean Peso', type: 'forex' },
  { symbol: 'USD/COP', name: 'US Dollar / Colombian Peso', type: 'forex' },
  { symbol: 'USD/PEN', name: 'US Dollar / Peruvian Sol', type: 'forex' },
  { symbol: 'USD/NZD', name: 'US Dollar / New Zealand Dollar', type: 'forex' }
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
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Fetch watchlist on mount
  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const res = await fetch('/api/watchlist')
        const data = await res.json()
        if (res.ok) {
          setWatchlist(data.map((item: any) => item.symbol))
        }
      } catch (e) {
        console.error('Failed to fetch watchlist:', e)
      }
    }
    fetchWatchlist()
  }, [])

  const toggleWatchlist = async (symbol: string, assetType: string) => {
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, assetType })
      })
      const data = await res.json()
      if (res.ok) {
        if (data.action === 'added') {
          setWatchlist(prev => [...prev, symbol])
        } else {
          setWatchlist(prev => prev.filter(s => s !== symbol))
        }
      }
    } catch (e) {
      console.error('Failed to toggle watchlist:', e)
    }
  }

  // Filter assets based on search and active tab
  const filteredAssets = POPULAR_ASSETS.filter((asset) => {
    const matchesSearch = asset.symbol.toLowerCase().includes(search.toLowerCase()) || 
                          asset.name.toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === 'all' || asset.type === activeTab
    return matchesSearch && matchesTab
  })

  // Reset to page 1 when search or tab changes
  useEffect(() => {
    setCurrentPage(1)
  }, [search, activeTab])

  // Paginated visible assets list
  const totalPages = Math.ceil(filteredAssets.length / pageSize)
  const startIdx = (currentPage - 1) * pageSize
  const visibleAssets = filteredAssets.slice(startIdx, startIdx + pageSize)

  // Fetch prices only for currently visible assets on interval
  const visibleAssetString = JSON.stringify(visibleAssets.map(a => a.symbol))

  useEffect(() => {
    if (visibleAssets.length === 0) return

    const fetchPrices = async () => {
      const newPrices = { ...prices }
      await Promise.all(
        visibleAssets.map(async (asset) => {
          try {
            const res = await fetch(`/api/market/quote?symbol=${asset.symbol}&assetType=${asset.type}`)
            const data = await res.json()
            if (data.price) {
              newPrices[asset.symbol] = data.price
            }
          } catch (e) {
            console.error(`Failed to fetch price for ${asset.symbol}`, e)
          }
        })
      )
      setPrices(newPrices)
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 15000)
    return () => clearInterval(interval)
  }, [visibleAssetString])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Market Explorer</h2>
        <p className="text-muted-foreground">Discover and trade stocks, crypto, and forex.</p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg overflow-x-auto max-w-full">
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
      <div className="border border-border rounded-xl bg-card overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[600px] sm:min-w-0">
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
            {visibleAssets.map((asset) => {
              const price = prices[asset.symbol]
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
                  <td className="px-6 py-4 text-right font-medium font-mono">
                    {price ? `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Loading...'}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${isPositive ? 'text-gain' : 'text-loss'}`}>
                    <div className="flex items-center justify-end gap-1 font-mono">
                      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isPositive ? '+' : ''}{mockChange.toFixed(2)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => toggleWatchlist(asset.symbol, asset.type)}
                      className="text-muted-foreground hover:text-primary transition-colors p-1"
                    >
                      <Star 
                        className={`h-5 w-5 mx-auto transition-all ${
                          watchlist.includes(asset.symbol) 
                            ? 'fill-yellow-500 text-yellow-500 scale-110' 
                            : 'hover:scale-110'
                        }`} 
                      />
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
            {visibleAssets.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No assets found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-border/50">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{startIdx + 1}</span> to <span className="font-semibold text-foreground">{Math.min(filteredAssets.length, startIdx + pageSize)}</span> of <span className="font-semibold text-foreground">{filteredAssets.length}</span> assets
          </p>
          <div className="flex items-center gap-1.5 bg-muted/30 p-1 rounded-lg border border-border/30 overflow-x-auto max-w-full">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = currentPage
              if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              if (pageNum <= 0 || pageNum > totalPages) return null

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`h-8 w-8 text-xs font-mono font-bold rounded-md transition-all ${
                    currentPage === pageNum
                      ? 'bg-primary text-primary-foreground shadow-md scale-[1.05]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all hover:bg-muted text-muted-foreground disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
