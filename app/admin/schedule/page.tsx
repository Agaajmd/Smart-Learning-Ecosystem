"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { Calendar, Plus, Edit, Trash2, BookOpen, User, MapPin, Search, Save, X, Users, Loader2 } from "lucide-react"

type Schedule = {
  id: string
  classId: string
  subject: string
  teacherId: string
  day: string
  startTime: string
  endTime: string
  room: string
}

type ClassRoom = { id: string; name: string }
type Teacher = { id: string; name: string }
type Student = { id: string; name: string; avatar: string }
type PiketSchedule = { id: string; classId: string; day: string; studentIds: string[] }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function AdminSchedulePage() {
  const [admin, setAdmin] = useState<{ name: string; avatar: string } | null>(null)
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [piketSchedules, setPiketSchedules] = useState<PiketSchedule[]>([])

  const [selectedDay, setSelectedDay] = useState("Monday")
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [scheduleToDelete, setScheduleToDelete] = useState<Schedule | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    classId: "",
    subject: "",
    teacherId: "",
    day: "Monday",
    startTime: "",
    endTime: "",
    room: "",
  })

  const load = async () => {
    const res = await fetch("/api/admin/schedule", { cache: "no-store" })
    if (!res.ok) throw new Error("Gagal memuat data jadwal")
    const data = await res.json()
    setAdmin(data.admin || null)
    setSchedules(Array.isArray(data.schedules) ? data.schedules : [])
    setClasses(Array.isArray(data.classes) ? data.classes : [])
    setTeachers(Array.isArray(data.teachers) ? data.teachers : [])
    setStudents(Array.isArray(data.students) ? data.students : [])
    setPiketSchedules(Array.isArray(data.piketSchedules) ? data.piketSchedules : [])
    setFormData((prev) => ({
      ...prev,
      classId: data.classes?.[0]?.id || "",
      teacherId: data.teachers?.[0]?.id || "",
    }))
  }

  useEffect(() => {
    load().catch(() => toast.error("Gagal memuat data"))
  }, [])

  const filteredSchedules = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return schedules
      .filter((s) => s.day === selectedDay)
      .filter((s) => !q || s.subject.toLowerCase().includes(q) || s.room.toLowerCase().includes(q))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [schedules, selectedDay, searchQuery])

  const getTeacherName = (teacherId: string) => teachers.find((t) => t.id === teacherId)?.name || "Unknown"
  const getClassName = (classId: string) => classes.find((c) => c.id === classId)?.name || "Unknown"

  const openCreate = () => {
    setEditingSchedule(null)
    setFormData({
      classId: classes[0]?.id || "",
      subject: "",
      teacherId: teachers[0]?.id || "",
      day: selectedDay,
      startTime: "",
      endTime: "",
      room: "",
    })
    setShowModal(true)
  }

  const openEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule)
    setFormData({
      classId: schedule.classId,
      subject: schedule.subject,
      teacherId: schedule.teacherId,
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!formData.classId || !formData.subject || !formData.teacherId || !formData.startTime || !formData.endTime || !formData.room) {
      toast.error("Semua field wajib diisi")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/admin/schedule", {
        method: editingSchedule ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingSchedule ? { ...formData, id: editingSchedule.id } : formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menyimpan jadwal")

      if (editingSchedule) {
        setSchedules((prev) => prev.map((item) => (item.id === editingSchedule.id ? data.schedule : item)))
      } else {
        setSchedules((prev) => [...prev, data.schedule])
      }

      toast.success(editingSchedule ? "Jadwal berhasil diperbarui" : "Jadwal berhasil ditambahkan")
      setShowModal(false)
      setEditingSchedule(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan jadwal")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!scheduleToDelete) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/schedule?id=${scheduleToDelete.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus jadwal")
      setSchedules((prev) => prev.filter((item) => item.id !== scheduleToDelete.id))
      setShowDeleteModal(false)
      setScheduleToDelete(null)
      toast.success("Jadwal berhasil dihapus")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus jadwal")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!admin) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Manajemen Jadwal</h1>
            <p className="text-sm text-slate-500">Kelola jadwal pelajaran untuk semua kelas</p>
          </div>
          <GlassButton onClick={openCreate} className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4 mr-2" />
            Tambah Jadwal
          </GlassButton>
        </div>

        <GlassCard className="border-l-4 border-l-purple-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-100 rounded-xl"><Users className="w-5 h-5 text-purple-600" /></div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Piket Hari Ini</h2>
              <p className="text-sm text-slate-500">Siswa yang bertugas pada {selectedDay}</p>
            </div>
          </div>
          <div className="space-y-3">
            {piketSchedules
              .filter((piket) => piket.day === selectedDay)
              .map((piket) => (
                <div key={piket.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="mb-2"><span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{getClassName(piket.classId)}</span></div>
                  <div className="flex flex-wrap gap-2">
                    {piket.studentIds
                      .map((id) => students.find((student) => student.id === id))
                      .filter(Boolean)
                      .map((student) => (
                        <div key={student!.id} className="flex items-center gap-2 px-2 py-1 bg-white rounded-lg border border-slate-200">
                          <img src={student!.avatar || "/placeholder-user.jpg"} alt={student!.name} className="w-6 h-6 rounded-full object-cover" />
                          <span className="text-sm text-slate-700">{student!.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </GlassCard>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {DAYS.map((day) => (
            <button key={day} onClick={() => setSelectedDay(day)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedDay === day ? "bg-purple-500 text-white shadow-lg" : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"}`}>
              {day}
            </button>
          ))}
        </div>

        <GlassCard className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <GlassInput placeholder="Cari mata pelajaran atau ruangan..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            Jadwal {selectedDay} ({filteredSchedules.length})
          </h2>
          <div className="space-y-3">
            {filteredSchedules.map((schedule) => (
              <div key={schedule.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 gap-3">
                <div className="flex items-start gap-4">
                  <div className="text-center min-w-[60px]"><p className="text-lg font-bold text-slate-800">{schedule.startTime}</p><p className="text-xs text-slate-400">{schedule.endTime}</p></div>
                  <div>
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-500" />{schedule.subject}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-2 mt-1"><User className="w-3 h-3" />{getTeacherName(schedule.teacherId)}</p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{schedule.room}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{getClassName(schedule.classId)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 sm:flex-col">
                  <GlassButton size="sm" onClick={() => openEdit(schedule)} className="flex-1 sm:flex-none justify-center"><Edit className="w-4 h-4" /></GlassButton>
                  <GlassButton size="sm" variant="danger" onClick={() => { setScheduleToDelete(schedule); setShowDeleteModal(true) }} className="flex-1 sm:flex-none justify-center"><Trash2 className="w-4 h-4" /></GlassButton>
                </div>
              </div>
            ))}
            {filteredSchedules.length === 0 && <EmptySkeleton rows={3} className="py-4" />}
          </div>
        </GlassCard>

        <GlassModal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSchedule ? "Edit Jadwal" : "Tambah Jadwal Baru"}>
          <div className="space-y-4">
            <select value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <GlassInput placeholder="Mata pelajaran" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} />
            <select value={formData.teacherId} onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
              {teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <select value={formData.day} onChange={(e) => setFormData({ ...formData, day: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white">
              {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <GlassInput type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} />
              <GlassInput type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} />
            </div>
            <GlassInput placeholder="Ruangan" value={formData.room} onChange={(e) => setFormData({ ...formData, room: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
            <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowModal(false)} disabled={isSubmitting}><X className="w-4 h-4 mr-2" />Batal</GlassButton>
            <GlassButton className="flex-1 justify-center" onClick={handleSave} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Simpan</GlassButton>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Jadwal">
          <p className="text-sm text-slate-600">Yakin ingin menghapus jadwal ini?</p>
          <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
            <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowDeleteModal(false)} disabled={isSubmitting}>Batal</GlassButton>
            <GlassButton variant="danger" className="flex-1 justify-center" onClick={handleDelete} disabled={isSubmitting}>{isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}Hapus</GlassButton>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
