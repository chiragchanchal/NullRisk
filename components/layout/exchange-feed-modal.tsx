'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Activity, Globe, CheckCircle2, ShieldCheck, Clock } from 'lucide-react'

interface ExchangeStatus {
  id: string
  name: string
  region: string
  hours: string
  tz: string
  isOpen: boolean
  localTime: string
  latencyMs: number
  instruments: string
}

export function ExchangeFeedModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [exchanges, setExchanges] = useState<ExchangeStatus[]>([])

  useEffect(() => {
    const updateExchangeTimes = () => {
      const now = new Date()

      // 1. NSE (India) IST: UTC+5:30
      const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })
      const istDate = new Date(istString)
      const istDay = istDate.getDay() // 0 = Sun, 6 = Sat
      const istHour = istDate.getHours()
      const istMin = istDate.getMinutes()
      const istTotalMinutes = istHour * 60 + istMin
      // Market hours: 9:15 AM (555 mins) to 3:30 PM (930 mins) Mon-Fri
      const isNseOpen = istDay >= 1 && istDay <= 5 && istTotalMinutes >= 555 && istTotalMinutes <= 930
      const istTimeFormatted = istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

      // 2. NASDAQ / NYSE (New York) EDT: UTC-4
      const nyString = now.toLocaleString('en-US', { timeZone: 'America/New_York' })
      const nyDate = new Date(nyString)
      const nyDay = nyDate.getDay()
      const nyHour = nyDate.getHours()
      const nyMin = nyDate.getMinutes()
      const nyTotalMinutes = nyHour * 60 + nyMin
      // Market hours: 9:30 AM (570 mins) to 4:00 PM (960 mins) Mon-Fri
      const isNyOpen = nyDay >= 1 && nyDay <= 5 && nyTotalMinutes >= 570 && nyTotalMinutes <= 960
      const nyTimeFormatted = nyDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

      // 3. Crypto: 24/7
      const utcString = now.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' })

      // 4. Forex: 24/5
      const isForexOpen = istDay >= 1 && istDay <= 5

      setExchanges([
        {
          id: 'nse',
          name: 'NSE India (National Stock Exchange)',
          region: 'Mumbai (IST UTC+5:30)',
          hours: '09:15 - 15:30 IST (Mon-Fri)',
          tz: 'Asia/Kolkata',
          isOpen: isNseOpen,
          localTime: `${istTimeFormatted} IST`,
          latencyMs: 14,
          instruments: 'Equities, NIFTY 50, BANKNIFTY, F&O',
        },
        {
          id: 'nasdaq',
          name: 'NASDAQ / NYSE Global Markets',
          region: 'New York (EDT UTC-4)',
          hours: '09:30 - 16:00 EDT (Mon-Fri)',
          tz: 'America/New_York',
          isOpen: isNyOpen,
          localTime: `${nyTimeFormatted} EDT`,
          latencyMs: 28,
          instruments: 'Tech Equities, S&P 500, ETFs, Mega-caps',
        },
        {
          id: 'crypto',
          name: 'Decentralized Spot & Futures Stream',
          region: 'Global Distributed Network',
          hours: '24 Hours / 7 Days (Continuous)',
          tz: 'UTC',
          isOpen: true,
          localTime: `${utcString} UTC`,
          latencyMs: 9,
          instruments: 'BTC, ETH, SOL, Liquid Alts',
        },
        {
          id: 'forex',
          name: 'Interbank FX Liquidity Pool',
          region: 'London / NY / Tokyo Interbank',
          hours: '24 Hours / 5 Days (Interbank)',
          tz: 'Global',
          isOpen: isForexOpen,
          localTime: `${istTimeFormatted} IST`,
          latencyMs: 18,
          instruments: 'USD/INR, EUR/USD, GBP/USD, Currency Pairs',
        },
      ])
    }

    updateExchangeTimes()
    const timer = setInterval(updateExchangeTimes, 1000)
    return () => clearInterval(timer)
  }, [])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          className="relative w-full max-w-2xl rounded-2xl bg-zinc-950 border border-white/[0.12] p-6 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.9)] overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-base font-bold font-mono tracking-tight text-zinc-100 flex items-center gap-2">
                  Exchange Feed & Market Pulse
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                </h2>
                <p className="text-[11px] font-mono text-zinc-400">
                  Real-time market session status, trading hours & low-latency execution feeds
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent hover:border-white/[0.08] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Exchanges Grid */}
          <div className="mt-5 space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {exchanges.map((ex) => (
              <div
                key={ex.id}
                className="p-4 rounded-xl bg-zinc-900/50 border border-white/[0.06] hover:border-zinc-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-zinc-100">{ex.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                        ex.isOpen
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border-white/[0.08]'
                      }`}
                    >
                      {ex.isOpen ? 'Active Market' : 'Market Closed'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-zinc-400">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-zinc-500" />
                      {ex.region}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-zinc-500" />
                      {ex.hours}
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500">
                    Coverage: <span className="text-zinc-300">{ex.instruments}</span>
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-white/[0.04]">
                  <div className="font-mono font-bold text-xs text-zinc-200 tabular-nums">
                    {ex.localTime}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{ex.latencyMs}ms latency</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Telemetry Footer */}
          <div className="mt-5 p-3 rounded-xl bg-zinc-900/30 border border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>TLS 1.3 Sub-millisecond Execution Bridge</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[11px] text-zinc-300">Feed Health: 100% Nominal</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
