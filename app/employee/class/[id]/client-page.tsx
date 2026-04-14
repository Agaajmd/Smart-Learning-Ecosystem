"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Plus, Trash2, UserRoundPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassModal } from "@/components/molecules/glass-modal"
import { ClassRoomGrid } from "@/components/organisms/class-room-grid"

type ParentAccount = {
  id: string
  name: string
  email: string
  childName: string
}

type Student = {
  id: string
  name: string
  email: string
  classId: string
  avatar?: string
}

type ClassRoom = {
  id: string
  name: string
  grade: string
  rows: number
  cols: number
}

type GridClassRoom = {
  id: string
  name: string
  grade: string
  rows: number
  cols: number
  teacherId: string
  floorPlanImage: string
  seatingPlan: Record<string, string>
}

type GridStudent = {
  id: string
  name: string
  email: string
  role: "STUDENT"
  avatar: string
  classId: string
  paymentStatus: "PAID"
  behaviorScore: number
  attendance: "PRESENT"
  points: number
  coins: number
  streak: number
  level: number
  xp: number
  parentId: string
  seatRow: number
  seatCol: number
}

type ParentForm = {
  name: string
  email: string
  password: string
  childId: string
}

const EMPTY_FORM: ParentForm = {
  name: "",
  email: "",
  password: "",
  childId: "",
}

interface EmployeeClassDetailClientProps {
  id?: string
}

export default function EmployeeClassDetailClient({ id }: EmployeeClassDetailClientProps) {
  const params = useParams<{ id: string }>()
  const classId = id || params?.id

  const [employee, setEmployee] = useState<any>(null)
  const [classItem, setClassItem] = useState<ClassRoom | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [parents, setParents] = useState<ParentAccount[]>([])
  const [form, setForm] = useState<ParentForm>(EMPTY_FORM)
  const [editingParent, setEditingParent] = useState<ParentAccount | null>(null)
  const [selectedParent, setSelectedParent] = useState<ParentAccount | null>(null)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const load = async () => {
    try {
      const [classesRes, parentsRes] = await Promise.all([
        fetch("/api/admin/classes", { cache: "no-store" }),
        fetch(`/api/employee/parents?classId=${classId}`, { cache: "no-store" }),
      ])

      if (!classesRes.ok || !parentsRes.ok) {
        throw new Error("Gagal memuat data kelas")
      }

      const classesData = await classesRes.json()
      const parentsData = await parentsRes.json()

      const nextClass = (classesData.classes || []).find((item: ClassRoom) => item.id === classId) || null
      const nextStudents = (classesData.students || []).filter((item: Student) => item.classId === classId)

      setEmployee(classesData.admin || null)
      setClassItem(nextClass)
      setStudents(nextStudents)
      setParents(Array.isArray(parentsData.parents) ? parentsData.parents : [])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!classId) return
    load().catch(() => toast.error("Gagal memuat data"))
  }, [classId])

  const availableChildren = useMemo(
    () => students.map((student) => ({ id: student.id, label: `${student.name} (${student.email})` })),
    [students],
  )

  const classRoomGridData = useMemo<GridClassRoom | null>(() => {
    if (!classItem) return null
    return {
      id: classItem.id,
      name: classItem.name,
      grade: classItem.grade,
      rows: classItem.rows,
      cols: classItem.cols,
      teacherId: "",
      floorPlanImage: "",
      seatingPlan: {},
    }
  }, [classItem])

  const classRoomGridStudents = useMemo<GridStudent[]>(() => {
    return students.map((student, index) => {
      const row = classItem ? Math.floor(index / Math.max(classItem.cols, 1)) : 0
      const col = classItem ? index % Math.max(classItem.cols, 1) : 0
      return {
        id: student.id,
        name: student.name,
        email: student.email,
        role: "STUDENT",
        avatar: student.avatar || "/placeholder-user.jpg",
        classId: student.classId,
        paymentStatus: "PAID",
        behaviorScore: 0,
        attendance: "PRESENT",
        points: 0,
        coins: 0,
        level: 1,
        xp: 0,
        streak: 0,
        parentId: "",
        seatRow: row,
        seatCol: col,
      }
    })
  }, [students, classItem])

  if (isLoading) {
    return <RouteLoading />
  }

  const openCreate = () => {
    setEditingParent(null)
    setForm(EMPTY_FORM)
    setShowFormModal(true)
  }

  const openEdit = (parent: ParentAccount) => {
    const student = students.find((item) => item.name === parent.childName)
    setEditingParent(parent)
    setForm({
      name: parent.name,
      email: parent.email,
      password: "",
      childId: student?.id || "",
    })
    setShowFormModal(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.childId || (!editingParent && !form.password)) {
      toast.error("Nama, email, anak, dan password wajib diisi")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingParent) {
        const res = await fetch("/api/employee/parents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingParent.id,
            name: form.name,
            email: form.email,
            password: form.password || undefined,
            childId: form.childId,
            classId,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Gagal update akun parent")
        setParents((prev) => prev.map((item) => (item.id === editingParent.id ? data.parent : item)))
        toast.success("Akun parent berhasil diperbarui")
      } else {
        const res = await fetch("/api/employee/parents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, classId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Gagal menambah akun parent")
        setParents((prev) => [...prev, data.parent])
        toast.success("Akun parent berhasil dibuat")
      }

      setShowFormModal(false)
      setEditingParent(null)
      setForm(EMPTY_FORM)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan akun parent")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedParent) return
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/employee/parents", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedParent.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus akun parent")
      setParents((prev) => prev.filter((item) => item.id !== selectedParent.id))
      setShowDeleteModal(false)
      setSelectedParent(null)
      toast.success("Akun parent berhasil dihapus")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus akun parent")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Detail Kelas {classItem?.name || "-"}</h1>
            <p className="text-slate-500">Kelola seat kelas dan akun parent siswa</p>
          </div>
          <GlassButton onClick={openCreate} className="flex items-center gap-2">
            <UserRoundPlus className="w-4 h-4" /> Tambah Akun Parent
          </GlassButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GlassCard className="p-4 text-center"><Users className="w-6 h-6 mx-auto mb-2 text-blue-600" /><p className="text-2xl font-bold text-slate-800">{students.length}</p><p className="text-xs text-slate-500">Siswa</p></GlassCard>
          <GlassCard className="p-4 text-center"><UserRoundPlus className="w-6 h-6 mx-auto mb-2 text-emerald-600" /><p className="text-2xl font-bold text-slate-800">{parents.length}</p><p className="text-xs text-slate-500">Akun Parent</p></GlassCard>
          <GlassCard className="p-4 text-center"><Users className="w-6 h-6 mx-auto mb-2 text-amber-600" /><p className="text-2xl font-bold text-slate-800">{classItem ? classItem.rows * classItem.cols : 0}</p><p className="text-xs text-slate-500">Kapasitas Kursi</p></GlassCard>
        </div>

        {classRoomGridData && (
          <GlassCard className="p-4 sm:p-5">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">Seat Kelas</h2>
            <ClassRoomGrid classroom={classRoomGridData} students={classRoomGridStudents} viewOnly />
          </GlassCard>
        )}

        <GlassCard className="p-4 sm:p-5 space-y-3">
          <h2 className="text-lg font-semibold text-slate-800">Daftar Akun Parent</h2>
          {parents.map((parent) => (
            <div key={parent.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{parent.name}</p>
                <p className="text-sm text-slate-500">{parent.email}</p>
                <p className="text-sm text-slate-600">Anak: {parent.childName}</p>
              </div>
              <div className="flex gap-2">
                <GlassButton size="sm" variant="secondary" onClick={() => openEdit(parent)}>Edit</GlassButton>
                <GlassButton size="sm" variant="danger" onClick={() => { setSelectedParent(parent); setShowDeleteModal(true) }}><Trash2 className="w-4 h-4" /></GlassButton>
              </div>
            </div>
          ))}
          {parents.length === 0 && <EmptySkeleton rows={2} className="py-4" />}
        </GlassCard>

        <GlassModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingParent ? "Edit Akun Parent" : "Tambah Akun Parent"}>
          <div className="space-y-4">
            <GlassInput placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <GlassInput type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <GlassInput type="password" placeholder={editingParent ? "Password baru (opsional)" : "Password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <select value={form.childId} onChange={(e) => setForm({ ...form, childId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-white text-slate-700">
              <option value="">Pilih Anak</option>
              {availableChildren.map((child) => (
                <option key={child.id} value={child.id}>{child.label}</option>
              ))}
            </select>
            <GlassButton className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Simpan
            </GlassButton>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Akun Parent">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Yakin ingin menghapus akun parent ini?</p>
            <GlassButton variant="danger" className="w-full" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Hapus
            </GlassButton>
          </div>
        </GlassModal>
    </div>
  )
}
