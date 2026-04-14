"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Plus, Search, Store, Trash2, UserCog, UtensilsCrossed } from "lucide-react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"

type Owner = {
  id: string
  name: string
  email: string
  canteenName: string
  canteenId?: string
}

type OwnerForm = {
  name: string
  email: string
  password: string
  canteenName: string
}

const EMPTY_FORM: OwnerForm = {
  name: "",
  email: "",
  password: "",
  canteenName: "",
}

export default function AdminCanteenPage() {
  const [admin, setAdmin] = useState<any>(null)
  const [owners, setOwners] = useState<Owner[]>([])
  const [query, setQuery] = useState("")
  const [showFormModal, setShowFormModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingOwner, setEditingOwner] = useState<Owner | null>(null)
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null)
  const [form, setForm] = useState<OwnerForm>(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const load = async () => {
    const res = await fetch("/api/admin/canteen-owners", { cache: "no-store" })
    if (!res.ok) throw new Error("Gagal memuat data kantin")
    const data = await res.json()
    setAdmin(data.admin || null)
    setOwners(Array.isArray(data.owners) ? data.owners : [])
  }

  useEffect(() => {
    load().catch(() => toast.error("Gagal memuat data"))
  }, [])

  const filteredOwners = useMemo(() => {
    const q = query.toLowerCase()
    return owners.filter(
      (owner) =>
        owner.name.toLowerCase().includes(q) ||
        owner.email.toLowerCase().includes(q) ||
        owner.canteenName.toLowerCase().includes(q),
    )
  }, [owners, query])

  const openCreate = () => {
    setEditingOwner(null)
    setForm(EMPTY_FORM)
    setShowFormModal(true)
  }

  const openEdit = (owner: Owner) => {
    setEditingOwner(owner)
    setForm({
      name: owner.name,
      email: owner.email,
      password: "",
      canteenName: owner.canteenName,
    })
    setShowFormModal(true)
  }

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.canteenName || (!editingOwner && !form.password)) {
      toast.error("Nama, email, nama kantin, dan password wajib diisi")
      return
    }

    setIsSubmitting(true)
    try {
      if (editingOwner) {
        const res = await fetch(`/api/admin/canteen-owners/${editingOwner.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password || undefined,
            canteenName: form.canteenName,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Gagal update pemilik kantin")
        setOwners((prev) => prev.map((owner) => (owner.id === editingOwner.id ? data.owner : owner)))
        toast.success("Pemilik kantin berhasil diperbarui")
      } else {
        const res = await fetch("/api/admin/canteen-owners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || "Gagal membuat pemilik kantin")
        setOwners((prev) => [...prev, data.owner])
        toast.success("Pemilik kantin berhasil dibuat")
      }
      setShowFormModal(false)
      setEditingOwner(null)
      setForm(EMPTY_FORM)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan data")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedOwner) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/canteen-owners/${selectedOwner.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus pemilik kantin")
      setOwners((prev) => prev.filter((owner) => owner.id !== selectedOwner.id))
      setShowDeleteModal(false)
      setSelectedOwner(null)
      toast.success("Pemilik kantin berhasil dihapus")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus data")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!admin) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="ADMIN" userName={admin.name} userAvatar={admin.avatar || "/placeholder-user.jpg"}>
      <div className="max-w-5xl mx-auto space-y-6 px-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Manajemen Kantin</h1>
            <p className="text-slate-500">Kelola akun pemilik kantin dan nama unit kantin</p>
          </div>
          <GlassButton onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Tambah Pemilik Kantin
          </GlassButton>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GlassCard className="p-4 text-center"><UserCog className="w-6 h-6 mx-auto mb-2 text-blue-600" /><p className="text-2xl font-bold text-slate-800">{owners.length}</p><p className="text-xs text-slate-500">Total Pemilik</p></GlassCard>
          <GlassCard className="p-4 text-center"><Store className="w-6 h-6 mx-auto mb-2 text-emerald-600" /><p className="text-2xl font-bold text-slate-800">{owners.length}</p><p className="text-xs text-slate-500">Total Kantin</p></GlassCard>
          <GlassCard className="p-4 text-center"><UtensilsCrossed className="w-6 h-6 mx-auto mb-2 text-amber-600" /><p className="text-2xl font-bold text-slate-800">Aktif</p><p className="text-xs text-slate-500">Status Unit</p></GlassCard>
        </div>

        <GlassCard className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <GlassInput placeholder="Cari pemilik, email, atau nama kantin..." className="pl-10" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-5 space-y-3">
          {filteredOwners.map((owner) => (
            <div key={owner.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-800">{owner.name}</p>
                <p className="text-sm text-slate-500">{owner.email}</p>
                <p className="text-sm text-slate-600">Kantin: {owner.canteenName}</p>
              </div>
              <div className="flex gap-2">
                <GlassButton size="sm" variant="secondary" onClick={() => openEdit(owner)}>Edit</GlassButton>
                <GlassButton size="sm" variant="danger" onClick={() => { setSelectedOwner(owner); setShowDeleteModal(true) }}><Trash2 className="w-4 h-4" /></GlassButton>
              </div>
            </div>
          ))}
          {filteredOwners.length === 0 && <div className="text-center py-8 text-slate-500">Data pemilik kantin tidak ditemukan.</div>}
        </GlassCard>

        <GlassModal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingOwner ? "Edit Pemilik Kantin" : "Tambah Pemilik Kantin"}>
          <div className="space-y-4">
            <GlassInput placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <GlassInput type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <GlassInput type="password" placeholder={editingOwner ? "Password baru (opsional)" : "Password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <GlassInput placeholder="Nama Kantin" value={form.canteenName} onChange={(e) => setForm({ ...form, canteenName: e.target.value })} />
            <GlassButton className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Simpan
            </GlassButton>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Pemilik Kantin">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Yakin ingin menghapus akun pemilik kantin ini?</p>
            <GlassButton variant="danger" className="w-full" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Hapus
            </GlassButton>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
