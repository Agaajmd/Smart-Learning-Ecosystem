"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import { RouteLoading } from "@/components/templates/route-loading"
import type { Student } from "@/lib/data-model"
import { Clock, MapPin, User, Calendar as CalendarIcon, ChevronRight, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

const dayMap = [
  { id: "Monday", label: "Senin" },
  { id: "Tuesday", label: "Selasa" },
  { id: "Wednesday", label: "Rabu" },
  { id: "Thursday", label: "Kamis" },
  { id: "Friday", label: "Jumat" },
]

const dayAliases: Record<string, string[]> = {
  monday: ["monday", "senin", "mon", "sen"],
  tuesday: ["tuesday", "selasa", "tue", "sel"],
  wednesday: ["wednesday", "rabu", "wed", "rab"],
  thursday: ["thursday", "kamis", "thu", "kam"],
  friday: ["friday", "jumat", "jum'at", "fri", "jum"],
}

const normalizeDay = (value: unknown) => String(value || "").trim().toLowerCase()

export default function ParentSchedule() {
  const [parent, setParent] = useState<any>(null)
  const [children, setChildren] = useState<Student[]>([])
  const [selectedChild, setSelectedChild] = useState<Student | null>(null)
  const [childClass, setChildClass] = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState("Monday")

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
      setSchedules(Array.isArray(data.schedules) ? data.schedules : [])
      setTeachers(Array.isArray(data.teachers) ? data.teachers : [])
    }

    load()
  }, [selectedChild?.id])

  const daySchedule = useMemo(
    () => {
      const selectedAliases = new Set(dayAliases[normalizeDay(selectedDay)] || [])
      return schedules
        .filter((schedule) => selectedAliases.has(normalizeDay(schedule.day)))
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    },
    [schedules, selectedDay],
  )

  if (!parent || !selectedChild) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jadwal Pelajaran</h1>
          <p className="text-slate-500">Jadwal kelas anak Anda</p>
        </div>

        {/* Child Selector */}
        {children.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all min-w-fit",
                  selectedChild?.id === child.id
                    ? "border-pink-500 bg-pink-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <img src={child.avatar} alt={child.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="text-left">
                  <p className="font-medium text-slate-800">{child.name}</p>
                  <p className="text-xs text-slate-500">{child.id === selectedChild.id ? childClass?.name || child.classId : child.classId}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Current Child Info */}
        <GlassCard className="bg-gradient-to-r from-pink-50 to-rose-50 border-pink-100">
          <div className="flex items-center gap-3">
            <img 
              src={selectedChild.avatar} 
              alt={selectedChild.name} 
              className="w-12 h-12 rounded-full object-cover ring-2 ring-pink-200"
            />
            <div>
              <p className="font-semibold text-slate-800">{selectedChild.name}</p>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <GraduationCap className="w-4 h-4" />
                <span>{childClass?.name || "Kelas tidak ditemukan"}</span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Day Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {dayMap.map((day) => (
            <button
              key={day.id}
              onClick={() => setSelectedDay(day.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-300 ${
                selectedDay === day.id
                  ? "bg-pink-500 text-white shadow-lg shadow-pink-500/25 scale-105"
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
              const teacher = teachers.find((item) => item.id === schedule.teacherId)
              return (
                <GlassCard
                  key={schedule.id}
                  hover
                  className="group"
                >
                  <div className="flex items-start gap-3">
                    {/* Time Badge */}
                    <div className="flex-shrink-0 text-center">
                      <div className="px-3 py-2 bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-100">
                        <Clock className="w-4 h-4 text-pink-500 mx-auto mb-1" />
                        <p className="text-xs font-bold text-pink-600">{schedule.startTime}</p>
                        <p className="text-[10px] text-pink-400">{schedule.endTime}</p>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 mb-1 group-hover:text-pink-600 transition-colors">
                        {schedule.subject}
                      </h3>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <User className="w-3.5 h-3.5" />
                          <span>{teacher?.name || "TBA"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{schedule.room}</span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-pink-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </GlassCard>
              )
            })
          )}
        </div>

        {/* Summary */}
        <GlassCard className="text-center">
          <p className="text-sm text-slate-500">
            Total <span className="font-semibold text-slate-700">{daySchedule.length}</span> mata pelajaran hari {dayMap.find(d => d.id === selectedDay)?.label}
          </p>
        </GlassCard>
      </div>
    </DashboardLayout>
  )
}
