"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { ClassRoomGrid } from "@/components/organisms/class-room-grid"
import { GlassCard } from "@/components/molecules/glass-card"
import type { Student } from "@/lib/data-model"
import { 
  GraduationCap,
  MapPin,
  Trophy,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RouteLoading } from "@/components/templates/route-loading"

export default function ParentClassPage() {
  const [parent, setParent] = useState<any>(null)
  const [children, setChildren] = useState<Student[]>([])
  const [selectedChild, setSelectedChild] = useState<Student | null>(null)
  const [childClass, setChildClass] = useState<any>(null)
  const [classmates, setClassmates] = useState<Student[]>([])
  const [teacher, setTeacher] = useState<any>(null)
  const [showChildSelector, setShowChildSelector] = useState(false)

  useEffect(() => {
    const load = async () => {
      const query = selectedChild?.id ? `?childId=${selectedChild.id}` : ""
      const res = await fetch(`/api/parent/child-overview${query}`, { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      setParent(data.parent || null)
      setChildren(Array.isArray(data.children) ? data.children : [])
      if (data.selectedChild) {
        setSelectedChild(data.selectedChild)
      }
      setChildClass(data.childClass || null)
      setClassmates(Array.isArray(data.classmates) ? data.classmates : [])
      if (Array.isArray(data.teachers) && data.teachers.length > 0) {
        setTeacher(data.teachers[0])
      }
    }

    load()
  }, [selectedChild?.id])

  const resolveAvatar = (value: unknown) => {
    const next = String(value || "").trim()
    return next || "/placeholder-user.jpg"
  }

  const getNetPoints = (target: any) => {
    const positivePoints = Number(target?.positivePoints ?? 0)
    const negativePoints = Number(target?.negativePoints ?? 0)
    const total = target?.totalPoints ?? target?.points
    if (total != null) return Number(total)
    return positivePoints - negativePoints
  }

  const childRank = useMemo(() => {
    if (!selectedChild) return 0
    return [...classmates].sort((a, b) => getNetPoints(b) - getNetPoints(a)).findIndex((s) => s.id === selectedChild.id) + 1
  }, [classmates, selectedChild])

  if (!parent || !selectedChild) {
    return <RouteLoading />
  }

  if (!childClass) {
    return (
      <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <GlassCard className="p-8 text-center">
            <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">Belum Terdaftar di Kelas</h2>
            <p className="text-slate-500 mt-2">Anak Anda belum ditempatkan di kelas.</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  const seatPosition = `Baris ${selectedChild.seatRow + 1}, Kolom ${selectedChild.seatCol + 1}`
  const presentCount = classmates.filter((s) => s.attendance === "PRESENT").length
  const sickCount = classmates.filter((s) => s.attendance === "SICK").length
  const alphaCount = classmates.filter((s) => s.attendance === "ALPHA").length

  const topStudents = [...classmates]
    .sort((a, b) => getNetPoints(b) - getNetPoints(a))
    .slice(0, 5)

  return (
    <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Layout Kelas</h1>
            <p className="text-slate-500">Lihat posisi dan kondisi kelas anak Anda</p>
          </div>

          {children.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowChildSelector(!showChildSelector)}
                className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all duration-200 min-w-[200px]"
              >
                <img 
                  src={resolveAvatar(selectedChild.avatar)} 
                  alt={selectedChild.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-800">{selectedChild.name}</p>
                  <p className="text-xs text-slate-500">{childClass.name}</p>
                </div>
                <ChevronDown className={cn(
                  "w-4 h-4 text-slate-400 transition-transform duration-200",
                  showChildSelector && "rotate-180"
                )} />
              </button>

              {showChildSelector && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowChildSelector(false)} 
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-slate-100">
                      <p className="text-xs font-medium text-slate-500 px-2">Pilih Anak</p>
                    </div>
                    <div className="p-1">
                      {children.map((child) => {
                        const cls = child.id === selectedChild.id ? childClass : null
                        const isSelected = child.id === selectedChild.id
                        return (
                          <button
                            key={child.id}
                            onClick={() => {
                              setSelectedChild(child)
                              setShowChildSelector(false)
                            }}
                            className={cn(
                              "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200",
                              isSelected 
                                ? "bg-blue-50 text-blue-700" 
                                : "hover:bg-slate-50 text-slate-700"
                            )}
                          >
                            <img 
                              src={resolveAvatar(child.avatar)} 
                              alt={child.name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1 text-left">
                              <p className={cn(
                                "text-sm font-medium",
                                isSelected ? "text-blue-700" : "text-slate-800"
                              )}>{child.name}</p>
                              <p className="text-xs text-slate-500">{cls?.name || "No class"}</p>
                            </div>
                            {isSelected && (
                              <CheckCircle className="w-4 h-4 text-blue-600" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Class Info Card */}
        <GlassCard className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <img 
              src={resolveAvatar(selectedChild.avatar)} 
              alt={selectedChild.name}
              className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-200"
            />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">{childClass.name}</h2>
              <p className="text-sm text-slate-500">Grade {childClass.grade}</p>
              {teacher && (
                <div className="flex items-center gap-2 mt-1">
                  <img
                    src={resolveAvatar(teacher.avatar)}
                    alt={teacher.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-sm text-slate-600">Wali Kelas: {teacher.name}</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Seat Position */}
        <GlassCard className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-600 font-medium">Posisi {selectedChild.name.split(" ")[0]}</p>
              <h3 className="text-lg font-bold text-slate-800">{seatPosition}</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Rank di Kelas</p>
              <p className="text-2xl font-bold text-blue-600">#{childRank}</p>
            </div>
          </div>
        </GlassCard>

        {/* Class Stats */}
        <div className="grid grid-cols-4 gap-3">
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-slate-800">{classmates.length}</p>
            <p className="text-xs text-slate-500">Total Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            <p className="text-xs text-slate-500">Present</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-amber-600">{sickCount}</p>
            <p className="text-xs text-slate-500">Sick</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-red-600">{alphaCount}</p>
            <p className="text-xs text-slate-500">Alpha</p>
          </GlassCard>
        </div>

        {/* Class Layout */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Layout Kelas</h2>
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
              <span>Posisi {selectedChild.name.split(' ')[0]}</span>
            </div>
          </div>
          <ClassRoomGrid 
            classroom={childClass} 
            students={classmates} 
            viewOnly={true}
            highlightStudentId={selectedChild.id}
          />
        </div>

        {/* Top Students */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">Top 5 Poin Siswa</h2>
          </div>
          <div className="space-y-3">
            {topStudents.map((s, idx) => (
              <div 
                key={s.id} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  s.id === selectedChild.id 
                    ? "bg-blue-50 border border-blue-200" 
                    : "bg-slate-50 hover:bg-slate-100"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  idx === 0 ? "bg-amber-100 text-amber-600" :
                  idx === 1 ? "bg-slate-200 text-slate-600" :
                  idx === 2 ? "bg-orange-100 text-orange-600" :
                  "bg-slate-100 text-slate-500"
                )}>
                  {idx + 1}
                </div>
                <img 
                  src={resolveAvatar(s.avatar)} 
                  alt={s.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium truncate",
                    s.id === selectedChild.id ? "text-blue-700" : "text-slate-800"
                  )}>
                    {s.name} {s.id === selectedChild.id && "(Anak Anda)"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 text-emerald-500" />
                      +{Number((s as any).positivePoints ?? 0)}
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-rose-500" />
                      -{Number((s as any).negativePoints ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{getNetPoints(s).toLocaleString()}</p>
                  <p className="text-xs text-slate-500">Total Poin</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  )
}
