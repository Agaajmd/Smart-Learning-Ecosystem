'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  className?: string
}

export function BottomSheet({ 
  open, 
  onOpenChange, 
  children, 
  className 
}: BottomSheetProps) {
  const [mounted, setMounted] = React.useState(false)
  const [isClosing, setIsClosing] = React.useState(false)
  const sheetRef = React.useRef<HTMLDivElement>(null)
  const closeTimerRef = React.useRef<number | null>(null)
  const startYRef = React.useRef(0)
  const currentYRef = React.useRef(0)
  const moveRafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      setIsClosing(false)
      if (sheetRef.current) {
        sheetRef.current.style.transform = ''
      }
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      if (moveRafRef.current !== null) {
        window.cancelAnimationFrame(moveRafRef.current)
        moveRafRef.current = null
      }
    }
  }, [open])

  const handleClose = React.useCallback(() => {
    if (isClosing || !open) {
      return
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
    }
    setIsClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      onOpenChange(false)
      setIsClosing(false)
      closeTimerRef.current = null
    }, 300)
  }, [isClosing, onOpenChange, open])

  const applyDragTransform = React.useCallback(() => {
    if (moveRafRef.current !== null) {
      return
    }

    moveRafRef.current = window.requestAnimationFrame(() => {
      moveRafRef.current = null
      if (!sheetRef.current) {
        return
      }

      const offset = Math.max(currentYRef.current, 0)
      sheetRef.current.style.transform = offset > 0 ? `translate3d(0, ${offset}px, 0)` : ''
    })
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    currentYRef.current = 0
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - startYRef.current
    currentYRef.current = deltaY > 0 ? deltaY : 0
    applyDragTransform()
  }

  const handleTouchEnd = () => {
    if (moveRafRef.current !== null) {
      window.cancelAnimationFrame(moveRafRef.current)
      moveRafRef.current = null
    }

    if (sheetRef.current) {
      if (currentYRef.current > 100) {
        handleClose()
      } else {
        sheetRef.current.style.transform = ''
      }
    }
    startYRef.current = 0
    currentYRef.current = 0
  }

  if (!mounted || (!open && !isClosing)) return null

  const content = (
    <div
      className={cn(
        'fixed inset-0 z-[100]',
        'transition-opacity duration-300',
        isClosing ? 'opacity-0' : 'opacity-100'
      )}
    >
      {/* Overlay - Click to close */}
      <div 
        className={cn(
          'absolute inset-0 bg-black/50 backdrop-blur-sm perf-overlay-blur cursor-pointer',
          'transition-opacity duration-300',
          isClosing ? 'opacity-0' : 'opacity-100'
        )}
        onClick={handleClose}
      />
      
      {/* Sheet Content - Always from bottom */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'absolute left-0 right-0 bottom-0',
          'bg-white rounded-t-[20px]',
          'max-h-[85vh] overflow-hidden',
          'transform transition-transform duration-300 ease-out',
          'will-change-transform',
          isClosing 
            ? 'translate-y-full' 
            : open 
              ? 'translate-y-0 animate-slide-up-from-bottom' 
              : 'translate-y-full',
          className
        )}
        style={{
          boxShadow: '0 -10px 40px rgba(0,0,0,0.15)'
        }}
      >
        {children}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export function BottomSheetHandle() {
  return (
    <div className="flex justify-center pt-3 pb-2">
      <div className="w-10 h-1 rounded-full bg-slate-300" />
    </div>
  )
}
