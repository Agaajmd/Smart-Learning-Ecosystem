import { cn } from "@/lib/utils"
import type { ReactNode, ButtonHTMLAttributes } from "react"

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: "default" | "gradient" | "outline" | "secondary" | "danger" | "ghost"
  size?: "sm" | "md" | "lg"
}

export const GlassButton = ({ children, className, variant = "default", size = "md", ...props }: GlassButtonProps) => {
  const variants = {
    default: "bg-blue-500 text-white border border-blue-500 hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/25",
    gradient:
      "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0 hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg hover:shadow-blue-500/25",
    outline: "bg-transparent border-2 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400",
    secondary: "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 hover:border-slate-300",
    danger: "bg-red-500 text-white border border-red-500 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/25",
    ghost: "bg-transparent border border-transparent text-slate-700 hover:bg-slate-100",
  }

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-2.5 text-base",
    lg: "px-6 py-3 text-lg",
  }

  return (
    <button
      className={cn(
        "rounded-lg font-medium shadow-sm",
        "transition-[color,background-color,border-color,box-shadow,transform] duration-300 ease-out",
        "hover:shadow-md active:scale-[0.97] flex items-center justify-center",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
