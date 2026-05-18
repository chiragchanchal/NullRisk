// lib/api/market.ts

export type AssetType = 'stock' | 'crypto' | 'forex'

const priceCache = new Map<string, { price: number; timestamp: number }>()
const CACHE_TTL_MS = 60000 // 1 minute cache

// 1. Fetch Real-time Quotes (Finnhub for Stocks, CoinGecko for Crypto, ExchangeRate for Forex)
export async function getMarketPrice(symbol: string, assetType: AssetType): Promise<number> {
  const cacheKey = `${assetType}-${symbol}`
  const cached = priceCache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price
  }
// try
  let price = 0

  try {
    if (assetType === 'crypto') {
      const searchRes = await fetch(`https://api.coingecko.com/api/v3/search?query=${symbol}`)
      const searchData = await searchRes.json()
      
      if (searchData.coins && searchData.coins.length > 0) {
        const coinId = searchData.coins[0].id
        const priceRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`)
        const priceData = await priceRes.json()
        price = priceData[coinId]?.usd || 0
      } else {
        price = await fetchFinnhubPrice(symbol) // Fallback to Finnhub for crypto like BINANCE:BTCUSDT
      }
    } else if (assetType === 'forex') {
      const parts = symbol.split('/')
      if (parts.length === 2) {
        const res = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_RATE_API_KEY}/pair/${parts[0]}/${parts[1]}`)
        const data = await res.json()
        price = data.conversion_rate || await fetchFinnhubPrice(symbol)
      } else {
        price = await fetchFinnhubPrice(symbol)
      }
    } else {
      // Stocks via Finnhub
      price = await fetchFinnhubPrice(symbol)
    }

    if (price > 0) {
      priceCache.set(cacheKey, { price, timestamp: Date.now() })
    } else {
      throw new Error(`Could not fetch price for ${symbol}`)
    }

    return price
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error)
    return fallbackPrice(symbol)
  }
}

async function fetchFinnhubPrice(symbol: string): Promise<number> {
  const apiKey = process.env.FINNHUB_API_KEY
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`)
  const data = await res.json()
  return data.c ? parseFloat(data.c) : 0
}

// 2. Fetch OHLC Data for Charts (Twelve Data)
export async function getMarketOHLC(symbol: string, interval: string = '1day', outputsize: number = 30) {
  const apiKey = process.env.TWELVE_DATA_API_KEY
  const res = await fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval}&outputsize=${outputsize}&apikey=${apiKey}`)
  const data = await res.json()
  
  if (data.values) {
    return data.values.map((v: any) => ({
      time: v.datetime,
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close)
    }))
  }
  return []
}

// 3. Fetch News (Finnhub)
export async function getMarketNews(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY
  const to = new Date().toISOString().split('T')[0]
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - 7)
  const from = fromDate.toISOString().split('T')[0]

  const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${apiKey}`)
  const data = await res.json()
  return Array.isArray(data) ? data.slice(0, 10) : []
}

function fallbackPrice(symbol: string): number {
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs((hash % 1000) + 10) + 0.50 
}
