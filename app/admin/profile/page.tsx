"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { ImageUploadModal } from "@/components/molecules/image-upload"
import {
  User,
  Mail,
  Shield,
  Edit,
  GraduationCap,
  Briefcase,
  School,
  Clock,
  Camera,
  Save,
} from "lucide-react"

type AdminUser = { id?: string; name: string; email: string; avatar: string }

export default function AdminProfile() {
  const [admin, setAdmin] = useState<AdminUser>({
    name: "",
    email: "",
    avatar: "/placeholder-user.jpg",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState({ studentsCount: 0, employeesCount: 0, classesCount: 0 })
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [editForm, setEditForm] = useState({
    name: admin.name,
    email: admin.email,
    password: "",
  })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" })
        const session = sessionRes.ok ? await sessionRes.json() : null
        const adminId = session?.user?.id ? `?adminId=${session.user.id}` : ""
        const res = await fetch(`/api/admin/profile${adminId}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        if (data.admin) {
          setAdmin(data.admin)
          setEditForm({ name: data.admin.name || "", email: data.admin.email || "", password: "" })
        }
        if (data.stats) setStats(data.stats)
      } catch {
        // Keep fallback values.
      } finally {
        if (active) setIsLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (isLoading) {
    return <RouteLoading />
  }

  const handleSaveProfile = async () => {
    if (!admin.id || isSavingProfile) return
    setIsSavingProfile(true)
    const password = editForm.password.trim()
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: admin.id,
          name: editForm.name,
          email: editForm.email,
          avatar: admin.avatar,
          ...(password ? { password } : {}),
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui profil"))
      }

      setAdmin((prev) => ({ ...prev, name: editForm.name, email: editForm.email }))
      setShowEditModal(false)
      toast.success("Profil berhasil diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui profil")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarSave = async (imageData: string | null) => {
    if (!imageData || !admin.id || isSavingAvatar) {
      return
    }

    setIsSavingAvatar(true)
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: admin.id,
          name: admin.name,
          email: admin.email,
          avatar: imageData,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui foto profil"))
      }

      const data = await res.json().catch(() => ({}))
      const nextAvatar = String(data?.admin?.avatar || imageData)
      setAdmin((prev) => ({ ...prev, avatar: nextAvatar }))
      toast.success("Foto profil berhasil diperbarui")
      setShowAvatarModal(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui foto profil")
      throw error
    } finally {
      setIsSavingAvatar(false)
    }
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar || "/placeholder-user.jpg"}>
      <div className="max-w-2xl mx-auto space-y-5 px-1">
        {/* Profile Header */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={admin.avatar || "/placeholder-user.jpg"}
                alt={admin.name}
                className="w-24 h-24 rounded-full border-4 border-amber-100 object-cover"
              />
              <button 
                onClick={() => setShowAvatarModal(true)}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <Camera className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <h1 className="text-xl font-bold text-slate-800 mt-4">{admin.name}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1 text-sm">
              <Mail className="w-4 h-4" />
              {admin.email}
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200 mt-3">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">Administrator</span>
            </div>
          </div>
        </GlassCard>

        {/* Management Stats */}
        <div className="grid grid-cols-3 gap-2">
          <GlassCard className="text-center py-3">
            <GraduationCap className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-slate-800">{stats.studentsCount}</p>
            <p className="text-[10px] text-slate-500">Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <Briefcase className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-lg font-bold text-slate-800">{stats.employeesCount}</p>
            <p className="text-[10px] text-slate-500">Guru</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <School className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-bold text-slate-800">{stats.classesCount}</p>
            <p className="text-[10px] text-slate-500">Kelas</p>
          </GlassCard>
        </div>

        {/* Admin Information */}
        <GlassCard>
          <h2 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-slate-400" />
            Informasi Administrator
          </h2>

          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Shield className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p className="font-medium text-slate-800 text-sm">System Administrator</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Clock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-500">Level Akses</p>
                <p className="font-medium text-slate-800 text-sm">Akses Admin Penuh</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Edit Profile Button */}
        <GlassButton 
          className="w-full justify-center py-3"
          onClick={() => {
            setEditForm({ name: admin.name, email: admin.email, password: "" })
            setShowEditModal(true)
          }}
        >
          <Edit className="w-5 h-5 mr-2" />
          Edit Profil
        </GlassButton>
      </div>

      {/* Edit Profile Modal */}
      <GlassModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profil"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nama Lengkap</label>
            <GlassInput
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Masukkan nama lengkap"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label>
            <GlassInput
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="Masukkan email"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Password Baru (Opsional)</label>
            <GlassInput
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Kosongkan jika tidak ingin ganti password"
            />
            <p className="text-xs text-slate-500 mt-1">Minimal 6 karakter</p>
          </div>
        </div>
        
        <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
          <GlassButton 
            variant="secondary"
            className="flex-1 justify-center" 
            onClick={() => setShowEditModal(false)}
          >
            Batal
          </GlassButton>
          <GlassButton 
            className="flex-1 justify-center" 
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSavingProfile ? "Menyimpan..." : "Simpan"}
          </GlassButton>
        </div>
      </GlassModal>

      <ImageUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSave={handleAvatarSave}
        currentImage={admin.avatar}
        title="Ganti Foto Profil"
      />
    </DashboardLayout>
  )
}
