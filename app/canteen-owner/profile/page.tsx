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
  ArrowLeft,
  Mail,
  Phone,
  Store,
  Star,
  ShoppingBag,
  Edit,
  Camera,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Owner = { id: string; name: string; email: string; phone: string; avatar: string; isActive: boolean }
type Canteen = {
  id: string
  name: string
  description: string
  image: string
  rating: number
  totalOrders: number
  isOpen: boolean
}

export default function CanteenOwnerProfilePage() {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [canteen, setCanteen] = useState<Canteen | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    canteenName: "",
    canteenDescription: "",
    canteenImage: "",
    canteenIsOpen: true,
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoadError(null)
        const [ownerRes, dashboardRes] = await Promise.all([
          fetch("/api/canteen-owner/profile", { cache: "no-store" }),
          fetch("/api/dashboard/canteen-owner", { cache: "no-store" }),
        ])

        let resolvedOwner: Owner | null = null

        if (ownerRes.ok) {
          const ownerData = await ownerRes.json()
          if (ownerData.owner) {
            const profileOwner: Owner = {
              id: String(ownerData.owner.id || ""),
              name: String(ownerData.owner.name || ""),
              email: String(ownerData.owner.email || ""),
              phone: String(ownerData.owner.phone || ""),
              avatar: String(ownerData.owner.avatar || "/placeholder-user.jpg"),
              isActive: Boolean(ownerData.owner.isActive),
            }

            resolvedOwner = profileOwner
            setOwner(profileOwner)
            const canteenName = String(ownerData.owner.canteenName || "")
            const canteenDescription = String(ownerData.owner.canteenDescription || "")
            const canteenImage = String(ownerData.owner.canteenImage || ownerData.canteen?.image || "")
            const canteenIsOpen = Boolean(ownerData.owner.canteenIsOpen ?? ownerData.canteen?.isOpen)
            setEditForm({
              name: profileOwner.name,
              email: profileOwner.email,
              phone: profileOwner.phone,
              password: "",
              canteenName,
              canteenDescription,
              canteenImage,
              canteenIsOpen,
            })
            if (ownerData.canteen) {
              setCanteen(ownerData.canteen)
            }
          }
        } else {
          const payload = await ownerRes.json().catch(() => ({}))
          setLoadError(String(payload?.error || "Gagal memuat profil owner"))
        }

        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json()
          if (dashboardData.owner && !resolvedOwner) {
            const dashboardOwner: Owner = {
              id: String(dashboardData.owner.id || ""),
              name: String(dashboardData.owner.name || "Pemilik Kantin"),
              email: String(dashboardData.owner.email || ""),
              phone: String(dashboardData.owner.phone || ""),
              avatar: String(dashboardData.owner.avatar || "/placeholder-user.jpg"),
              isActive: dashboardData.owner.isActive !== false,
            }
            setOwner(dashboardOwner)
            setEditForm((prev) => ({
              ...prev,
              name: dashboardOwner.name,
              email: dashboardOwner.email,
              phone: dashboardOwner.phone,
              password: "",
              canteenName: prev.canteenName || String(dashboardData.owner.canteenName || ""),
            }))
          }
          setCanteen((prev) => prev || dashboardData.canteen || null)
        } else if (!resolvedOwner) {
          const payload = await dashboardRes.json().catch(() => ({}))
          setLoadError(String(payload?.error || "Gagal memuat data owner"))
        }
      } catch {
        setLoadError("Gagal memuat profil owner")
      } finally {
        setIsLoading(false)
      }
    }
    load().catch(() => {})
  }, [])

  const handleSaveProfile = async () => {
    if (!owner || isSavingProfile) return
    setIsSavingProfile(true)
    const password = editForm.password.trim()
    try {
      const res = await fetch("/api/canteen-owner/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: owner.id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          canteenName: editForm.canteenName,
          canteenDescription: editForm.canteenDescription,
          canteenImage: editForm.canteenImage,
          canteenIsOpen: editForm.canteenIsOpen,
          avatar: owner.avatar,
          ...(password ? { password } : {}),
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui profil"))
      }

      const data = await res.json()
      if (data.owner) {
        setOwner((prev) =>
          prev
            ? {
                ...prev,
                name: data.owner.name,
                email: data.owner.email,
                phone: data.owner.phone,
              }
            : prev,
        )
      }
      if (data.canteen) {
        setCanteen(data.canteen)
      } else {
        setCanteen((prev) =>
          prev
            ? {
                ...prev,
                name: editForm.canteenName,
                description: editForm.canteenDescription,
                image: editForm.canteenImage || prev.image,
                isOpen: editForm.canteenIsOpen,
              }
            : prev,
        )
      }
      setShowEditModal(false)
      toast.success("Profil berhasil diperbarui")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui profil")
    } finally {
      setIsSavingProfile(false)
    }
  }

  if (isLoading) {
    return <RouteLoading />
  }

  if (!owner) {
    return (
      <DashboardLayout role="CANTEEN_OWNER" userName="Pemilik Kantin" userAvatar="/placeholder-user.jpg">
        <div className="max-w-2xl mx-auto px-1">
          <GlassCard className="p-6 border border-amber-200 bg-amber-50 text-amber-700">
            <p className="font-semibold">Data owner belum tersedia</p>
            <p className="text-sm mt-2">{loadError || "Hubungi admin untuk menghubungkan akun owner dengan kantin."}</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  const handleCanteenImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const result = String(loadEvent.target?.result || "")
      if (!result) return
      setEditForm((prev) => ({ ...prev, canteenImage: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarSave = async (imageData: string | null) => {
    if (!imageData || !owner || isSavingAvatar) return

    setIsSavingAvatar(true)
    try {
      const res = await fetch("/api/canteen-owner/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: owner.id,
          name: owner.name,
          email: owner.email,
          phone: owner.phone,
          avatar: imageData,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui foto profil"))
      }

      const data = await res.json().catch(() => ({}))
      const nextAvatar = String(data?.owner?.avatar || imageData)

      setOwner((prev) => (prev ? { ...prev, avatar: nextAvatar } : prev))
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
    <DashboardLayout role="CANTEEN_OWNER" userName={owner.name} userAvatar={owner.avatar}>
      <div className="max-w-2xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/canteen-owner" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Profil Saya</h1>
            <p className="text-slate-500 text-sm">Informasi akun pemilik kantin</p>
          </div>
        </div>

        {/* Profile Card */}
        <GlassCard className="p-6 text-center">
          <div className="relative w-24 mx-auto">
            <img 
              src={owner.avatar} 
              alt={owner.name} 
              className="w-24 h-24 rounded-full object-cover mx-auto ring-4 ring-orange-100"
            />
            <button
              onClick={() => setShowAvatarModal(true)}
              className="absolute -bottom-1 -right-1 p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-slate-800 mt-4">{owner.name}</h2>
          <p className="text-slate-500">Pemilik Kantin</p>
          <span className={cn(
            "inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium",
            owner.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {owner.isActive ? "Aktif" : "Tidak Aktif"}
          </span>
        </GlassCard>

        {/* Contact Info */}
        <GlassCard className="p-4 space-y-4">
          <h3 className="font-semibold text-slate-800">Informasi Kontak</h3>
          
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="p-2 rounded-lg bg-blue-100">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Email</p>
              <p className="font-medium text-slate-800">{owner.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
            <div className="p-2 rounded-lg bg-green-100">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Telepon</p>
              <p className="font-medium text-slate-800">{owner.phone}</p>
            </div>
          </div>
        </GlassCard>

        {/* Canteen Info */}
        {canteen && (
          <GlassCard className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-slate-600" />
              <h3 className="font-semibold text-slate-800">Informasi Kantin</h3>
            </div>

            <div className="rounded-xl overflow-hidden">
              <img 
                src={canteen.image} 
                alt={canteen.name}
                className="w-full h-32 object-cover"
              />
            </div>
            
            <div>
              <h4 className="font-semibold text-slate-800">{canteen.name}</h4>
              <p className="text-sm text-slate-500 mt-1">{canteen.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-amber-50 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-600">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-bold">{canteen.rating}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Rating</p>
              </div>
              <div className="p-3 rounded-xl bg-blue-50 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600">
                  <ShoppingBag className="w-4 h-4" />
                  <span className="font-bold">{canteen.totalOrders}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Total Order</p>
              </div>
            </div>

            <div className="pt-1">
              <span className={cn(
                "inline-flex px-3 py-1 rounded-full text-xs font-medium",
                canteen.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {canteen.isOpen ? "Kantin Buka" : "Kantin Tutup"}
              </span>
            </div>
          </GlassCard>
        )}

        <GlassButton
          className="w-full py-3"
          onClick={() => {
            setEditForm({
              name: owner.name || "",
              email: owner.email || "",
              phone: owner.phone || "",
              password: "",
              canteenName: canteen?.name || "",
              canteenDescription: canteen?.description || "",
              canteenImage: canteen?.image || "",
              canteenIsOpen: canteen?.isOpen ?? true,
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kantin</label>
            <GlassInput value={editForm.canteenName} onChange={(e) => setEditForm({ ...editForm, canteenName: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi Kantin</label>
            <GlassInput value={editForm.canteenDescription} onChange={(e) => setEditForm({ ...editForm, canteenDescription: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Foto Kantin</label>
            <label className="block border border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/40 transition-colors">
              <input type="file" className="hidden" accept="image/*" onChange={handleCanteenImageChange} />
              <p className="text-sm text-slate-600">Upload foto kantin</p>
            </label>
            {editForm.canteenImage ? (
              <img src={editForm.canteenImage} alt="Preview kantin" className="mt-3 w-full h-28 object-cover rounded-xl border border-slate-200" />
            ) : null}
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Status Operasional</label>
            <button
              type="button"
              onClick={() => setEditForm((prev) => ({ ...prev, canteenIsOpen: !prev.canteenIsOpen }))}
              className={cn(
                "relative w-12 h-6 rounded-full transition-colors",
                editForm.canteenIsOpen ? "bg-green-500" : "bg-slate-300"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                editForm.canteenIsOpen ? "left-6" : "left-0.5"
              )} />
            </button>
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
        currentImage={owner.avatar}
        title="Ganti Foto Profil"
      />
    </DashboardLayout>
  )
}
