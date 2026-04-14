"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
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
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" })

  useEffect(() => {
    const load = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" })
        const session = sessionRes.ok ? await sessionRes.json() : null
        const parentId = session?.user?.id || ""
        const [profileRes, childrenRes] = await Promise.all([
          fetch(`/api/parent/profile${parentId ? `?parentId=${parentId}` : ""}`, { cache: "no-store" }),
          fetch(`/api/parent/child-overview${parentId ? `?parentId=${parentId}` : ""}`, { cache: "no-store" }),
        ])

        if (!profileRes.ok || !childrenRes.ok) return
        const profileData = await profileRes.json()
        const childrenData = await childrenRes.json()
        setParent(profileData.parent || null)
        setEditForm({
          name: profileData.parent?.name || "",
          email: profileData.parent?.email || "",
          phone: profileData.parent?.phone || "",
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
        }),
      })
      if (!res.ok) throw new Error()

      setParent((prev: any) => ({ ...prev, ...editForm }))
      setShowEditModal(false)
      toast.success("Profil berhasil diperbarui")
    } catch {
      toast.error("Gagal memperbarui profil")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !parent?.id || isSavingAvatar) return

    setIsSavingAvatar(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const avatar = String(event.target?.result || "")
      if (!avatar) {
        setIsSavingAvatar(false)
        return
      }
      try {
        const res = await fetch("/api/parent/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: parent.id,
            name: parent.name,
            email: parent.email,
            phone: parent.phone,
            avatar,
          }),
        })
        if (!res.ok) throw new Error()

        setParent((prev: any) => ({ ...prev, avatar }))
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
            setEditForm({ name: parent.name || "", email: parent.email || "", phone: parent.phone || "" })
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

      <GlassModal isOpen={showAvatarModal} onClose={() => setShowAvatarModal(false)} title="Ganti Foto Profil" size="sm">
        <label className="block border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
          <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
          <Camera className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-600 font-medium">Klik untuk pilih foto</p>
          <p className="text-xs text-slate-400 mt-1">JPG, PNG (maks 5MB)</p>
        </label>

        <GlassButton variant="secondary" onClick={() => setShowAvatarModal(false)} className="w-full mt-4" disabled={isSavingAvatar}>
          Batal
        </GlassButton>
      </GlassModal>
    </DashboardLayout>
  )
}
