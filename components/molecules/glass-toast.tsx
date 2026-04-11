"use client"

import { cn } from "@/lib/utils"
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface GlassToastProps {
  isOpen: boolean
  onClose: () => void
  message: string
  type?: "success" | "error" | "warning" | "info"
  duration?: number
}

export const GlassToast = ({ isOpen, onClose, message, type = "success", duration = 3000 }: GlassToastProps) => {
  const [isClosing, setIsClosing] = useState(false)
  const autoCloseTimerRef = useRef<number | null>(null)
  const closeAnimationTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current !== null) {
        window.clearTimeout(autoCloseTimerRef.current)
      }
      if (closeAnimationTimerRef.current !== null) {
        window.clearTimeout(closeAnimationTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false)
      if (autoCloseTimerRef.current !== null) {
        window.clearTimeout(autoCloseTimerRef.current)
      }
      if (closeAnimationTimerRef.current !== null) {
        window.clearTimeout(closeAnimationTimerRef.current)
      }
      autoCloseTimerRef.current = window.setTimeout(() => {
        setIsClosing(true)
        closeAnimationTimerRef.current = window.setTimeout(() => {
          onClose()
          closeAnimationTimerRef.current = null
        }, 300) // Wait for animation
      }, duration)
      return () => {
        if (autoCloseTimerRef.current !== null) {
          window.clearTimeout(autoCloseTimerRef.current)
          autoCloseTimerRef.current = null
        }
      }
    }
  }, [isOpen, duration, onClose])

  if (!isOpen && !isClosing) return null

  const handleClose = () => {
    if (autoCloseTimerRef.current !== null) {
      window.clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
    if (closeAnimationTimerRef.current !== null) {
      window.clearTimeout(closeAnimationTimerRef.current)
    }
    setIsClosing(true)
    closeAnimationTimerRef.current = window.setTimeout(() => {
      onClose()
      closeAnimationTimerRef.current = null
    }, 300)
  }

  const variants = {
    success: {
      icon: <CheckCircle className="w-5 h-5" />,
      bgColor: "bg-emerald-500",
      textColor: "text-white",
    },
    error: {
      icon: <XCircle className="w-5 h-5" />,
      bgColor: "bg-red-500",
      textColor: "text-white",
    },
    warning: {
      icon: <AlertCircle className="w-5 h-5" />,
      bgColor: "bg-amber-500",
      textColor: "text-white",
    },
    info: {
      icon: <Info className="w-5 h-5" />,
      bgColor: "bg-blue-500",
      textColor: "text-white",
    },
  }

  const variant = variants[type]

  return (
    <div 
      className={cn(
        "fixed top-6 right-6 z-[100] transition-all duration-300 ease-out",
        isClosing 
          ? "opacity-0 translate-x-8 scale-95" 
          : "opacity-100 translate-x-0 scale-100 animate-in slide-in-from-right-4 fade-in"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 min-w-[280px] max-w-md",
          "shadow-lg shadow-slate-900/10 rounded-xl",
          "backdrop-blur-sm border border-white/20",
          variant.bgColor,
          variant.textColor,
        )}
      >
        <div className="flex-shrink-0">{variant.icon}</div>
        <p className="text-sm font-medium flex-1">{message}</p>
        <button 
          onClick={handleClose} 
          className={cn(
            "flex-shrink-0 p-1 rounded-lg transition-all duration-200",
            "hover:bg-white/20 active:scale-95"
          )}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
