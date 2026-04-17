"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { 
  AlertTriangle, 
  Wrench, 
  FileText, 
  ClipboardList,
  CheckCircle,
  Clock,
  PackageCheck,
  Activity,
  QrCode,
  Users,
  Wallet,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import {
  isPageFeatureEnabled,
  type PageFeatureStateMap,
} from "@/lib/page-features"

type AdminUser = { name: string; avatar: string }
type ReportItem = { id: string; type: string; title: string; status: string; date: string; reporter: string; priority: string }
type InventoryItem = { id: string; name: string; total: number; working: number; broken: number }

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<AdminUser>({ name: "", avatar: "/placeholder-user.jpg" })
  const [isLoading, setIsLoading] = useState(true)
  const [reports, setReports] = useState<ReportItem[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null)
  const [activeTab, setActiveTab] = useState<"reports" | "inventory">("reports")
  const [featureState, setFeatureState] = useState<PageFeatureStateMap>({})

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [res, featureRes] = await Promise.all([
          fetch("/api/dashboard/admin", { cache: "no-store" }),
          fetch("/api/page-features", { cache: "no-store" }),
        ])
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        if (data.admin) setAdmin(data.admin)
        if (Array.isArray(data.reports)) setReports(data.reports)
        if (Array.isArray(data.inventory)) setInventory(data.inventory)

        if (featureRes.ok) {
          const featurePayload = await featureRes.json()
          if (featurePayload?.state && typeof featurePayload.state === "object") {
            setFeatureState(featurePayload.state as PageFeatureStateMap)
          }
        }
      } catch {
        // Keep current state when API is unavailable.
      } finally {
        if (active) setIsLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (isLoading) {
    return <RouteLoading />
  }

  const pendingReports = reports.filter(r => r.status === "pending")
  const inProgressReports = reports.filter(r => r.status === "in-progress")
  const resolvedReports = reports.filter(r => r.status === "resolved")

  const stats = [
    { icon: AlertTriangle, label: "Laporan Pending", value: pendingReports.length, color: "text-orange-500", bgColor: "bg-orange-50" },
    { icon: Activity, label: "Sedang Diproses", value: inProgressReports.length, color: "text-blue-500", bgColor: "bg-blue-50" },
    { icon: CheckCircle, label: "Selesai", value: resolvedReports.length, color: "text-green-500", bgColor: "bg-green-50" },
    { icon: PackageCheck, label: "Total Aset", value: inventory.reduce((acc, i) => acc + i.total, 0), color: "text-purple-500", bgColor: "bg-purple-50" },
  ]

  const walletTopupFeatureEnabled = isPageFeatureEnabled("admin_wallet_topups", featureState)

  const quickActions = [
    { href: "/admin/scan", icon: QrCode, label: "Scan QR Aset", description: "Scan dan laporkan masalah aset", color: "bg-blue-500" },
    { href: "/admin/users", icon: Users, label: "Data Pengguna", description: "Lihat dan kelola data pengguna", color: "bg-emerald-500" },
    {
      href: "/admin/wallet-topups",
      icon: Wallet,
      label: "Konfirmasi Topup",
      description: "Verifikasi permintaan topup dompet",
      color: "bg-amber-500",
      disabled: !walletTopupFeatureEnabled,
    },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-orange-100 text-orange-800 border-orange-300"
      case "in-progress": return "bg-blue-100 text-blue-800 border-blue-300"
      case "resolved": return "bg-green-100 text-green-800 border-green-300"
      default: return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800"
      case "medium": return "bg-amber-100 text-amber-800"
      case "low": return "bg-slate-200 text-slate-700"
      default: return "bg-slate-200 text-slate-700"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Menunggu"
      case "in-progress": return "Diproses"
      case "resolved": return "Selesai"
      default: return status
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "damage": return <Wrench className="w-4 h-4" />
      case "facility": return <ClipboardList className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const handleUpdateStatus = async (reportId: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/asset-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reportId,
          status: newStatus,
        }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(String(payload?.error || "Gagal memperbarui status laporan"))
      }

      setReports((prev) =>
        prev.map((item) =>
          item.id === reportId
            ? {
                ...item,
                status: newStatus,
                priority: newStatus === "pending" ? "high" : newStatus === "in-progress" ? "medium" : "low",
              }
            : item,
        ),
      )
      setSelectedReport(null)
      toast.success("Status laporan diperbarui", {
        description: `Laporan telah diubah ke status "${getStatusLabel(newStatus)}"`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui status laporan")
    }
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar || "/placeholder-user.jpg"}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                Operator
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard Sarana Prasarana</h1>
            <p className="text-slate-500">Kelola fasilitas dan aset sekolah</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className={`${stat.bgColor} rounded-2xl p-4 border border-slate-100`}>
                <Icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-600">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            const isDisabled = Boolean((action as { disabled?: boolean }).disabled)

            if (isDisabled) {
              return (
                <div
                  key={action.href}
                  className="flex items-center gap-4 p-4 bg-slate-100 border border-dashed border-slate-300 rounded-2xl text-slate-400"
                >
                  <div className="p-3 bg-slate-300 rounded-xl">
                    <Icon className="w-6 h-6 text-slate-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-600 flex items-center gap-2">
                      {action.label}
                      <XCircle className="w-4 h-4 text-rose-500" />
                    </h3>
                    <p className="text-sm text-slate-500">Dinonaktifkan oleh Kepala Sekolah</p>
                  </div>
                </div>
              )
            }

            return (
              <Link key={action.href} href={action.href}>
                <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 hover:shadow-md transition-all duration-200">
                  <div className={`p-3 ${action.color} rounded-xl`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{action.label}</h3>
                    <p className="text-sm text-slate-500">{action.description}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "reports" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Laporan ({reports.length})
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === "inventory" 
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            <PackageCheck className="w-4 h-4 inline mr-2" />
            Inventaris
          </button>
        </div>

        {/* Reports Tab Content */}
        {activeTab === "reports" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-slate-600" />
                Laporan Terbaru
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {reports.map((report) => (
                <div 
                  key={report.id} 
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                      {getTypeIcon(report.type)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">{report.title}</p>
                      <p className="text-xs text-slate-500">{report.reporter} • {report.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-1 text-[10px] font-medium rounded-full ${getPriorityColor(report.priority)}`}>
                      {report.priority === "high" ? "Tinggi" : report.priority === "medium" ? "Sedang" : "Rendah"}
                    </span>
                    <span className={`px-2 py-1 text-[10px] font-medium rounded-full border ${getStatusColor(report.status)}`}>
                      {getStatusLabel(report.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Tab Content */}
        {activeTab === "inventory" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-slate-600" />
                Status Inventaris
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {inventory.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-slate-800">{item.name}</p>
                    <p className="text-sm text-slate-500">Total: {item.total}</p>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-slate-600">Baik: {item.working}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <span className="text-slate-600">Rusak: {item.broken}</span>
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full" 
                      style={{ width: `${(item.working / item.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <GlassModal isOpen={!!selectedReport} onClose={() => setSelectedReport(null)} title="Detail Laporan">
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-slate-100 rounded-xl text-slate-600">
                {getTypeIcon(selectedReport.type)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{selectedReport.title}</h3>
                <p className="text-sm text-slate-500">{selectedReport.reporter} • {selectedReport.date}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <span className={`px-3 py-1.5 text-xs font-medium rounded-full ${getPriorityColor(selectedReport.priority)}`}>
                Prioritas: {selectedReport.priority === "high" ? "Tinggi" : selectedReport.priority === "medium" ? "Sedang" : "Rendah"}
              </span>
              <span className={`px-3 py-1.5 text-xs font-medium rounded-full border ${getStatusColor(selectedReport.status)}`}>
                {getStatusLabel(selectedReport.status)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-sm text-slate-600 mb-3">Ubah Status:</p>
              <div className="flex gap-2 flex-wrap">
                <button 
                  onClick={() => handleUpdateStatus(selectedReport.id, "pending")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Menunggu
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedReport.id, "in-progress")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <Wrench className="w-4 h-4" />
                  Proses
                </button>
                <button 
                  onClick={() => handleUpdateStatus(selectedReport.id, "resolved")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Selesai
                </button>
              </div>
            </div>
          </div>
        )}
      </GlassModal>
    </DashboardLayout>
  )
}
