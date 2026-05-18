'use client'

import useSWR from 'swr'
import { Trophy, Medal, Clock, Copy } from 'lucide-react'
import { useState, useEffect } from 'react'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function LeaderboardPage() {
  const { data: leaderboard, error, isLoading } = useSWR('/api/leaderboard', fetcher, { refreshInterval: 60000 })
  const [timeLeft, setTimeLeft] = useState('')
  const [isCopying, setIsCopying] = useState<string | null>(null)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const nextSunday = new Date()
      nextSunday.setDate(now.getDate() + ((7 - now.getDay()) % 7))
      nextSunday.setHours(0, 0, 0, 0)
      if (now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
        // It is exactly sunday midnight
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
        body: JSON.stringify({ targetUserId })
      })
      if (res.ok) {
        alert('Successfully copied trader portfolio!')
      } else {
        const err = await res.json()
        alert(`Error: ${err.error}`)
      }
    } catch (e) {
      alert('Failed to copy trader.')
    } finally {
      setIsCopying(null)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading Leaderboard...</div>
  }

  if (error || !leaderboard || leaderboard.error || !Array.isArray(leaderboard)) {
    return (
      <div className="p-6 text-loss bg-loss/10 border border-loss/20 rounded-xl">
        <h3 className="font-bold text-lg mb-1">Failed to load leaderboard</h3>
        <p className="text-sm opacity-90">{error?.message || leaderboard?.error || 'Invalid leaderboard data received from the server.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" /> Global Leaderboard
          </h2>
          <p className="text-muted-foreground mt-1">Compete for the highest returns and copy the best traders.</p>
        </div>

        <div className="bg-card border border-border px-4 py-2 rounded-xl flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Weekly Reset In</div>
            <div className="font-mono font-bold text-lg">{timeLeft}</div>
          </div>
        </div>
      </div>

      <div className="border border-border rounded-xl bg-card overflow-x-auto">
        <table className="w-full text-sm text-left min-w-[550px] sm:min-w-0">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium w-16 text-center">Rank</th>
              <th className="px-6 py-4 font-medium">Trader</th>
              <th className="px-6 py-4 font-medium text-right">Weekly Return</th>
              <th className="px-6 py-4 font-medium text-right">Total Return</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((user: any, index: number) => {
              const isPositiveTotal = user.total_return_pct >= 0
              const isPositiveWeekly = user.weekly_return_pct >= 0
              let RankIcon = null
              
              if (index === 0) RankIcon = <Medal className="h-6 w-6 text-yellow-500 mx-auto" />
              else if (index === 1) RankIcon = <Medal className="h-6 w-6 text-slate-300 mx-auto" />
              else if (index === 2) RankIcon = <Medal className="h-6 w-6 text-amber-600 mx-auto" />
              else RankIcon = <span className="font-bold text-muted-foreground">{index + 1}</span>

              return (
                <tr key={user.user_id} className="border-b border-border hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-center">{RankIcon}</td>
                  <td className="px-6 py-4 font-bold">{user.username}</td>
                  <td className={`px-6 py-4 text-right font-medium font-mono ${isPositiveWeekly ? 'text-gain' : 'text-loss'}`}>
                    {isPositiveWeekly ? '+' : ''}{Number(user.weekly_return_pct).toFixed(2)}%
                  </td>
                  <td className={`px-6 py-4 text-right font-medium font-mono ${isPositiveTotal ? 'text-gain' : 'text-loss'}`}>
                    {isPositiveTotal ? '+' : ''}{Number(user.total_return_pct).toFixed(2)}%
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleCopyTrader(user.user_id)}
                      disabled={isCopying === user.user_id}
                      className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 h-8 px-3 transition-colors disabled:opacity-50"
                    >
                      {isCopying === user.user_id ? 'Copying...' : (
                        <>
                          <Copy className="h-3 w-3 mr-1.5" /> Copy Trader
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
            
            {leaderboard.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No traders found yet. Start trading to appear on the leaderboard!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
