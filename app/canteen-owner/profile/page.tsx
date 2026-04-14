"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
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
type Canteen = { id: string; name: string; description: string; image: string; rating: number; totalOrders: number }

export default function CanteenOwnerProfilePage() {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [canteen, setCanteen] = useState<Canteen | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" })

  useEffect(() => {
    const load = async () => {
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" })
      const session = sessionRes.ok ? await sessionRes.json() : null
      const ownerId = session?.user?.id || ""

      const [ownerRes, dashboardRes] = await Promise.all([
        fetch(`/api/canteen-owner/profile${ownerId ? `?ownerId=${ownerId}` : ""}`, { cache: "no-store" }),
        fetch(`/api/dashboard/canteen-owner${ownerId ? `?ownerId=${ownerId}` : ""}`, { cache: "no-store" }),
      ])

      if (ownerRes.ok) {
        const ownerData = await ownerRes.json()
        if (ownerData.owner) {
          setOwner(ownerData.owner)
          setEditForm({
            name: ownerData.owner.name || "",
            email: ownerData.owner.email || "",
            phone: ownerData.owner.phone || "",
          })
        }
      }

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json()
        setCanteen(dashboardData.canteen || null)
      }
    }
    load().catch(() => {})
  }, [])

  const handleSaveProfile = async () => {
    if (!owner.id || isSavingProfile) return
    setIsSavingProfile(true)
    try {
      const res = await fetch("/api/canteen-owner/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: owner.id,
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          avatar: owner.avatar,
        }),
      })
      if (!res.ok) throw new Error()

      setOwner((prev) => ({ ...prev, ...editForm }))
      setShowEditModal(false)
      toast.success("Profil berhasil diperbarui")
    } catch {
      toast.error("Gagal memperbarui profil")
    } finally {
      setIsSavingProfile(false)
    }
  }

  if (!owner) {
    return <RouteLoading />
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !owner.id || isSavingAvatar) return

    setIsSavingAvatar(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const avatar = String(event.target?.result || "")
      if (!avatar) {
        setIsSavingAvatar(false)
        return
      }

      try {
        const res = await fetch("/api/canteen-owner/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: owner.id,
            name: owner.name,
            email: owner.email,
            phone: owner.phone,
            avatar,
          }),
        })
        if (!res.ok) throw new Error()

        setOwner((prev) => ({ ...prev, avatar }))
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
          </GlassCard>
        )}

        <GlassButton
          className="w-full py-3"
          onClick={() => {
            setEditForm({ name: owner.name || "", email: owner.email || "", phone: owner.phone || "" })
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
        <label className="block border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-300 hover:bg-orange-50/50 transition-colors">
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
