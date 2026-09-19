'use client'

import useSWR from 'swr'
import { Clock, Copy, RefreshCw, Crown } from 'lucide-react'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface LeaderboardUser {
  user_id: string
  username: string
  weekly_return_pct: number
  total_return_pct: number
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      stiffness: 360,
      damping: 26,
    },
  },
}

export default function LeaderboardPage() {
  const { data: leaderboard, error, isLoading } = useSWR('/api/leaderboard', fetcher, {
    refreshInterval: 60000,
  })
  const [timeLeft, setTimeLeft] = useState('')
  const [isCopying, setIsCopying] = useState<string | null>(null)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const nextSunday = new Date()
      nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7))
      nextSunday.setHours(0, 0, 0, 0)
      if (now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
        nextSunday.setDate(now.getDate() + 7)
      }

      const diff = nextSunday.getTime() - now.getTime()
      const d = Math.floor(diff / (1000 * 60 * 60 * 24))
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const m = Math.floor((diff / 1000 / 60) % 60)

      setTimeLeft(`${d}d ${h}h ${m}m`)
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 60000)
    return () => clearInterval(timer)
  }, [])

  const handleCopyTrader = async (targetUserId: string) => {
    setIsCopying(targetUserId)
    try {
      const res = await fetch('/api/trade/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId }),
      })
      if (res.ok) {
        alert('Successfully copied trader portfolio!')
      } else {
        const err = await res.json()
        alert(`Error: ${err.error}`)
      }
    } catch {
      alert('Failed to copy trader.')
    } finally {
      setIsCopying(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-zinc-500 gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
        <span className="text-xs font-mono tracking-wider uppercase">Loading Verified Traders...</span>
      </div>
    )
  }

  if (error || !leaderboard || leaderboard.error || !Array.isArray(leaderboard)) {
    return (
      <div className="p-6 text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-2xl max-w-xl mx-auto mt-8 font-mono text-xs">
        <h3 className="font-bold text-sm mb-1 text-rose-300">Leaderboard Offline</h3>
        <p className="opacity-90">{error?.message || leaderboard?.error || 'Invalid leaderboard data.'}</p>
      </div>
    )
  }

  const top3 = leaderboard.slice(0, 3)

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-sans">Institutional Leaderboard</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-white/[0.06]">
              TOP TRADERS
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Benchmark performance, replicate portfolios, and compete for weekly capital bonuses
          </p>
        </div>

        {/* Weekly Countdown Chip */}
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-zinc-950/80 border border-white/[0.08] shadow-sm">
          <Clock className="h-4 w-4 text-emerald-400" />
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 font-semibold">
              Weekly Reset
            </span>
            <span className="text-xs font-bold font-mono text-zinc-200 tabular-nums">{timeLeft}</span>
          </div>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {top3.map((trader: LeaderboardUser, idx: number) => {
            const isFirst = idx === 0
            const isSecond = idx === 1
            const badgeColor = isFirst
              ? 'border-amber-500/40 from-amber-500/15 to-transparent'
              : isSecond
              ? 'border-slate-400/30 from-slate-400/10 to-transparent'
              : 'border-amber-700/30 from-amber-700/10 to-transparent'

            const badgeText = isFirst ? '🥇 RANK 1' : isSecond ? '🥈 RANK 2' : '🥉 RANK 3'

            return (
              <motion.div
                key={trader.user_id}
                variants={cardVariants}
                whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
                className={`rounded-2xl p-5 border bg-gradient-to-b ${badgeColor} bg-zinc-950/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.6)] flex flex-col justify-between space-y-4`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isFirst
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : isSecond
                          ? 'bg-slate-400/20 text-slate-200 border border-slate-400/30'
                          : 'bg-amber-700/20 text-amber-400 border border-amber-700/30'
                      }`}
                    >
                      {isFirst ? <Crown className="h-5 w-5 text-amber-400" /> : idx + 1}
                    </div>
                    <div>
                      <h3 className="font-mono font-bold text-sm text-zinc-100">{trader.username}</h3>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{badgeText}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase">All-Time</span>
                    <span
                      className={`text-sm font-bold font-mono tabular-nums ${
                        trader.total_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {trader.total_return_pct >= 0 ? '+' : ''}
                      {Number(trader.total_return_pct).toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-white/[0.04] text-xs font-mono">
                  <span className="text-zinc-500">Weekly Pace</span>
                  <span
                    className={`font-bold tabular-nums ${
                      trader.weekly_return_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {trader.weekly_return_pct >= 0 ? '+' : ''}
                    {Number(trader.weekly_return_pct).toFixed(2)}%
                  </span>
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                  onClick={() => handleCopyTrader(trader.user_id)}
                  disabled={isCopying === trader.user_id}
                  className="w-full h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/[0.08] text-xs font-mono font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  {isCopying === trader.user_id ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Copying Portfolio...
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 text-zinc-400" />
                      Replicate Portfolio
                    </>
                  )}
                </motion.button>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Main Table */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/80 overflow-hidden shadow-[0_4px_24px_-4px_rgba(0,0,0,0.6)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[550px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-zinc-900/40 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                <th className="py-3.5 px-5 font-semibold text-center w-16">Rank</th>
                <th className="py-3.5 px-5 font-semibold">Trader Profile</th>
                <th className="py-3.5 px-4 font-semibold text-right">Weekly Return</th>
                <th className="py-3.5 px-4 font-semibold text-right">Total Net Return</th>
                <th className="py-3.5 px-5 font-semibold text-right">Copy Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {leaderboard.map((user: LeaderboardUser, index: number) => {
                const isPositiveTotal = user.total_return_pct >= 0
                const isPositiveWeekly = user.weekly_return_pct >= 0

                return (
                  <motion.tr
                    key={user.user_id}
                    variants={cardVariants}
                    className="hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="py-3.5 px-5 text-center font-mono font-bold text-xs text-zinc-400">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </td>
                    <td className="py-3.5 px-5 font-mono font-bold text-sm text-zinc-100">
                      <div className="flex items-center gap-2">
                        <span>{user.username}</span>
                        {index < 3 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20 text-[9px] text-amber-300">
                            PRO
                          </span>
                        )}
                      </div>
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold text-xs tabular-nums ${
                        isPositiveWeekly ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositiveWeekly ? '+' : ''}
                      {Number(user.weekly_return_pct).toFixed(2)}%
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono font-bold text-xs tabular-nums ${
                        isPositiveTotal ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isPositiveTotal ? '+' : ''}
                      {Number(user.total_return_pct).toFixed(2)}%
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.94 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                        onClick={() => handleCopyTrader(user.user_id)}
                        disabled={isCopying === user.user_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-mono font-semibold transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        {isCopying === user.user_id ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            Copying...
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-zinc-400" />
                            Copy
                          </>
                        )}
                      </motion.button>
                    </td>
                  </motion.tr>
                )
              })}

              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono text-xs">
                    No active traders registered on the leaderboard.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  )
}
