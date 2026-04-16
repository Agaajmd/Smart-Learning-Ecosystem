"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { ImageUploadModal } from "@/components/molecules/image-upload"
import { 
  ArrowLeft,
  Mail,
  Phone,
  Users,
  GraduationCap,
  Edit,
  Camera,
} from "lucide-react"
import Link from "next/link"
import { RouteLoading } from "@/components/templates/route-loading"

export default function ParentProfilePage() {
  const [parent, setParent] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", password: "" })

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, childrenRes] = await Promise.all([
          fetch("/api/parent/profile", { cache: "no-store" }),
          fetch("/api/parent/child-overview", { cache: "no-store" }),
        ])

        if (!profileRes.ok || !childrenRes.ok) return
        const profileData = await profileRes.json()
        const childrenData = await childrenRes.json()
        setParent(profileData.parent || null)
        setEditForm({
          name: profileData.parent?.name || "",
          email: profileData.parent?.email || "",
          phone: profileData.parent?.phone || "",
          password: "",
        })
        setChildren(Array.isArray(childrenData.children) ? childrenData.children : [])
      } catch {
        setParent(null)
      }
    }

    load()
  }, [])

  const handleSaveProfile = async () => {
    if (!parent?.id || isSavingProfile) return
    setIsSavingProfile(true)
    const password = editForm.password.trim()
    try {
      const res = await fetch("/api/parent/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: parent.id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          avatar: parent.avatar,
          ...(password ? { password } : {}),
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui profil"))
      }

      setParent((prev: any) => ({ ...prev, ...editForm }))
      setShowEditModal(false)
      toast.success("Profil berhasil diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui profil")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarSave = async (imageData: string | null) => {
    if (!imageData || !parent?.id || isSavingAvatar) return

    setIsSavingAvatar(true)
    try {
      const res = await fetch("/api/parent/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: parent.id,
          name: parent.name,
          email: parent.email,
          phone: parent.phone,
          avatar: imageData,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui foto profil"))
      }

      const data = await res.json().catch(() => ({}))
      const nextAvatar = String(data?.parent?.avatar || imageData)

      setParent((prev: any) => ({ ...prev, avatar: nextAvatar }))
      setShowAvatarModal(false)
      toast.success("Foto profil berhasil diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui foto profil")
      throw error
    } finally {
      setIsSavingAvatar(false)
    }
  }

  if (!parent) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
      <div className="max-w-2xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/parent" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Profil Saya</h1>
            <p className="text-slate-500 text-sm">Informasi akun orang tua</p>
          </div>
        </div>

        {/* Profile Card */}
        <GlassCard className="p-6 text-center">
          <div className="relative w-24 mx-auto">
            <img 
              src={parent.avatar} 
              alt={parent.name} 
              className="w-24 h-24 rounded-full object-cover mx-auto ring-4 ring-blue-100"
            />
            <button
              onClick={() => setShowAvatarModal(true)}
              className="absolute -bottom-1 -right-1 p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mt-4">{parent.name}</h2>
          <p className="text-slate-500">Orang Tua / Wali</p>
        </GlassCard>

        {/* Info Cards */}
        <GlassCard className="p-4 space-y-4">
          <h3 className="font-semibold text-slate-800">Informasi Kontak</h3>
          
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="p-2 rounded-lg bg-blue-100">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="font-medium text-slate-800">{parent.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="p-2 rounded-lg bg-green-100">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Telepon</p>
              <p className="font-medium text-slate-800">{parent.phone}</p>
            </div>
          </div>
        </GlassCard>

        {/* Children List */}
        <GlassCard className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600" />
            <h3 className="font-semibold text-slate-800">Anak yang Terdaftar</h3>
          </div>
          
          <div className="space-y-3">
            {children.map(child => {
              return (
                <div key={child.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <img 
                    src={child.avatar} 
                    alt={child.name} 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{child.name}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <GraduationCap className="w-4 h-4" />
                      <span>{child.classId}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        <GlassButton
          className="w-full py-3"
          onClick={() => {
            setEditForm({
              name: parent.name || "",
              email: parent.email || "",
              phone: parent.phone || "",
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <GlassInput value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <GlassInput type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Telepon</label>
            <GlassInput value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password Baru (Opsional)</label>
            <GlassInput type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
            <p className="text-xs text-slate-500 mt-1">Minimal 6 karakter</p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowEditModal(false)}>
            Batal
          </GlassButton>
          <GlassButton className="flex-1 justify-center" onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? "Menyimpan..." : "Simpan"}
          </GlassButton>
        </div>
      </GlassModal>

      <ImageUploadModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSave={handleAvatarSave}
        currentImage={parent.avatar}
        title="Ganti Foto Profil"
      />
    </DashboardLayout>
  )
}
