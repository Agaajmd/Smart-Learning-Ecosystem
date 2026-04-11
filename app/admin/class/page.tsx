"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { mockAdmins, mockClasses, mockEmployees, mockStudents, type ClassRoom, type Student } from "@/lib/mock-data"
import { getAllAuthUsers, removeAuthUserCredential, upsertAuthUserCredential } from "@/lib/auth-user-storage"
import { cn } from "@/lib/utils"
import { Edit2, GraduationCap, Plus, School, Search, Trash2, Users } from "lucide-react"

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
  const admin = mockAdmins[0]
  const [classes, setClasses] = useState<ClassRoom[]>([...mockClasses])
  const [students, setStudents] = useState<Student[]>([...mockStudents])
  const [searchClass, setSearchClass] = useState("")
  const [searchStudent, setSearchStudent] = useState("")
  const [activeClassId, setActiveClassId] = useState(mockClasses[0]?.id ?? "")

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

  const filteredClasses = useMemo(() => {
    const query = searchClass.toLowerCase()
    return classes.filter((cls) => cls.name.toLowerCase().includes(query) || cls.grade.toLowerCase().includes(query))
  }, [classes, searchClass])

  const activeClass = useMemo(() => classes.find((cls) => cls.id === activeClassId) ?? null, [classes, activeClassId])

  const studentsInActiveClass = useMemo(() => {
    if (!activeClassId) {
      return []
    }

    const query = searchStudent.toLowerCase()
    return students.filter((student) => {
      if (student.classId !== activeClassId) {
        return false
      }

      return student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query)
    })
  }, [students, activeClassId, searchStudent])

  const getStudentCount = (classId: string) => students.filter((student) => student.classId === classId).length

  const getTeacherName = (teacherId: string) => {
    const teacher = mockEmployees.find((employee) => employee.id === teacherId)
    return teacher?.name ?? "Belum ditentukan"
  }

  const resetClassForm = () => setClassForm(EMPTY_CLASS_FORM)

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

  const openDeleteClassModal = (classItem: ClassRoom) => {
    setSelectedClass(classItem)
    setShowDeleteClassModal(true)
  }

  const handleCreateClass = () => {
    if (!classForm.name || !classForm.grade) {
      toast.error("Nama dan grade kelas wajib diisi")
      return
    }

    const newClass: ClassRoom = {
      id: `c${Date.now()}`,
      name: classForm.name,
      grade: classForm.grade,
      rows: classForm.rows,
      cols: classForm.cols,
      teacherId: classForm.teacherId,
    }

    setClasses((prev) => [...prev, newClass])
    setShowCreateClassModal(false)
    resetClassForm()
    setActiveClassId(newClass.id)
    toast.success(`Kelas ${newClass.name} berhasil dibuat`)
  }

  const handleUpdateClass = () => {
    if (!selectedClass) {
      return
    }

    if (!classForm.name || !classForm.grade) {
      toast.error("Nama dan grade kelas wajib diisi")
      return
    }

    setClasses((prev) =>
      prev.map((cls) =>
        cls.id === selectedClass.id
          ? {
              ...cls,
              ...classForm,
            }
          : cls,
      ),
    )

    setShowEditClassModal(false)
    setSelectedClass(null)
    resetClassForm()
    toast.success("Data kelas berhasil diperbarui")
  }

  const handleDeleteClass = () => {
    if (!selectedClass) {
      return
    }

    const deletedClassId = selectedClass.id
    const deletedStudents = students.filter((student) => student.classId === deletedClassId)
    deletedStudents.forEach((student) => removeAuthUserCredential(student.id))

    setStudents((prev) => prev.filter((student) => student.classId !== deletedClassId))
    setClasses((prev) => prev.filter((cls) => cls.id !== deletedClassId))

    const fallbackClass = classes.find((cls) => cls.id !== deletedClassId)
    setActiveClassId(fallbackClass?.id ?? "")

    setShowDeleteClassModal(false)
    setSelectedClass(null)
    toast.success(`Kelas ${selectedClass.name} beserta siswa di dalamnya berhasil dihapus`)
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
    setStudentForm({
      id: student.id,
      name: student.name,
      email: student.email,
      password: "",
    })
    setShowStudentModal(true)
  }

  const handleSaveStudent = () => {
    if (!activeClassId) {
      toast.error("Kelas belum dipilih")
      return
    }

    if (!studentForm.name || !studentForm.email) {
      toast.error("Nama dan email siswa wajib diisi")
      return
    }

    if (!editingStudent && studentForm.password.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }

    if (editingStudent) {
      const existingCredential = getAllAuthUsers().find((user) => user.id === editingStudent.id)
      const password = studentForm.password || existingCredential?.password || "student123"

      setStudents((prev) =>
        prev.map((student) =>
          student.id === editingStudent.id
            ? {
                ...student,
                name: studentForm.name,
                email: studentForm.email,
              }
            : student,
        ),
      )

      upsertAuthUserCredential({
        id: editingStudent.id,
        name: studentForm.name,
        email: studentForm.email,
        avatar: editingStudent.avatar,
        role: "STUDENT",
        password,
      })

      toast.success("Data siswa berhasil diperbarui")
    } else {
      const newStudent: Student = {
        id: `s-${Date.now()}`,
        name: studentForm.name,
        email: studentForm.email,
        avatar: "/placeholder.svg",
        role: "STUDENT",
        classId: activeClassId,
        paymentStatus: "UNPAID",
        behaviorScore: 100,
        attendance: "PRESENT",
        seatRow: 0,
        seatCol: 0,
        coins: 0,
        streak: 0,
        level: 1,
        xp: 0,
      }

      setStudents((prev) => [...prev, newStudent])
      upsertAuthUserCredential({
        id: newStudent.id,
        name: newStudent.name,
        email: newStudent.email,
        avatar: newStudent.avatar,
        role: "STUDENT",
        password: studentForm.password,
      })

      toast.success("Siswa berhasil ditambahkan")
    }

    setShowStudentModal(false)
    setEditingStudent(null)
    setStudentForm(EMPTY_STUDENT_FORM)
  }

  const handleDeleteStudent = () => {
    if (!selectedStudent) {
      return
    }

    setStudents((prev) => prev.filter((student) => student.id !== selectedStudent.id))
    removeAuthUserCredential(selectedStudent.id)
    setShowDeleteStudentModal(false)
    setSelectedStudent(null)
    toast.success("Siswa berhasil dihapus")
  }

  const totalSeats = classes.reduce((acc, cls) => acc + cls.rows * cls.cols, 0)

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar}>
      <div className="max-w-6xl mx-auto space-y-6 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Manajemen Kelas dan Siswa</h1>
            <p className="text-slate-500">Kelola kelas dan akun login siswa berdasarkan kelas</p>
          </div>
          <GlassButton
            onClick={() => {
              resetClassForm()
              setShowCreateClassModal(true)
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Kelas
          </GlassButton>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassCard className="p-4 text-center">
            <School className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{classes.length}</p>
            <p className="text-xs text-slate-500">Total Kelas</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <Users className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{students.length}</p>
            <p className="text-xs text-slate-500">Total Siswa</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <GraduationCap className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{mockEmployees.length}</p>
            <p className="text-xs text-slate-500">Total Guru</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <School className="w-6 h-6 text-amber-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{totalSeats}</p>
            <p className="text-xs text-slate-500">Total Kursi</p>
          </GlassCard>
        </div>

        <GlassCard className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <GlassInput
              type="text"
              placeholder="Cari kelas..."
              value={searchClass}
              onChange={(event) => setSearchClass(event.target.value)}
              className="pl-10"
            />
          </div>
        </GlassCard>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClasses.map((classItem) => {
            const studentCount = getStudentCount(classItem.id)
            const capacity = classItem.rows * classItem.cols
            const occupancy = Math.round((studentCount / capacity) * 100)

            return (
              <GlassCard
                key={classItem.id}
                className={cn(
                  "p-4 border-2 transition-all duration-300 cursor-pointer",
                  activeClassId === classItem.id ? "border-blue-400 shadow-md" : "border-transparent",
                )}
                onClick={() => setActiveClassId(classItem.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-800">{classItem.name}</h3>
                    <p className="text-xs text-slate-500">Grade {classItem.grade}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        openEditClassModal(classItem)
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-slate-500" />
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation()
                        openDeleteClassModal(classItem)
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Wali Kelas</span>
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">{getTeacherName(classItem.teacherId)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Siswa</span>
                    <span className="font-medium text-slate-700">{studentCount}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        occupancy >= 80 ? "bg-red-500" : occupancy >= 50 ? "bg-amber-500" : "bg-emerald-500",
                      )}
                      style={{ width: `${Math.min(occupancy, 100)}%` }}
                    />
                  </div>
                </div>
              </GlassCard>
            )
          })}
        </div>

        <GlassCard className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Data Siswa Kelas {activeClass?.name ?? "-"}</h2>
              <p className="text-sm text-slate-500">Kelola akun login siswa berdasarkan kelas terpilih</p>
            </div>
            <GlassButton onClick={openCreateStudentModal} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </GlassButton>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <GlassInput
              type="text"
              placeholder="Cari siswa di kelas ini..."
              value={searchStudent}
              onChange={(event) => setSearchStudent(event.target.value)}
              className="pl-10"
            />
          </div>

          <div className="space-y-2">
            {studentsInActiveClass.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                Tidak ada siswa pada kelas ini
              </div>
            ) : (
              studentsInActiveClass.map((student) => (
                <div key={student.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50">
                  <div>
                    <p className="font-medium text-slate-800">{student.name}</p>
                    <p className="text-sm text-slate-500">{student.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <GlassButton variant="secondary" onClick={() => openEditStudentModal(student)}>
                      Edit
                    </GlassButton>
                    <GlassButton
                      className="bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => {
                        setSelectedStudent(student)
                        setShowDeleteStudentModal(true)
                      }}
                    >
                      Hapus
                    </GlassButton>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        <GlassModal isOpen={showCreateClassModal} onClose={() => setShowCreateClassModal(false)} title="Tambah Kelas Baru">
          <ClassForm form={classForm} onChange={setClassForm} onCancel={() => setShowCreateClassModal(false)} onSave={handleCreateClass} />
        </GlassModal>

        <GlassModal isOpen={showEditClassModal} onClose={() => setShowEditClassModal(false)} title="Edit Kelas">
          <ClassForm form={classForm} onChange={setClassForm} onCancel={() => setShowEditClassModal(false)} onSave={handleUpdateClass} />
        </GlassModal>

        <GlassModal isOpen={showDeleteClassModal} onClose={() => setShowDeleteClassModal(false)} title="Hapus Kelas">
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800">Apakah Anda yakin ingin menghapus kelas <strong>{selectedClass?.name}</strong>?</p>
              <p className="text-sm text-red-600 mt-2">Semua siswa pada kelas ini juga akan dihapus.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <GlassButton variant="secondary" className="flex-1" onClick={() => setShowDeleteClassModal(false)}>
                Batal
              </GlassButton>
              <GlassButton className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteClass}>
                Hapus
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        <GlassModal isOpen={showStudentModal} onClose={() => setShowStudentModal(false)} title={editingStudent ? "Edit Siswa" : "Tambah Siswa"}>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nama</label>
              <GlassInput value={studentForm.name} onChange={(event) => setStudentForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="Nama lengkap siswa" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
              <GlassInput type="email" value={studentForm.email} onChange={(event) => setStudentForm((prev) => ({ ...prev, email: event.target.value }))} placeholder="email@siswa.id" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Password {editingStudent ? "(isi jika ingin ganti)" : ""}</label>
              <GlassInput type="password" value={studentForm.password} onChange={(event) => setStudentForm((prev) => ({ ...prev, password: event.target.value }))} placeholder={editingStudent ? "Kosongkan jika tidak diganti" : "Minimal 6 karakter"} />
            </div>
            <div className="flex gap-3 pt-2">
              <GlassButton variant="secondary" className="flex-1" onClick={() => setShowStudentModal(false)}>
                Batal
              </GlassButton>
              <GlassButton className="flex-1" onClick={handleSaveStudent}>
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteStudentModal} onClose={() => setShowDeleteStudentModal(false)} title="Hapus Siswa">
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-800">Apakah Anda yakin ingin menghapus siswa <strong>{selectedStudent?.name}</strong>?</p>
              <p className="text-sm text-red-600 mt-2">Akun login siswa juga akan dihapus.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <GlassButton variant="secondary" className="flex-1" onClick={() => setShowDeleteStudentModal(false)}>
                Batal
              </GlassButton>
              <GlassButton className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleDeleteStudent}>
                Hapus
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}

function ClassForm({
  form,
  onChange,
  onCancel,
  onSave,
}: {
  form: ClassFormState
  onChange: (state: ClassFormState) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nama Kelas</label>
        <GlassInput placeholder="Contoh: Class 10-A" value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1.5 block">Grade</label>
        <GlassInput placeholder="Contoh: 10" value={form.grade} onChange={(event) => onChange({ ...form, grade: event.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Baris</label>
          <GlassInput type="number" min={1} max={10} value={form.rows} onChange={(event) => onChange({ ...form, rows: Number(event.target.value) || 1 })} />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Kolom</label>
          <GlassInput type="number" min={1} max={10} value={form.cols} onChange={(event) => onChange({ ...form, cols: Number(event.target.value) || 1 })} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700 mb-1.5 block">Wali Kelas</label>
        <select
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          value={form.teacherId}
          onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
        >
          <option value="">Pilih Guru</option>
          {mockEmployees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name} - {employee.subject}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <GlassButton variant="secondary" className="flex-1" onClick={onCancel}>
          Batal
        </GlassButton>
        <GlassButton className="flex-1" onClick={onSave}>
          Simpan
        </GlassButton>
      </div>
    </div>
  )
}
