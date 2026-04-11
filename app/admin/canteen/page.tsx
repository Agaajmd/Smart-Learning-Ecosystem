"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { 
  mockAdmins,
  mockCanteenOwners,
  mockCanteens,
  type CanteenOwner,
  type Canteen,
} from "@/lib/mock-data"
import { 
  ArrowLeft,
  Search,
  Plus,
  Edit2,
  Trash2,
  Store,
  Star,
  ShoppingBag,
  Phone,
  Mail,
  ToggleLeft,
  ToggleRight,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { getAllAuthUsers, removeAuthUserCredential, upsertAuthUserCredential } from "@/lib/auth-user-storage"

export default function AdminCanteenPage() {
  const admin = mockAdmins[0]
  const [canteenOwners, setCanteenOwners] = useState<CanteenOwner[]>(mockCanteenOwners)
  const [canteens, setCanteens] = useState<Canteen[]>(mockCanteens)
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingOwner, setEditingOwner] = useState<CanteenOwner | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    canteenName: "",
    canteenDescription: "",
    isActive: true,
  })

  const filteredOwners = canteenOwners.filter(o => 
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.canteenName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleOpenModal = (owner?: CanteenOwner) => {
    if (owner) {
      const canteen = canteens.find(c => c.id === owner.canteenId)
      setEditingOwner(owner)
      setFormData({
        name: owner.name,
        email: owner.email,
        password: "",
        phone: owner.phone,
        canteenName: owner.canteenName,
        canteenDescription: canteen?.description || "",
        isActive: owner.isActive,
      })
    } else {
      setEditingOwner(null)
      setFormData({
        name: "",
        email: "",
        password: "",
        phone: "",
        canteenName: "",
        canteenDescription: "",
        isActive: true,
      })
    }
    setShowModal(true)
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.email || !formData.canteenName) {
      toast.error("Mohon lengkapi semua field yang diperlukan")
      return
    }

    if (!editingOwner && formData.password.length < 6) {
      toast.error("Password pemilik kantin minimal 6 karakter")
      return
    }

    if (editingOwner && formData.password && formData.password.length < 6) {
      toast.error("Password pemilik kantin minimal 6 karakter")
      return
    }

    if (editingOwner) {
      const existingCredential = getAllAuthUsers().find((user) => user.id === editingOwner.id)
      const password = formData.password || existingCredential?.password || "canteen123"

      setCanteenOwners(canteenOwners.map(o => o.id === editingOwner.id ? {
        ...o,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        canteenName: formData.canteenName,
        isActive: formData.isActive,
      } : o))
      setCanteens(canteens.map(c => c.ownerId === editingOwner.id ? {
        ...c,
        name: formData.canteenName,
        description: formData.canteenDescription,
      } : c))
      upsertAuthUserCredential({
        id: editingOwner.id,
        name: formData.name,
        email: formData.email,
        avatar: editingOwner.avatar,
        role: "CANTEEN_OWNER",
        password,
      })
      toast.success("Data pemilik kantin berhasil diperbarui")
    } else {
      const newOwnerId = `co${Date.now()}`
      const newCanteenId = `can${Date.now()}`
      
      const newOwner: CanteenOwner = {
        id: newOwnerId,
        name: formData.name,
        email: formData.email,
        avatar: "/placeholder.svg?height=100&width=100",
        role: "CANTEEN_OWNER",
        canteenId: newCanteenId,
        canteenName: formData.canteenName,
        phone: formData.phone,
        isActive: formData.isActive,
      }

      const newCanteen: Canteen = {
        id: newCanteenId,
        name: formData.canteenName,
        ownerId: newOwnerId,
        description: formData.canteenDescription,
        image: "/placeholder.svg?height=200&width=300&query=food+stall",
        rating: 0,
        totalOrders: 0,
        isOpen: formData.isActive,
      }

      setCanteenOwners([...canteenOwners, newOwner])
      setCanteens([...canteens, newCanteen])
      upsertAuthUserCredential({
        id: newOwner.id,
        name: newOwner.name,
        email: newOwner.email,
        avatar: newOwner.avatar,
        role: "CANTEEN_OWNER",
        password: formData.password,
      })
      toast.success("Pemilik kantin baru berhasil ditambahkan")
    }
    setShowModal(false)
  }

  const handleDelete = (ownerId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus pemilik kantin ini?")) {
      const owner = canteenOwners.find(o => o.id === ownerId)
      if (owner) {
        setCanteenOwners(canteenOwners.filter(o => o.id !== ownerId))
        setCanteens(canteens.filter(c => c.id !== owner.canteenId))
        removeAuthUserCredential(owner.id)
        toast.success("Pemilik kantin berhasil dihapus")
      }
    }
  }

  const handleToggleActive = (ownerId: string) => {
    setCanteenOwners(canteenOwners.map(o => o.id === ownerId ? { ...o, isActive: !o.isActive } : o))
    const owner = canteenOwners.find(o => o.id === ownerId)
    if (owner) {
      setCanteens(canteens.map(c => c.ownerId === ownerId ? { ...c, isOpen: !owner.isActive } : c))
    }
    toast.success("Status pemilik kantin diperbarui")
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Manajemen Kantin</h1>
              <p className="text-slate-500 text-sm">{canteenOwners.length} pemilik kantin terdaftar</p>
            </div>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tambah
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pemilik kantin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{canteenOwners.length}</p>
            <p className="text-sm text-slate-500">Total Kantin</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{canteenOwners.filter(o => o.isActive).length}</p>
            <p className="text-sm text-slate-500">Aktif</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{canteenOwners.filter(o => !o.isActive).length}</p>
            <p className="text-sm text-slate-500">Tidak Aktif</p>
          </GlassCard>
        </div>

        {/* Canteen Owners List */}
        <div className="space-y-3">
          {filteredOwners.map(owner => {
            const canteen = canteens.find(c => c.id === owner.canteenId)
            return (
              <GlassCard key={owner.id} className={cn("p-4", !owner.isActive && "opacity-60")}>
                <div className="flex items-start gap-4">
                  <img 
                    src={owner.avatar} 
                    alt={owner.name}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-100"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-slate-800">{owner.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Store className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{owner.canteenName}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenModal(owner)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(owner.id)}
                          className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {owner.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {owner.phone}
                      </span>
                    </div>

                    {canteen && (
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {canteen.rating}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <ShoppingBag className="w-3.5 h-3.5" />
                          {canteen.totalOrders} order
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-600">Status Kantin:</span>
                  <button
                    onClick={() => handleToggleActive(owner.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                      owner.isActive 
                        ? "bg-green-100 text-green-700" 
                        : "bg-red-100 text-red-700"
                    )}
                  >
                    {owner.isActive ? (
                      <>
                        <ToggleRight className="w-4 h-4" />
                        Aktif
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4" />
                        Tidak Aktif
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>
            )
          })}
        </div>

        {filteredOwners.length === 0 && (
          <GlassCard className="p-8 text-center">
            <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Tidak ada pemilik kantin ditemukan</p>
          </GlassCard>
        )}

        {/* Add/Edit Modal */}
        <GlassModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingOwner ? "Edit Pemilik Kantin" : "Tambah Pemilik Kantin Baru"}
        >
          <div className="space-y-4 p-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Pemilik *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Ibu Wartini"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com"
                />
              </div>
              <div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password {editingOwner ? "(opsional)" : "*"}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingOwner ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Telepon</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="081234567890"
              />
            </div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Kantin *</label>
              <input
                type="text"
                value={formData.canteenName}
                onChange={(e) => setFormData({ ...formData, canteenName: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Kantin Bu Wartini"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi Kantin</label>
              <textarea
                value={formData.canteenDescription}
                onChange={(e) => setFormData({ ...formData, canteenDescription: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="Deskripsi singkat tentang kantin..."
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Status Aktif</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  formData.isActive ? "bg-green-500" : "bg-slate-300"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  formData.isActive ? "left-6" : "left-0.5"
                )} />
              </button>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                {editingOwner ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
