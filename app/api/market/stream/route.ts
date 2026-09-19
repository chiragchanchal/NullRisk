import { NextRequest } from 'next/server'
import { getMarketPrice, AssetType } from '@/lib/api/market'

export const dynamic = 'force-dynamic'

interface SymbolConfig {
  symbol: string
  assetType: AssetType
  basePrice: number
  volatility: number
}

const DEFAULT_SYMBOLS: SymbolConfig[] = [
  { symbol: 'BTC', assetType: 'crypto', basePrice: 7240000, volatility: 0.0008 },
  { symbol: 'ETH', assetType: 'crypto', basePrice: 295000, volatility: 0.001 },
  { symbol: 'SOL', assetType: 'crypto', basePrice: 14200, volatility: 0.0014 },
  { symbol: 'AAPL', assetType: 'stock', basePrice: 18250, volatility: 0.0004 },
  { symbol: 'NVDA', assetType: 'stock', basePrice: 98400, volatility: 0.0007 },
  { symbol: 'RELIANCE.NS', assetType: 'stock', basePrice: 2980.5, volatility: 0.0003 },
  { symbol: 'TCS.NS', assetType: 'stock', basePrice: 3890.0, volatility: 0.0003 },
  { symbol: 'USD/INR', assetType: 'forex', basePrice: 83.45, volatility: 0.0001 },
]

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const rawSymbols = searchParams.get('symbols')?.split(',').map((s) => s.trim().toUpperCase()) || []

  // Initialize tracked prices
  const trackedMap = new Map<string, { price: number; assetType: AssetType; volatility: number }>()

  for (const item of DEFAULT_SYMBOLS) {
    trackedMap.set(item.symbol, {
      price: item.basePrice,
      assetType: item.assetType,
      volatility: item.volatility,
    })
  }

  // If specific symbols were requested, try fetching baseline or fall back
  if (rawSymbols.length > 0) {
    for (const sym of rawSymbols) {
      if (!trackedMap.has(sym)) {
        try {
          const fetchedPrice = await getMarketPrice(sym, 'stock')
          trackedMap.set(sym, {
            price: fetchedPrice > 0 ? fetchedPrice : 1500,
            assetType: 'stock',
            volatility: 0.0005,
          })
        } catch {
          trackedMap.set(sym, {
            price: 1000,
            assetType: 'stock',
            volatility: 0.0005,
          })
        }
      }
    }
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial snapshot of all tracked symbols
      const initialSnapshot: Record<string, { price: number; changePct: number; timestamp: number }> = {}
      trackedMap.forEach((val, key) => {
        initialSnapshot[key] = {
          price: Number(val.price.toFixed(val.assetType === 'forex' ? 4 : 2)),
          changePct: 0,
          timestamp: Date.now(),
        }
      })

      controller.enqueue(
        encoder.encode(`event: snapshot\ndata: ${JSON.stringify(initialSnapshot)}\n\n`)
      )

      // 2. High-frequency tick generator (fires every 800ms)
      const interval = setInterval(() => {
        if (req.signal.aborted) {
          clearInterval(interval)
          controller.close()
          return
        }

        // Randomly select 1 to 3 symbols to tick in this cycle
        const symbolsArray = Array.from(trackedMap.keys())
        const numTicks = Math.floor(Math.random() * 3) + 1
        const updatedTicks: Array<{
          symbol: string
          price: number
          change: number
          direction: 'up' | 'down'
          timestamp: number
        }> = []

        for (let i = 0; i < numTicks; i++) {
          const randomSymbol = symbolsArray[Math.floor(Math.random() * symbolsArray.length)]
          const current = trackedMap.get(randomSymbol)
          if (!current) continue

          // Stochastic brownian motion tick
          const shock = (Math.random() - 0.495) * 2 // slight upward bias
          const delta = current.price * current.volatility * shock
          const newPrice = Math.max(0.01, current.price + delta)
          current.price = newPrice

          updatedTicks.push({
            symbol: randomSymbol,
            price: Number(newPrice.toFixed(current.assetType === 'forex' ? 4 : 2)),
            change: Number(delta.toFixed(4)),
            direction: delta >= 0 ? 'up' : 'down',
            timestamp: Date.now(),
          })
        }

        controller.enqueue(
          encoder.encode(`event: tick\ndata: ${JSON.stringify(updatedTicks)}\n\n`)
        )
      }, 800)

      // 3. Heartbeat ping every 15s to keep connection alive
      const pingInterval = setInterval(() => {
        if (req.signal.aborted) {
          clearInterval(pingInterval)
          return
        }
        controller.enqueue(encoder.encode(`: ping\n\n`))
      }, 15000)

      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        clearInterval(pingInterval)
        try {
          controller.close()
        } catch {
          // Stream already closed
        }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Encoding': 'none',
    },
  })
}
