'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, AlertOctagon, RefreshCw, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const router = useRouter()
  const supabase = createClient()

  const [isResetting, setIsResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    onClose()
  }

  const handleReset = async () => {
    if (!confirm('Are you absolutely sure you want to reset your TradeLab account? This will erase all positions, transactions, and reset your balance to ₹5,00,000.00!')) {
      return
    }

    setIsResetting(true)
    setResetMessage('')
    setSuccess(false)

    try {
      const res = await fetch('/api/profile/reset', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
        setResetMessage(data.message)
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setSuccess(false)
        setResetMessage(data.error || 'Failed to reset account.')
      }
    } catch {
      setSuccess(false)
      setResetMessage('An unexpected error occurred.')
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl font-mono relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <span className="text-sm font-black text-white uppercase tracking-wider">System Settings</span>
              </div>
              <button
                onClick={() => {
                  onClose()
                  setResetMessage('')
                }}
                className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-zinc-400 tracking-wider">Trading Environment</h3>
                <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-lg p-3 space-y-2 text-[11px] text-zinc-400">
                  <div className="flex justify-between">
                    <span>Twelve Data API:</span>
                    <span className="text-green-400 font-bold">CONNECTED</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Finnhub API:</span>
                    <span className="text-green-400 font-bold">CONNECTED</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Anthropic AI API:</span>
                    <span className="text-green-400 font-bold">CONNECTED (SIMULATED STREAM)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-red-500 tracking-wider">Nuclear Actions</h3>
                <div className="bg-red-950/10 border border-red-900/30 rounded-lg p-4 space-y-3">
                  <div className="flex gap-3">
                    <AlertOctagon className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-red-200">Reset Simulator Account</p>
                      <p className="text-[10px] text-red-400/80 leading-relaxed">
                        This will erase all active option positions, margin borrows, transaction history, and restore your mock balance back to ₹5,00,000.00.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleReset}
                    disabled={isResetting}
                    className="w-full h-9 bg-red-900 hover:bg-red-800 disabled:opacity-40 text-white rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5"
                  >
                    {isResetting ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        RESETTING ACCOUNT...
                      </>
                    ) : (
                      '⚠️ RESET ALL SIMULATOR DATA'
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                <button
                  onClick={handleLogout}
                  className="w-full h-9 border border-zinc-800 hover:bg-red-950/20 hover:text-red-400 text-zinc-300 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5"
                >
                  <LogOut className="h-4 w-4" />
                  LOG OUT OF ACCOUNT
                </button>
              </div>

              {/* Notifications */}
              <AnimatePresence>
                {resetMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className={`text-[11px] p-3 rounded-lg border ${
                      success
                        ? 'bg-green-950/30 border-green-800 text-green-300'
                        : 'bg-red-950/30 border-red-800 text-red-300'
                    }`}
                  >
                    {resetMessage}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-zinc-800 bg-zinc-900/30 text-center">
              <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">TradeLab Terminal v1.0.0</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
