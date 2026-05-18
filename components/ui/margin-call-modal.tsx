'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

function AnimatedNumber({ from, to, duration = 1.5 }: { from: number; to: number; duration?: number }) {
  const count = useMotionValue(from)
  const rounded = useTransform(count, (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v)
  )
  const [display, setDisplay] = useState(
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(from)
  )

  useEffect(() => {
    const unsubscribe = rounded.on('change', setDisplay)
    const controls = animate(count, to, { duration, ease: 'easeOut' })
    return () => {
      unsubscribe()
      controls.stop()
    }
  }, [from, to, duration, count, rounded])

  return <span>{display}</span>
}

interface MarginCallInfo {
  symbol: string
  lostAmount: number
  closedAt: string
}

export function MarginCallModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [callInfo, setCallInfo] = useState<MarginCallInfo | null>(null)
  const [showFlash, setShowFlash] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let channel: any

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel('margin_liquidation_alerts')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'margin_positions',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updated = payload.new as any
            // Only fire if this update set status to 'liquidated'
            if (updated.status === 'liquidated') {
              const collateral = updated.collateral_amount || 0
              setCallInfo({
                symbol: updated.symbol,
                lostAmount: collateral,
                closedAt: updated.closed_at
              })
              setShowFlash(true)
              // Flash fades out, then modal appears
              setTimeout(() => {
                setShowFlash(false)
                setIsOpen(true)
              }, 800)
            }
          }
        )
        .subscribe()
    }

    setupRealtime()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [supabase])

  return (
    <>
      {/* Full-screen Red Flash */}
      <AnimatePresence>
        {showFlash && (
          <motion.div
            key="flash"
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{ backgroundColor: '#FF4D4D' }}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: [0.9, 0.4, 0.9, 0.2, 0] }}
            transition={{ duration: 0.8, times: [0, 0.25, 0.5, 0.75, 1] }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Margin Call Modal */}
      <AnimatePresence>
        {isOpen && callInfo && (
          <motion.div
            key="margin-call-modal"
            className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="relative bg-card border-2 border-loss rounded-3xl p-8 max-w-md w-full overflow-hidden shadow-2xl shadow-loss/30"
            >
              {/* Pulsing background glow */}
              <motion.div
                className="absolute inset-0 bg-loss/10 pointer-events-none rounded-3xl"
                animate={{ opacity: [0.1, 0.25, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />

              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="relative z-10 flex flex-col items-center text-center space-y-5">
                {/* Icon */}
                <motion.div
                  className="h-20 w-20 rounded-full bg-loss/20 border-4 border-loss flex items-center justify-center"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity }}
                >
                  <AlertTriangle className="h-10 w-10 text-loss" />
                </motion.div>

                {/* Title */}
                <div>
                  <h2 className="text-2xl font-black text-loss uppercase tracking-widest">
                    Margin Call
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Position liquidated at market price
                  </p>
                </div>

                {/* Symbol */}
                <div className="bg-loss/10 border border-loss/30 rounded-xl px-6 py-3 w-full">
                  <p className="text-xs font-bold text-loss uppercase tracking-widest mb-1">Asset Liquidated</p>
                  <p className="text-2xl font-black">{callInfo.symbol}</p>
                </div>

                {/* Animated loss counter */}
                <div className="w-full">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">Collateral Lost</p>
                  <div className="text-3xl font-black text-loss font-mono">
                    <AnimatedNumber from={callInfo.lostAmount} to={0} duration={1.8} />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your margin position was automatically closed because your unrealised loss exceeded 80% of your collateral. All remaining funds have been returned to your balance.
                </p>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full h-12 bg-loss hover:bg-loss/90 text-white font-bold rounded-xl transition-colors"
                >
                  Acknowledge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
