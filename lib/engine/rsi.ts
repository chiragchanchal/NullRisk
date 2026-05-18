/**
 * RSI (Relative Strength Index) — pure TypeScript
 * Standard Wilder smoothing, period = 14
 */

export function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50 // not enough data, return neutral

  // We need at least period+1 closes for period changes
  const relevant = closes.slice(0, period + 1)

  // Calculate initial gains and losses
  const changes: number[] = []
  for (let i = 0; i < relevant.length - 1; i++) {
    changes.push(relevant[i] - relevant[i + 1]) // newest first, so i is newer
  }

  let avgGain = changes.slice(0, period).reduce((sum, c) => sum + Math.max(0, c), 0) / period
  let avgLoss = changes.slice(0, period).reduce((sum, c) => sum + Math.max(0, -c), 0) / period

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return parseFloat((100 - 100 / (1 + rs)).toFixed(2))
}

/**
 * 14-day price change percentage
 * closes[0] = today, closes[14] = 14 days ago
 */
export function calculate14dChange(closes: number[]): number {
  if (closes.length < 15) return 0
  const today = closes[0]
  const fourteenDaysAgo = closes[14]
  if (fourteenDaysAgo === 0) return 0
  return parseFloat((((today - fourteenDaysAgo) / fourteenDaysAgo) * 100).toFixed(2))
}
