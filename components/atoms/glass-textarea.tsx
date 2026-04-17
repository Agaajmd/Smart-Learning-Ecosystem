import { cn } from "@/lib/utils"
import type { TextareaHTMLAttributes } from "react"

interface GlassTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

export const GlassTextarea = ({ className, label, id, ...props }: GlassTextareaProps) => {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "w-full px-4 py-3 rounded-lg min-h-[120px]",
          "bg-white/80 backdrop-blur-sm border border-slate-200",
          "text-slate-800 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-white",
          "transition-[color,background-color,border-color,box-shadow] duration-300 ease-out resize-none",
          "hover:border-slate-300",
          className,
        )}
        {...props}
      />
    </div>
  )
}
