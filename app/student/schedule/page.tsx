"use client"

import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import { RouteLoading } from "@/components/templates/route-loading"
import { Clock, MapPin, User, Calendar as CalendarIcon, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

const dayMap = [
  { id: "Monday", label: "Senin" },
  { id: "Tuesday", label: "Selasa" },
  { id: "Wednesday", label: "Rabu" },
  { id: "Thursday", label: "Kamis" },
  { id: "Friday", label: "Jumat" },
]

export default function StudentSchedule() {
  const [student, setStudent] = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [teachers, setTeachers] = useState<Record<string, string>>({})
  const [selectedDay, setSelectedDay] = useState("Monday")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/student/overview", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        setStudent(data.student || null)
        setSchedules(Array.isArray(data.schedules) ? data.schedules : [])
        const nextTeachers: Record<string, string> = {}
        if (data.teacher?.id) {
          nextTeachers[data.teacher.id] = data.teacher.name
        }
        setTeachers(nextTeachers)
      } catch {
        setStudent(null)
      }
    }

    load()
  }, [])

  const daySchedule = useMemo(
    () =>
      schedules
        .filter((s) => s.day === selectedDay)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [schedules, selectedDay],
  )

  if (!student) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jadwal Pelajaran</h1>
          <p className="text-slate-500">Jadwal kelas minggu ini</p>
        </div>

        {/* Day Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {dayMap.map((day) => (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                selectedDay === day.id
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/25 scale-105"
                  : "bg-white/80 backdrop-blur-sm text-slate-600 hover:bg-white hover:text-slate-800 hover:shadow-md"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>

        {/* Schedule List */}
        <div className="space-y-3">
          {daySchedule.length === 0 ? (
            <GlassCard>
              <EmptySkeleton rows={3} className="py-4" />
            </GlassCard>
          ) : (
            daySchedule.map((schedule, index) => {
              const teacherName = teachers[schedule.teacherId] || "TBA"
              return (
                <GlassCard
                  key={schedule.id}
                  hover
                  className="group animate-in slide-in-from-bottom-2 fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start gap-3">
                    {/* Time Badge */}
                    <div className="flex-shrink-0 text-center">
                      <div className="px-3 py-2 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                        <Clock className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-xs font-bold text-blue-600">{schedule.startTime}</p>
                        <p className="text-[10px] text-blue-400">{schedule.endTime}</p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                        {schedule.subject}
                      </h3>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <User className="w-3.5 h-3.5" />
                          <span>{teacherName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{schedule.room}</span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </GlassCard>
              )
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
