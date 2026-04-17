"use client"

import { GlassButton } from "@/components/atoms/glass-button"
import { GlassCard } from "@/components/molecules/glass-card"
import { Clock3, Sparkles, Trophy, Wallet, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface WalletCardProps {
  ownerName: string
  secondaryLabel?: string
  walletBalance: number
  pendingAmount?: number
  isLoading?: boolean
  onTopupClick?: () => void
  topupLabel?: string
  disabled?: boolean
  disabledReason?: string
}

export const WalletCard = ({
  ownerName,
  secondaryLabel,
  walletBalance,
  pendingAmount = 0,
  isLoading = false,
  onTopupClick,
  topupLabel = "Topup Dompet",
  disabled = false,
  disabledReason = "Dinonaktifkan oleh Kepala Sekolah",
}: WalletCardProps) => {
  const resolvedSecondaryLabel = String(secondaryLabel || "-")

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0))

  return (
    <GlassCard
      className={cn(
        "relative overflow-hidden p-5 group transition-all duration-500",
        disabled
          ? "bg-gradient-to-br from-slate-300 to-slate-400 pointer-events-none"
          : "bg-gradient-to-br from-blue-500 to-blue-600 hover:shadow-xl hover:shadow-blue-500/25",
      )}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform duration-700 group-hover:scale-110" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 transition-transform duration-700 group-hover:scale-110" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-white/90">Dompet Sekolah</span>
          {disabled ? (
            <XCircle className="w-4 h-4 text-rose-200" />
          ) : (
            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-yellow-400 transition-transform duration-300 group-hover:rotate-12" />
          <span className="text-2xl font-bold text-white">{isLoading ? "Memuat..." : formatCurrency(walletBalance)}</span>
        </div>

        <div className="mb-4 flex items-center gap-2 text-[11px] text-white/90">
          <span className="rounded-full bg-white/20 px-2 py-0.5 inline-flex items-center gap-1">
            <Clock3 className="w-3 h-3" />
            {disabled ? disabledReason : `Menunggu ${formatCurrency(pendingAmount)}`}
          </span>
        </div>

        <div className="flex items-center justify-between text-white/90 text-xs mb-4">
          <span className="truncate mr-2">{ownerName}</span>
          <span className="shrink-0">{resolvedSecondaryLabel}</span>
        </div>

        <GlassButton
          type="button"
          size="sm"
          className={cn(
            "w-full",
            disabled
              ? "bg-slate-100 text-slate-500 border border-slate-300"
              : "bg-white text-blue-700 hover:bg-blue-50",
          )}
          onClick={disabled ? undefined : onTopupClick}
          disabled={disabled || !onTopupClick}
        >
          {disabled ? <XCircle className="w-4 h-4 mr-2" /> : <Wallet className="w-4 h-4 mr-2" />}
          {disabled ? "Dompet Dinonaktifkan" : topupLabel}
        </GlassButton>
      </div>
    </GlassCard>
  )
}
