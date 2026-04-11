"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { 
  mockEmployees, 
  mockClasses,
  mockSchedule,
  mockTasks,
  mockTaskSubmissions,
} from "@/lib/mock-data"
import { 
  ArrowLeft,
  User,
  Mail,
  Briefcase,
  BookOpen,
  ClipboardList,
  CheckCircle,
  TrendingUp,
  Star,
  Clock,
  Award
} from "lucide-react"

interface ClientPageProps {
  id: string
}

export default function StaffDetailClient({ id }: ClientPageProps) {
  const router = useRouter()
  const staff = useMemo(() => mockEmployees.find((employee) => employee.id === id), [id])

  if (!staff) {
    return (
      <DashboardLayout role="SUPER_ADMIN" userName="Kepala Sekolah" userAvatar="/placeholder.svg">
        <div className="w-full max-w-4xl mx-auto">
          <GlassCard className="text-center py-12">
            <User className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold text-slate-800">Staff tidak ditemukan</h2>
            <GlassButton
              className="mt-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Kembali
            </GlassButton>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  // Calculate performance metrics
  const staffSchedules = useMemo(() => mockSchedule.filter((schedule) => schedule.teacherId === staff.id), [staff.id])
  const staffTasks = useMemo(() => mockTasks.filter((task) => task.teacherId === staff.id), [staff.id])
  const staffTaskSubmissions = useMemo(() => {
    const taskIds = new Set(staffTasks.map((task) => task.id))
    return mockTaskSubmissions.filter((submission) => taskIds.has(submission.taskId))
  }, [staffTasks])
  const gradedSubmissions = useMemo(
    () => staffTaskSubmissions.filter((submission) => submission.status === "GRADED"),
    [staffTaskSubmissions],
  )
  const homeroomClass = useMemo(
    () => (staff.homeroomClassId ? mockClasses.find((item) => item.id === staff.homeroomClassId) : null),
    [staff.homeroomClassId],
  )

  // Mock performance data
  const performanceData = useMemo(
    () => ({
      teachingScore: 85,
      attendanceRate: 95,
      taskCompletion:
        staffTaskSubmissions.length > 0
          ? Math.round((gradedSubmissions.length / staffTaskSubmissions.length) * 100)
          : 92,
      studentSatisfaction: 88,
      overallScore: 90,
    }),
    [staffTaskSubmissions.length, gradedSubmissions.length],
  )

  const performanceHistory = [
    { month: "Jan", score: 85 },
    { month: "Feb", score: 88 },
    { month: "Mar", score: 86 },
    { month: "Apr", score: 90 },
    { month: "Mei", score: 92 },
    { month: "Jun", score: 90 },
  ]

  const achievements = [
    { title: "Guru Terbaik Bulan Ini", date: "Mei 2024", icon: Award },
    { title: "100% Kehadiran Q1", date: "Mar 2024", icon: CheckCircle },
    { title: "Inovasi Pembelajaran", date: "Feb 2024", icon: Star },
  ]

  return (
    <DashboardLayout role="SUPER_ADMIN" userName="Kepala Sekolah" userAvatar="/placeholder.svg">
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Back Button */}
        <GlassButton
          variant="secondary"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Kembali
        </GlassButton>

        {/* Profile Header */}
        <GlassCard className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <img
              src={staff.avatar}
              alt={staff.name}
              className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-200"
            />
            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold text-slate-800">{staff.name}</h1>
              <p className="text-purple-600">Guru {staff.subject}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                <span className="px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600">
                  {staff.subject}
                </span>
                {homeroomClass && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    Wali Kelas {homeroomClass.name}
                  </span>
                )}
              </div>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{performanceData.overallScore}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Skor Kinerja</p>
            </div>
          </div>
        </GlassCard>

        {/* Contact Info */}
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
              <p className="text-xs text-slate-500">Mata Pelajaran</p>
              <p className="text-slate-800">{staff.subject}</p>
            </div>
          </GlassCard>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-4">
            <BookOpen className="w-5 h-5 mx-auto mb-2 text-blue-500" />
            <p className="text-xl font-bold text-slate-800">{staffSchedules.length}</p>
            <p className="text-xs text-slate-500">Jadwal Mengajar</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <ClipboardList className="w-5 h-5 mx-auto mb-2 text-purple-500" />
            <p className="text-xl font-bold text-slate-800">{staffTasks.length}</p>
            <p className="text-xs text-slate-500">Tugas Dibuat</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <Star className="w-5 h-5 mx-auto mb-2 text-yellow-500" />
            <p className="text-xl font-bold text-slate-800">{staff.rating.toFixed(1)}</p>
            <p className="text-xs text-slate-500">Rating</p>
          </GlassCard>
        </div>

        {/* Performance Metrics */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-500" />
            Metrik Kinerja
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-slate-800">{performanceData.teachingScore}%</p>
              <p className="text-xs text-slate-500">Kualitas Mengajar</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-slate-800">{performanceData.attendanceRate}%</p>
              <p className="text-xs text-slate-500">Kehadiran</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <ClipboardList className="w-6 h-6 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold text-slate-800">{performanceData.taskCompletion}%</p>
              <p className="text-xs text-slate-500">Penyelesaian Tugas</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl text-center">
              <Star className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-slate-800">{performanceData.studentSatisfaction}%</p>
              <p className="text-xs text-slate-500">Kepuasan Siswa</p>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <p className="text-sm text-slate-600 mb-3">Perkembangan Kinerja 6 Bulan Terakhir</p>
            <div className="flex items-end justify-between h-32 gap-2">
              {performanceHistory.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-gradient-to-t from-purple-500 to-blue-500 rounded-t-lg transition-all"
                    style={{ height: `${item.score}%` }}
                  />
                  <p className="text-xs text-slate-500 mt-2">{item.month}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Achievements */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Penghargaan
          </h2>

          <div className="space-y-3">
            {achievements.map((achievement, index) => {
              const AchievementIcon = achievement.icon
              return (
                <div 
                  key={index}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                >
                  <div className="p-2 bg-yellow-100 rounded-xl">
                    <AchievementIcon className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800">{achievement.title}</h4>
                    <p className="text-xs text-slate-500">{achievement.date}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Teaching Schedule */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            Jadwal Mengajar
          </h2>

          {staffSchedules.length === 0 ? (
            <p className="text-center text-slate-500 py-4">Belum ada jadwal mengajar</p>
          ) : (
            <div className="space-y-2">
              {staffSchedules.slice(0, 5).map(schedule => {
                const classInfo = mockClasses.find(c => c.id === schedule.classId)
                return (
                  <div 
                    key={schedule.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{schedule.subject}</p>
                        <p className="text-xs text-slate-500">{classInfo?.name || schedule.classId}</p>
                      </div>
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
