"use client"

import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { AttendanceLeaderboard } from "@/components/organisms/attendance-leaderboard"
import { mockEmployees, mockSchedule } from "@/lib/mock-data"
import { Calendar, LayoutGrid, BookOpen, Users, Award } from "lucide-react"
import Link from "next/link"

export default function EmployeeDashboard() {
  const employee = mockEmployees[0]
  const todayClasses = mockSchedule.filter((s) => s.day === "Monday" && s.teacherId === employee.id)

  const quickActions = [
    {
      href: "/employee/schedule",
      icon: Calendar,
      label: "Jadwal Mengajar",
      description: "Lihat jadwal mingguan Anda",
    },
    { href: "/employee/class/c1", icon: LayoutGrid, label: "Kelas Saya", description: "Kelola kehadiran siswa" },
    { href: "/employee/grades", icon: Award, label: "Poin Keaktifan", description: "Input poin aktivitas siswa" },
    { href: "/employee/rapor", icon: BookOpen, label: "AI Rapor", description: "Generate laporan siswa" },
  ]

  return (
    <DashboardLayout role="EMPLOYEE" userName={employee.name} userAvatar={employee.avatar}>
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
        <AttendanceLeaderboard limit={15} />
      </div>
    </DashboardLayout>
  )
}
