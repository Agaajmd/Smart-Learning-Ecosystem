"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import { GlassButton } from "@/components/atoms/glass-button"
import type { ClassRoom, Employee, Schedule, Task, TaskSubmission, User } from "@/lib/data-model"
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Briefcase,
  BookOpen,
  ClipboardList,
  CheckCircle,
  TrendingUp,
  Star,
  Clock,
} from "lucide-react"

interface ClientPageProps {
  id: string
}

export default function StaffDetailClient({ id }: ClientPageProps) {
  const router = useRouter()
  const [superAdmin, setSuperAdmin] = useState<User | null>(null)
  const [staff, setStaff] = useState<Employee | User | null>(null)
  const [type, setType] = useState<"teacher" | "admin" | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [taskSubmissions, setTaskSubmissions] = useState<TaskSubmission[]>([])
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [staffRes, baseRes] = await Promise.all([
          fetch(`/api/super-admin/staff/${id}`, { cache: "no-store" }),
          fetch("/api/super-admin/staff", { cache: "no-store" }),
        ])

        if (!staffRes.ok) throw new Error("Staff tidak ditemukan")
        const staffData = await staffRes.json()
        const baseData = baseRes.ok ? await baseRes.json() : {}

        setSuperAdmin(baseData.superAdmin || null)
        setStaff(staffData.staff || null)
        setType(staffData.type || null)
        setSchedules(Array.isArray(staffData.schedules) ? staffData.schedules : [])
        setTasks(Array.isArray(staffData.tasks) ? staffData.tasks : [])
        setTaskSubmissions(Array.isArray(staffData.taskSubmissions) ? staffData.taskSubmissions : [])
        setClasses(Array.isArray(staffData.classes) ? staffData.classes : [])
      } catch {
        setStaff(null)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [id])

  const teacher = useMemo(() => (type === "teacher" && staff ? (staff as Employee) : null), [type, staff])

  const gradedSubmissions = useMemo(() => taskSubmissions.filter((submission) => submission.status === "GRADED"), [taskSubmissions])

  const performanceData = useMemo(() => {
    const ratingScore = teacher ? Math.round(Math.min(Math.max(teacher.rating, 0), 5) * 20) : null
    const taskCompletion = taskSubmissions.length > 0 ? Math.round((gradedSubmissions.length / taskSubmissions.length) * 100) : null
    const attendanceRate = null
    const studentSatisfaction = ratingScore
    const values = [ratingScore, taskCompletion, attendanceRate, studentSatisfaction].filter(
      (value): value is number => typeof value === "number",
    )
    return {
      teachingScore: ratingScore,
      attendanceRate,
      taskCompletion,
      studentSatisfaction,
      overallScore: values.length > 0 ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null,
    }
  }, [gradedSubmissions.length, taskSubmissions.length, teacher])

  const formatPercent = (value: number | null) => (typeof value === "number" ? `${value}%` : "-")

  if (isLoading) {
    return <RouteLoading />
  }

  if (!staff) {
    return (
      <DashboardLayout role="SUPER_ADMIN" userName="" userAvatar="/placeholder-user.jpg">
        <div className="w-full max-w-4xl mx-auto">
          <GlassCard className="text-center py-12">
            <UserIcon className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-800">Staff tidak ditemukan</h2>
            <GlassButton className="mt-4" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </GlassButton>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      role="SUPER_ADMIN"
      userName={superAdmin?.name || ""}
      userAvatar={superAdmin?.avatar || "/placeholder-user.jpg"}
    >
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <GlassButton variant="secondary" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </GlassButton>

        <GlassCard className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img src={staff.avatar || "/placeholder-user.jpg"} alt={staff.name} className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200" />
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-slate-800">{staff.name}</h1>
              <p className="text-purple-600">{teacher ? `Guru ${teacher.subject}` : "Administrator"}</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{performanceData.overallScore ?? "-"}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Skor Kinerja</p>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GlassCard className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Mail className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="text-slate-800">{staff.email}</p>
            </div>
          </GlassCard>
          <GlassCard className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <Briefcase className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Role</p>
              <p className="text-slate-800">{teacher ? `Guru ${teacher.subject}` : "Admin"}</p>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-4">
            <BookOpen className="w-5 h-5 mx-auto mb-2 text-blue-500" />
            <p className="text-xl font-bold text-slate-800">{schedules.length}</p>
            <p className="text-xs text-slate-500">Jadwal Mengajar</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <ClipboardList className="w-5 h-5 mx-auto mb-2 text-purple-500" />
            <p className="text-xl font-bold text-slate-800">{tasks.length}</p>
            <p className="text-xs text-slate-500">Tugas Dibuat</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <Star className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
            <p className="text-xl font-bold text-slate-800">{teacher ? teacher.rating.toFixed(1) : "-"}</p>
            <p className="text-xs text-slate-500">Rating</p>
          </GlassCard>
        </div>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Metrik Kinerja
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-slate-800">{formatPercent(performanceData.teachingScore)}</p>
              <p className="text-xs text-slate-500">Kualitas Mengajar</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-slate-800">{formatPercent(performanceData.attendanceRate)}</p>
              <p className="text-xs text-slate-500">Kehadiran</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <ClipboardList className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold text-slate-800">{formatPercent(performanceData.taskCompletion)}</p>
              <p className="text-xs text-slate-500">Penyelesaian Tugas</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-slate-800">{formatPercent(performanceData.studentSatisfaction)}</p>
              <p className="text-xs text-slate-500">Kepuasan Siswa</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            Jadwal Mengajar
          </h2>

          {schedules.length === 0 ? (
            <EmptySkeleton rows={3} className="py-4" />
          ) : (
            <div className="space-y-2">
              {schedules.slice(0, 8).map((schedule) => {
                const classInfo = classes.find((item) => item.id === schedule.classId)
                return (
                  <div key={schedule.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{schedule.subject}</p>
                      <p className="text-xs text-slate-500">{classInfo?.name || schedule.classId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-slate-800">{schedule.day}</p>
                      <p className="text-xs text-slate-500">{schedule.startTime} - {schedule.endTime}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </DashboardLayout>
  )
}
