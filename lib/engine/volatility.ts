/**
 * 30-day Historical Volatility Calculator
 * Uses daily log returns from OHLC data to estimate annualised volatility,
 * which we use as an IV proxy for BSM pricing.
 */

export function calculateHistoricalVolatility(ohlcData: Array<{ close: number }>): number {
  if (!ohlcData || ohlcData.length < 2) return 0.25 // default 25% vol fallback

  // Use the last 30 days (or all available data if less)
  const slice = ohlcData.slice(0, 30)

  // Calculate daily log returns
  const returns: number[] = []
  for (let i = 0; i < slice.length - 1; i++) {
    const today = slice[i].close
    const yesterday = slice[i + 1].close
    if (yesterday > 0 && today > 0) {
      returns.push(Math.log(today / yesterday))
    }
  }

  if (returns.length < 2) return 0.25

  // Sample mean
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length

  // Sample variance
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1)

  // Daily standard deviation
  const dailyStdDev = Math.sqrt(variance)

  // Annualise (×√252 trading days)
  const annualisedVol = dailyStdDev * Math.sqrt(252)

  // Clamp to reasonable range [5%, 300%]
  return Math.max(0.05, Math.min(3.0, annualisedVol))
}
