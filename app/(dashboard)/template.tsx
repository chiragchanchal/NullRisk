'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8, filter: 'blur(2px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{
        type: 'spring' as const,
        stiffness: 380,
        damping: 30,
        mass: 0.7,
      }}
      className="h-full"
    >
      {children}
    </motion.div>
  )
}
