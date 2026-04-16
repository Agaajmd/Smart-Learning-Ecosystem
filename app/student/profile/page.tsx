"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { ImageUploadModal } from "@/components/molecules/image-upload"
import {
  User,
  Mail,
  Phone,
  GraduationCap,
  Edit,
  Camera,
} from "lucide-react"

export default function StudentProfile() {
  const [student, setStudent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", password: "" })

  useEffect(() => {
    const load = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" })
        const session = sessionRes.ok ? await sessionRes.json() : null
        const studentId = session?.user?.id || ""
        const res = await fetch(`/api/student/profile${studentId ? `?studentId=${studentId}` : ""}`, { cache: "no-store" })
        if (!res.ok) {
          throw new Error("Gagal memuat profil")
        }
        const data = await res.json()
        if (!data.student) {
          throw new Error("Data siswa tidak tersedia")
        }
        setStudent(data.student)
        setEditForm({
          name: data.student.name || "",
          email: data.student.email || "",
          phone: data.student.phone || "",
          password: "",
        })
      } catch {
        setLoadError("Profil belum bisa dimuat.")
        setStudent(null)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const handleSaveProfile = async () => {
    if (!student?.id || isSavingProfile) return
    setIsSavingProfile(true)
    const password = editForm.password.trim()
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
          ...(password ? { password } : {}),
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui profil"))
      }
      setStudent((prev: any) => ({ ...prev, name: editForm.name, email: editForm.email, phone: editForm.phone }))
      setShowEditModal(false)
      toast.success("Profil berhasil diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui profil")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarSave = async (imageData: string | null) => {
    if (!imageData || !student?.id || isSavingAvatar) return

    setIsSavingAvatar(true)
    try {
      const res = await fetch("/api/student/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: student.id,
          name: student.name,
          email: student.email,
          phone: editForm.phone,
          avatar: imageData,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui foto profil"))
      }

      const data = await res.json().catch(() => ({}))
      const nextAvatar = String(data?.user?.avatar || imageData)

      setStudent((prev: any) => ({ ...prev, avatar: nextAvatar }))
      setShowAvatarModal(false)
      toast.success("Foto profil berhasil diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui foto profil")
      throw error
    } finally {
      setIsSavingAvatar(false)
    }
  }

  if (isLoading) {
    return <RouteLoading />
  }

  if (!student) {
    return (
      <DashboardLayout role="STUDENT" userName="-" userAvatar="/placeholder-user.jpg">
        <div className="flex items-center justify-center min-h-[50vh]">
          <GlassCard className="p-8 text-center max-w-md">
            <User className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">Profil siswa tidak tersedia</h2>
            <p className="text-slate-500 mt-2">{loadError || "Silakan login ulang atau hubungi admin."}</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  const classLabel = student.className
    ? `${student.className}${student.classGrade ? ` - Grade ${student.classGrade}` : ""}`
    : (student.classId ?? "-").toUpperCase()

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
              <span className="text-sm font-medium">{classLabel}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-blue-500" />Informasi Siswa</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><GraduationCap className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-400">Kelas</p><p className="font-medium text-slate-800">{classLabel}</p></div></div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Mail className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-400">Email</p><p className="font-medium text-slate-800">{student.email}</p></div></div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><Phone className="w-5 h-5 text-slate-400" /><div><p className="text-xs text-slate-400">Telepon</p><p className="font-medium text-slate-800">{editForm.phone || "-"}</p></div></div>
          </div>
        </GlassCard>

        <GlassButton
          className="w-full py-4"
          onClick={() => {
            setEditForm({
              name: student.name || "",
              email: student.email || "",
              phone: student.phone || "",
              password: "",
            })
            setShowEditModal(true)
          }}
        >
          <Edit className="w-5 h-5 mr-2" />
          Edit Profil
        </GlassButton>
      </div>

      <GlassModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profil" size="md">
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label><GlassInput value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Email</label><GlassInput type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-slate-700 mb-1">Nomor Telepon</label><GlassInput value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password Baru (Opsional)</label>
            <GlassInput type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
            <p className="text-xs text-slate-500 mt-1">Minimal 6 karakter</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <GlassButton variant="ghost" className="flex-1" onClick={() => setShowEditModal(false)}>Batal</GlassButton>
          <GlassButton className="flex-1" onClick={handleSaveProfile} disabled={isSavingProfile}>{isSavingProfile ? "Menyimpan..." : "Simpan"}</GlassButton>
        </div>
      </GlassModal>

      <ImageUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSave={handleAvatarSave}
        currentImage={student.avatar}
        title="Ganti Foto Profil"
      />
    </DashboardLayout>
  )
}
