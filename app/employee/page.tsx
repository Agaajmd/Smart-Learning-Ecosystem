"use client"

import { useEffect, useState } from "react"
import { GlassCard } from "@/components/molecules/glass-card"
import { RouteLoading } from "@/components/templates/route-loading"
import { AttendanceLeaderboard } from "@/components/organisms/attendance-leaderboard"
import { Calendar, LayoutGrid, BookOpen, Users, Award } from "lucide-react"
import Link from "next/link"
import type { Student } from "@/lib/data-model"

type Employee = { id: string; name: string; subject: string; classesCount: number; rating: number }
type Schedule = { id: string; day: string }
type ClassRoomLite = { id: string }

export default function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee>({ id: "", name: "", subject: "-", classesCount: 0, rating: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [todayClasses, setTodayClasses] = useState<Schedule[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [primaryClassId, setPrimaryClassId] = useState("")

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch("/api/dashboard/employee", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        if (data.employee) setEmployee(data.employee)
        if (Array.isArray(data.todayClasses)) setTodayClasses(data.todayClasses)

        const contextRes = await fetch("/api/employee/context", { cache: "no-store" })
        if (!contextRes.ok || !active) return
        const context = await contextRes.json()
        if (Array.isArray(context.students)) setStudents(context.students)
        if (Array.isArray(context.classes) && context.classes.length > 0) {
          const firstClass = (context.classes as ClassRoomLite[])[0]
          if (firstClass?.id) setPrimaryClassId(firstClass.id)
        }
      } catch {
        // Keep fallback values.
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

  const quickActions = [
    {
      href: "/employee/schedule",
      icon: Calendar,
      label: "Jadwal Mengajar",
      description: "Lihat jadwal mingguan Anda",
    },
    {
      href: primaryClassId ? `/employee/class/${primaryClassId}` : "/employee/schedule",
      icon: LayoutGrid,
      label: "Kelas Saya",
      description: "Kelola kehadiran siswa",
    },
    { href: "/employee/grades", icon: Award, label: "Poin Keaktifan", description: "Input poin aktivitas siswa" },
    { href: "/employee/rapor", icon: BookOpen, label: "AI Rapor", description: "Generate laporan siswa" },
  ]

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Selamat datang,</h1>
          <p className="text-slate-500">{employee.name}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="text-center py-4">
            <Users className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-slate-800">{employee.classesCount}</p>
            <p className="text-xs text-slate-500">Kelas</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <Calendar className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-slate-800">{todayClasses.length}</p>
            <p className="text-xs text-slate-500">Hari Ini</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <BookOpen className="w-6 h-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold text-slate-800">{employee.subject}</p>
            <p className="text-xs text-slate-500">Mapel</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <span className="text-2xl">⭐</span>
            <p className="text-2xl font-bold text-slate-800">{employee.rating}</p>
            <p className="text-xs text-slate-500">Rating</p>
          </GlassCard>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Aksi Cepat</h2>
          <div className="grid gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.href} href={action.href}>
                  <GlassCard className="flex items-center gap-4" hover>
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{action.label}</h3>
                      <p className="text-sm text-slate-500">{action.description}</p>
                    </div>
                  </GlassCard>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Attendance Leaderboard */}
        <AttendanceLeaderboard limit={15} students={students} />
      </div>
    </>
  )
}
