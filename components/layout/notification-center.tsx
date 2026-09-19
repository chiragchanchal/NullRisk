'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, Trash2, ArrowUpRight, TrendingUp, AlertTriangle, ShieldCheck, Award } from 'lucide-react'
import Link from 'next/link'

export interface NotificationItem {
  id: string
  title: string
  description: string
  time: string
  type: 'fill' | 'alert' | 'milestone' | 'system'
  read: boolean
  link?: string
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Milestone Target Active',
    description: 'Achieve +10.00% portfolio return to unlock ₹10,00,000 Liquid Mock Balance.',
    time: '10m ago',
    type: 'milestone',
    read: false,
    link: '/portfolio',
  },
  {
    id: 'n2',
    title: 'Paper Trading Engine Online',
    description: 'Market data connected to Finnhub, CoinGecko & Twelve Data feeds.',
    time: '25m ago',
    type: 'system',
    read: false,
    link: '/market',
  },
  {
    id: 'n3',
    title: 'Margin Safety Protocol Verified',
    description: 'Dynamic liquidation threshold monitor active at 80% and 150% debt-to-collateral ratios.',
    time: '1h ago',
    type: 'alert',
    read: true,
    link: '/portfolio',
  },
]

export function NotificationCenter({
  isOpen,
  onClose,
  onUnreadCountChange,
}: {
  isOpen: boolean
  onClose: () => void
  onUnreadCountChange?: (count: number) => void
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS)
  const [activeTab, setActiveTab] = useState<'all' | 'orders' | 'alerts'>('all')

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }))
    setNotifications(updated)
    onUnreadCountChange?.(0)
  }

  const clearAll = () => {
    setNotifications([])
    onUnreadCountChange?.(0)
  }

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'orders') return n.type === 'fill'
    if (activeTab === 'alerts') return n.type === 'alert' || n.type === 'milestone'
    return true
  })

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="absolute right-0 top-12 z-50 w-80 sm:w-96">
        {/* Backdrop for outside click */}
        <div className="fixed inset-0 z-40" onClick={onClose} />

        {/* Popover Card */}
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          className="relative z-50 rounded-2xl bg-zinc-950 border border-white/[0.12] shadow-[0_16px_48px_-8px_rgba(0,0,0,0.85)] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Bell className="h-3.5 w-3.5" />
              </div>
              <span className="font-mono font-bold text-sm text-zinc-100">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2 py-1 rounded-md text-[10px] font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Mark all as read"
                >
                  <Check className="h-3 w-3 text-emerald-400" />
                  <span>Mark Read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors cursor-pointer"
                  title="Clear all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-4 pt-2.5 pb-1 flex items-center gap-2 border-b border-white/[0.04] bg-zinc-900/30">
            {(['all', 'orders', 'alerts'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded transition-colors cursor-pointer ${
                  activeTab === tab
                    ? 'bg-zinc-800 text-zinc-100 font-bold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab === 'all' ? 'All Alerts' : tab === 'orders' ? 'Orders' : 'Risk & Milestones'}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.04]">
            {filteredNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <ShieldCheck className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-mono text-zinc-400">All notifications cleared</p>
                <p className="text-[10px] font-mono text-zinc-600 mt-0.5">Execution fills and risk alerts will appear here</p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 transition-colors hover:bg-zinc-900/40 flex items-start gap-3 ${
                    !item.read ? 'bg-zinc-900/20' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.type === 'milestone' ? (
                      <div className="h-6 w-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Award className="h-3 w-3" />
                      </div>
                    ) : item.type === 'alert' ? (
                      <div className="h-6 w-6 rounded-md bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                        <AlertTriangle className="h-3 w-3" />
                      </div>
                    ) : item.type === 'fill' ? (
                      <div className="h-6 w-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                      </div>
                    ) : (
                      <div className="h-6 w-6 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <ShieldCheck className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono font-bold text-xs text-zinc-200 truncate">
                        {item.title}
                      </span>
                      <span className="text-[9px] font-mono text-zinc-500 shrink-0">{item.time}</span>
                    </div>
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                    {item.link && (
                      <Link
                        href={item.link}
                        onClick={onClose}
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 mt-1.5 transition-colors"
                      >
                        <span>View Details</span>
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>

                  {!item.read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
