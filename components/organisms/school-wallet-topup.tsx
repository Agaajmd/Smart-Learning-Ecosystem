"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { PlusCircle, Clock, CheckCircle2, XCircle, QrCode, CreditCard } from "lucide-react"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassButton } from "@/components/atoms/glass-button"
import type { UserRole, WalletTopupMethod, WalletTopupStatus } from "@/lib/data-model"

type SchoolWalletTopupTriggerProps = {
  openModal: () => void
  walletBalance: number
  pendingAmount: number
  isLoading: boolean
}

interface SchoolWalletTopupProps {
  role: UserRole
  renderTrigger?: (props: SchoolWalletTopupTriggerProps) => ReactNode
}

type WalletTopupItem = {
  id: string
  amount: number
  method: WalletTopupMethod
  status: WalletTopupStatus
  requestedAt: string
  proofReference?: string
  proofUrl?: string
  adminNote?: string
}

type WalletTopupMethodMeta = {
  code: WalletTopupMethod
  label: string
  accountNumber: string
  accountName: string
  description: string
}

type WalletTopupResponse = {
  methods: WalletTopupMethodMeta[]
  qrisImagePath: string
  topups: WalletTopupItem[]
  walletBalance: number
  pendingAmount: number
}

const ENABLED_ROLES: UserRole[] = ["STUDENT", "EMPLOYEE", "PARENT", "SUPER_ADMIN"]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

function getStatusBadge(status: WalletTopupStatus) {
  switch (status) {
    case "APPROVED":
      return {
        className: "bg-emerald-100 text-emerald-700",
        icon: CheckCircle2,
        label: "Disetujui",
      }
    case "REJECTED":
      return {
        className: "bg-rose-100 text-rose-700",
        icon: XCircle,
        label: "Ditolak",
      }
    default:
      return {
        className: "bg-amber-100 text-amber-700",
        icon: Clock,
        label: "Menunggu",
      }
  }
}

export function SchoolWalletTopup({ role, renderTrigger }: SchoolWalletTopupProps) {
  const isEnabled = ENABLED_ROLES.includes(role)
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [methods, setMethods] = useState<WalletTopupMethodMeta[]>([])
  const [qrisImagePath, setQrisImagePath] = useState("/QRISPAYMENT.PNG")
  const [topups, setTopups] = useState<WalletTopupItem[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [pendingAmount, setPendingAmount] = useState(0)

  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState<WalletTopupMethod>("QRIS")
  const [proofFileName, setProofFileName] = useState("")
  const [proofDataUrl, setProofDataUrl] = useState("")
  const [proofMimeType, setProofMimeType] = useState("")

  const selectedMethod = useMemo(
    () => methods.find((item) => item.code === method) || null,
    [methods, method],
  )

  const loadTopups = useCallback(async () => {
    if (!isEnabled) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/wallet/topups", { cache: "no-store" })
      if (!res.ok) throw new Error("Gagal memuat data topup")
      const data = (await res.json()) as WalletTopupResponse
      setMethods(Array.isArray(data.methods) ? data.methods : [])
      setQrisImagePath(data.qrisImagePath || "/QRISPAYMENT.PNG")
      setTopups(Array.isArray(data.topups) ? data.topups : [])
      setWalletBalance(Number(data.walletBalance || 0))
      setPendingAmount(Number(data.pendingAmount || 0))

      if (Array.isArray(data.methods) && data.methods.length > 0) {
        setMethod((currentMethod) =>
          data.methods.some((item) => item.code === currentMethod)
            ? currentMethod
            : data.methods[0].code,
        )
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memuat data topup")
    } finally {
      setIsLoading(false)
    }
  }, [isEnabled])

  useEffect(() => {
    if (!isEnabled) return
    void loadTopups()
  }, [isEnabled, loadTopups])

  useEffect(() => {
    if (!open) return
    void loadTopups()
  }, [open, loadTopups])

  if (!isEnabled) return null

  const isProofImage = proofMimeType.startsWith("image/") && proofDataUrl.startsWith("data:")

  const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setProofFileName("")
      setProofDataUrl("")
      setProofMimeType("")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const encoded = String(reader.result || "")
      if (!encoded) {
        toast.error("Gagal membaca file bukti transfer")
        return
      }

      setProofFileName(file.name)
      setProofMimeType(file.type || "")
      setProofDataUrl(encoded)
    }
    reader.onerror = () => {
      toast.error("Gagal membaca file bukti transfer")
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    const numericAmount = Number(amount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Nominal topup tidak valid")
      return
    }

    if (!proofDataUrl) {
      toast.error("Bukti transfer wajib diupload")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/wallet/topups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numericAmount,
          method,
          proofUrl: proofDataUrl,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(String(data?.error || "Gagal mengirim permintaan topup"))
      }

      toast.success("Permintaan topup berhasil dikirim")
      setAmount("")
      setProofFileName("")
      setProofDataUrl("")
      setProofMimeType("")
      await loadTopups()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengirim permintaan topup")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {renderTrigger
        ? renderTrigger({
            openModal: () => setOpen(true),
            walletBalance,
            pendingAmount,
            isLoading,
          })
        : null}

      <GlassModal isOpen={open} onClose={() => setOpen(false)} title="Topup Dompet Sekolah" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Saldo Dompet</p>
              <p className="text-lg font-semibold text-emerald-700">{formatCurrency(walletBalance)}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">Menunggu Konfirmasi</p>
              <p className="text-lg font-semibold text-amber-700">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Buat Permintaan Topup
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Nominal</label>
              <GlassInput
                type="number"
                min={1000}
                step={1000}
                placeholder="Contoh: 50000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Metode Pembayaran</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as WalletTopupMethod)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {methods.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedMethod ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  {selectedMethod.code === "QRIS" ? <QrCode className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                  Detail Pembayaran
                </p>
                <p>{selectedMethod.description}</p>
                {selectedMethod.accountNumber !== "-" ? <p>No Tujuan: {selectedMethod.accountNumber}</p> : null}
                <p>Atas Nama: {selectedMethod.accountName}</p>
                {selectedMethod.code === "QRIS" ? (
                  <img
                    src={qrisImagePath}
                    alt="QRIS Sekolah"
                    className="mt-2 w-full max-h-64 object-contain rounded-lg border border-blue-100 bg-white"
                  />
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-600">Upload Bukti Transfer *</label>
              <label className="block rounded-xl border-2 border-dashed border-slate-200 bg-white px-4 py-5 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/40 transition-colors">
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                  onChange={handleProofFileChange}
                />
                <p className="text-sm font-medium text-slate-700">Klik untuk upload file/foto bukti transfer</p>
                <p className="text-xs text-slate-500 mt-1">Format umum didukung, maksimal 10MB.</p>
              </label>

              {proofDataUrl ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <p className="text-xs text-slate-600">
                    File dipilih: <span className="font-medium">{proofFileName || "Bukti transfer"}</span>
                  </p>
                  {isProofImage ? (
                    <img
                      src={proofDataUrl}
                      alt="Preview bukti transfer"
                      className="max-h-56 w-full object-contain rounded-lg border border-slate-200 bg-white"
                    />
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setProofFileName("")
                      setProofDataUrl("")
                      setProofMimeType("")
                    }}
                    className="text-xs font-medium text-rose-600 hover:text-rose-700"
                  >
                    Hapus file
                  </button>
                </div>
              ) : null}
            </div>

            <GlassButton
              type="button"
              className="w-full"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !proofDataUrl}
            >
              {isSubmitting ? "Mengirim..." : "Kirim Permintaan Topup"}
            </GlassButton>
          </div>

          <div className="rounded-xl border border-slate-200 p-3 space-y-2">
            <h3 className="text-sm font-semibold text-slate-700">Riwayat Topup</h3>
            {isLoading ? (
              <p className="text-xs text-slate-500">Memuat riwayat...</p>
            ) : topups.length === 0 ? (
              <p className="text-xs text-slate-500">Belum ada riwayat topup.</p>
            ) : (
              topups.slice(0, 8).map((item) => {
                const badge = getStatusBadge(item.status)
                const Icon = badge.icon
                return (
                  <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-700">{formatCurrency(item.amount)} • {item.method}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${badge.className}`}>
                        <Icon className="w-3 h-3" />
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1">{new Date(item.requestedAt).toLocaleString("id-ID")}</p>
                    {item.proofUrl ? (
                      <a
                        href={item.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex mt-1 text-blue-600 hover:text-blue-700"
                      >
                        Lihat bukti transfer
                      </a>
                    ) : null}
                    {item.adminNote ? <p className="text-slate-600 mt-1">Catatan admin: {item.adminNote}</p> : null}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </GlassModal>
    </>
  )
}
