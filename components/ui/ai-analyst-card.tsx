'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Sparkles, Bot } from 'lucide-react'

interface AIAnalystCardProps {
  symbol: string
}

export function AIAnalystCard({ symbol }: AIAnalystCardProps) {
  const [analysis, setAnalysis] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState('')
  const [cacheHit, setCacheHit] = useState(false)
  const [cacheAge, setCacheAge] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Format analysis text: bold bullet labels, keep rest normal
  const formatAnalysis = (text: string) => {
    return text
      .split('\n')
      .map((line, i) => {
        if (!line.trim()) return null
        // Highlight bullet markers
        const formatted = line
          .replace(/^[•\-\*]\s*/, '')
          .replace(/^(\d+\.\s*)/, '')

        // Extract label (everything before first colon)
        const colonIdx = formatted.indexOf(':')
        if (colonIdx !== -1) {
          const label = formatted.slice(0, colonIdx)
          const rest = formatted.slice(colonIdx)
          return (
            <div key={i} className="flex gap-2 leading-relaxed">
              <span className="text-green-400 shrink-0 select-none">▸</span>
              <span>
                <span className="text-green-300 font-black">{label}</span>
                <span className="text-green-400/90">{rest}</span>
              </span>
            </div>
          )
        }
        return (
          <div key={i} className="flex gap-2 leading-relaxed">
            <span className="text-green-400 shrink-0">▸</span>
            <span className="text-green-400/90">{formatted}</span>
          </div>
        )
      })
      .filter(Boolean)
  }

  const fetchAnalysis = async (forceRefresh = false) => {
    // Cancel any ongoing stream
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    setIsStreaming(false)
    setError('')
    if (forceRefresh) setAnalysis('')
    setCacheHit(false)
    setCacheAge(null)

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, forceRefresh }),
        signal: controller.signal
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Analysis failed')
      }

      const hit = res.headers.get('X-Cache') === 'HIT'
      const age = res.headers.get('X-Cache-Age')
      setCacheHit(hit)
      setCacheAge(age)

      // Stream the response
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      setIsLoading(false)
      setIsStreaming(true)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        accumulated += chunk
        setAnalysis(accumulated)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to generate analysis.')
      }
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const showContent = analysis || isLoading || error

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-green-900/50 bg-zinc-950 overflow-hidden"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-green-900/40 bg-black/40">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <Bot className="h-3.5 w-3.5 text-green-500" />
            <span className="text-[11px] font-bold text-green-500 tracking-widest uppercase font-mono">
              NullRisk AI — {symbol}
            </span>
          </div>
          {cacheHit && (
            <span className="text-[9px] text-green-700 font-mono bg-green-950 px-1.5 py-0.5 rounded">
              CACHED {cacheAge ? `${parseFloat(cacheAge).toFixed(0)}m ago` : ''}
            </span>
          )}
        </div>

        <button
          onClick={() => fetchAnalysis(!analysis ? false : true)}
          disabled={isLoading || isStreaming}
          className="flex items-center gap-1.5 text-[11px] font-bold text-green-600 hover:text-green-400 transition-colors font-mono disabled:opacity-40 group"
        >
          <RefreshCw className={`h-3 w-3 ${(isLoading || isStreaming) ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          {analysis ? 'REFRESH' : 'GENERATE'}
        </button>
      </div>

      {/* Terminal body */}
      <div className="p-5 font-mono text-sm min-h-[100px]">
        <AnimatePresence mode="wait">
          {!showContent && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-4 text-center gap-3"
            >
              <Sparkles className="h-8 w-8 text-green-900" />
              <div className="space-y-1">
                <p className="text-green-700 text-sm font-mono">AI Analyst ready</p>
                <p className="text-green-900 text-xs">Click Generate to get AI commentary on {symbol}</p>
              </div>
              <button
                onClick={() => fetchAnalysis(false)}
                className="mt-2 px-5 py-2 bg-green-950 border border-green-800 hover:border-green-600 hover:bg-green-900/50 text-green-400 text-xs font-black rounded-lg transition-all font-mono tracking-widest"
              >
                ▶ GENERATE ANALYSIS
              </button>
            </motion.div>
          )}

          {isLoading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 text-green-500/70"
            >
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-xs font-mono animate-pulse">
                Fetching market data + generating analysis...
              </span>
            </motion.div>
          )}

          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400/80 text-xs font-mono"
            >
              ✗ {error}
            </motion.div>
          )}

          {analysis && !isLoading && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2.5"
            >
              {formatAnalysis(analysis)}
              {/* Blinking cursor while streaming */}
              {isStreaming && (
                <motion.span
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-2 h-4 bg-green-400 ml-1 align-middle"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer bar */}
      <div className="px-4 py-2 border-t border-green-900/30 bg-black/20 flex items-center justify-between">
        <span className="text-[9px] text-green-900 font-mono uppercase tracking-widest">
          Powered by Claude · For educational purposes only
        </span>
        <span className="text-[9px] text-green-900 font-mono">
          {analysis ? `${analysis.split(/\s+/).length} words` : '—'}
        </span>
      </div>
    </motion.div>
  )
}
