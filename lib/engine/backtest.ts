export interface OHLCBar {
  time: string
  open: number
  high: number
  low: number
  close: number
}

export interface BacktestTrade {
  id: string
  entryTime: string
  exitTime: string
  direction: 'long'
  entryPrice: number
  exitPrice: number
  quantity: number
  pnl: number
  pnlPct: number
  holdingBars: number
  reason: string
}

export interface BacktestResult {
  strategyId: string
  strategyName: string
  symbol: string
  initialCapital: number
  finalCapital: number
  totalReturnPct: number
  benchmarkReturnPct: number
  alphaPct: number
  winRatePct: number
  profitFactor: number
  maxDrawdownPct: number
  sharpeRatio: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  equityCurve: Array<{
    time: string
    strategyEquity: number
    benchmarkEquity: number
  }>
  trades: BacktestTrade[]
}

// 1. Technical Indicator Helpers
export function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const emaArray: number[] = []
  if (prices.length === 0) return emaArray

  let ema = prices[0]
  emaArray.push(ema)

  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k)
    emaArray.push(ema)
  }
  return emaArray
}

export function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = []
  if (prices.length <= period) {
    return prices.map(() => 50)
  }

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff >= 0) gains += diff
    else losses += Math.abs(diff)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = 0; i < period; i++) {
    rsi.push(50)
  }

  const rsFirst = avgLoss === 0 ? 100 : avgGain / avgLoss
  rsi.push(100 - 100 / (1 + rsFirst))

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? Math.abs(diff) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    rsi.push(100 - 100 / (1 + rs))
  }

  return rsi
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): Array<{ upper: number; middle: number; lower: number }> {
  const bands: Array<{ upper: number; middle: number; lower: number }> = []

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      bands.push({ upper: prices[i], middle: prices[i], lower: prices[i] })
      continue
    }

    const slice = prices.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period
    const stdDev = Math.sqrt(variance)

    bands.push({
      upper: mean + multiplier * stdDev,
      middle: mean,
      lower: mean - multiplier * stdDev,
    })
  }

  return bands
}

// 2. Main Strategy Backtest Simulator
export function runBacktest({
  strategyId,
  symbol,
  bars,
  initialCapital = 500000,
  fastPeriod = 9,
  slowPeriod = 21,
  slippagePct = 0.0005, // 0.05% realistic execution slippage
}: {
  strategyId: 'ema_cross' | 'rsi_reversion' | 'bb_breakout' | 'macd_trend'
  symbol: string
  bars: OHLCBar[]
  initialCapital?: number
  fastPeriod?: number
  slowPeriod?: number
  slippagePct?: number
}): BacktestResult {
  if (!bars || bars.length < 10) {
    throw new Error('Insufficient historical data for backtesting')
  }

  const closes = bars.map((b) => b.close)
  const benchmarkInitialPrice = closes[0]
  const benchmarkUnits = initialCapital / benchmarkInitialPrice

  let cash = initialCapital
  let positionQty = 0
  let entryPrice = 0
  let entryTime = ''
  let entryIndex = 0

  const trades: BacktestTrade[] = []
  const equityCurve: Array<{ time: string; strategyEquity: number; benchmarkEquity: number }> = []

  // Pre-calculate indicators
  const fastEMA = calculateEMA(closes, fastPeriod)
  const slowEMA = calculateEMA(closes, slowPeriod)
  const rsi = calculateRSI(closes, 14)
  const bb = calculateBollingerBands(closes, 20, 2)

  let peakEquity = initialCapital
  let maxDrawdown = 0

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]
    const currentPrice = bar.close
    let buySignal = false
    let sellSignal = false
    let signalReason = ''

    // Signal Evaluation
    if (strategyId === 'ema_cross') {
      if (i > 0) {
        const prevFast = fastEMA[i - 1]
        const prevSlow = slowEMA[i - 1]
        const currFast = fastEMA[i]
        const currSlow = slowEMA[i]

        if (prevFast <= prevSlow && currFast > currSlow) {
          buySignal = true
          signalReason = `Bullish Golden Cross (Fast EMA ${fastPeriod} crossed above Slow EMA ${slowPeriod})`
        } else if (prevFast >= prevSlow && currFast < currSlow) {
          sellSignal = true
          signalReason = `Bearish Death Cross (Fast EMA crossed below Slow EMA)`
        }
      }
    } else if (strategyId === 'rsi_reversion') {
      const currentRSI = rsi[i]
      if (currentRSI < 30) {
        buySignal = true
        signalReason = `RSI Oversold (${currentRSI.toFixed(1)} < 30)`
      } else if (currentRSI > 70) {
        sellSignal = true
        signalReason = `RSI Overbought (${currentRSI.toFixed(1)} > 70)`
      }
    } else if (strategyId === 'bb_breakout') {
      const currentBB = bb[i]
      if (currentPrice < currentBB.lower) {
        buySignal = true
        signalReason = `Lower Bollinger Band Bounce (Price pierced lower band)`
      } else if (currentPrice > currentBB.upper) {
        sellSignal = true
        signalReason = `Upper Bollinger Band Touch (Profit target reached)`
      }
    } else {
      // MACD Trend (Fast 12 - Slow 26)
      const ema12 = fastEMA[i]
      const ema26 = slowEMA[i]
      if (ema12 > ema26 && positionQty === 0) {
        buySignal = true
        signalReason = `MACD Momentum Alignment`
      } else if (ema12 < ema26 && positionQty > 0) {
        sellSignal = true
        signalReason = `MACD Divergence Exit`
      }
    }

    // Trade Execution Simulation
    if (buySignal && positionQty === 0 && cash > 1000) {
      const effectiveBuyPrice = currentPrice * (1 + slippagePct)
      const allocatedCash = cash * 0.95 // 95% capital allocation
      positionQty = allocatedCash / effectiveBuyPrice
      cash -= allocatedCash
      entryPrice = effectiveBuyPrice
      entryTime = bar.time
      entryIndex = i
    } else if (sellSignal && positionQty > 0) {
      const effectiveSellPrice = currentPrice * (1 - slippagePct)
      const proceeds = positionQty * effectiveSellPrice
      const pnl = proceeds - (positionQty * entryPrice)
      const pnlPct = (effectiveSellPrice - entryPrice) / entryPrice * 100

      trades.push({
        id: `trade-${trades.length + 1}`,
        entryTime,
        exitTime: bar.time,
        direction: 'long',
        entryPrice: Number(entryPrice.toFixed(2)),
        exitPrice: Number(effectiveSellPrice.toFixed(2)),
        quantity: Number(positionQty.toFixed(4)),
        pnl: Number(pnl.toFixed(2)),
        pnlPct: Number(pnlPct.toFixed(2)),
        holdingBars: i - entryIndex,
        reason: signalReason,
      })

      cash += proceeds
      positionQty = 0
      entryPrice = 0
    }

    // Equity Marking
    const currentEquity = cash + (positionQty * currentPrice)
    const benchmarkEquity = benchmarkUnits * currentPrice

    if (currentEquity > peakEquity) {
      peakEquity = currentEquity
    }
    const currentDrawdown = (peakEquity - currentEquity) / peakEquity * 100
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown
    }

    equityCurve.push({
      time: bar.time,
      strategyEquity: Number(currentEquity.toFixed(2)),
      benchmarkEquity: Number(benchmarkEquity.toFixed(2)),
    })
  }

  // Force close position on final bar for accounting
  if (positionQty > 0) {
    const lastBar = bars[bars.length - 1]
    const effectiveSellPrice = lastBar.close * (1 - slippagePct)
    const proceeds = positionQty * effectiveSellPrice
    const pnl = proceeds - (positionQty * entryPrice)
    const pnlPct = (effectiveSellPrice - entryPrice) / entryPrice * 100

    trades.push({
      id: `trade-${trades.length + 1}`,
      entryTime,
      exitTime: lastBar.time,
      direction: 'long',
      entryPrice: Number(entryPrice.toFixed(2)),
      exitPrice: Number(effectiveSellPrice.toFixed(2)),
      quantity: Number(positionQty.toFixed(4)),
      pnl: Number(pnl.toFixed(2)),
      pnlPct: Number(pnlPct.toFixed(2)),
      holdingBars: bars.length - 1 - entryIndex,
      reason: 'End of simulation period liquidation',
    })

    cash += proceeds
    positionQty = 0
  }

  const finalCapital = cash
  const totalReturnPct = ((finalCapital - initialCapital) / initialCapital) * 100
  const finalBenchmarkPrice = closes[closes.length - 1]
  const benchmarkReturnPct = ((finalBenchmarkPrice - benchmarkInitialPrice) / benchmarkInitialPrice) * 100
  const alphaPct = totalReturnPct - benchmarkReturnPct

  const winningTrades = trades.filter((t) => t.pnl > 0)
  const losingTrades = trades.filter((t) => t.pnl <= 0)
  const winRatePct = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0

  const grossProfit = winningTrades.reduce((acc, t) => acc + t.pnl, 0)
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0

  // Standardized Sharpe Ratio (assuming 5% risk-free rate)
  const tradeReturns = trades.map((t) => t.pnlPct)
  const meanReturn = tradeReturns.length > 0 ? tradeReturns.reduce((a, b) => a + b, 0) / tradeReturns.length : 0
  const variance = tradeReturns.length > 1
    ? tradeReturns.reduce((a, b) => a + Math.pow(b - meanReturn, 2), 0) / (tradeReturns.length - 1)
    : 1
  const stdDev = Math.sqrt(variance) || 1
  const sharpeRatio = Number(((meanReturn - 0.05) / stdDev).toFixed(2))

  const strategyNames: Record<string, string> = {
    ema_cross: 'Dual EMA Dynamic Trend Follower',
    rsi_reversion: 'RSI Statistical Mean Reversion',
    bb_breakout: 'Bollinger Bands Volatility Expansion',
    macd_trend: 'MACD Momentum Divergence Engine',
  }

  return {
    strategyId,
    strategyName: strategyNames[strategyId] || 'Quantitative Strategy',
    symbol,
    initialCapital,
    finalCapital: Number(finalCapital.toFixed(2)),
    totalReturnPct: Number(totalReturnPct.toFixed(2)),
    benchmarkReturnPct: Number(benchmarkReturnPct.toFixed(2)),
    alphaPct: Number(alphaPct.toFixed(2)),
    winRatePct: Number(winRatePct.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    maxDrawdownPct: Number(maxDrawdown.toFixed(2)),
    sharpeRatio,
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    equityCurve,
    trades,
  }
}

export function generateSyntheticOHLC(symbol: string, barsCount: number = 90): OHLCBar[] {
  const basePrices: Record<string, number> = {
    BTC: 67420,
    ETH: 3540,
    AAPL: 228.5,
    NVDA: 122.4,
    TSLA: 245.8,
    'RELIANCE.NS': 2980,
    'USD/INR': 83.6,
  }
  const basePrice = basePrices[symbol] || 150
  const volatility = symbol.includes('BTC') || symbol.includes('ETH') ? 0.032 : 0.016
  const bars: OHLCBar[] = []
  let currentClose = basePrice
  const now = new Date()

  for (let i = barsCount - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const timeStr = d.toISOString().split('T')[0]

    const trendFactor = Math.sin(i * 0.18) * 0.007
    const randomFactor = (Math.random() - 0.485) * volatility
    const changePct = trendFactor + randomFactor
    const open = currentClose
    const close = Math.max(1, open * (1 + changePct))
    const high = Math.max(open, close) * (1 + Math.random() * 0.008)
    const low = Math.min(open, close) * (1 - Math.random() * 0.008)
    currentClose = close

    bars.push({
      time: timeStr,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    })
  }
  return bars
}
