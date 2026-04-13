"use client"

import type React from "react"

import { useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassTextarea } from "@/components/atoms/glass-textarea"
import { GlassModal } from "@/components/molecules/glass-modal"
import { mockAdmins } from "@/lib/mock-data"
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  X,
  Package,
  Filter,
  Search,
  MapPin,
  User,
  Wrench,
  MessageSquare,
  ChevronDown,
} from "lucide-react"

type ReportStatus = "pending" | "in_progress" | "resolved"

interface AssetReport {
  id: string
  assetId: string
  assetName: string
  damageType: string
  description: string
  status: ReportStatus
  createdAt: string
  location: string
  reportedBy: string
  reporterClass: string
  assignedTo?: string
  resolvedAt?: string
  resolution?: string
}

// Mock data for reports from students
const mockReports: AssetReport[] = [
  {
    id: "RPT001",
    assetId: "MEJA-A101-001",
    assetName: "Meja Siswa",
    damageType: "broken",
    description: "Kaki meja patah, tidak stabil saat digunakan",
    status: "pending",
    createdAt: "2025-01-15T08:30:00",
    location: "Ruang 101",
    reportedBy: "Ahmad Fadhil",
    reporterClass: "XII IPA 1",
  },
  {
    id: "RPT002",
    assetId: "AC-A201-002",
    assetName: "AC Ruangan",
    damageType: "malfunctioning",
    description: "AC tidak dingin, suara berisik saat menyala",
    status: "in_progress",
    createdAt: "2025-01-14T10:15:00",
    location: "Ruang 201",
    reportedBy: "Sarah Putri",
    reporterClass: "XI IPS 2",
    assignedTo: "Pak Teknisi Budi",
  },
  {
    id: "RPT003",
    assetId: "PROJ-A102-001",
    assetName: "Proyektor",
    damageType: "malfunctioning",
    description: "Gambar buram dan warna tidak normal",
    status: "resolved",
    createdAt: "2025-01-10T14:00:00",
    location: "Ruang 102",
    reportedBy: "Budi Santoso",
    reporterClass: "X MIPA 1",
    resolvedAt: "2025-01-12T16:00:00",
    resolution: "Lampu proyektor diganti dengan yang baru",
  },
  {
    id: "RPT004",
    assetId: "KURSI-B102-005",
    assetName: "Kursi Siswa",
    damageType: "broken",
    description: "Sandaran kursi lepas dari dudukan",
    status: "pending",
    createdAt: "2025-01-15T09:45:00",
    location: "Ruang 102",
    reportedBy: "Dewi Lestari",
    reporterClass: "XI IPA 3",
  },
  {
    id: "RPT005",
    assetId: "PAPAN-C201-001",
    assetName: "Papan Tulis",
    damageType: "wear",
    description: "Permukaan papan sudah aus, sulit dihapus",
    status: "in_progress",
    createdAt: "2025-01-13T11:30:00",
    location: "Ruang 201",
    reportedBy: "Riko Pratama",
    reporterClass: "XII IPS 1",
    assignedTo: "Pak Maintenance Andi",
  },
]

export default function AdminReportsPage() {
  const admin = mockAdmins[0]
  const [reports, setReports] = useState(mockReports)
  const [selectedReport, setSelectedReport] = useState<AssetReport | null>(null)
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "in_progress" | "resolved">("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionType, setActionType] = useState<"process" | "resolve">("process")
  const [actionNote, setActionNote] = useState("")
  const [showFilterDropdown, setShowFilterDropdown] = useState(false)

  const filteredReports = reports.filter((report) => {
    const matchesStatus = filterStatus === "all" || report.status === filterStatus
    const matchesSearch =
      report.assetName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.assetId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reportedBy.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
            <Clock className="w-3 h-3" />
            Menunggu
          </span>
        )
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            <AlertCircle className="w-3 h-3" />
            Diproses
          </span>
        )
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle className="w-3 h-3" />
            Selesai
          </span>
        )
      default:
        return null
    }
  }

  const getDamageTypeLabel = (type: string) => {
    switch (type) {
      case "broken":
        return "Rusak/Patah"
      case "malfunctioning":
        return "Tidak Berfungsi"
      case "missing":
        return "Bagian Hilang"
      case "wear":
        return "Aus Normal"
      default:
        return "Lainnya"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleProcessReport = () => {
    if (!selectedReport) return

    setReports(
      reports.map((r) =>
        r.id === selectedReport.id
          ? { ...r, status: "in_progress", assignedTo: actionNote || "Tim Maintenance" }
          : r
      )
    )
    setSelectedReport({ ...selectedReport, status: "in_progress", assignedTo: actionNote || "Tim Maintenance" })
    setShowActionModal(false)
    setActionNote("")
  }

  const handleResolveReport = () => {
    if (!selectedReport) return

    setReports(
      reports.map((r) =>
        r.id === selectedReport.id
          ? { ...r, status: "resolved", resolvedAt: new Date().toISOString(), resolution: actionNote }
          : r
      )
    )
    setSelectedReport({
      ...selectedReport,
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolution: actionNote,
    })
    setShowActionModal(false)
    setActionNote("")
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length
  const resolvedCount = reports.filter((r) => r.status === "resolved").length

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Laporan Aset</h1>
          <p className="text-slate-500">Kelola laporan kerusakan dari siswa</p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-3">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-lg font-bold text-slate-800">{pendingCount}</span>
            </div>
            <p className="text-xs text-slate-500">Menunggu</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <div className="flex items-center justify-center gap-2">
              <Wrench className="w-4 h-4 text-blue-500" />
              <span className="text-lg font-bold text-slate-800">{inProgressCount}</span>
            </div>
            <p className="text-xs text-slate-500">Diproses</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-lg font-bold text-slate-800">{resolvedCount}</span>
            </div>
            <p className="text-xs text-slate-500">Selesai</p>
          </GlassCard>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari laporan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50"
            >
              <Filter className="w-4 h-4 text-slate-500" />
              <span className="text-slate-700">Filter</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {showFilterDropdown && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                {[
                  { value: "all", label: "Semua" },
                  { value: "pending", label: "Menunggu" },
                  { value: "in_progress", label: "Diproses" },
                  { value: "resolved", label: "Selesai" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setFilterStatus(option.value as typeof filterStatus)
                      setShowFilterDropdown(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                      filterStatus === option.value ? "text-blue-600 bg-blue-50" : "text-slate-700"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Reports List */}
        <div className="space-y-3">
          {filteredReports.length === 0 ? (
            <GlassCard className="text-center py-8">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Tidak ada laporan ditemukan</p>
            </GlassCard>
          ) : (
            filteredReports.map((report) => (
              <GlassCard
                key={report.id}
                className="cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        report.status === "pending"
                          ? "bg-amber-100"
                          : report.status === "in_progress"
                          ? "bg-blue-100"
                          : "bg-emerald-100"
                      }`}
                    >
                      <FileText
                        className={`w-5 h-5 ${
                          report.status === "pending"
                            ? "text-amber-600"
                            : report.status === "in_progress"
                            ? "text-blue-600"
                            : "text-emerald-600"
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-800">{report.assetName}</h3>
                      <p className="text-xs text-slate-400">{report.assetId}</p>
                    </div>
                  </div>
                  {getStatusBadge(report.status)}
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500 mt-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {report.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {report.reportedBy}
                  </span>
                </div>

                <p className="text-xs text-slate-400 mt-2">{formatDate(report.createdAt)}</p>
              </GlassCard>
            ))
          )}
        </div>
      </div>

      {/* Report Detail Modal */}
      <GlassModal
        isOpen={!!selectedReport && !showActionModal}
        onClose={() => setSelectedReport(null)}
        title="Detail Laporan"
        size="lg"
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Status</span>
              {getStatusBadge(selectedReport.status)}
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-400">ID Laporan</p>
              <p className="font-medium text-slate-800">{selectedReport.id}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-400">Aset</p>
              <p className="font-medium text-slate-800">{selectedReport.assetName}</p>
              <p className="text-sm text-slate-500">{selectedReport.assetId}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Lokasi</p>
                <p className="font-medium text-slate-800">{selectedReport.location}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Jenis Kerusakan</p>
                <p className="font-medium text-slate-800">{getDamageTypeLabel(selectedReport.damageType)}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-400">Dilaporkan Oleh</p>
              <p className="font-medium text-slate-800">{selectedReport.reportedBy}</p>
              <p className="text-sm text-slate-500">{selectedReport.reporterClass}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-400">Deskripsi Kerusakan</p>
              <p className="text-slate-800">{selectedReport.description}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-400">Tanggal Laporan</p>
              <p className="font-medium text-slate-800">{formatDate(selectedReport.createdAt)}</p>
            </div>

            {selectedReport.assignedTo && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-500">Ditugaskan Kepada</p>
                <p className="font-medium text-blue-700">{selectedReport.assignedTo}</p>
              </div>
            )}

            {selectedReport.resolution && (
              <div className="p-3 bg-emerald-50 rounded-lg">
                <p className="text-xs text-emerald-500">Catatan Penyelesaian</p>
                <p className="text-emerald-800">{selectedReport.resolution}</p>
                {selectedReport.resolvedAt && (
                  <p className="text-xs text-emerald-500 mt-1">
                    Diselesaikan: {formatDate(selectedReport.resolvedAt)}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              {selectedReport.status === "pending" && (
                <GlassButton
                  className="flex-1"
                  onClick={() => {
                    setActionType("process")
                    setShowActionModal(true)
                  }}
                >
                  <Wrench className="w-4 h-4 mr-2" />
                  Proses
                </GlassButton>
              )}
              {selectedReport.status === "in_progress" && (
                <GlassButton
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => {
                    setActionType("resolve")
                    setShowActionModal(true)
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Selesaikan
                </GlassButton>
              )}
              <GlassButton variant="ghost" className="flex-1" onClick={() => setSelectedReport(null)}>
                Tutup
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>

      {/* Action Modal */}
      <GlassModal
        isOpen={showActionModal && !!selectedReport}
        onClose={() => setShowActionModal(false)}
        title={actionType === "process" ? "Proses Laporan" : "Selesaikan Laporan"}
      >
        {selectedReport && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-400">Aset</p>
              <p className="font-medium text-slate-800">{selectedReport.assetName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {actionType === "process" ? "Ditugaskan Kepada" : "Catatan Penyelesaian"}
              </label>
              <GlassTextarea
                placeholder={
                  actionType === "process"
                    ? "contoh: Pak Teknisi Budi"
                    : "Jelaskan bagaimana masalah diselesaikan..."
                }
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton variant="ghost" className="flex-1" onClick={() => setShowActionModal(false)}>
                Batal
              </GlassButton>
              <GlassButton
                className={`flex-1 ${actionType === "resolve" ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                onClick={actionType === "process" ? handleProcessReport : handleResolveReport}
              >
                {actionType === "process" ? "Proses" : "Selesaikan"}
              </GlassButton>
            </div>
          </div>
        )}
      </GlassModal>
    </DashboardLayout>
  )
}
