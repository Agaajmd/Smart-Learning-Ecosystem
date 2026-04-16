"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import type { AttendanceRecord, Parent, Student } from "@/lib/data-model"
import { 
  CalendarCheck,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ParentAttendancePage() {
  const [parent, setParent] = useState<Parent | null>(null)
  const [children, setChildren] = useState<Student[]>([])
  const [selectedChild, setSelectedChild] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [childClassName, setChildClassName] = useState("")

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const query = selectedChild?.id ? `?childId=${selectedChild.id}` : ""
        const res = await fetch(`/api/parent/child-overview${query}`, {
          cache: "no-store",
        })
        if (!res.ok) return
        const data = await res.json()
        setParent(data.parent || null)
        setChildren(Array.isArray(data.children) ? data.children : [])
        if (data.selectedChild) {
          setSelectedChild(data.selectedChild)
        }
        setAttendance(data.attendance || [])
        setChildClassName(data.childClass?.name || data.selectedChild?.classId || "-")
      } catch {
        setParent(null)
      }
    }

    fetchOverview()
  }, [selectedChild?.id])

  const monthOptions = useMemo(() => {
    const monthKeys = [...new Set(attendance.map((item) => String(item.date || "").slice(0, 7)).filter(Boolean))]
      .sort((a, b) => b.localeCompare(a))

    return monthKeys.map((value) => {
      const [year, month] = value.split("-")
      const asDate = new Date(Number(year), Math.max(0, Number(month) - 1), 1)
      return {
        value,
        label: asDate.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
      }
    })
  }, [attendance])

  useEffect(() => {
    if (monthOptions.length === 0) {
      setSelectedMonth("")
      return
    }

    if (!selectedMonth || !monthOptions.some((month) => month.value === selectedMonth)) {
      setSelectedMonth(monthOptions[0].value)
    }
  }, [monthOptions, selectedMonth])

  const filteredAttendance = selectedMonth
    ? attendance.filter((item) => String(item.date || "").startsWith(selectedMonth))
    : attendance

  const presentCount = filteredAttendance.filter(a => a.status === "PRESENT").length
  const sickCount = filteredAttendance.filter(a => a.status === "SICK").length
  const alphaCount = filteredAttendance.filter(a => a.status === "ALPHA").length
  const totalDays = filteredAttendance.length
  const attendancePercentage = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0

  if (!parent) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar || "/placeholder-user.jpg"}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/parent" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Kehadiran Anak</h1>
            <p className="text-slate-500 text-sm">Rekap kehadiran harian di sekolah</p>
          </div>
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
                  <p className="text-xs text-slate-500">{child.id === selectedChild?.id ? childClassName : child.classId}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Month Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {monthOptions.map(month => (
            <button
              key={month.value}
              onClick={() => setSelectedMonth(month.value)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                selectedMonth === month.value
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {month.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        <GlassCard className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-white/80 text-sm">Persentase Kehadiran</p>
              <p className="text-4xl font-bold mt-1">{attendancePercentage}%</p>
              <p className="text-white/80 text-sm mt-2">dari {totalDays} hari sekolah</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/20">
              <CalendarCheck className="w-10 h-10 text-white" />
            </div>
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-2.5 rounded-xl bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-600">{presentCount}</p>
              <p className="text-xs text-slate-500">Hadir</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-600">{sickCount}</p>
              <p className="text-xs text-slate-500">Sakit</p>
            </div>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="p-2.5 rounded-xl bg-red-100">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-red-600">{alphaCount}</p>
              <p className="text-xs text-slate-500">Alpha</p>
            </div>
          </GlassCard>
        </div>

        {/* Attendance List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800">Riwayat Kehadiran</h3>
          {filteredAttendance.length > 0 ? (
            filteredAttendance.map(record => (
              <GlassCard key={record.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2.5 rounded-xl",
                      record.status === "PRESENT" ? "bg-green-100" :
                      record.status === "SICK" ? "bg-amber-100" : "bg-red-100"
                    )}>
                      {record.status === "PRESENT" ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : record.status === "SICK" ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">
                        {new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {record.notes && (
                        <p className="text-sm text-slate-500">Catatan: {record.notes}</p>
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-sm font-medium",
                    record.status === "PRESENT" ? "bg-green-100 text-green-700" :
                    record.status === "SICK" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {record.status === "PRESENT" ? "Hadir" : record.status === "SICK" ? "Sakit" : "Alpha"}
                  </span>
                </div>
              </GlassCard>
            ))
          ) : (
            <GlassCard>
              <EmptySkeleton rows={4} className="py-4" />
            </GlassCard>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
