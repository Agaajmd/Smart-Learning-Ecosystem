"use client"

import { cn } from "@/lib/utils"
import { X } from "lucide-react"
import { useEffect, useState, useCallback, useRef } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"

interface GlassModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  className?: string
  size?: "sm" | "md" | "lg" | "xl" | "full"
}

export const GlassModal = ({ 
  isOpen, 
  onClose, 
  children, 
  title, 
  className,
  size = "md" 
}: GlassModalProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const hideTimerRef = useRef<number | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // Handle mounting for portal
  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
      animationFrameRef.current = requestAnimationFrame(() => {
        setIsAnimating(true)
      })
    } else {
      setIsAnimating(false)
      hideTimerRef.current = window.setTimeout(() => {
        setIsVisible(false)
        document.body.style.overflow = ''
      }, 250)
    }
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      return
    }
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
    }
    setIsAnimating(false)
    closeTimerRef.current = window.setTimeout(() => {
      onClose()
      closeTimerRef.current = null
    }, 250)
  }, [onClose])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current)
        closeTimerRef.current = null
      }
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current)
        hideTimerRef.current = null
      }
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [])

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, handleClose])

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus()
      }
    }
  }, [isOpen, isAnimating])

  if (!isVisible || !isMounted) return null

  const sizeClasses = {
    sm: "max-w-[340px] sm:max-w-sm",
    md: "max-w-[380px] sm:max-w-md",
    lg: "max-w-[420px] sm:max-w-lg",
    xl: "max-w-[480px] sm:max-w-xl",
    full: "max-w-[520px] sm:max-w-2xl"
  }

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      {/* Backdrop with smooth fade */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-[2px] perf-overlay-blur",
          "transition-opacity duration-200 ease-out",
          isAnimating ? "opacity-100" : "opacity-0"
        )}
        onClick={handleClose} 
        aria-hidden="true"
      />
      
      {/* Modal Panel */}
      <div
        ref={modalRef}
        className={cn(
          "relative w-[calc(100%-24px)] mx-3",
          sizeClasses[size],
          "bg-white",
          "rounded-2xl sm:rounded-3xl",
          "shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]",
          "border border-slate-200/80",
          "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isAnimating 
            ? "opacity-100 scale-100 translate-y-0" 
            : "opacity-0 scale-[0.96] translate-y-2",
          "max-h-[90vh] sm:max-h-[85vh]",
          "overflow-hidden flex flex-col",
          className,
        )}
        style={{ willChange: isAnimating ? 'transform, opacity' : 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/50">
          {title && (
            <h3 
              id="modal-title"
              className="text-base sm:text-lg font-semibold text-slate-900 pr-2"
            >
              {title}
            </h3>
          )}
          <button
            onClick={handleClose}
            className={cn(
              "p-2 rounded-xl",
              "bg-slate-100 hover:bg-slate-200 active:bg-slate-300",
              "transition-[background-color,color,transform] duration-150 ease-out",
              "ml-auto shrink-0",
              "focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2",
              "group"
            )}
            aria-label="Close modal"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1 overscroll-contain perf-scroll-container">
          {children}
        </div>
      </div>
    </div>
  )

  // Use portal to render modal at document body level
  return createPortal(modalContent, document.body)
}
