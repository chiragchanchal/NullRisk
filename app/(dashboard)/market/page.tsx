'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Star, TrendingUp, TrendingDown, ArrowRight, X } from 'lucide-react'
import { AssetLogo } from '@/components/ui/asset-logo'

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
  { symbol: 'HBAR', name: 'Hedera', type: 'crypto' },
  { symbol: 'QNT', name: 'Quant', type: 'crypto' },
  { symbol: 'EGLD', name: 'MultiversX', type: 'crypto' },
  { symbol: 'FLOW', name: 'Flow', type: 'crypto' },
  { symbol: 'KAVA', name: 'Kava', type: 'crypto' },
  { symbol: 'MINA', name: 'Mina', type: 'crypto' },
  { symbol: 'TWT', name: 'Trust Wallet Token', type: 'crypto' },
  { symbol: 'ZIL', name: 'Zilliqa', type: 'crypto' },
  { symbol: '1INCH', name: '1inch Network', type: 'crypto' },
  { symbol: 'DASH', name: 'Dash', type: 'crypto' },
  { symbol: 'ZEC', name: 'Zcash', type: 'crypto' },
  { symbol: 'XMR', name: 'Monero', type: 'crypto' },

  // ================= FOREX (50) =================
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'forex' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', type: 'forex' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', type: 'forex' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', type: 'forex' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', type: 'forex' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', type: 'forex' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', type: 'forex' },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', type: 'forex' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', type: 'forex' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', type: 'forex' },
  { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', type: 'forex' },
  { symbol: 'EUR/INR', name: 'Euro / Indian Rupee', type: 'forex' },
  { symbol: 'GBP/INR', name: 'British Pound / Indian Rupee', type: 'forex' },
  { symbol: 'JPY/INR', name: 'Japanese Yen / Indian Rupee', type: 'forex' },
  { symbol: 'AUD/INR', name: 'Australian Dollar / Indian Rupee', type: 'forex' },
  { symbol: 'CAD/INR', name: 'Canadian Dollar / Indian Rupee', type: 'forex' },
  { symbol: 'CHF/INR', name: 'Swiss Franc / Indian Rupee', type: 'forex' },
  { symbol: 'AED/INR', name: 'UAE Dirham / Indian Rupee', type: 'forex' },
  { symbol: 'SAR/INR', name: 'Saudi Riyal / Indian Rupee', type: 'forex' },
  { symbol: 'SGD/INR', name: 'Singapore Dollar / Indian Rupee', type: 'forex' },
  { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', type: 'forex' },
  { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', type: 'forex' },
  { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', type: 'forex' },
  { symbol: 'GBP/CHF', name: 'British Pound / Swiss Franc', type: 'forex' },
  { symbol: 'GBP/AUD', name: 'British Pound / Australian Dollar', type: 'forex' },
  { symbol: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen', type: 'forex' },
  { symbol: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen', type: 'forex' },
  { symbol: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen', type: 'forex' },
  { symbol: 'NZD/JPY', name: 'New Zealand Dollar / Japanese Yen', type: 'forex' },
  { symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar', type: 'forex' },
  { symbol: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar', type: 'forex' },
  { symbol: 'USD/CNH', name: 'US Dollar / Chinese Yuan (Offshore)', type: 'forex' },
  { symbol: 'USD/ZAR', name: 'US Dollar / South African Rand', type: 'forex' },
  { symbol: 'USD/TRY', name: 'US Dollar / Turkish Lira', type: 'forex' },
  { symbol: 'USD/MXN', name: 'US Dollar / Mexican Peso', type: 'forex' },
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
]

const getStableMockChange = (symbol: string) => {
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  const pct = ((Math.abs(hash) % 1000) / 100) - 5
  return pct === 0 ? 1.25 : pct
}

export default function MarketExplorer() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'all' | 'stock' | 'crypto' | 'forex'>('all')
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [prices, setPrices] = useState<Record<string, number>>({})

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 15

  // Fetch watchlist
  useEffect(() => {
    const fetchWatchlist = async () => {
      try {
        const res = await fetch('/api/watchlist')
        const data = await res.json()
        if (res.ok) {
          setWatchlist(data.map((item: { symbol: string }) => item.symbol))
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
        body: JSON.stringify({ symbol, assetType }),
      })
      const data = await res.json()
      if (res.ok) {
        if (data.action === 'added') {
          setWatchlist((prev) => [...prev, symbol])
        } else {
          setWatchlist((prev) => prev.filter((s) => s !== symbol))
        }
      }
    } catch (e) {
      console.error('Failed to toggle watchlist:', e)
    }
  }

  // Filter assets
  const filteredAssets = useMemo(() => {
    return POPULAR_ASSETS.filter((asset) => {
      const matchesSearch =
        asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
        asset.name.toLowerCase().includes(search.toLowerCase())
      const matchesTab = activeTab === 'all' || asset.type === activeTab
      return matchesSearch && matchesTab
    })
  }, [search, activeTab])

  const totalPages = Math.ceil(filteredAssets.length / pageSize)
  const startIdx = (currentPage - 1) * pageSize
  const visibleAssets = useMemo(() => {
    return filteredAssets.slice(startIdx, startIdx + pageSize)
  }, [filteredAssets, startIdx, pageSize])

  useEffect(() => {
    if (visibleAssets.length === 0) return

    const fetchPrices = async () => {
      const updates: Record<string, number> = {}
      await Promise.all(
        visibleAssets.map(async (asset) => {
          try {
            const res = await fetch(`/api/market/quote?symbol=${encodeURIComponent(asset.symbol)}&assetType=${asset.type}`)
            const data = await res.json()
            if (data.price) {
              updates[asset.symbol] = data.price
            }
          } catch (e) {
            console.error(`Failed to fetch price for ${asset.symbol}`, e)
          }
        })
      )
      setPrices((prev) => ({ ...prev, ...updates }))
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 15000)
    return () => clearInterval(interval)
  }, [visibleAssets])

  const tabs: Array<'all' | 'stock' | 'crypto' | 'forex'> = ['all', 'stock', 'crypto', 'forex']

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">Market Explorer</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-white/[0.06]">
              150 ASSETS
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Global stocks, high-liquidity crypto tokens, and major currency pairs
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 bg-zinc-900/80 border border-white/[0.08] rounded-xl self-start sm:self-auto overflow-x-auto max-w-full">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab)
                setCurrentPage(1)
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab === 'all' ? 'All Classes' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Meta Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
          <input
            type="text"
            placeholder="Search by symbol or asset name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full h-10 bg-zinc-950 border border-white/[0.08] focus:border-emerald-500/40 rounded-xl pl-10 pr-9 text-xs font-mono text-zinc-200 placeholder:text-zinc-600 outline-none transition-all focus:ring-1 focus:ring-emerald-500/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-zinc-500 self-end sm:self-center">
          Showing <span className="text-zinc-300 font-bold">{filteredAssets.length}</span> matching instruments
        </div>
      </div>

      {/* Asset Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/80 overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-zinc-900/40 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                <th className="py-3.5 px-5 font-semibold">Instrument</th>
                <th className="py-3.5 px-4 font-semibold">Sector / Class</th>
                <th className="py-3.5 px-4 font-semibold text-right">Live Mark Price</th>
                <th className="py-3.5 px-4 font-semibold text-right">24h Volatility</th>
                <th className="py-3.5 px-4 font-semibold text-center">Watch</th>
                <th className="py-3.5 px-5 font-semibold text-right">Order Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {visibleAssets.map((asset) => {
                const price = prices[asset.symbol]
                const mockChange = getStableMockChange(asset.symbol)
                const isPositive = mockChange >= 0
                const isWatched = watchlist.includes(asset.symbol)

                return (
                  <tr
                    key={asset.symbol}
                    className="hover:bg-zinc-900/40 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/market/${asset.symbol}?type=${asset.type}`)}
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <AssetLogo symbol={asset.symbol} type={asset.type} size={36} />
                        <div>
                          <div className="font-mono font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                            {asset.symbol}
                          </div>
                          <div className="text-[11px] font-mono text-zinc-500 truncate max-w-[180px]">
                            {asset.name}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-zinc-900 border border-white/[0.06] text-zinc-400">
                        {asset.type}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-zinc-100 tabular-nums">
                      {price
                        ? `₹${price.toLocaleString('en-IN', {
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

                    <td
                      className="py-3.5 px-4 text-center"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleWatchlist(asset.symbol, asset.type)
                      }}
                    >
                      <button
                        type="button"
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors"
                        title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
                      >
                        <Star
                          className={`h-4 w-4 transition-all ${
                            isWatched ? 'fill-amber-400 text-amber-400 scale-110' : 'hover:scale-110'
                          }`}
                        />
                      </button>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/market/${asset.symbol}?type=${asset.type}`)
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-emerald-500 hover:text-zinc-950 text-zinc-300 border border-white/[0.08] hover:border-emerald-400 text-xs font-mono font-bold transition-all shadow-sm group-hover:border-zinc-700"
                      >
                        <span>Trade</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                )
              })}

              {visibleAssets.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-500 font-mono text-xs">
                    No instruments found matching &quot;{search}&quot;. Try another symbol or category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-white/[0.06] bg-zinc-950">
            <p className="text-xs font-mono text-zinc-500">
              Showing <span className="font-bold text-zinc-300">{startIdx + 1}</span> to{' '}
              <span className="font-bold text-zinc-300">
                {Math.min(filteredAssets.length, startIdx + pageSize)}
              </span>{' '}
              of <span className="font-bold text-zinc-300">{filteredAssets.length}</span> assets
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 text-xs font-mono rounded-lg border border-white/[0.06] bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
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
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-7 w-7 text-xs font-mono font-bold rounded-lg transition-all ${
                      currentPage === pageNum
                        ? 'bg-emerald-500 text-zinc-950 shadow-md'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-white/[0.06]'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 text-xs font-mono rounded-lg border border-white/[0.06] bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
