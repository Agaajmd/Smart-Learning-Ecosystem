"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { toast } from "sonner"
import {
  Calendar,
  MapPin,
  BookOpen,
  Search,
  Users,
  Briefcase,
  Shield,
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Save,
  X,
} from "lucide-react"

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
type Teacher = { id: string; name: string; subject?: string; avatar?: string; homeroomClassId?: string }
type AdminUser = { id: string; name: string; email: string; avatar?: string }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export default function SuperAdminSchedulePage() {
  const [superAdmin, setSuperAdmin] = useState<{ name: string; avatar: string } | null>(null)
  const [selectedDay, setSelectedDay] = useState("Monday")
  const [searchQuery, setSearchQuery] = useState("")
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [form, setForm] = useState({
    classId: "",
    subject: "",
    teacherId: "",
    day: "Monday",
    startTime: "",
    endTime: "",
    room: "",
  })

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/super-admin/schedule", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      if (data.superAdmin) setSuperAdmin(data.superAdmin)
      setSchedules(Array.isArray(data.schedules) ? data.schedules : [])
      setClasses(Array.isArray(data.classes) ? data.classes : [])
      setTeachers(Array.isArray(data.teachers) ? data.teachers : [])
      setAdmins(Array.isArray(data.admins) ? data.admins : [])
    }

    load()
      .catch(() => {
        // Keep fallback values.
      })
      .finally(() => setIsLoading(false))
  }, [])

  const filteredSchedules = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return schedules
      .filter((schedule) => schedule.day === selectedDay)
      .filter((schedule) => {
        if (!query) return true
        const teacher = teachers.find((item) => item.id === schedule.teacherId)
        return (
          schedule.subject.toLowerCase().includes(query) ||
          schedule.room.toLowerCase().includes(query) ||
          (teacher?.name || "").toLowerCase().includes(query)
        )
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [schedules, selectedDay, searchQuery, teachers])

  const resetForm = () => {
    setForm({
      classId: classes[0]?.id || "",
      subject: "",
      teacherId: teachers[0]?.id || "",
      day: selectedDay,
      startTime: "",
      endTime: "",
      room: "",
    })
    setEditingId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowFormModal(true)
  }

  const openEditModal = (schedule: Schedule) => {
    setEditingId(schedule.id)
    setForm({
      classId: schedule.classId,
      subject: schedule.subject,
      teacherId: schedule.teacherId,
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room,
    })
    setShowFormModal(true)
  }

  const submitForm = async () => {
    if (!form.classId || !form.subject || !form.teacherId || !form.day || !form.startTime || !form.endTime || !form.room) {
      toast.error("Semua field wajib diisi")
      return
    }

    setIsMutating(true)
    try {
      const res = await fetch("/api/super-admin/schedule", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menyimpan jadwal")

      const next = data.schedule as Schedule
      if (editingId) {
        setSchedules((prev) => prev.map((item) => (item.id === editingId ? next : item)))
        toast.success("Jadwal berhasil diperbarui")
      } else {
        setSchedules((prev) => [...prev, next])
        toast.success("Jadwal berhasil ditambahkan")
      }
      setShowFormModal(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan jadwal")
    } finally {
      setIsMutating(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingId) return
    setIsMutating(true)
    try {
      const res = await fetch(`/api/super-admin/schedule?id=${deletingId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus jadwal")
      setSchedules((prev) => prev.filter((item) => item.id !== deletingId))
      toast.success("Jadwal berhasil dihapus")
      setShowDeleteModal(false)
      setDeletingId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus jadwal")
    } finally {
      setIsMutating(false)
    }
  }

  const schedulesByTeacher = useMemo(() => {
    return teachers
      .map((teacher) => ({
        teacher,
        schedules: filteredSchedules.filter((schedule) => schedule.teacherId === teacher.id),
      }))
      .filter((item) => item.schedules.length > 0)
  }, [teachers, filteredSchedules])

  const getClassName = (classId: string) => classes.find((item) => item.id === classId)?.name || "Unknown"

  if (isLoading) {
    return <RouteLoading />
  }

  if (!superAdmin) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={superAdmin.name} userAvatar={superAdmin.avatar}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Jadwal Harian</h1>
            <p className="text-sm text-slate-500">Lihat seluruh jadwal guru dan admin hari ini</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-purple-100 rounded-xl">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-700">{selectedDay}</span>
            </div>
            <GlassButton onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah
            </GlassButton>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-4"><div className="w-10 h-10 mx-auto mb-2 bg-blue-100 rounded-xl flex items-center justify-center"><Briefcase className="w-5 h-5 text-blue-600" /></div><p className="text-2xl font-bold text-slate-800">{schedulesByTeacher.length}</p><p className="text-xs text-slate-500">Guru Aktif</p></GlassCard>
          <GlassCard className="text-center py-4"><div className="w-10 h-10 mx-auto mb-2 bg-green-100 rounded-xl flex items-center justify-center"><GraduationCap className="w-5 h-5 text-green-600" /></div><p className="text-2xl font-bold text-slate-800">{filteredSchedules.length}</p><p className="text-xs text-slate-500">Kelas Hari Ini</p></GlassCard>
          <GlassCard className="text-center py-4"><div className="w-10 h-10 mx-auto mb-2 bg-orange-100 rounded-xl flex items-center justify-center"><Shield className="w-5 h-5 text-orange-600" /></div><p className="text-2xl font-bold text-slate-800">{admins.length}</p><p className="text-xs text-slate-500">Admin Aktif</p></GlassCard>
        </div>

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
            <GlassInput placeholder="Cari guru, mata pelajaran, atau ruangan..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-10" />
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-purple-500" />Jadwal Guru ({schedulesByTeacher.length} guru aktif)</h2>
          <div className="space-y-4">
            {schedulesByTeacher.map(({ teacher, schedules: teacherSchedules }) => (
              <div key={teacher.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-slate-200">
                  <img src={teacher.avatar || "/placeholder-user.jpg"} alt={teacher.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{teacher.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500">{teacher.subject || "-"}</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">{teacherSchedules.length} kelas</span>
                      {teacher.homeroomClassId && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Wali Kelas</span>}
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  {teacherSchedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-slate-100">
                      <div className="text-center min-w-[50px] px-2 py-1 bg-purple-50 rounded-lg"><p className="text-sm font-bold text-purple-700">{schedule.startTime}</p><p className="text-[10px] text-purple-500">{schedule.endTime}</p></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-700 text-sm flex items-center gap-1.5 truncate"><BookOpen className="w-3 h-3 text-blue-500 shrink-0" />{schedule.subject}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className="text-xs text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{schedule.room}</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{getClassName(schedule.classId)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(schedule)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                        >
                          <Edit className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingId(schedule.id)
                            setShowDeleteModal(true)
                          }}
                          className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-orange-500" />Admin Staff Bertugas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {admins.map((admin) => (
              <div key={admin.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <img src={admin.avatar || "/placeholder-user.jpg"} alt={admin.name} className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow" />
                <div className="flex-1"><p className="font-medium text-slate-800 text-sm">{admin.name}</p><p className="text-xs text-slate-500">{admin.email}</p></div>
                <div className="px-2 py-1 bg-green-100 rounded-full"><span className="text-xs text-green-700 font-medium">Aktif</span></div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassModal
          isOpen={showFormModal}
          onClose={() => {
            setShowFormModal(false)
            resetForm()
          }}
          title={editingId ? "Edit Jadwal" : "Tambah Jadwal"}
        >
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <select
                value={form.classId}
                onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800"
              >
                <option value="">Pilih Kelas</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                value={form.teacherId}
                onChange={(event) => setForm((prev) => ({ ...prev, teacherId: event.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800"
              >
                <option value="">Pilih Guru</option>
                {teachers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <GlassInput
              placeholder="Mata pelajaran"
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            />

            <div className="grid sm:grid-cols-3 gap-3">
              <select
                value={form.day}
                onChange={(event) => setForm((prev) => ({ ...prev, day: event.target.value }))}
                className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800"
              >
                {DAYS.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
              <GlassInput
                type="time"
                value={form.startTime}
                onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
              />
              <GlassInput
                type="time"
                value={form.endTime}
                onChange={(event) => setForm((prev) => ({ ...prev, endTime: event.target.value }))}
              />
            </div>

            <GlassInput
              placeholder="Ruangan"
              value={form.room}
              onChange={(event) => setForm((prev) => ({ ...prev, room: event.target.value }))}
            />

            <div className="flex gap-3 pt-2">
              <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowFormModal(false)} disabled={isMutating}>
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton className="flex-1 justify-center" onClick={submitForm} disabled={isMutating}>
                {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Jadwal">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Jadwal yang dipilih akan dihapus permanen. Lanjutkan?</p>
            <div className="flex gap-3">
              <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowDeleteModal(false)} disabled={isMutating}>
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton variant="danger" className="flex-1 justify-center" onClick={confirmDelete} disabled={isMutating}>
                {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Hapus
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
