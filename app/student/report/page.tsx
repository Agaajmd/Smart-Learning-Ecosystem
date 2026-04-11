"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassTextarea } from "@/components/atoms/glass-textarea"
import { GlassButton } from "@/components/atoms/glass-button"
import { mockStudents } from "@/lib/mock-data"
import {
  Camera,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Package,
} from "lucide-react"

// Mock data for reports
const mockReports = [
  {
    id: "RPT001",
    assetId: "MEJA-A101-001",
    assetName: "Meja Siswa",
    damageType: "broken",
    description: "Kaki meja patah, tidak stabil saat digunakan",
    status: "pending",
    createdAt: "2025-01-15T08:30:00",
    location: "Ruang 101",
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
  },
]

export default function StudentReportPage() {
  const student = mockStudents[0]
  const [activeTab, setActiveTab] = useState<"form" | "history">("form")
  const [assetId, setAssetId] = useState("")
  const [damageType, setDamageType] = useState("")
  const [description, setDescription] = useState("")
  const [location, setLocation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [reports, setReports] = useState(mockReports)
  const [selectedReport, setSelectedReport] = useState<typeof mockReports[0] | null>(null)
  const successTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!assetId || !damageType || !description || !location) {
      alert("Mohon isi semua field!")
      return
    }

    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Add new report
    const newReport = {
      id: `RPT${String(reports.length + 1).padStart(3, "0")}`,
      assetId,
      assetName: assetId,
      damageType,
      description,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      location,
    }

    setReports((prev) => [newReport, ...prev])
    setShowSuccess(true)
    setAssetId("")
    setDamageType("")
    setDescription("")
    setLocation("")
    setIsSubmitting(false)

    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current)
    }
    successTimerRef.current = window.setTimeout(() => {
      setShowSuccess(false)
      successTimerRef.current = null
    }, 3000)
  }

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

  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar}>
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800">Laporan Aset</h1>
          <p className="text-slate-500">Laporkan kerusakan fasilitas sekolah</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("form")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "form"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Buat Laporan
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Riwayat ({reports.length})
          </button>
        </div>

        {/* Success Toast */}
        {showSuccess && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-lg shadow-lg animate-in slide-in-from-top-2">
            <CheckCircle className="w-5 h-5" />
            <span>Laporan berhasil dikirim!</span>
          </div>
        )}

        {/* Form Tab */}
        {activeTab === "form" && (
          <GlassCard className="space-y-6">
            {/* Image Upload */}
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                id="asset-image"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    // Handle file upload
                    console.log('File selected:', file.name)
                  }
                }}
              />
              <label htmlFor="asset-image" className="flex flex-col items-center cursor-pointer">
                <div className="p-4 bg-blue-100 rounded-full mb-4">
                  <Camera className="w-10 h-10 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">Upload Foto Kerusakan</p>
                <p className="text-xs text-slate-500 mb-4">Klik untuk memilih gambar atau seret ke sini</p>
                <GlassButton type="button" variant="outline" size="sm">
                  <Camera className="w-4 h-4 mr-2" />
                  Pilih Gambar
                </GlassButton>
              </label>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">ID Aset</label>
                <GlassInput
                  placeholder="contoh: MEJA-A101-001"
                  value={assetId}
                  onChange={(e) => setAssetId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lokasi</label>
                <GlassInput
                  placeholder="contoh: Ruang 101"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Jenis Kerusakan</label>
                <select
                  value={damageType}
                  onChange={(e) => setDamageType(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pilih jenis kerusakan...</option>
                  <option value="broken">Rusak/Patah</option>
                  <option value="malfunctioning">Tidak Berfungsi</option>
                  <option value="missing">Bagian Hilang</option>
                  <option value="wear">Aus Normal</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
                <GlassTextarea
                  placeholder="Jelaskan kerusakan secara detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <GlassButton type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Mengirim...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    Kirim Laporan
                  </span>
                )}
              </GlassButton>
            </form>
          </GlassCard>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {reports.length === 0 ? (
              <GlassCard className="text-center py-8">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">Belum ada laporan</p>
              </GlassCard>
            ) : (
              reports.map((report) => (
                <GlassCard
                  key={report.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setSelectedReport(report)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800">{report.assetName}</h3>
                        <p className="text-xs text-slate-400">{report.assetId}</p>
                        <p className="text-sm text-slate-500 mt-1">{report.location}</p>
                      </div>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">{formatDate(report.createdAt)}</p>
                </GlassCard>
              ))
            )}
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      <GlassModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title="Detail Laporan"
        size="md"
      >
        {selectedReport && (
          <>
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

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Lokasi</p>
                <p className="font-medium text-slate-800">{selectedReport.location}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Jenis Kerusakan</p>
                <p className="font-medium text-slate-800">{getDamageTypeLabel(selectedReport.damageType)}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Deskripsi</p>
                <p className="text-slate-800">{selectedReport.description}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-400">Tanggal Laporan</p>
                <p className="font-medium text-slate-800">{formatDate(selectedReport.createdAt)}</p>
              </div>
            </div>

            <GlassButton
              variant="ghost"
              className="w-full mt-6"
              onClick={() => setSelectedReport(null)}
            >
              Tutup
            </GlassButton>
          </>
        )}
      </GlassModal>
    </DashboardLayout>
  )
}
