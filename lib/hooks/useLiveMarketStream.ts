'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export interface MarketTick {
  symbol: string
  price: number
  change: number
  direction: 'up' | 'down'
  timestamp: number
}

export type TickDirection = 'up' | 'down' | null

export function useLiveMarketStream(symbols?: string[]) {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [tickDirections, setTickDirections] = useState<Record<string, TickDirection>>({})
  const [isStreaming, setIsStreaming] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const flashTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const connectRef = useRef<() => void>(() => {})

  const symbolsKey = symbols ? symbols.sort().join(',') : ''

  const connect = useCallback(() => {
    if (typeof window === 'undefined') return

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const query = symbolsKey ? `?symbols=${encodeURIComponent(symbolsKey)}` : ''
    const url = `/api/market/stream${query}`
    const es = new EventSource(url)
    eventSourceRef.current = es

    es.onopen = () => {
      setIsStreaming(true)
    }

    es.addEventListener('snapshot', (e) => {
      try {
        const data: Record<string, { price: number }> = JSON.parse(e.data)
        const initialPrices: Record<string, number> = {}
        for (const [sym, val] of Object.entries(data)) {
          initialPrices[sym] = val.price
        }
        setPrices((prev) => ({ ...prev, ...initialPrices }))
      } catch (err) {
        console.error('Error parsing market snapshot', err)
      }
    })

    es.addEventListener('tick', (e) => {
      try {
        const ticks: MarketTick[] = JSON.parse(e.data)
        const priceUpdates: Record<string, number> = {}
        const dirUpdates: Record<string, TickDirection> = {}

        for (const t of ticks) {
          priceUpdates[t.symbol] = t.price
          dirUpdates[t.symbol] = t.direction

          // Reset the flash direction back to null after 600ms
          if (flashTimeoutsRef.current[t.symbol]) {
            clearTimeout(flashTimeoutsRef.current[t.symbol])
          }
          flashTimeoutsRef.current[t.symbol] = setTimeout(() => {
            setTickDirections((prev) => ({ ...prev, [t.symbol]: null }))
          }, 600)
        }

        setPrices((prev) => ({ ...prev, ...priceUpdates }))
        setTickDirections((prev) => ({ ...prev, ...dirUpdates }))
      } catch (err) {
        console.error('Error parsing market tick', err)
      }
    })

    es.onerror = () => {
      setIsStreaming(false)
      es.close()
      // Reconnect with 3s backoff
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = setTimeout(() => {
        connectRef.current()
      }, 3000)
    }
  }, [symbolsKey])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  useEffect(() => {
    connect()

    const currentFlashTimeouts = flashTimeoutsRef.current

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      for (const timer of Object.values(currentFlashTimeouts)) {
        clearTimeout(timer)
      }
    }
  }, [connect])

  return {
    prices,
    tickDirections,
    isStreaming,
    reconnect: connect,
  }
}
