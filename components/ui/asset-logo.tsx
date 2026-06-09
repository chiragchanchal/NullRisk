'use client'

import React from 'react'

interface AssetLogoProps {
  symbol: string
  type?: 'stock' | 'crypto' | 'forex' | string
  className?: string
  size?: number
}

// 1. Forex Currency Symbols Mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'Fr',
  NZD: 'NZ$',
  AED: 'د.إ',
  SAR: 'ر.س',
  CNY: '¥',
  HKD: 'HK$',
  SGD: 'S$',
  ZAR: 'R',
  MXN: '$',
  TRY: '₺',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  THB: '฿',
  MYR: 'RM',
  IDR: 'Rp',
  PHP: '₱',
  KRW: '₩',
  TWD: 'NT$',
  VND: '₫',
  BRL: 'R$',
  RUB: '₽',
  PLN: 'zł',
  ILS: '₪',
  ARS: '$',
  CLP: '$',
  COP: '$',
  PEN: 'S/.',
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

// Helper to render currency coin
function renderCurrencyCoin(currency: string, size: number, className: string = '') {
  const symbol = CURRENCY_SYMBOLS[currency] || currency
  
  // Deterministic gradient for currencies
  let bgGradient = 'from-slate-500 to-slate-700'
  if (currency === 'USD') bgGradient = 'from-emerald-400 via-emerald-500 to-green-600'
  else if (currency === 'EUR') bgGradient = 'from-blue-400 via-blue-500 to-indigo-600'
  else if (currency === 'GBP') bgGradient = 'from-violet-400 via-purple-500 to-indigo-600'
  else if (currency === 'JPY') bgGradient = 'from-rose-400 via-rose-500 to-pink-600'
  else if (currency === 'INR') bgGradient = 'from-amber-400 via-orange-500 to-rose-600'
  else if (currency === 'CAD') bgGradient = 'from-red-400 via-red-500 to-rose-600'
  else if (currency === 'AUD') bgGradient = 'from-teal-400 via-teal-500 to-cyan-600'
  else if (currency === 'CHF') bgGradient = 'from-gray-300 via-slate-400 to-slate-500'
  else {
    // Stable color for other currencies
    let hash = 0
    for (let i = 0; i < currency.length; i++) {
      hash = currency.charCodeAt(i) + ((hash << 5) - hash)
    }
    const gradients = [
      'from-emerald-400 to-teal-600',
      'from-blue-400 to-indigo-600',
      'from-purple-400 to-pink-600',
      'from-amber-400 to-orange-600',
      'from-rose-400 to-red-600',
      'from-cyan-400 to-blue-600',
    ]
    bgGradient = gradients[Math.abs(hash) % gradients.length]
  }

  return (
    <div 
      className={`rounded-full bg-gradient-to-br ${bgGradient} text-white flex items-center justify-center font-black shadow-md border border-white/20 select-none relative shrink-0 transition-transform hover:scale-[1.05] ${className}`}
      style={{ 
        width: size, 
        height: size, 
        fontSize: symbol.length > 2 ? size * 0.28 : size * 0.42
      }}
    >
      {/* Coin inner ring */}
      <div className="absolute inset-[10%] rounded-full border border-white/10 flex items-center justify-center font-sans tracking-tight">
        {symbol}
      </div>
    </div>
  )
}

// 2. Cryptocurrencies Custom SVG Mapping
const CRYPTO_LOGOS: Record<string, { bg: string; icon: React.ReactNode }> = {
  BTC: {
    bg: 'from-amber-500 to-orange-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M16.63 10.37c.39-.77.58-1.57.58-2.39 0-2.31-1.63-4.04-4.59-4.51V1.5h-2.15v1.94c-.56 0-1.13.02-1.7.07V1.5H6.62v1.98c-1.35.08-2.69.21-4 .4v2.18h1.49c.81 0 1.25.43 1.25 1.29v9.26c0 .86-.44 1.29-1.25 1.29H2.62v2.18c1.37.19 2.76.32 4.15.4v1.94h2.15v-1.9c.59.05 1.18.07 1.77.07v1.83h2.15v-1.91c3.19-.34 4.88-2 4.88-4.66 0-1.74-.88-3.09-2.59-3.79zm-7.39-4.22h3.29c1.61 0 2.5.64 2.5 1.93s-.89 1.94-2.5 1.94H9.24V6.15zm3.76 11.23H9.24v-4.14h3.76c1.76 0 2.66.72 2.66 2.07s-.9 2.07-2.66 2.07z"/>
      </svg>
    )
  },
  ETH: {
    bg: 'from-[#627EEA] to-[#455AAB]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M12 2L3.5 14 12 18.5 20.5 14 12 2zm0 14.5L5.3 13.5 12 4.4l6.7 9.1-6.7 3zm0 2.5L3.5 15l8.5 5 8.5-5-8.5 4z" />
      </svg>
    )
  },
  SOL: {
    bg: 'from-[#14F195] via-[#805AD5] to-[#9945FF]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M3.6 17.5h16.8L18.4 20H1.6l2-2.5zm0-7.3h16.8l-2 2.5H1.6l2-2.5zm14.8-7.3l2 2.5H3.6l-2 2.5h16.8z"/>
      </svg>
    )
  },
  BNB: {
    bg: 'from-amber-400 to-yellow-500',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M12 2l4.5 4.5-2.12 2.12L12 6.24l-2.38 2.38-2.12-2.12L12 2zm4.5 7.62l2.38 2.38-2.38 2.38-2.12-2.12 2.12-2.12zM12 22l-4.5-4.5 2.12-2.12L12 17.76l2.38-2.38 2.12 2.12L12 22zm-4.5-9.62L5.12 10 2.74 12.38l2.38 2.38 2.38-2.38zM12 10.12l1.88 1.88-1.88 1.88-1.88-1.88L12 10.12z"/>
      </svg>
    )
  },
  ADA: {
    bg: 'from-blue-600 to-indigo-800',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <circle cx="12" cy="12" r="2.2"/>
        <circle cx="12" cy="6" r="1.3"/>
        <circle cx="12" cy="18" r="1.3"/>
        <circle cx="6" cy="12" r="1.3"/>
        <circle cx="18" cy="12" r="1.3"/>
        <circle cx="7.75" cy="7.75" r="1.3"/>
        <circle cx="16.25" cy="7.75" r="1.3"/>
        <circle cx="7.75" cy="16.25" r="1.3"/>
        <circle cx="16.25" cy="16.25" r="1.3"/>
        <circle cx="12" cy="3" r="0.9"/>
        <circle cx="12" cy="21" r="0.9"/>
        <circle cx="3" cy="12" r="0.9"/>
        <circle cx="21" cy="12" r="0.9"/>
      </svg>
    )
  },
  XRP: {
    bg: 'from-blue-500 to-sky-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M12.2 14.5l6.3 6.3c.6.6 1.5.6 2.1 0 .6-.6.6-1.5 0-2.1l-6.3-6.3L20.6 6c.6-.6.6-1.5 0-2.1s-1.5-.6-2.1 0l-6.3 6.3L5.9 3.9c-.6-.6-1.5-.6-2.1 0s-.6 1.5 0 2.1l6.3 6.3L3.8 18.7c-.6.6-.6 1.5 0 2.1s1.5.6 2.1 0l6.3-6.3z"/>
      </svg>
    )
  },
  DOT: {
    bg: 'from-pink-500 to-rose-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="12" cy="4.5" r="1.8" />
        <circle cx="12" cy="19.5" r="1.8" />
        <circle cx="4.5" cy="12" r="1.8" />
        <circle cx="19.5" cy="12" r="1.8" />
        <circle cx="6.7" cy="6.7" r="1.8" />
        <circle cx="17.3" cy="6.7" r="1.8" />
        <circle cx="6.7" cy="17.3" r="1.8" />
        <circle cx="17.3" cy="17.3" r="1.8" />
      </svg>
    )
  },
  DOGE: {
    bg: 'from-yellow-500 to-amber-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M13.2 4H6v16h7.2c3.2 0 5.8-2.6 5.8-5.8v-4.4c0-3.2-2.6-5.8-5.8-5.8zm2.8 10.2c0 1.5-1.2 2.8-2.8 2.8H9V7.2h4.2c1.5 0 2.8 1.2 2.8 2.8v4.2zM7.5 11h5v2h-5z"/>
      </svg>
    )
  },
  SHIB: {
    bg: 'from-orange-500 to-red-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M12 3c-1.5 2.5-3.5 3-6 3 .5-3-1-5.5-2.5-7C2 2 1 5 2.5 8c-1.5.5-2 2-2 3.5C.5 15.5 5.5 22 12 22s11.5-6.5 11.5-10.5c0-1.5-.5-3-2-3.5C23 5 22 2 20.5 0c-1.5 1.5-3 4-2.5 7-2.5 0-4.5-.5-6-3zm-4 9c.8 0 1.5.7 1.5 1.5S8.8 15 8 15s-1.5-.7-1.5-1.5.7-1.5 1.5-1.5zm8 0c.8 0 1.5.7 1.5 1.5S16.8 15 16 15s-1.5-.7-1.5-1.5.7-1.5 1.5-1.5z"/>
      </svg>
    )
  },
  AVAX: {
    bg: 'from-red-500 to-rose-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M12 2.5L2 19.5h20L12 2.5zm0 5.8l6.1 10.2H5.9L12 8.3z"/>
      </svg>
    )
  },
  MATIC: {
    bg: 'from-purple-500 to-indigo-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 17L12 19.5L17 17V12L12 9.5L7 12V17Z" />
        <path d="M12 9.5V4.5L7 2L2 4.5V9.5L7 12" />
        <path d="M12 14.5V19.5" opacity="0.5" />
      </svg>
    )
  },
  LTC: {
    bg: 'from-slate-400 to-slate-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M18.14 15.65h-6.2l1.64-6.19h5.18l.51-1.92h-5.18l1.32-5H11.5l-1.32 5H6.94l-.51 1.92h3.24L8 15.65H4.22L3.6 18h15.15z"/>
      </svg>
    )
  },
  LINK: {
    bg: 'from-blue-600 to-indigo-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 20 6.5 20 15.5 12 20 4 15.5 4 6.5" />
        <polygon points="12 6 17 9.25 17 14.75 12 18 7 14.75 7 9.25" />
      </svg>
    )
  },
  UNI: {
    bg: 'from-pink-500 to-fuchsia-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M12 2C7 2 3 6 3 11c0 3 1.5 5.5 3.8 7.2L6 21c3-.5 5.5-2.2 7-4.5 4 .2 8-2.5 8-7.5 0-4.5-4-7-9-7zm1.5 8.5c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5z"/>
      </svg>
    )
  },
  NEAR: {
    bg: 'from-gray-800 to-black',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round">
        <path d="M4 20V4l16 16V4" />
      </svg>
    )
  },
  ATOM: {
    bg: 'from-[#2E3148] to-[#1A1C2A]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[1.5] p-[15%]">
        <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(30 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(-30 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="3.5" transform="rotate(90 12 12)" />
        <circle cx="12" cy="12" r="2" className="fill-current text-white" />
      </svg>
    )
  },
  XLM: {
    bg: 'from-blue-600 to-indigo-900',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]">
        <circle cx="12" cy="12" r="8" />
        <path d="M7 17l10-10M11 6l7 7M6 11l7 7" strokeLinecap="round" />
      </svg>
    )
  },
  ALGO: {
    bg: 'from-gray-900 to-black',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M18.8 19.7l-4.5-8.1L12.5 15l3.2 5.7c.3.5-.1 1.2-.8 1.2h-2.5c-.3 0-.6-.2-.7-.5L8.2 15l-1.9 3.5h2.5c.6 0 .9.7.6 1.2l-.7 1.2c-.3.5-.9.8-1.5.8H1.8c-.7 0-1.1-.7-.8-1.2L9.2 4.3c.3-.6 1.1-.6 1.4 0l2.5 4.5 1.5-2.7c.3-.6 1.1-.6 1.4 0l5.1 9.1c.3.6-.1 1.3-.8 1.3H20c-.5.2-.9 0-1.2-.3z"/>
      </svg>
    )
  },
  ICP: {
    bg: 'from-purple-600 to-indigo-800',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 12c-2.5-4-5-4-7-2s-2 5 0 7 4.5 2 7-2c2.5 4 5 4 7 2s2-5 0-7-4.5-2-7 2z" />
      </svg>
    )
  },
  FTM: {
    bg: 'from-blue-500 to-indigo-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
        <line x1="12" y1="2" x2="12" y2="22" />
      </svg>
    )
  },
  MANA: {
    bg: 'from-orange-500 to-rose-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M12 2L2 22h20L12 2zm0 5l6.5 12h-13L12 7zm-3.5 8c-.8 0-1.5.7-1.5 1.5S7.7 18 8.5 18s1.5-.7 1.5-1.5S9.3 15 8.5 15z"/>
      </svg>
    )
  },
  SAND: {
    bg: 'from-cyan-500 to-blue-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a9 9 0 0 0 0 18 9 9 0 0 0 9-9" />
        <path d="M12 9a3 3 0 1 0 0 6" />
      </svg>
    )
  },
  AAVE: {
    bg: 'from-[#B6509E] to-[#863872]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M12 2a6 6 0 0 0-6 6v7.5c0 1 .5 2 1.5 2.5l2 1 2.5-2 2.5 2 2-1c1-.5 1.5-1.5 1.5-2.5V8a6 6 0 0 0-6-6zm-2 7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
      </svg>
    )
  },
  CRV: {
    bg: 'from-stone-700 to-stone-900',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round">
        <path d="M4 6c4 6 12 6 16 0M4 18c4-6 12-6 16 0" />
      </svg>
    )
  },
  MKR: {
    bg: 'from-[#1AAB9B] to-[#127F73]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V4l8 8 8-8v16" />
      </svg>
    )
  },
  COMP: {
    bg: 'from-[#00D395] to-[#009E6F]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round">
        <line x1="5" y1="7" x2="19" y2="7" />
        <line x1="5" y1="12" x2="19" y2="12" />
        <line x1="5" y1="17" x2="19" y2="17" />
      </svg>
    )
  },
  GRT: {
    bg: 'from-[#6F4CFF] to-[#4F2FD6]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2.5 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20h18M3 16l6-6 4 4 8-8" />
      </svg>
    )
  },
  SNX: {
    bg: 'from-[#0E0E1B] to-[#242445]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2.5 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 15l4-5 4 5 4-5 4 5" />
      </svg>
    )
  },
  AXS: {
    bg: 'from-blue-600 to-indigo-800',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 8l7-5 7 5v8l-7 5-7-5V8z" />
        <path d="M12 8v8M8 12h8" opacity="0.6" />
      </svg>
    )
  },
  GALA: {
    bg: 'from-[#011627] to-slate-900',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
        <polygon points="12 7.5 17.5 11 17.5 14.5 12 18 6.5 14.5 6.5 11" />
      </svg>
    )
  },
  DYDX: {
    bg: 'from-indigo-500 to-purple-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4h8a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5H5V4z" />
        <path d="M12 14v6" />
      </svg>
    )
  },
  RUNE: {
    bg: 'from-emerald-400 to-teal-500',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l9 10-9 10-9-10zM12 6v12" />
      </svg>
    )
  },
  IMX: {
    bg: 'from-zinc-800 to-zinc-950',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round">
        <path d="M5 5l14 14M19 5L5 19" />
      </svg>
    )
  },
  ENJ: {
    bg: 'from-[#6236FF] to-indigo-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4h14M5 12h10M5 20h14" />
      </svg>
    )
  },
  BAT: {
    bg: 'from-[#FF5000] to-orange-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2.5 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 3 21 19 3 19" />
      </svg>
    )
  },
  THETA: {
    bg: 'from-[#2AB8C5] to-teal-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    )
  },
  LRC: {
    bg: 'from-blue-500 to-indigo-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 20 12 12 22 4 12" />
      </svg>
    )
  },
  CHZ: {
    bg: 'from-red-600 to-rose-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )
  },
  GMT: {
    bg: 'from-amber-500 to-yellow-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18M12 3v18" />
      </svg>
    )
  },
  APT: {
    bg: 'from-teal-400 to-emerald-500',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    )
  },
  OP: {
    bg: 'from-red-500 to-red-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-3 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
      </svg>
    )
  },
  ARB: {
    bg: 'from-sky-500 to-blue-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    )
  },
  LDO: {
    bg: 'from-cyan-400 to-sky-500',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 22h20L12 2z" />
      </svg>
    )
  },
  GMX: {
    bg: 'from-slate-700 to-slate-900',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3h18v18H3zM9 9l6 6M15 9l-6 6" />
      </svg>
    )
  },
  EGLD: {
    bg: 'from-amber-600 to-amber-800',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
      </svg>
    )
  },
  FLOW: {
    bg: 'from-green-400 to-emerald-500',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" />
      </svg>
    )
  },
  MINA: {
    bg: 'from-violet-700 to-purple-900',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="8" />
      </svg>
    )
  },
  XTZ: {
    bg: 'from-blue-600 to-blue-800',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M16 5h-8v2h4l-4 8h2l4-8v8h2V5z"/>
      </svg>
    )
  },
  EOS: {
    bg: 'from-slate-600 to-slate-800',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 20 8.5 12 22 4 8.5" />
        <line x1="4" y1="8.5" x2="20" y2="8.5" />
      </svg>
    )
  },
  VET: {
    bg: 'from-sky-400 to-indigo-500',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 4l6 14 6-14" />
      </svg>
    )
  }
}

// 3. Stocks Custom SVG Mapping
const STOCK_LOGOS: Record<string, { bg: string; icon: React.ReactNode }> = {
  AAPL: {
    bg: 'from-slate-400 to-slate-600',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.5-.62.72-1.16 1.87-1.02 2.98 1.11.09 2.25-.57 2.97-1.42z"/>
      </svg>
    )
  },
  MSFT: {
    bg: 'from-neutral-700 to-neutral-900',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full p-[15%]">
        <rect x="3" y="3" width="8" height="8" fill="#F25022"/>
        <rect x="13" y="3" width="8" height="8" fill="#7FBA00"/>
        <rect x="3" y="13" width="8" height="8" fill="#00A4EF"/>
        <rect x="13" y="13" width="8" height="8" fill="#FFB900"/>
      </svg>
    )
  },
  GOOGL: {
    bg: 'from-stone-100 to-stone-200 border border-border/40',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full p-[10%]">
        <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.56-1.56 2.95-3.24 3.5v2.87h5.18c3.07-2.83 4.82-7 4.82-11.95 0-.75-.07-1.49-.2-2.15z" fill="#4285F4"/>
        <path d="M12.18 20.2c2.68 0 4.93-.89 6.57-2.42l-5.18-2.87c-.8.54-1.83.87-3.05.87-2.35 0-4.34-1.58-5.05-3.71H1.05v2.98c1.71 3.4 5.21 5.73 9.29 5.73z" fill="#34A853"/>
        <path d="M7.13 12.07a5.72 5.72 0 0 1 0-3.64V5.45H1.05a9.83 9.83 0 0 0 0 9.6l6.08-2.98z" fill="#FBBC05"/>
        <path d="M12.18 5.75c1.46 0 2.77.5 3.8 1.49l2.85-2.85C17.1 2.85 14.86 2 12.18 2 8.1 2 4.6 4.33 2.89 7.73l6.08 2.98c.71-2.13 2.7-3.71 5.05-3.71z" fill="#EA4335"/>
      </svg>
    )
  },
  AMZN: {
    bg: 'from-slate-800 to-slate-950',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full text-[#FF9900] fill-current p-[15%]">
        <path d="M18.8 14.6c-1.3 1.1-3.2 1.7-5.3 1.7-3.2 0-5.9-1.5-7.2-3.8-.3-.5-.1-.7.4-.4 1.8 1 4.3 1.6 6.8 1.6 2 0 4.1-.4 5.8-1.2.6-.3.8 0 .5.5z"/>
        <path d="M20.2 12.7c-.2-.4-.7-.3-1.1-.1l-1.9.9c-.3.2-.3.5 0 .7.8.6 1.8 1.3 2.8.9.9-.4.9-1.7.2-2.4z"/>
      </svg>
    )
  },
  TSLA: {
    bg: 'from-red-600 to-red-800',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M12 2c-.1 0-7.8 1.6-7.8 1.6v2.2s7.8-1.5 7.8-1.5 7.8 1.5 7.8 1.5V3.6S12.1 2 12 2zm7.4 5.3s-7.4 2-7.4 2-7.4-2-7.4-2V9s7.4 2.1 7.4 2.1 7.4-2.1 7.4-2.1V7.3zm-.8 5s-6.6 2.2-6.6 2.2-6.6-2.2-6.6-2.2v2s6.6 2.3 6.6 2.3 6.6-2.3 6.6-2.3v-2z"/>
      </svg>
    )
  },
  NVDA: {
    bg: 'from-[#76B900] to-emerald-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2" />
        <path d="M12 18c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6" />
        <path d="M12 14c1.105 0 2-1.105 2-2.5S13.105 9 12 9" />
      </svg>
    )
  },
  META: {
    bg: 'from-[#0081FB] to-blue-800',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-[2.5] p-[10%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 15a4 4 0 1 1 0-8c2.5 0 5 5 5 5s2.5-5 5-5a4 4 0 1 1 0 8c-2.5 0-5-5-5-5s-2.5 5-5 5z" />
      </svg>
    )
  },
  NFLX: {
    bg: 'from-red-600 to-black',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M4 2v20h3.5l4.5-13.5 4.5 13.5H20V2h-3.5v13.5L12 2H8v13.5L4.5 2H4z"/>
      </svg>
    )
  },
  AMD: {
    bg: 'from-[#ED1C24] to-red-800',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M20 4H9v6l5-5h6v5l-5 5h6v4H4v-8h5l-5-5v13h16V4z"/>
      </svg>
    )
  },
  INTC: {
    bg: 'from-[#0071C5] to-blue-800',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round">
        <path d="M3 12a9 9 0 1 1 18 0M10 9h4M12 9v6M9 15h6" />
      </svg>
    )
  },
  'BRK.B': {
    bg: 'from-[#002855] to-blue-950',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-serif font-black text-xs select-none">
        BH
      </div>
    )
  },
  JNJ: {
    bg: 'from-red-600 to-rose-800',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-serif italic font-black text-[10px] select-none">
        J&J
      </div>
    )
  },
  V: {
    bg: 'from-[#1A1F71] to-[#0F134A]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full text-[#F7B600] fill-current p-[15%]">
        <path d="M21 4l-3 14H15l3-14zM11.5 4L7.8 14.2l-.4-2L6 6.3c-.3-1-1-1.8-2-2.3L4 4h5.5l1.3 5.5zm8 0h-3.8L13 18h3.3l1.2-5.5H20z" />
      </svg>
    )
  },
  PG: {
    bg: 'from-[#003DA5] to-blue-800',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-bold text-[9px] select-none">
        P&G
      </div>
    )
  },
  JPM: {
    bg: 'from-[#111111] to-neutral-900',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinejoin="round">
        <polygon points="12 2 21 7.2 21 16.8 12 22 3 16.8 3 7.2" />
        <polygon points="12 6.5 17 9.4 17 14.6 12 17.5 7 14.6 7 9.4" opacity="0.6" />
      </svg>
    )
  },
  UNH: {
    bg: 'from-blue-900 to-cyan-950',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L3 6v6c0 5.5 4.5 10 9 10s9-4.5 9-10V6l-9-4z" />
        <path d="M9 10l3 3 3-3" opacity="0.7" />
      </svg>
    )
  },
  HD: {
    bg: 'from-[#F96302] to-orange-800',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-black text-[8px] select-none -rotate-12">
        DEPOT
      </div>
    )
  },
  LLY: {
    bg: 'from-red-500 to-rose-700',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-serif italic font-bold text-xs select-none">
        Lilly
      </div>
    )
  },
  BAC: {
    bg: 'from-blue-800 to-blue-950',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full p-[15%]">
        <rect x="3" y="4" width="18" height="5" fill="#E31837" />
        <rect x="3" y="11" width="18" height="9" fill="#0056B3" />
      </svg>
    )
  },
  DIS: {
    bg: 'from-[#113C7B] to-blue-950',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-current text-white p-[15%]">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 14.5c-.8.5-1.5.3-2-.5L9.5 13H11v-1.5h-2.5v-2H11V8h2.5v1.5h1c.8 0 1.5.7 1.5 1.5v3.5c0 1-.8 1.5-2 1.5z" />
      </svg>
    )
  },
  RELIANCE: {
    bg: 'from-blue-900 to-indigo-950',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-black text-xs select-none">
        R
      </div>
    )
  },
  TCS: {
    bg: 'from-[#00529B] to-blue-900',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-bold text-[8px] select-none">
        TCS
      </div>
    )
  },
  INFY: {
    bg: 'from-[#006699] to-cyan-900',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-black text-[8px] select-none">
        INFY
      </div>
    )
  },
  HDFCBANK: {
    bg: 'from-[#003366] to-blue-900',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-bold text-[8px] select-none">
        HDFC
      </div>
    )
  },
  ICICIBANK: {
    bg: 'from-[#993300] to-amber-900',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-black text-[8px] select-none">
        ICICI
      </div>
    )
  },
  SBIN: {
    bg: 'from-[#00B5E2] to-cyan-700',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full fill-none stroke-white stroke-2 p-[15%]">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="2.5" className="fill-current text-white" />
        <line x1="12" y1="14.5" x2="12" y2="20" strokeWidth="2.5" />
      </svg>
    )
  },
  BHARTIARTL: {
    bg: 'from-[#E30A17] to-rose-800',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-black text-[9px] select-none">
        airtel
      </div>
    )
  },
  KOTAKBANK: {
    bg: 'from-red-600 to-stone-700',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-bold text-[8px] select-none">
        KOTAK
      </div>
    )
  },
  LT: {
    bg: 'from-amber-500 to-yellow-600',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-black text-xs select-none">
        L&T
      </div>
    )
  },
  AXISBANK: {
    bg: 'from-rose-800 to-rose-950',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-bold text-[8px] select-none">
        AXIS
      </div>
    )
  },
  WIPRO: {
    bg: 'from-blue-400 via-purple-500 to-rose-500',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-black text-[8px] select-none">
        WIPRO
      </div>
    )
  },
  TATASTEEL: {
    bg: 'from-blue-700 to-indigo-900',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-bold text-[8px] select-none">
        TATA
      </div>
    )
  },
  MARUTI: {
    bg: 'from-slate-400 to-slate-600',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-bold text-[8px] select-none">
        MS
      </div>
    )
  },
  ONGC: {
    bg: 'from-red-600 to-orange-700',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-bold text-[8px] select-none">
        ONGC
      </div>
    )
  },
  COALINDIA: {
    bg: 'from-emerald-700 to-black',
    icon: (
      <div className="w-full h-full flex items-center justify-center text-white font-sans font-bold text-[8px] select-none">
        CIL
      </div>
    )
  }
}

// Fallback generator for stocks
function renderStockCoinFallback(symbol: string, size: number, className: string = '') {
  const gradient = getInitialsColor(symbol)
  const cleanInit = symbol.replace('.NS', '').substring(0, 2)
  return (
    <div 
      className={`rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black shadow-md border border-white/20 select-none relative shrink-0 transition-transform hover:scale-[1.05] ${className}`}
      style={{ width: size, height: size }}
    >
      <div 
        className="absolute inset-[10%] rounded-xl border border-white/10 flex items-center justify-center font-mono tracking-tight text-center"
        style={{ fontSize: size * 0.38 }}
      >
        {cleanInit}
      </div>
    </div>
  )
}

// Fallback generator for crypto
function renderCryptoCoinFallback(symbol: string, size: number, className: string = '') {
  const gradient = getInitialsColor(symbol)
  const cleanInit = symbol.substring(0, 2)
  return (
    <div 
      className={`rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center font-black shadow-md border border-white/20 select-none relative shrink-0 transition-transform hover:scale-[1.05] ${className}`}
      style={{ width: size, height: size }}
    >
      <div 
        className="absolute inset-[10%] rounded-full border border-white/10 flex items-center justify-center font-mono tracking-tight text-center"
        style={{ fontSize: size * 0.38 }}
      >
        {cleanInit}
      </div>
    </div>
  )
}

export function AssetLogo({ symbol, type = 'stock', className = '', size = 32 }: AssetLogoProps) {
  const normalizedSymbol = symbol.toUpperCase()
  const cleanSym = normalizedSymbol.replace('.NS', '')
  const normType = type?.toLowerCase() || 'stock'

  // 1. Forex overlapping flags/coins render logic
  if (normType === 'forex' || normalizedSymbol.includes('/')) {
    const parts = normalizedSymbol.split('/')
    const baseCurrency = parts[0] || 'USD'
    const quoteCurrency = parts[1] || 'INR'

    return (
      <div 
        className={`relative inline-flex items-center shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        {/* Quote currency coin (bottom-right) */}
        {renderCurrencyCoin(quoteCurrency, size * 0.65, 'absolute bottom-0 right-0 z-0')}
        {/* Base currency coin (top-left) */}
        {renderCurrencyCoin(baseCurrency, size * 0.65, 'absolute top-0 left-0 z-10')}
      </div>
    )
  }

  // 2. Crypto render logic
  if (normType === 'crypto') {
    const cryptoConfig = CRYPTO_LOGOS[cleanSym]
    if (cryptoConfig) {
      return (
        <div 
          className={`rounded-full bg-gradient-to-br ${cryptoConfig.bg} flex items-center justify-center shrink-0 shadow-md border border-white/20 relative transition-transform hover:scale-[1.05] ${className}`}
          style={{ width: size, height: size }}
        >
          {/* Inner ring */}
          <div className="absolute inset-[8%] rounded-full border border-white/10 flex items-center justify-center overflow-hidden">
            {cryptoConfig.icon}
          </div>
        </div>
      )
    }
    return renderCryptoCoinFallback(cleanSym, size, className)
  }

  // 3. Stock render logic
  const stockConfig = STOCK_LOGOS[cleanSym]
  if (stockConfig) {
    return (
      <div 
        className={`rounded-xl bg-gradient-to-br ${stockConfig.bg} flex items-center justify-center shrink-0 shadow-md border border-white/20 relative transition-transform hover:scale-[1.05] ${className}`}
        style={{ width: size, height: size }}
      >
        {/* Inner ring */}
        <div className="absolute inset-[8%] rounded-xl border border-white/10 flex items-center justify-center overflow-hidden">
          {stockConfig.icon}
        </div>
      </div>
    )
  }

  return renderStockCoinFallback(cleanSym, size, className)
}
