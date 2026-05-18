'use client'

import { useState, useEffect } from 'react'
import { SettingsModal } from '@/components/ui/settings-modal'

export function SettingsListener() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('open-settings', handleOpen)
    return () => window.removeEventListener('open-settings', handleOpen)
  }, [])

  return <SettingsModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
}
