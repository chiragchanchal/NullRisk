'use client'

import React, { useState, useEffect } from 'react'

interface AssetLogoProps {
  symbol: string
  type?: 'stock' | 'crypto' | 'forex' | string
  className?: string
  size?: number
}

// 50 popular stocks mapping to official website domains
const STOCK_DOMAINS: Record<string, string> = {
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  GOOGL: 'google.com',
  AMZN: 'amazon.com',
  TSLA: 'tesla.com',
  NVDA: 'nvidia.com',
  META: 'meta.com',
  NFLX: 'netflix.com',
  AMD: 'amd.com',
  INTC: 'intel.com',
  'BRK.B': 'berkshirehathaway.com',
  JNJ: 'jnj.com',
  V: 'visa.com',
  PG: 'pg.com',
  JPM: 'jpmorgan.com',
  UNH: 'unitedhealthgroup.com',
  HD: 'homedepot.com',
  LLY: 'lilly.com',
  BAC: 'bankofamerica.com',
  DIS: 'disney.com',
  'RELIANCE.NS': 'ril.com',
  'TCS.NS': 'tcs.com',
  'INFY.NS': 'infosys.com',
  'HDFCBANK.NS': 'hdfcbank.com',
  'ICICIBANK.NS': 'icicibank.com',
  'HINDUNILVR.NS': 'hul.co.in',
  'ITC.NS': 'itcportal.com',
  'SBIN.NS': 'sbi.co.in',
  'BHARTIARTL.NS': 'airtel.in',
  'KOTAKBANK.NS': 'kotak.com',
  'LT.NS': 'larsentoubro.com',
  'AXISBANK.NS': 'axisbank.com',
  'ASIANPAINT.NS': 'asianpaints.com',
  'MARUTI.NS': 'marutisuzuki.com',
  'SUNPHARMA.NS': 'sunpharma.com',
  'TITAN.NS': 'titancompany.in',
  'ULTRACEMCO.NS': 'ultratechcement.com',
  'WIPRO.NS': 'wipro.com',
  'NESTLEIND.NS': 'nestle.in',
  'M&M.NS': 'mahindra.com',
  'HCLTECH.NS': 'hcltech.com',
  'TATASTEEL.NS': 'tatasteel.com',
  'NTPC.NS': 'ntpc.co.in',
  'POWERGRID.NS': 'powergrid.in',
  'BAJFINANCE.NS': 'bajajfinserv.in',
  'BAJAJFINSV.NS': 'bajajfinserv.in',
  'ONGC.NS': 'ongcindia.com',
  'ADANIENT.NS': 'adanienterprises.com',
  'JSWSTEEL.NS': 'jsw.in',
  'COALINDIA.NS': 'coalindia.in',
}

// Forex currency to country code mapping
const FLAG_MAP: Record<string, string> = {
  USD: 'us',
  EUR: 'eu',
  JPY: 'jp',
  GBP: 'gb',
  AUD: 'au',
  CAD: 'ca',
  CHF: 'ch',
  NZD: 'nz',
  INR: 'in',
  AED: 'ae',
  SAR: 'sa',
  CNY: 'cn',
  HKD: 'hk',
  SGD: 'sg',
  ZAR: 'za',
  MXN: 'mx',
  TRY: 'tr',
  SEK: 'se',
  NOK: 'no',
  DKK: 'dk',
  THB: 'th',
  MYR: 'my',
  IDR: 'id',
  PHP: 'ph',
  KRW: 'kr',
  TWD: 'tw',
  VND: 'vn',
  BRL: 'br',
  RUB: 'ru',
  PLN: 'pl',
  ILS: 'il',
  ARS: 'ar',
  CLP: 'cl',
  COP: 'co',
  PEN: 'pe',
}

// Utility to generate stable background gradient based on symbol
function getInitialsColor(symbol: string) {
  let hash = 0
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash)
  }
  const colors = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-purple-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-red-600',
    'from-cyan-500 to-blue-600',
  ]
  return colors[Math.abs(hash) % colors.length]
}

export function AssetLogo({ symbol, type = 'stock', className = '', size = 32 }: AssetLogoProps) {
  const [imgFailed, setImgFailed] = useState(false)
  const normalizedSymbol = symbol.toUpperCase()

  // Reset image state when symbol changes
  useEffect(() => {
    setImgFailed(false)
  }, [symbol])

  // Get clean initials for fallback
  const cleanInitials = normalizedSymbol
    .replace('.NS', '')
    .substring(0, 2)

  // 1. Forex overlapping flags render logic
  if (type === 'forex' || normalizedSymbol.includes('/')) {
    const parts = normalizedSymbol.split('/')
    const baseCurrency = parts[0] || 'USD'
    const quoteCurrency = parts[1] || 'INR'

    const baseFlag = FLAG_MAP[baseCurrency] || 'us'
    const quoteFlag = FLAG_MAP[quoteCurrency] || 'in'

    return (
      <div 
        className={`relative inline-flex items-center shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {/* Quote currency flag (bottom-right) */}
        <div 
          className="absolute bottom-0 right-0 rounded-full border border-border bg-background overflow-hidden flex items-center justify-center shadow-sm"
          style={{ width: size * 0.65, height: size * 0.65 }}
        >
          <img
            src={`https://flagcdn.com/w40/${quoteFlag}.png`}
            alt={quoteCurrency}
            className="w-full h-full object-cover scale-[1.35]"
            onError={(e) => {
              // Fallback to standard country flag
              ;(e.target as HTMLImageElement).src = `https://flagcdn.com/w40/us.png`
            }}
          />
        </div>
        {/* Base currency flag (top-left) */}
        <div 
          className="absolute top-0 left-0 rounded-full border border-border bg-background overflow-hidden flex items-center justify-center shadow-md z-10"
          style={{ width: size * 0.65, height: size * 0.65 }}
        >
          <img
            src={`https://flagcdn.com/w40/${baseFlag}.png`}
            alt={baseCurrency}
            className="w-full h-full object-cover scale-[1.35]"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = `https://flagcdn.com/w40/eu.png`
            }}
          />
        </div>
      </div>
    )
  }

  // 2. Crypto or Stock logo with dynamic URL
  let logoUrl = ''
  if (!imgFailed) {
    if (type === 'crypto') {
      logoUrl = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/${normalizedSymbol.toLowerCase()}.png`
    } else if (type === 'stock') {
      const domain = STOCK_DOMAINS[normalizedSymbol] || STOCK_DOMAINS[normalizedSymbol + '.NS']
      if (domain) {
        logoUrl = `https://logo.clearbit.com/${domain}`
      } else {
        // Dynamic search domain fallback using symbol
        logoUrl = `https://logo.clearbit.com/${normalizedSymbol.toLowerCase()}.com`
      }
    }
  }

  // Render Image or Initials Avatar
  if (logoUrl && !imgFailed) {
    return (
      <div 
        className={`rounded-xl border border-border/80 bg-background/50 backdrop-blur-sm overflow-hidden flex items-center justify-center shrink-0 shadow-sm transition-all hover:scale-[1.05] ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={logoUrl}
          alt={symbol}
          className="w-full h-full object-cover p-1 bg-white"
          onError={() => setImgFailed(true)}
        />
      </div>
    )
  }

  // Fallback initial colored badge
  const gradient = getInitialsColor(normalizedSymbol)
  return (
    <div
      className={`rounded-xl bg-gradient-to-br ${gradient} text-white font-mono font-black flex items-center justify-center shrink-0 shadow-sm border border-white/10 uppercase tracking-tighter ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {cleanInitials}
    </div>
  )
}
