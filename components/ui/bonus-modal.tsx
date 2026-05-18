'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import confetti from 'canvas-confetti'
import { Trophy, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function BonusModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [bonusAmount, setBonusAmount] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    let channel: any

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      channel = supabase
        .channel(`bonus_inserts_${Math.random().toString(36).substring(7)}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bonus_events',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const amount = payload.new.bonus_amount
            setBonusAmount(amount)
            setIsOpen(true)
            triggerConfetti()
          }
        )
        .subscribe()
    }

    setupRealtime()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase])

  const triggerConfetti = () => {
    const duration = 3 * 1000
    const animationEnd = Date.now() + duration
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        return clearInterval(interval)
      }

      const particleCount = 50 * (timeLeft / duration)
      
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      })
      confetti({
        ...defaults, particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      })
    }, 250)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            className="bg-card border-2 border-gain/50 shadow-2xl shadow-gain/20 rounded-3xl p-8 max-w-md w-full relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-gain/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-gain/20 rounded-full blur-3xl pointer-events-none" />

            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors z-10"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex flex-col items-center text-center space-y-6 relative z-10">
              <div className="h-24 w-24 bg-gain/10 rounded-full flex items-center justify-center border-4 border-gain">
                <Trophy className="h-12 w-12 text-gain" />
              </div>

              <div>
                <h2 className="text-3xl font-black tracking-tight mb-2">Milestone Reached!</h2>
                <p className="text-muted-foreground">
                  Your trading strategy is paying off. You've hit a 10% portfolio growth milestone!
                </p>
              </div>

              <div className="bg-gain/10 border border-gain/20 rounded-xl p-4 w-full">
                <p className="text-sm font-medium text-gain uppercase tracking-widest mb-1">Bonus Awarded</p>
                <p className="text-4xl font-black text-foreground">
                  +{formatCurrency(bonusAmount)}
                </p>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-full h-12 bg-gain hover:bg-gain/90 text-white font-bold rounded-xl transition-colors"
              >
                Keep Trading
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
