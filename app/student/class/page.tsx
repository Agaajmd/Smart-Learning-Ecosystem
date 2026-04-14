"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { ClassRoomGrid } from "@/components/organisms/class-room-grid"
import { GlassCard } from "@/components/molecules/glass-card"
import { 
  Users, 
  GraduationCap, 
  MapPin, 
  User,
  Trophy,
  Flame,
  Star,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RouteLoading } from "@/components/templates/route-loading"

export default function StudentClassPage() {
  const [student, setStudent] = useState<any>(null)
  const [studentClass, setStudentClass] = useState<any>(null)
  const [classmates, setClassmates] = useState<any[]>([])
  const [teacher, setTeacher] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/student/overview", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        setStudent(data.student || null)
        setStudentClass(data.studentClass || null)
        setClassmates(Array.isArray(data.classmates) ? data.classmates : [])
        setTeacher(data.teacher || null)
      } catch {
        setStudent(null)
      }
    }

    load()
  }, [])

  const myRank = useMemo(() => {
    if (!student) return 0
    return [...classmates].sort((a, b) => b.xp - a.xp).findIndex((s) => s.id === student.id) + 1
  }, [classmates, student])

  if (!student) {
    return <RouteLoading />
  }

  if (!studentClass) {
    return (
      <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <GlassCard className="p-8 text-center">
            <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">Belum Terdaftar di Kelas</h2>
            <p className="text-slate-500 mt-2">Silakan hubungi admin untuk penempatan kelas.</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  // Find student's row and column position
  const seatPosition = `Baris ${student.seatRow + 1}, Kolom ${student.seatCol + 1}`

  // Calculate class stats
  const presentCount = classmates.filter(s => s.attendance === "PRESENT").length
  const sickCount = classmates.filter(s => s.attendance === "SICK").length
  const alphaCount = classmates.filter(s => s.attendance === "ALPHA").length
  
  // Top students by level/XP
  const topStudents = [...classmates]
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 5)
  
  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-800">Kelas Saya</h1>
          <p className="text-slate-500">Lihat informasi kelas dan posisi dudukmu</p>
        </div>

        {/* Class Info Card */}
        <GlassCard className="p-4">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">{studentClass.name}</h2>
              <p className="text-sm text-slate-500">Grade {studentClass.grade}</p>
              {teacher && (
                <div className="flex items-center gap-2 mt-2">
                  <img 
                    src={teacher.avatar} 
                    alt={teacher.name}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-sm text-slate-600">Wali Kelas: {teacher.name}</span>
                </div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* My Seat Info */}
        <GlassCard className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <MapPin className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-blue-600 font-medium">Posisi Dudukmu</p>
              <h3 className="text-lg font-bold text-slate-800">{seatPosition}</h3>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-500">Rank di Kelas</p>
              <p className="text-2xl font-bold text-blue-600">#{myRank}</p>
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
              <span>Posisimu</span>
            </div>
          </div>
          <ClassRoomGrid 
            classroom={studentClass} 
            students={classmates} 
            viewOnly={true}
            highlightStudentId={student.id}
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
                  s.id === student.id 
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
                    s.id === student.id ? "text-blue-700" : "text-slate-800"
                  )}>
                    {s.name} {s.id === student.id && "(Kamu)"}
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
