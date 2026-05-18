/**
 * Black-Scholes-Merton Option Pricing Engine (Pure TypeScript, no external deps)
 *
 * Notation:
 *  S  = Current underlying price
 *  K  = Strike price
 *  T  = Time to expiry in years  (e.g. 30 days → 30/365)
 *  r  = Risk-free rate (annualised, e.g. 0.05 = 5%)
 *  σ  = Implied/Historical Volatility (annualised, e.g. 0.25 = 25%)
 */

export interface BSMInput {
  S: number   // spot price
  K: number   // strike price
  T: number   // time to expiry (years)
  r: number   // risk-free rate (annualised)
  sigma: number // volatility (annualised)
  type: 'call' | 'put'
}

export interface BSMResult {
  price: number
  delta: number
  gamma: number
  theta: number // per calendar day
  vega: number  // per 1% move in vol
  rho: number
  d1: number
  d2: number
  intrinsicValue: number
  timeValue: number
  impliedMoneyness: 'ITM' | 'ATM' | 'OTM'
}

// ─── Cumulative Normal Distribution (Hart approximation) ──────────────────────
function cdf(x: number): number {
  const a1 =  0.254829592
  const a2 = -0.284496736
  const a3 =  1.421413741
  const a4 = -1.453152027
  const a5 =  1.061405429
  const p  =  0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.SQRT2
  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}

// Standard Normal PDF
function pdf(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI)
}

// ─── Main BSM Calculator ──────────────────────────────────────────────────────
export function calculateBSM(input: BSMInput): BSMResult {
  const { S, K, T, r, sigma, type } = input

  if (T <= 0) {
    // Expired option
    const intrinsic = type === 'call'
      ? Math.max(0, S - K)
      : Math.max(0, K - S)
    return {
      price: intrinsic, delta: type === 'call' ? (S > K ? 1 : 0) : (K > S ? -1 : 0),
      gamma: 0, theta: 0, vega: 0, rho: 0, d1: 0, d2: 0,
      intrinsicValue: intrinsic, timeValue: 0,
      impliedMoneyness: S === K ? 'ATM' : (type === 'call' ? (S > K ? 'ITM' : 'OTM') : (K > S ? 'ITM' : 'OTM'))
    }
  }

  const sqrtT = Math.sqrt(T)
  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT)
  const d2 = d1 - sigma * sqrtT

  let price: number
  let delta: number
  let rho: number

  if (type === 'call') {
    price = S * cdf(d1) - K * Math.exp(-r * T) * cdf(d2)
    delta = cdf(d1)
    rho = K * T * Math.exp(-r * T) * cdf(d2) / 100
  } else {
    price = K * Math.exp(-r * T) * cdf(-d2) - S * cdf(-d1)
    delta = cdf(d1) - 1
    rho = -K * T * Math.exp(-r * T) * cdf(-d2) / 100
  }

  // Greeks shared between calls and puts
  const gamma = pdf(d1) / (S * sigma * sqrtT)

  // Theta: expressed as daily decay (divide annualised by 365)
  const thetaAnnual = type === 'call'
    ? (-(S * pdf(d1) * sigma) / (2 * sqrtT) - r * K * Math.exp(-r * T) * cdf(d2))
    : (-(S * pdf(d1) * sigma) / (2 * sqrtT) + r * K * Math.exp(-r * T) * cdf(-d2))
  const theta = thetaAnnual / 365

  // Vega: per 1% change in volatility
  const vega = S * pdf(d1) * sqrtT / 100

  // Intrinsic & Time value
  const intrinsicValue = type === 'call'
    ? Math.max(0, S - K)
    : Math.max(0, K - S)
  const timeValue = Math.max(0, price - intrinsicValue)

  // Moneyness
  const moneynessTol = S * 0.01 // within 1% = ATM
  let impliedMoneyness: 'ITM' | 'ATM' | 'OTM'
  if (Math.abs(S - K) <= moneynessTol) {
    impliedMoneyness = 'ATM'
  } else if (type === 'call') {
    impliedMoneyness = S > K ? 'ITM' : 'OTM'
  } else {
    impliedMoneyness = K > S ? 'ITM' : 'OTM'
  }

  return {
    price: Math.max(0, price),
    delta: parseFloat(delta.toFixed(6)),
    gamma: parseFloat(gamma.toFixed(6)),
    theta: parseFloat(theta.toFixed(6)),
    vega: parseFloat(vega.toFixed(6)),
    rho: parseFloat(rho.toFixed(6)),
    d1, d2,
    intrinsicValue,
    timeValue,
    impliedMoneyness
  }
}

// ─── Strike Generator ─────────────────────────────────────────────────────────
export function generateStrikes(spotPrice: number, numEachSide = 5, interval = 5): number[] {
  // Round to nearest interval
  const atm = Math.round(spotPrice / interval) * interval
  const strikes: number[] = []
  for (let i = -numEachSide; i <= numEachSide; i++) {
    const strike = atm + i * interval
    if (strike > 0) strikes.push(strike)
  }
  return strikes
}

// ─── Expiry Helpers ───────────────────────────────────────────────────────────
export function getExpiryDates(): { label: string; date: Date; T: number }[] {
  const now = new Date()

  // Next Friday (weekly)
  const nextFriday = new Date(now)
  nextFriday.setDate(now.getDate() + ((5 - now.getDay() + 7) % 7 || 7))
  nextFriday.setHours(15, 30, 0, 0) // 3:30pm market close

  // Last Friday of current month (monthly)
  const lastFridayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  while (lastFridayOfMonth.getDay() !== 5) {
    lastFridayOfMonth.setDate(lastFridayOfMonth.getDate() - 1)
  }
  lastFridayOfMonth.setHours(15, 30, 0, 0)

  // Last Friday of next month
  const lastFridayNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0)
  while (lastFridayNextMonth.getDay() !== 5) {
    lastFridayNextMonth.setDate(lastFridayNextMonth.getDate() - 1)
  }
  lastFridayNextMonth.setHours(15, 30, 0, 0)

  const toT = (d: Date) => Math.max(0, (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365))

  const results = []
  if (nextFriday > now) {
    results.push({ label: `Weekly — ${nextFriday.toDateString()}`, date: nextFriday, T: toT(nextFriday) })
  }
  if (lastFridayOfMonth > now && lastFridayOfMonth.getTime() !== nextFriday.getTime()) {
    results.push({ label: `Monthly — ${lastFridayOfMonth.toDateString()}`, date: lastFridayOfMonth, T: toT(lastFridayOfMonth) })
  }
  results.push({ label: `Monthly — ${lastFridayNextMonth.toDateString()}`, date: lastFridayNextMonth, T: toT(lastFridayNextMonth) })

  return results
}
