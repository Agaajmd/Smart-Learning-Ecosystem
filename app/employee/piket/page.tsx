"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/molecules/glass-card"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { CalendarDays, Plus, Edit, Trash2, Users, Save } from "lucide-react"

type PiketSchedule = { id: string; classId: string; day: string; studentIds: string[]; createdBy: string }
type Employee = { id: string; homeroomClassId?: string }
type ClassRoom = { id: string; name: string }
type Student = { id: string; name: string; classId: string }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const DAY_LABELS: Record<string, string> = { Monday: "Senin", Tuesday: "Selasa", Wednesday: "Rabu", Thursday: "Kamis", Friday: "Jumat", Saturday: "Sabtu" }

export default function TeacherPiketPage() {
  const [teacher, setTeacher] = useState<Employee>({ id: "" })
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [piketSchedules, setPiketSchedules] = useState<PiketSchedule[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<PiketSchedule | null>(null)
  const [selectedDay, setSelectedDay] = useState("Monday")
  const [form, setForm] = useState({ day: "Monday", studentIds: [] as string[] })

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/employee/context", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      const nextTeacher = data.employee || { id: "" }
      const nextStudents: Student[] = Array.isArray(data.students) ? data.students : []
      const nextSchedules: PiketSchedule[] = Array.isArray(data.piketSchedules) ? data.piketSchedules : []
      setTeacher(nextTeacher)
      setClasses(Array.isArray(data.classes) ? data.classes : [])
      setStudents(nextStudents)
      setPiketSchedules(nextSchedules.filter((item) => item.classId === nextTeacher.homeroomClassId))
    }
    load().catch(() => {})
  }, [])

  const homeroomClass = useMemo(() => classes.find((c) => c.id === teacher.homeroomClassId), [classes, teacher.homeroomClassId])
  const classStudents = useMemo(() => students.filter((s) => s.classId === teacher.homeroomClassId), [students, teacher.homeroomClassId])
  const schedulesForDay = useMemo(() => piketSchedules.filter((p) => p.day === selectedDay), [piketSchedules, selectedDay])

  const handleOpenCreate = () => { setEditingSchedule(null); setForm({ day: selectedDay, studentIds: [] }); setShowModal(true) }
  const handleOpenEdit = (schedule: PiketSchedule) => { setEditingSchedule(schedule); setForm({ day: schedule.day, studentIds: schedule.studentIds }); setShowModal(true) }

  const handleSave = () => {
    if (form.studentIds.length === 0) {
      toast.error("Pilih minimal 1 siswa")
      return
    }

    if (editingSchedule) {
      setPiketSchedules((prev) => prev.map((item) => (item.id === editingSchedule.id ? { ...item, day: form.day, studentIds: form.studentIds } : item)))
      toast.success("Jadwal piket berhasil diperbarui")
    } else {
      const newSchedule: PiketSchedule = {
        id: `pk-${Date.now()}`,
        classId: teacher.homeroomClassId || "",
        day: form.day,
        studentIds: form.studentIds,
        createdBy: teacher.id,
      }
      setPiketSchedules((prev) => [...prev, newSchedule])
      toast.success("Jadwal piket berhasil ditambahkan")
    }
    setShowModal(false)
  }

  const handleDelete = (id: string) => {
    setPiketSchedules((prev) => prev.filter((item) => item.id !== id))
    toast.success("Jadwal piket berhasil dihapus")
  }

  const toggleStudent = (studentId: string) => {
    setForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter((id) => id !== studentId)
        : [...prev.studentIds, studentId],
    }))
  }

  const getStudentName = (studentId: string) => classStudents.find((s) => s.id === studentId)?.name || "Unknown"

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Jadwal Piket</h1>
          <p className="text-sm text-slate-500">{homeroomClass ? `Wali Kelas ${homeroomClass.name}` : "Kelola jadwal piket siswa"}</p>
        </div>
        <GlassButton onClick={handleOpenCreate} className="w-full sm:w-auto justify-center"><Plus className="w-4 h-4 mr-2" />Tambah Piket</GlassButton>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {DAYS.map((day) => (
          <button key={day} onClick={() => setSelectedDay(day)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${selectedDay === day ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            {DAY_LABELS[day]}
          </button>
        ))}
      </div>

      <GlassCard>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Jadwal Piket - {DAY_LABELS[selectedDay]}</h2>
        {schedulesForDay.length === 0 ? (
          <EmptySkeleton rows={3} className="py-4" />
        ) : (
          <div className="space-y-3">
            {schedulesForDay.map((schedule) => (
              <div key={schedule.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1"><div className="p-2 rounded-xl bg-blue-100"><Users className="w-5 h-5 text-blue-600" /></div><div className="flex-1"><h3 className="font-semibold text-slate-800">Piket Kelas</h3><div className="flex flex-wrap gap-2 mt-2">{schedule.studentIds.map((studentId) => <span key={studentId} className="px-2 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs">{getStudentName(studentId)}</span>)}</div></div></div>
                  <div className="flex gap-2"><GlassButton size="sm" onClick={() => handleOpenEdit(schedule)}><Edit className="w-4 h-4" /></GlassButton><GlassButton size="sm" variant="danger" onClick={() => handleDelete(schedule.id)}><Trash2 className="w-4 h-4" /></GlassButton></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassModal isOpen={showModal} onClose={() => setShowModal(false)} title={editingSchedule ? "Edit Jadwal Piket" : "Tambah Jadwal Piket"}>
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Hari</label>
            <div className="grid grid-cols-3 gap-2">
              {DAYS.map((day) => (
                <button key={day} onClick={() => setForm({ ...form, day })} className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${form.day === day ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Pilih Siswa ({form.studentIds.length} dipilih)</label>
            <div className="max-h-48 overflow-y-auto space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              {classStudents.map((student) => (
                <button key={student.id} onClick={() => toggleStudent(student.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${form.studentIds.includes(student.id) ? "bg-blue-50 border-2 border-blue-500" : "bg-white border border-slate-200 hover:border-slate-300"}`}>
                  <span className="text-sm font-medium text-slate-800">{student.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowModal(false)}>Batal</GlassButton>
            <GlassButton className="flex-1 justify-center" onClick={handleSave}><Save className="w-4 h-4 mr-2" />Simpan</GlassButton>
          </div>
        </div>
      </GlassModal>
    </div>
  )
}
