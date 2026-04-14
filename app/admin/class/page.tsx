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
import { Edit2, GraduationCap, Loader2, Plus, School, Search, Trash2, Users } from "lucide-react"
import { cn } from "@/lib/utils"

type ClassRoom = {
  id: string
  name: string
  grade: string
  rows: number
  cols: number
  teacherId: string
}

type Student = {
  id: string
  name: string
  email: string
  classId: string
}

type ClassFormState = {
  name: string
  grade: string
  rows: number
  cols: number
  teacherId: string
}

type StudentFormState = {
  id: string
  name: string
  email: string
  password: string
}

const EMPTY_CLASS_FORM: ClassFormState = {
  name: "",
  grade: "",
  rows: 5,
  cols: 5,
  teacherId: "",
}

const EMPTY_STUDENT_FORM: StudentFormState = {
  id: "",
  name: "",
  email: "",
  password: "",
}

export default function AdminClassManagement() {
  const [admin, setAdmin] = useState<any>(null)
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [searchClass, setSearchClass] = useState("")
  const [searchStudent, setSearchStudent] = useState("")
  const [activeClassId, setActiveClassId] = useState("")

  const [showCreateClassModal, setShowCreateClassModal] = useState(false)
  const [showEditClassModal, setShowEditClassModal] = useState(false)
  const [showDeleteClassModal, setShowDeleteClassModal] = useState(false)
  const [selectedClass, setSelectedClass] = useState<ClassRoom | null>(null)
  const [classForm, setClassForm] = useState<ClassFormState>(EMPTY_CLASS_FORM)

  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [studentForm, setStudentForm] = useState<StudentFormState>(EMPTY_STUDENT_FORM)

  const [isMutatingClass, setIsMutatingClass] = useState(false)
  const [isMutatingStudent, setIsMutatingStudent] = useState(false)

  const load = async () => {
    const res = await fetch("/api/admin/classes", { cache: "no-store" })
    if (!res.ok) throw new Error("Gagal memuat data kelas")
    const data = await res.json()
    setAdmin(data.admin || null)
    setClasses(Array.isArray(data.classes) ? data.classes : [])
    const nextStudents = Array.isArray(data.students) ? data.students : []
    setStudents(nextStudents)
    if (!activeClassId && data.classes?.[0]?.id) {
      setActiveClassId(data.classes[0].id)
    }
  }

  useEffect(() => {
    load().catch(() => toast.error("Gagal memuat data"))
  }, [])

  const filteredClasses = useMemo(() => {
    const query = searchClass.toLowerCase()
    return classes.filter((cls) => cls.name.toLowerCase().includes(query) || cls.grade.toLowerCase().includes(query))
  }, [classes, searchClass])

  const studentsInActiveClass = useMemo(() => {
    if (!activeClassId) return []
    const query = searchStudent.toLowerCase()
    return students.filter(
      (student) =>
        student.classId === activeClassId &&
        (student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query)),
    )
  }, [students, activeClassId, searchStudent])

  const getStudentCount = (classId: string) => students.filter((student) => student.classId === classId).length

  const resetClassForm = () => setClassForm(EMPTY_CLASS_FORM)

  const handleCreateClass = async () => {
    if (!classForm.name || !classForm.grade) {
      toast.error("Nama dan grade kelas wajib diisi")
      return
    }

    setIsMutatingClass(true)
    try {
      const res = await fetch("/api/admin/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal membuat kelas")

      setClasses((prev) => [...prev, data.classItem])
      setActiveClassId(data.classItem.id)
      setShowCreateClassModal(false)
      resetClassForm()
      toast.success("Kelas berhasil dibuat")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat kelas")
    } finally {
      setIsMutatingClass(false)
    }
  }

  const openEditClassModal = (classItem: ClassRoom) => {
    setSelectedClass(classItem)
    setClassForm({
      name: classItem.name,
      grade: classItem.grade,
      rows: classItem.rows,
      cols: classItem.cols,
      teacherId: classItem.teacherId,
    })
    setShowEditClassModal(true)
  }

  const handleUpdateClass = async () => {
    if (!selectedClass) return
    setIsMutatingClass(true)
    try {
      const res = await fetch(`/api/admin/classes/${selectedClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(classForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal update kelas")

      setClasses((prev) => prev.map((item) => (item.id === selectedClass.id ? data.classItem : item)))
      setShowEditClassModal(false)
      setSelectedClass(null)
      resetClassForm()
      toast.success("Kelas berhasil diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal update kelas")
    } finally {
      setIsMutatingClass(false)
    }
  }

  const handleDeleteClass = async () => {
    if (!selectedClass) return
    setIsMutatingClass(true)
    try {
      const res = await fetch(`/api/admin/classes/${selectedClass.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus kelas")

      const deletedId = selectedClass.id
      setClasses((prev) => prev.filter((item) => item.id !== deletedId))
      setStudents((prev) => prev.filter((item) => item.classId !== deletedId))
      setActiveClassId((prev) => (prev === deletedId ? "" : prev))
      setShowDeleteClassModal(false)
      setSelectedClass(null)
      toast.success("Kelas berhasil dihapus")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus kelas")
    } finally {
      setIsMutatingClass(false)
    }
  }

  const openCreateStudentModal = () => {
    if (!activeClassId) {
      toast.error("Pilih kelas terlebih dahulu")
      return
    }
    setEditingStudent(null)
    setStudentForm(EMPTY_STUDENT_FORM)
    setShowStudentModal(true)
  }

  const openEditStudentModal = (student: Student) => {
    setEditingStudent(student)
    setStudentForm({ id: student.id, name: student.name, email: student.email, password: "" })
    setShowStudentModal(true)
  }

  const handleSaveStudent = async () => {
    if (!studentForm.name || !studentForm.email || (!editingStudent && !studentForm.password)) {
      toast.error("Nama, email, dan password wajib diisi")
      return
    }

    setIsMutatingStudent(true)
    try {
      if (editingStudent) {
        const res = await fetch(`/api/admin/students/${editingStudent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: studentForm.name,
            email: studentForm.email,
            password: studentForm.password || undefined,
            classId: activeClassId,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Gagal update siswa")
        setStudents((prev) => prev.map((item) => (item.id === editingStudent.id ? data.student : item)))
        toast.success("Siswa berhasil diperbarui")
      } else {
        const res = await fetch("/api/admin/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: studentForm.name,
            email: studentForm.email,
            password: studentForm.password,
            classId: activeClassId,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Gagal menambah siswa")
        setStudents((prev) => [...prev, data.student])
        toast.success("Siswa berhasil ditambahkan")
      }

      setShowStudentModal(false)
      setEditingStudent(null)
      setStudentForm(EMPTY_STUDENT_FORM)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan siswa")
    } finally {
      setIsMutatingStudent(false)
    }
  }

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return
    setIsMutatingStudent(true)
    try {
      const res = await fetch(`/api/admin/students/${selectedStudent.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus siswa")
      setStudents((prev) => prev.filter((item) => item.id !== selectedStudent.id))
      setShowDeleteStudentModal(false)
      setSelectedStudent(null)
      toast.success("Siswa berhasil dihapus")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus siswa")
    } finally {
      setIsMutatingStudent(false)
    }
  }

  const totalSeats = classes.reduce((acc, cls) => acc + cls.rows * cls.cols, 0)

  if (!admin) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar || "/placeholder-user.jpg"}>
      <div className="max-w-6xl mx-auto space-y-6 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Manajemen Kelas dan Siswa</h1>
            <p className="text-slate-500">Kelola kelas dan akun siswa berbasis API</p>
          </div>
          <GlassButton onClick={() => { resetClassForm(); setShowCreateClassModal(true) }} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Kelas
          </GlassButton>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard className="p-4 text-center"><School className="w-6 h-6 text-blue-600 mx-auto mb-2" /><p className="text-2xl font-bold text-slate-800">{classes.length}</p><p className="text-xs text-slate-500">Total Kelas</p></GlassCard>
          <GlassCard className="p-4 text-center"><Users className="w-6 h-6 text-emerald-600 mx-auto mb-2" /><p className="text-2xl font-bold text-slate-800">{students.length}</p><p className="text-xs text-slate-500">Total Siswa</p></GlassCard>
          <GlassCard className="p-4 text-center"><GraduationCap className="w-6 h-6 text-purple-600 mx-auto mb-2" /><p className="text-2xl font-bold text-slate-800">-</p><p className="text-xs text-slate-500">Total Guru</p></GlassCard>
          <GlassCard className="p-4 text-center"><School className="w-6 h-6 text-amber-600 mx-auto mb-2" /><p className="text-2xl font-bold text-slate-800">{totalSeats}</p><p className="text-xs text-slate-500">Total Kursi</p></GlassCard>
        </div>

        <GlassCard className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <GlassInput type="text" placeholder="Cari kelas..." value={searchClass} onChange={(event) => setSearchClass(event.target.value)} className="pl-10" />
          </div>
        </GlassCard>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((classItem) => {
            const studentCount = getStudentCount(classItem.id)
            const capacity = classItem.rows * classItem.cols
            const occupancy = Math.round((studentCount / capacity) * 100)
            return (
              <GlassCard key={classItem.id} className={cn("p-4 border-2 transition-all duration-300 cursor-pointer", activeClassId === classItem.id ? "border-blue-400 shadow-md" : "border-transparent")} onClick={() => setActiveClassId(classItem.id)}>
                <div className="flex items-start justify-between mb-3">
                  <div><h3 className="font-bold text-slate-800">{classItem.name}</h3><p className="text-xs text-slate-500">Grade {classItem.grade}</p></div>
                  <div className="flex gap-1">
                    <button onClick={(event) => { event.stopPropagation(); openEditClassModal(classItem) }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors"><Edit2 className="w-4 h-4 text-slate-500" /></button>
                    <button onClick={(event) => { event.stopPropagation(); setSelectedClass(classItem); setShowDeleteClassModal(true) }} className="p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4 text-red-500" /></button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-500">Siswa</span><span className="font-medium text-slate-700">{studentCount}</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all", occupancy >= 80 ? "bg-red-500" : occupancy >= 50 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(occupancy, 100)}%` }} /></div>
                </div>
              </GlassCard>
            )
          })}
        </div>

        <GlassCard className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div><h2 className="text-lg font-semibold text-slate-800">Daftar Siswa Kelas</h2><p className="text-sm text-slate-500">{studentsInActiveClass.length} siswa ditemukan</p></div>
            <GlassButton onClick={openCreateStudentModal}><Plus className="w-4 h-4 mr-2" /> Tambah Siswa</GlassButton>
          </div>
          <GlassInput placeholder="Cari siswa di kelas aktif..." value={searchStudent} onChange={(event) => setSearchStudent(event.target.value)} />
          <div className="space-y-2">
            {studentsInActiveClass.map((student) => (
              <div key={student.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="font-medium text-slate-800 truncate">{student.name}</p><p className="text-sm text-slate-500 truncate">{student.email}</p></div>
                <div className="flex gap-2">
                  <GlassButton size="sm" variant="secondary" onClick={() => openEditStudentModal(student)}><Edit2 className="w-4 h-4" /></GlassButton>
                  <GlassButton size="sm" variant="danger" onClick={() => { setSelectedStudent(student); setShowDeleteStudentModal(true) }}><Trash2 className="w-4 h-4" /></GlassButton>
                </div>
              </div>
            ))}
            {studentsInActiveClass.length === 0 && <EmptySkeleton rows={3} className="py-4" />}
          </div>
        </GlassCard>

        <GlassModal isOpen={showCreateClassModal} onClose={() => setShowCreateClassModal(false)} title="Tambah Kelas">
          <div className="space-y-4">
            <GlassInput placeholder="Nama kelas" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
            <GlassInput placeholder="Grade" value={classForm.grade} onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <GlassInput type="number" placeholder="Rows" value={String(classForm.rows)} onChange={(e) => setClassForm({ ...classForm, rows: Number(e.target.value || 5) })} />
              <GlassInput type="number" placeholder="Cols" value={String(classForm.cols)} onChange={(e) => setClassForm({ ...classForm, cols: Number(e.target.value || 5) })} />
            </div>
            <GlassButton className="w-full" onClick={handleCreateClass} disabled={isMutatingClass}>
              {isMutatingClass ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Buat Kelas
            </GlassButton>
          </div>
        </GlassModal>

        <GlassModal isOpen={showEditClassModal} onClose={() => setShowEditClassModal(false)} title="Edit Kelas">
          <div className="space-y-4">
            <GlassInput placeholder="Nama kelas" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
            <GlassInput placeholder="Grade" value={classForm.grade} onChange={(e) => setClassForm({ ...classForm, grade: e.target.value })} />
            <GlassButton className="w-full" onClick={handleUpdateClass} disabled={isMutatingClass}>
              {isMutatingClass ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Edit2 className="w-4 h-4 mr-2" />} Simpan Perubahan
            </GlassButton>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteClassModal} onClose={() => setShowDeleteClassModal(false)} title="Hapus Kelas">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Yakin ingin menghapus kelas ini dan seluruh siswa di dalamnya?</p>
            <GlassButton variant="danger" className="w-full" onClick={handleDeleteClass} disabled={isMutatingClass}>
              {isMutatingClass ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Hapus Kelas
            </GlassButton>
          </div>
        </GlassModal>

        <GlassModal isOpen={showStudentModal} onClose={() => setShowStudentModal(false)} title={editingStudent ? "Edit Siswa" : "Tambah Siswa"}>
          <div className="space-y-4">
            <GlassInput placeholder="Nama siswa" value={studentForm.name} onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })} />
            <GlassInput type="email" placeholder="Email siswa" value={studentForm.email} onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })} />
            <GlassInput type="password" placeholder={editingStudent ? "Password baru (opsional)" : "Password"} value={studentForm.password} onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })} />
            <GlassButton className="w-full" onClick={handleSaveStudent} disabled={isMutatingStudent}>
              {isMutatingStudent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Simpan Siswa
            </GlassButton>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteStudentModal} onClose={() => setShowDeleteStudentModal(false)} title="Hapus Siswa">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Yakin ingin menghapus akun siswa ini?</p>
            <GlassButton variant="danger" className="w-full" onClick={handleDeleteStudent} disabled={isMutatingStudent}>
              {isMutatingStudent ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Hapus Siswa
            </GlassButton>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
