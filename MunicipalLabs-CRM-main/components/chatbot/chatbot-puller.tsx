'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, PanInfo } from 'framer-motion'

const PULLER_WIDTH = 60
const EXPAND_THRESHOLD = 150 // pixels to drag before expanding

export function ChatbotPuller() {
  const [isDragging, setIsDragging] = React.useState(false)
  const [dragOffset, setDragOffset] = React.useState(0)
  const router = useRouter()
  const pathname = usePathname()
  
  // Hide puller on chatbot page
  const isOnChatbotPage = pathname === '/chatbot'

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const newOffset = Math.max(0, Math.min(PULLER_WIDTH * 2, info.offset.x))
    setDragOffset(newOffset)
  }

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    
    if (info.offset.x >= EXPAND_THRESHOLD) {
      // Navigate to chatbot page
      router.push('/chatbot')
      setDragOffset(0)
    } else {
      // Snap back
      setDragOffset(0)
    }
  }

  const handleClick = () => {
    router.push('/chatbot')
  }

  if (isOnChatbotPage) {
    return null
  }

  return (
    <motion.div
      initial={{ x: -PULLER_WIDTH }}
      animate={{ x: dragOffset - PULLER_WIDTH }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-1/2 -translate-y-1/2 z-50"
      style={{ height: PULLER_WIDTH }}
    >
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: PULLER_WIDTH * 2 }}
            dragElastic={0.1}
            onDragStart={handleDragStart}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            className={cn(
              'h-full w-[60px] bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700',
              'rounded-r-2xl shadow-2xl cursor-grab active:cursor-grabbing',
              'flex items-center justify-center',
              'hover:shadow-primary/50 transition-shadow',
              isDragging && 'shadow-primary/50'
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Puller handle indicator */}
            <div className="flex flex-col items-center gap-1">
              <MessageCircle className="w-6 h-6 text-white" />
              {isDragging && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-white text-xs font-medium whitespace-nowrap"
                >
                  {dragOffset >= EXPAND_THRESHOLD ? 'Release to open' : 'Pull to open'}
                </motion.div>
              )}
            </div>

            {/* Visual feedback line */}
            {isDragging && (
              <motion.div
                className="absolute left-full top-0 bottom-0 w-1 bg-primary/30"
                style={{ width: `${Math.min(100, (dragOffset / EXPAND_THRESHOLD) * 100)}%` }}
              />
            )}
          </motion.div>
        </motion.div>
  )
}

