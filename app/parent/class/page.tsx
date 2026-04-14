"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { ClassRoomGrid } from "@/components/organisms/class-room-grid"
import { GlassCard } from "@/components/molecules/glass-card"
import type { Student } from "@/lib/data-model"
import { 
  Users, 
  GraduationCap, 
  MapPin, 
  User,
  Trophy,
  Flame,
  Star,
  CheckCircle,
  AlertCircle,
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

  const childRank = useMemo(() => {
    if (!selectedChild) return 0
    return [...classmates].sort((a, b) => b.xp - a.xp).findIndex((s) => s.id === selectedChild.id) + 1
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

  // Find child's row and column position
  const seatPosition = `Baris ${selectedChild.seatRow + 1}, Kolom ${selectedChild.seatCol + 1}`

  // Calculate class stats
  const presentCount = classmates.filter(s => s.attendance === "PRESENT").length
  const sickCount = classmates.filter(s => s.attendance === "SICK").length
  const alphaCount = classmates.filter(s => s.attendance === "ALPHA").length
  
  // Top students by level/XP
  const topStudents = [...classmates]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5)
  
  // Attendance status for selected child
  const getAttendanceStatus = () => {
    switch (selectedChild.attendance) {
      case "PRESENT":
        return { label: "Hadir", color: "text-green-600", bg: "bg-green-50", border: "border-green-200", icon: CheckCircle }
      case "SICK":
        return { label: "Sakit", color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-200", icon: AlertCircle }
      case "ALPHA":
        return { label: "Alpha", color: "text-red-600", bg: "bg-red-50", border: "border-red-200", icon: AlertCircle }
      default:
        return { label: "Unknown", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200", icon: User }
    }
  }
  
  const attendanceStatus = getAttendanceStatus()
  const AttendanceIcon = attendanceStatus.icon

  return (
    <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
        {/* Header with Child Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Kelas Anak</h1>
            <p className="text-slate-500">Lihat informasi kelas anak Anda</p>
          </div>

          {/* Child Selector (if multiple children) */}
          {children.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowChildSelector(!showChildSelector)}
                className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all duration-200 min-w-[200px]"
              >
                <img 
                  src={selectedChild.avatar} 
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

              {/* Dropdown */}
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
                              src={child.avatar} 
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

        {/* Child Info Card */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-4">
            <img 
              src={selectedChild.avatar} 
              alt={selectedChild.name}
              className="w-16 h-16 rounded-xl object-cover ring-2 ring-slate-200"
            />
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">{selectedChild.name}</h2>
              <p className="text-sm text-slate-500">{childClass.name} • Grade {childClass.grade}</p>
              {teacher && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">Wali Kelas: {teacher.name}</span>
                </div>
              )}
            </div>
            <div className={cn(
              "px-3 py-2 rounded-xl border flex items-center gap-2",
              attendanceStatus.bg,
              attendanceStatus.border
            )}>
              <AttendanceIcon className={cn("w-4 h-4", attendanceStatus.color)} />
              <span className={cn("text-sm font-medium", attendanceStatus.color)}>
                {attendanceStatus.label}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Child Stats */}
        <div className="grid grid-cols-4 gap-3">
          <GlassCard className="text-center py-3">
            <p className="text-xl font-bold text-blue-600">#{childRank}</p>
            <p className="text-[10px] text-slate-500">Rank Kelas</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-xl font-bold text-amber-600">Lv.{selectedChild.level}</p>
            <p className="text-[10px] text-slate-500">Level</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-xl font-bold text-orange-600">{selectedChild.streak}</p>
            <p className="text-[10px] text-slate-500">Hari Streak</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-xl font-bold text-slate-800">{selectedChild.xp.toLocaleString()}</p>
            <p className="text-[10px] text-slate-500">XP</p>
          </GlassCard>
        </div>

        {/* Seat Position */}
        <GlassCard className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-600 font-medium">Posisi Duduk</p>
              <h3 className="text-lg font-bold text-slate-800">{seatPosition}</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Skor Perilaku</p>
              <p className={cn(
                "text-2xl font-bold",
                selectedChild.behaviorScore >= 80 ? "text-green-600" :
                selectedChild.behaviorScore >= 60 ? "text-yellow-600" : "text-red-600"
              )}>{selectedChild.behaviorScore}</p>
            </div>
          </div>
        </GlassCard>

        {/* Class Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-3">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-slate-500" />
            </div>
            <p className="text-2xl font-bold text-slate-800">{classmates.length}</p>
            <p className="text-xs text-slate-500">Total Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-green-600">{presentCount}</p>
            <p className="text-xs text-slate-500">Hadir Hari Ini</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-orange-600">{sickCount + alphaCount}</p>
            <p className="text-xs text-slate-500">Tidak Hadir</p>
          </GlassCard>
        </div>

        {/* Class Layout with highlight */}
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

        {/* Top Students in Class */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-slate-800">Top 5 Siswa</h2>
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
                  src={s.avatar} 
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
                      <Star className="w-3 h-3 text-amber-500" />
                      Lv.{s.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-orange-500" />
                      {s.streak} hari
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{s.xp.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">XP</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  )
}
