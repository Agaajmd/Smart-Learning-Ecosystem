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
  Mail,
  Crown,
  Edit,
  GraduationCap,
  Briefcase,
  School,
  DollarSign,
  Camera,
} from "lucide-react"

export default function SuperAdminProfile() {
  const [superAdmin, setSuperAdmin] = useState<{ id: string; name: string; email: string; avatar: string } | null>(null)
  const [studentsCount, setStudentsCount] = useState(0)
  const [employeesCount, setEmployeesCount] = useState(0)
  const [classesCount, setClassesCount] = useState(0)
  const [profit, setProfit] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "" })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" })
        const session = sessionRes.ok ? await sessionRes.json() : null
        const superAdminId = session?.user?.id ? `?superAdminId=${session.user.id}` : ""
        const res = await fetch(`/api/super-admin/profile${superAdminId}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return

        if (data.superAdmin) {
          setSuperAdmin(data.superAdmin)
          setEditForm((prev) => ({
            ...prev,
            name: data.superAdmin.name || "",
            email: data.superAdmin.email || "",
            password: "",
          }))
        }
        if (data.stats) {
          setStudentsCount(Number(data.stats.studentsCount || 0))
          setEmployeesCount(Number(data.stats.employeesCount || 0))
          setClassesCount(Number(data.stats.classesCount || 0))
          setProfit(Number(data.stats.profit || 0))
        }
      } catch {
        // Keep fallback values.
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (!superAdmin) {
    return <RouteLoading />
  }

  const handleSaveProfile = async () => {
    if (!superAdmin.id || isSavingProfile) return
    setIsSavingProfile(true)
    const password = editForm.password.trim()
    try {
      const res = await fetch("/api/super-admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: superAdmin.id,
          name: editForm.name,
          email: editForm.email,
          avatar: superAdmin.avatar,
          ...(password ? { password } : {}),
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui profil"))
      }

      setSuperAdmin((prev) => (prev ? { ...prev, name: editForm.name, email: editForm.email } : prev))
      setShowEditModal(false)
      toast.success("Profil berhasil diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui profil")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarSave = async (imageData: string | null) => {
    if (!imageData || !superAdmin.id || isSavingAvatar) return

    setIsSavingAvatar(true)
    try {
      const res = await fetch("/api/super-admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: superAdmin.id,
          name: superAdmin.name,
          email: superAdmin.email,
          avatar: imageData,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui foto profil"))
      }

      const data = await res.json().catch(() => ({}))
      const nextAvatar = String(data?.superAdmin?.avatar || imageData)

      setSuperAdmin((prev) => (prev ? { ...prev, avatar: nextAvatar } : prev))
      setShowAvatarModal(false)
      toast.success("Foto profil berhasil diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui foto profil")
      throw error
    } finally {
      setIsSavingAvatar(false)
    }
  }

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={superAdmin.name} userAvatar={superAdmin.avatar}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={
                  superAdmin.avatar ||
                  "/placeholder.svg?height=120&width=120&query=school principal professional portrait"
                }
                alt={superAdmin.name}
                className="w-24 h-24 rounded-full border-4 border-indigo-100 object-cover"
              />
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mt-4">{superAdmin.name}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {superAdmin.email}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 border border-indigo-200 mt-3">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">Kepala Sekolah</span>
            </div>
          </div>
        </GlassCard>

        {/* School Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlassCard className="text-center py-3">
            <GraduationCap className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-slate-800">{studentsCount}</p>
            <p className="text-xs text-slate-500">Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <Briefcase className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-lg font-bold text-slate-800">{employeesCount}</p>
            <p className="text-xs text-slate-500">Guru</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <School className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
            <p className="text-lg font-bold text-slate-800">{classesCount}</p>
            <p className="text-xs text-slate-500">Kelas</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold text-slate-800">Rp {(profit / 1000000).toFixed(0)}M</p>
            <p className="text-xs text-slate-500">Profit</p>
          </GlassCard>
        </div>

        {/* Edit Profile Button */}
        <GlassButton
          className="w-full py-4"
          onClick={() => {
            setEditForm({ name: superAdmin.name || "", email: superAdmin.email || "", password: "" })
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <GlassInput
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Masukkan nama lengkap"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <GlassInput
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="Masukkan email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password Baru (Opsional)</label>
            <GlassInput
              type="password"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Kosongkan jika tidak ingin ganti password"
            />
            <p className="text-xs text-slate-500 mt-1">Minimal 6 karakter</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <GlassButton
            variant="ghost"
            className="flex-1"
            onClick={() => setShowEditModal(false)}
          >
            Batal
          </GlassButton>
          <GlassButton className="flex-1" onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? "Menyimpan..." : "Simpan"}
          </GlassButton>
        </div>
      </GlassModal>

      <ImageUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSave={handleAvatarSave}
        currentImage={superAdmin.avatar}
        title="Ganti Foto Profil"
      />
    </DashboardLayout>
  )
}
