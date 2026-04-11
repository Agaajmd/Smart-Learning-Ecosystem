"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { ClassRoomGrid } from "@/components/organisms/class-room-grid"
import { GlassToast } from "@/components/molecules/glass-toast"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { mockEmployees, mockClasses, mockStudents, mockParents, type AttendanceStatus, type Parent } from "@/lib/mock-data"
import { getAllAuthUsers, removeAuthUserCredential, upsertAuthUserCredential } from "@/lib/auth-user-storage"
import { ChevronDown, School, Users, GraduationCap, Plus, Edit2, Trash2, UserRound, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClientPageProps {
  id: string
}

export default function EmployeeClassClient({ id }: ClientPageProps) {
  const router = useRouter()
  const employee = mockEmployees[0]
  
  const [selectedClassId, setSelectedClassId] = useState(id)
  const [showClassSelector, setShowClassSelector] = useState(false)
  const [attendanceOverrides, setAttendanceOverrides] = useState<Record<string, AttendanceStatus>>({})
  const [parents, setParents] = useState<Parent[]>([...mockParents])
  const [showParentModal, setShowParentModal] = useState(false)
  const [showDeleteParentModal, setShowDeleteParentModal] = useState(false)
  const [selectedParent, setSelectedParent] = useState<Parent | null>(null)
  const [parentForm, setParentForm] = useState({
    id: "",
    name: "",
    email: "",
    password: "",
    childId: "",
  })
  
  const classroom = useMemo(
    () => mockClasses.find((c) => c.id === selectedClassId) || mockClasses[0],
    [selectedClassId],
  )
  const students = useMemo(
    () =>
      mockStudents
        .filter((s) => s.classId === classroom.id)
        .map((s) => ({ ...s, attendance: attendanceOverrides[s.id] ?? s.attendance })),
    [classroom.id, attendanceOverrides],
  )
  const classParents = useMemo(() => {
    const classStudentIds = new Set(students.map((student) => student.id))
    return parents.filter((parent) => parent.childrenIds.some((childId) => classStudentIds.has(childId)))
  }, [parents, students])

  const homeroomTeacherName = useMemo(() => {
    const teacher = mockEmployees.find((item) => item.id === classroom.teacherId)
    return teacher?.name || "Belum ditentukan"
  }, [classroom.teacherId])
  const [toast, setToast] = useState({ open: false, message: "" })

  const handleAttendanceChange = useCallback((studentId: string, status: AttendanceStatus) => {
    setAttendanceOverrides((prev) => ({ ...prev, [studentId]: status }))
    const student = students.find((s) => s.id === studentId)
    setToast({
      open: true,
      message: `${student?.name}'s attendance updated to ${status}`,
    })
  }, [students])

  const handleClassChange = useCallback((classId: string) => {
    setSelectedClassId(classId)
    setShowClassSelector(false)
    router.push(`/employee/class/${classId}`)
  }, [router])

  const openCreateParentModal = useCallback(() => {
    setSelectedParent(null)
    setParentForm({
      id: "",
      name: "",
      email: "",
      password: "",
      childId: students[0]?.id || "",
    })
    setShowParentModal(true)
  }, [students])

  const openEditParentModal = useCallback((parent: Parent) => {
    const firstChildInClass = parent.childrenIds.find((childId) => students.some((student) => student.id === childId)) || ""
    setSelectedParent(parent)
    setParentForm({
      id: parent.id,
      name: parent.name,
      email: parent.email,
      password: "",
      childId: firstChildInClass,
    })
    setShowParentModal(true)
  }, [students])

  const saveParentAccount = useCallback(() => {
    if (!parentForm.name || !parentForm.email || !parentForm.childId) {
      setToast({ open: true, message: "Nama, email, dan anak wajib diisi" })
      return
    }

    if (!selectedParent && parentForm.password.length < 6) {
      setToast({ open: true, message: "Password minimal 6 karakter" })
      return
    }

    if (selectedParent) {
      const existingCredential = getAllAuthUsers().find((user) => user.id === selectedParent.id)
      const password = parentForm.password || existingCredential?.password || "parent123"
      const updatedParent: Parent = {
        ...selectedParent,
        name: parentForm.name,
        email: parentForm.email,
        childrenIds: [parentForm.childId],
      }

      setParents((prev) => prev.map((item) => (item.id === selectedParent.id ? updatedParent : item)))
      upsertAuthUserCredential({
        id: updatedParent.id,
        name: updatedParent.name,
        email: updatedParent.email,
        avatar: updatedParent.avatar,
        role: "PARENT",
        password,
      })
      setToast({ open: true, message: "Akun orang tua berhasil diperbarui" })
    } else {
      const newParent: Parent = {
        id: `p-${Date.now()}`,
        name: parentForm.name,
        email: parentForm.email,
        avatar: "/placeholder.svg",
        role: "PARENT",
        childrenIds: [parentForm.childId],
        phone: "",
      }

      setParents((prev) => [...prev, newParent])
      upsertAuthUserCredential({
        id: newParent.id,
        name: newParent.name,
        email: newParent.email,
        avatar: newParent.avatar,
        role: "PARENT",
        password: parentForm.password,
      })
      setToast({ open: true, message: "Akun orang tua berhasil ditambahkan" })
    }

    setShowParentModal(false)
  }, [parentForm, selectedParent])

  const deleteParentAccount = useCallback(() => {
    if (!selectedParent) {
      return
    }

    setParents((prev) => prev.filter((parent) => parent.id !== selectedParent.id))
    removeAuthUserCredential(selectedParent.id)
    setShowDeleteParentModal(false)
    setSelectedParent(null)
    setToast({ open: true, message: "Akun orang tua berhasil dihapus" })
  }, [selectedParent])

  return (
    <DashboardLayout role="EMPLOYEE" userName={employee.name} userAvatar={employee.avatar}>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Manajemen Kelas</h1>
            <p className="text-slate-500">Klik siswa untuk mengubah kehadiran</p>
          </div>
          
          {/* Class Selector */}
          <div className="relative">
            <button
              onClick={() => setShowClassSelector(!showClassSelector)}
              className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all duration-200 min-w-[180px]"
            >
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <School className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-slate-800">{classroom.name}</p>
                <p className="text-xs text-slate-500">Grade {classroom.grade}</p>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-slate-400 transition-transform duration-200",
                showClassSelector && "rotate-180"
              )} />
            </button>

            {/* Dropdown */}
            {showClassSelector && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowClassSelector(false)} 
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-2 border-b border-slate-100">
                    <p className="text-xs font-medium text-slate-500 px-2">Pilih Kelas</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1">
                    {mockClasses.map((cls) => {
                      const classStudentCount = mockStudents.filter(s => s.classId === cls.id).length
                      const isSelected = cls.id === selectedClassId
                      return (
                        <button
                          key={cls.id}
                          onClick={() => handleClassChange(cls.id)}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200",
                            isSelected 
                              ? "bg-blue-50 text-blue-700" 
                              : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg",
                            isSelected ? "bg-blue-100" : "bg-slate-100"
                          )}>
                            <GraduationCap className={cn(
                              "w-4 h-4",
                              isSelected ? "text-blue-600" : "text-slate-500"
                            )} />
                          </div>
                          <div className="flex-1 text-left">
                            <p className={cn(
                              "text-sm font-medium",
                              isSelected ? "text-blue-700" : "text-slate-800"
                            )}>{cls.name}</p>
                            <p className="text-xs text-slate-500">Grade {cls.grade}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Users className="w-3 h-3" />
                            <span>{classStudentCount}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Class Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-slate-800">{students.length}</p>
            <p className="text-xs text-slate-500">Total Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-green-600">
              {students.filter(s => s.attendance === "PRESENT").length}
            </p>
            <p className="text-xs text-slate-500">Hadir</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <p className="text-2xl font-bold text-red-600">
              {students.filter(s => s.attendance !== "PRESENT").length}
            </p>
            <p className="text-xs text-slate-500">Tidak Hadir</p>
          </GlassCard>
        </div>

        <ClassRoomGrid classroom={classroom} students={students} onAttendanceChange={handleAttendanceChange} />

        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">CRUD Akun Orang Tua</h2>
              <p className="text-sm text-slate-500">Wali kelas: {homeroomTeacherName} • Kelas: {classroom.name}</p>
            </div>
            <GlassButton onClick={openCreateParentModal}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Orang Tua
            </GlassButton>
          </div>

          <div className="space-y-2">
            {classParents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-slate-500">
                Belum ada akun orang tua untuk kelas ini
              </div>
            ) : (
              classParents.map((parent) => {
                const child = students.find((student) => parent.childrenIds.includes(student.id))
                return (
                  <div key={parent.id} className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{parent.name}</p>
                      <p className="text-sm text-slate-500">{parent.email}</p>
                      <p className="text-xs text-slate-500 mt-1">Anak: {child?.name || "-"} • Kelas: {classroom.name}</p>
                    </div>
                    <div className="flex gap-2">
                      <GlassButton variant="secondary" onClick={() => openEditParentModal(parent)}>
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </GlassButton>
                      <GlassButton
                        className="bg-red-500 hover:bg-red-600 text-white"
                        onClick={() => {
                          setSelectedParent(parent)
                          setShowDeleteParentModal(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Hapus
                      </GlassButton>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </GlassCard>

        <GlassModal
          isOpen={showParentModal}
          onClose={() => setShowParentModal(false)}
          title={selectedParent ? "Edit Akun Orang Tua" : "Tambah Akun Orang Tua"}
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nama Orang Tua</label>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={parentForm.name}
                  onChange={(event) => setParentForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nama orang tua"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
              <input
                type="email"
                value={parentForm.email}
                onChange={(event) => setParentForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="orangtua@example.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Password {selectedParent ? "(opsional)" : "*"}</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={parentForm.password}
                  onChange={(event) => setParentForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={selectedParent ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Pilih Anak</label>
              <select
                value={parentForm.childId}
                onChange={(event) => setParentForm((prev) => ({ ...prev, childId: event.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} - {classroom.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <GlassButton variant="secondary" className="flex-1" onClick={() => setShowParentModal(false)}>
                Batal
              </GlassButton>
              <GlassButton className="flex-1" onClick={saveParentAccount}>
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteParentModal} onClose={() => setShowDeleteParentModal(false)} title="Hapus Akun Orang Tua">
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              Hapus akun {selectedParent?.name}? Akun login orang tua juga akan dihapus.
            </div>
            <div className="flex gap-3 pt-2">
              <GlassButton variant="secondary" className="flex-1" onClick={() => setShowDeleteParentModal(false)}>
                Batal
              </GlassButton>
              <GlassButton className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={deleteParentAccount}>
                Hapus
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        <GlassToast
          isOpen={toast.open}
          onClose={() => setToast({ open: false, message: "" })}
          message={toast.message}
          type="success"
        />
      </div>
    </DashboardLayout>
  )
}
