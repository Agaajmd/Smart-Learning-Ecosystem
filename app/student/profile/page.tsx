"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import {
  User,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Award,
  TrendingUp,
  Clock,
  Edit,
  Camera,
  Upload,
  BookOpen,
} from "lucide-react"

export default function StudentProfile() {
  const [student, setStudent] = useState<any>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" })

  useEffect(() => {
    const load = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" })
        const session = sessionRes.ok ? await sessionRes.json() : null
        const studentId = session?.user?.id || ""
        const res = await fetch(`/api/student/profile${studentId ? `?studentId=${studentId}` : ""}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!data.student) return
        setStudent(data.student)
        setEditForm({
          name: data.student.name || "",
          email: data.student.email || "",
          phone: data.student.phone || "",
        })
      } catch {
        setStudent(null)
      }
    }

    load()
  }, [])

  const handleSaveProfile = async () => {
    if (!student?.id || isSavingProfile) return
    setIsSavingProfile(true)
    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          avatar: student.avatar,
        }),
      })

      if (!res.ok) throw new Error()
      setStudent((prev: any) => ({ ...prev, name: editForm.name, email: editForm.email, phone: editForm.phone }))
      setShowEditModal(false)
      toast.success("Profil berhasil diperbarui")
    } catch {
      toast.error("Gagal memperbarui profil")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !student?.id || isSavingAvatar) return

    setIsSavingAvatar(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const avatar = String(event.target?.result || "")
      if (!avatar) {
        setIsSavingAvatar(false)
        return
      }

      try {
        const res = await fetch("/api/student/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: student.id,
            name: student.name,
            email: student.email,
            phone: editForm.phone,
            avatar,
          }),
        })
        if (!res.ok) throw new Error()

        setStudent((prev: any) => ({ ...prev, avatar }))
        setShowAvatarModal(false)
        toast.success("Foto profil berhasil diperbarui")
      } catch {
        toast.error("Gagal memperbarui foto profil")
      } finally {
        setIsSavingAvatar(false)
      }
    }
    reader.readAsDataURL(file)
  }

  if (!student) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar}>
      <div className="max-w-2xl mx-auto space-y-4">
        <GlassCard>
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={student.avatar || "/placeholder.svg"}
                alt={student.name}
                className="w-24 h-24 rounded-full border-4 border-blue-100 object-cover"
              />
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mt-4">{student.name}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {student.email}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border border-blue-200 mt-3">
              <GraduationCap className="w-4 h-4" />
              <span className="text-sm font-medium">{(student.classId ?? "-").toUpperCase()}</span>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlassCard className="text-center py-3"><Award className="w-5 h-5 mx-auto mb-1 text-amber-500" /><p className="text-lg font-bold text-slate-800">0</p><p className="text-xs text-slate-500">Poin</p></GlassCard>
          <GlassCard className="text-center py-3"><TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-500" /><p className="text-lg font-bold text-slate-800">-</p><p className="text-xs text-slate-500">Rata-rata</p></GlassCard>
          <GlassCard className="text-center py-3"><Clock className="w-5 h-5 mx-auto mb-1 text-blue-500" /><p className="text-lg font-bold text-slate-800">-</p><p className="text-xs text-slate-500">Kehadiran</p></GlassCard>
          <GlassCard className="text-center py-3"><BookOpen className="w-5 h-5 mx-auto mb-1 text-purple-500" /><p className="text-lg font-bold text-slate-800">-</p><p className="text-xs text-slate-500">Tugas</p></GlassCard>
        </div>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-blue-500" />Informasi Siswa</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><GraduationCap className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-400">Kelas</p><p className="font-medium text-slate-800">{(student.classId ?? "-").toUpperCase()}</p></div></div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Mail className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-400">Email</p><p className="font-medium text-slate-800">{student.email}</p></div></div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Phone className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-400">Telepon</p><p className="font-medium text-slate-800">{editForm.phone || "-"}</p></div></div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Calendar className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-400">Status</p><p className="font-medium text-slate-800">Aktif</p></div></div>
          </div>
        </GlassCard>

        <GlassButton className="w-full py-4" onClick={() => setShowEditModal(true)}>
          <Edit className="w-5 h-5 mr-2" />
          Edit Profil
        </GlassButton>
      </div>

      <GlassModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profil" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label><GlassInput value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><GlassInput type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nomor Telepon</label><GlassInput value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
        </div>

        <div className="flex gap-3 mt-6">
          <GlassButton variant="ghost" className="flex-1" onClick={() => setShowEditModal(false)}>Batal</GlassButton>
          <GlassButton className="flex-1" onClick={handleSaveProfile} disabled={isSavingProfile}>{isSavingProfile ? "Menyimpan..." : "Simpan"}</GlassButton>
        </div>
      </GlassModal>

      <GlassModal isOpen={showAvatarModal} onClose={() => setShowAvatarModal(false)} title="Ganti Foto Profil" size="sm">
        <div className="flex flex-col items-center">
          <img src={student.avatar || "/placeholder.svg"} alt="Current avatar" className="w-24 h-24 rounded-full border-4 border-blue-100 object-cover mb-4" />
          <label className="w-full">
            <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-300">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-slate-600">Pilih foto baru</span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </label>
        </div>

        <GlassButton variant="ghost" className="w-full mt-4" onClick={() => setShowAvatarModal(false)} disabled={isSavingAvatar}>Batal</GlassButton>
      </GlassModal>
    </DashboardLayout>
  )
}
