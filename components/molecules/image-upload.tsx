"use client"

import * as React from "react"
import { useState, useRef, useCallback } from "react"
import { Upload, X, Camera, Image as ImageIcon, Check } from "lucide-react"
import { GlassButton } from "@/components/atoms/glass-button"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  currentImage?: string
  onImageChange: (imageData: string | null) => void | Promise<void>
  onClose?: () => void
  className?: string
  shape?: "circle" | "square"
  size?: "sm" | "md" | "lg"
  showActions?: boolean
}

export function ImageUpload({
  currentImage,
  onImageChange,
  onClose,
  className,
  shape = "circle",
  size = "lg",
  showActions = true,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-40 h-40",
  }

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      return
    }

    setIsLoading(true)
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setPreview(result)
      setIsLoading(false)
    }
    reader.onerror = () => {
      setIsLoading(false)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleConfirm = async () => {
    if (!preview || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onImageChange(preview)
      onClose?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (isSubmitting) return
    setPreview(currentImage || null)
    onClose?.()
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "relative flex items-center justify-center border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden group",
          sizeClasses[size],
          shape === "circle" ? "rounded-full" : "rounded-2xl",
          isDragging
            ? "border-purple-400 bg-purple-500/20 scale-105"
            : "border-white/30 bg-white/5 hover:border-white/50 hover:bg-white/10",
          isLoading && "animate-pulse"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className={cn(
                "w-full h-full object-cover",
                shape === "circle" ? "rounded-full" : "rounded-2xl"
              )}
            />
            {/* Overlay on hover */}
            <div
              className={cn(
                "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center",
                shape === "circle" ? "rounded-full" : "rounded-2xl"
              )}
            >
              <Camera className="w-8 h-8 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-4">
            {isLoading ? (
              <div className="w-8 h-8 border-2 border-white/30 border-t-purple-400 rounded-full animate-spin" />
            ) : (
              <>
                <Upload className="w-8 h-8 mb-2" />
                <span className="text-xs text-center">
                  Klik atau drag gambar
                </span>
              </>
            )}
          </div>
        )}

        {/* Remove button */}
        {preview && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRemove()
            }}
            className={cn(
              "absolute -top-1 -right-1 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600",
              "transform hover:scale-110"
            )}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Preview info */}
      {preview && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded-full text-green-300 text-xs">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Gambar siap digunakan</span>
        </div>
      )}

      {/* Action buttons */}
      {showActions && (
        <div className="flex gap-3 w-full max-w-xs">
          <GlassButton
            variant="secondary"
            className="flex-1 justify-center"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <X className="w-4 h-4 mr-2" />
            Batal
          </GlassButton>
          <GlassButton
            className="flex-1 justify-center"
            onClick={handleConfirm}
            disabled={!preview || isSubmitting}
          >
            <Check className="w-4 h-4 mr-2" />
            {isSubmitting ? "Mengganti..." : "Ganti Foto"}
          </GlassButton>
        </div>
      )}

      {/* Tips */}
      <p className="text-xs text-slate-400 text-center max-w-xs">
        Format: JPG, PNG, GIF, WebP. Maksimal 5MB.
      </p>
    </div>
  )
}

// Modal wrapper for image upload
interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  currentImage?: string
  onSave: (imageData: string | null) => void | Promise<void>
  title?: string
}

export function ImageUploadModal({
  isOpen,
  onClose,
  currentImage,
  onSave,
  title = "Upload Foto Profil",
}: ImageUploadModalProps) {
  const handleImageChange = async (imageData: string | null) => {
    await onSave(imageData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-transparent"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white/10 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-300">
        <h2 className="text-lg font-semibold text-slate-800 text-center mb-6">
          {title}
        </h2>

        <ImageUpload
          currentImage={currentImage}
          onImageChange={handleImageChange}
          onClose={onClose}
          shape="circle"
          size="lg"
        />
      </div>
    </div>
  )
}
