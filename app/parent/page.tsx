"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { SchoolWalletTopup } from "@/components/organisms/school-wallet-topup"
import { WalletCard } from "@/components/organisms/wallet-card"
import type { Student } from "@/lib/data-model"
import { 
  Wallet, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock,
  CalendarCheck,
  AlertTriangle,
  Star,
  TrendingUp,
  TrendingDown,
  Award,
  GraduationCap,
  User,
  ChevronRight,
  BookOpen,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { RouteLoading } from "@/components/templates/route-loading"

export default function ParentDashboard() {
  const [parent, setParent] = useState<any>(null)
  const [children, setChildren] = useState<Student[]>([])
  const [selectedChild, setSelectedChild] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])
  const [activityPoints, setActivityPoints] = useState<any[]>([])
  const [grades, setGrades] = useState<any[]>([])
  const [childClass, setChildClass] = useState<any>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const query = selectedChild?.id ? `?childId=${selectedChild.id}` : ""
        const res = await fetch(`/api/parent/child-overview${query}`, { cache: "no-store" })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(String(payload?.error || "Gagal memuat data parent"))
        }
        const data = await res.json()
        if (!active) return
        if (data.parent) setParent(data.parent)
        if (Array.isArray(data.children) && data.children.length > 0) {
          setChildren(data.children)
          const selected =
            data.selectedChild ||
            data.children.find((item: Student) => item.id === selectedChild?.id) ||
            data.children[0]
          setSelectedChild(selected)
        } else {
          setChildren([])
          setSelectedChild(null)
        }
        if (Array.isArray(data.payments)) setPayments(data.payments)
        if (Array.isArray(data.attendance)) setAttendance(data.attendance)
        if (Array.isArray(data.activityPoints)) setActivityPoints(data.activityPoints)
        if (Array.isArray(data.grades)) setGrades(data.grades)
        setChildClass(data.childClass || null)
      } catch (error) {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : "Gagal memuat data parent")
        setParent((prev: any) => prev || null)
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [selectedChild?.id])

  if (isLoading) {
    return <RouteLoading />
  }

  if (!parent) {
    return (
      <DashboardLayout role="PARENT" userName="Orang Tua" userAvatar="/placeholder-user.jpg">
        <div className="max-w-2xl mx-auto px-1">
          <GlassCard className="p-6 border border-rose-200 bg-rose-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-700">Data parent belum tersedia</p>
                <p className="text-sm text-rose-600 mt-1">{loadError || "Silakan cek relasi akun parent dengan siswa."}</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  if (!selectedChild) {
    return (
      <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
        <div className="max-w-2xl mx-auto px-1 space-y-4">
          {loadError ? (
            <GlassCard className="p-4 border border-amber-200 bg-amber-50 text-amber-700 text-sm">
              {loadError}
            </GlassCard>
          ) : null}
          <GlassCard className="p-6">
            <h1 className="text-lg font-semibold text-slate-800">Belum Ada Data Anak</h1>
            <p className="text-sm text-slate-600 mt-2">
              Akun parent ini belum terhubung ke data siswa. Silakan hubungi wali kelas/admin untuk mengatur relasi parent-anak.
            </p>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  // Calculate statistics
  const totalPayments = payments.reduce((acc, p) => acc + p.amount, 0)
  const paidPayments = payments.filter(p => p.status === "PAID").reduce((acc, p) => acc + p.amount, 0)
  const unpaidPayments = payments.filter(p => p.status !== "PAID").reduce((acc, p) => acc + p.amount, 0)
  
  const presentCount = attendance.filter(a => a.status === "PRESENT").length
  const sickCount = attendance.filter(a => a.status === "SICK").length
  const alphaCount = attendance.filter(a => a.status === "ALPHA").length
  const attendancePercentage = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0

  const positivePoints = activityPoints.filter(p => p.type === "POSITIVE").reduce((acc, p) => acc + p.points, 0)
  const negativePoints = activityPoints.filter(p => p.type === "NEGATIVE").reduce((acc, p) => acc + Math.abs(p.points), 0)

  const averageGrade = grades.length > 0 
    ? Math.round(grades.reduce((acc, g) => acc + g.knowledge, 0) / grades.length)
    : 0

  return (
    <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
        {loadError ? (
          <GlassCard className="p-3 border border-amber-200 bg-amber-50 text-amber-700 text-sm">
            {loadError}
          </GlassCard>
        ) : null}
        {/* Header */}
        <div className="pb-2">
          <h1 className="text-xl font-bold text-slate-800">Selamat Datang, {parent.name}</h1>
          <p className="text-slate-500">Pantau perkembangan anak Anda</p>
        </div>

        {/* Child Selector */}
        {children.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all min-w-fit",
                  selectedChild?.id === child.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <img src={child.avatar} alt={child.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="text-left">
                  <p className="font-medium text-slate-800">{child.name}</p>
                  <p className="text-xs text-slate-500">{child.id === selectedChild?.id ? childClass?.name || child.classId : child.classId}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected Child Info */}
        <GlassCard className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 p-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center gap-4">
            <img src={selectedChild.avatar} alt={selectedChild.name} className="w-16 h-16 rounded-full object-cover ring-4 ring-white/30" />
            <div className="flex-1 text-white">
              <h2 className="text-xl font-bold">{selectedChild.name}</h2>
              <p className="text-white/80">{childClass?.name || selectedChild.classId}</p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-300" />
                  {selectedChild.xp} XP
                </span>
                <span className="flex items-center gap-1">
                  <Award className="w-4 h-4 text-yellow-300" />
                  {selectedChild.coins} Koin
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        <SchoolWalletTopup
          role="PARENT"
          renderTrigger={({ openModal, walletBalance, pendingAmount, isLoading }) => (
            <WalletCard
              ownerName={parent.name}
              secondaryLabel="Akun Orang Tua"
              walletBalance={walletBalance}
              pendingAmount={pendingAmount}
              isLoading={isLoading}
              onTopupClick={openModal}
            />
          )}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-100">
                <CalendarCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{attendancePercentage}%</p>
                <p className="text-xs text-slate-500">Kehadiran</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-100">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">+{positivePoints}</p>
                <p className="text-xs text-slate-500">Poin Positif</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{averageGrade}</p>
                <p className="text-xs text-slate-500">Rata-rata Nilai</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100">
                <TrendingDown className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-600">-{negativePoints}</p>
                <p className="text-xs text-slate-500">Poin Negatif</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Financial Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Keuangan</h2>
            <Link href="/parent/finance" className="text-sm text-blue-500 flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <GlassCard className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100">
                  <Wallet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Lunas</p>
                  <p className="text-lg font-bold text-emerald-600">Rp {paidPayments.toLocaleString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Belum Lunas</p>
                <p className="text-lg font-bold text-red-500">Rp {unpaidPayments.toLocaleString()}</p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-3">
              {payments.slice(0, 3).map(payment => (
                <div key={payment.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      payment.status === "PAID" ? "bg-green-100" : payment.status === "PARTIAL" ? "bg-amber-100" : "bg-red-100"
                    )}>
                      {payment.status === "PAID" ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : payment.status === "PARTIAL" ? (
                        <Clock className="w-4 h-4 text-amber-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-700 text-sm">{payment.type}</p>
                      <p className="text-xs text-slate-500">{payment.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">Rp {payment.amount.toLocaleString()}</p>
                    <p className={cn(
                      "text-xs",
                      payment.status === "PAID" ? "text-green-600" : payment.status === "PARTIAL" ? "text-amber-600" : "text-red-600"
                    )}>
                      {payment.status === "PAID" ? "Lunas" : payment.status === "PARTIAL" ? "Sebagian" : "Belum Bayar"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Attendance Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Kehadiran</h2>
            <Link href="/parent/attendance" className="text-sm text-blue-500 flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <GlassCard className="p-4">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{presentCount}</p>
                <p className="text-xs text-slate-600">Hadir</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-xl">
                <p className="text-2xl font-bold text-amber-600">{sickCount}</p>
                <p className="text-xs text-slate-600">Sakit</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-600">{alphaCount}</p>
                <p className="text-xs text-slate-600">Alpha</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Riwayat Terakhir:</p>
              {attendance.slice(0, 5).map(record => (
                <div key={record.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-600">{new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    record.status === "PRESENT" ? "bg-green-100 text-green-700" :
                    record.status === "SICK" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {record.status === "PRESENT" ? "Hadir" : record.status === "SICK" ? "Sakit" : "Alpha"}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Activity Points */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Poin Aktivitas</h2>
            <Link href="/parent/points" className="text-sm text-blue-500 flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-100">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Poin Positif</p>
                  <p className="text-lg font-bold text-green-600">+{positivePoints}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-red-100">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Poin Negatif</p>
                  <p className="text-lg font-bold text-red-600">-{negativePoints}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {activityPoints.slice(0, 3).map(point => (
                <div key={point.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    point.type === "POSITIVE" ? "bg-green-100" : "bg-red-100"
                  )}>
                    {point.type === "POSITIVE" ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-slate-700 text-sm">{point.category}</p>
                      <span className={cn(
                        "font-bold",
                        point.type === "POSITIVE" ? "text-green-600" : "text-red-600"
                      )}>
                        {point.type === "POSITIVE" ? "+" : ""}{point.points}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{point.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(point.date).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          <Link href="/parent/finance">
            <GlassCard className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-100">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">Pembayaran</p>
                  <p className="text-xs text-slate-500">Detail keuangan</p>
                </div>
              </div>
            </GlassCard>
          </Link>
          <Link href="/parent/grades">
            <GlassCard className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-100">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">Nilai</p>
                  <p className="text-xs text-slate-500">Lihat rapor</p>
                </div>
              </div>
            </GlassCard>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  )
}
