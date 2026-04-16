"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { 
  ArrowLeft,
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Filter,
  ImageIcon,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Owner = { id: string; name: string; avatar: string; canteenId: string }
type ProductCategory = "MAKANAN" | "MINUMAN" | "SNACK"
type Product = {
  id: string
  canteenId: string
  name: string
  description: string
  price: number
  image: string
  category: ProductCategory
  stock: number
  isAvailable: boolean
}

const REMOTE_IMAGE_URL_PATTERN = /^https?:\/\//i

function normalizeImagePayload(image: string) {
  const source = String(image || "").trim()
  if (!source) return undefined
  if (source.startsWith("data:")) return source
  if (REMOTE_IMAGE_URL_PATTERN.test(source)) return source
  return undefined
}

const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit, timeoutMs = 12000) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export default function CanteenOwnerProductsPage() {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "MAKANAN" as ProductCategory,
    stock: "",
    isAvailable: true,
    image: "",
  })

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadError(null)
        const res = await fetchWithTimeout("/api/canteen-owner/products", { cache: "no-store" })
        const payload = await res.json().catch(() => ({}))
        if (res.ok) {
          if (payload.owner) setOwner(payload.owner)
          setProducts(Array.isArray(payload.products) ? payload.products : [])
          return
        }

        setLoadError(String(payload?.error || "Data produk belum dapat dimuat"))

        const dashboardRes = await fetchWithTimeout("/api/dashboard/canteen-owner", { cache: "no-store" })
        if (dashboardRes.ok) {
          const dashboardData = await dashboardRes.json()
          if (dashboardData.owner) {
            setOwner({
              id: String(dashboardData.owner.id || ""),
              name: String(dashboardData.owner.name || "Pemilik Kantin"),
              avatar: String(dashboardData.owner.avatar || "/placeholder-user.jpg"),
              canteenId: String(dashboardData.owner.canteenId || ""),
            })
          }
          if (Array.isArray(dashboardData.products)) {
            setProducts(dashboardData.products)
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          setLoadError("Waktu memuat data produk terlalu lama. Coba lagi.")
        } else {
          setLoadError("Data produk belum dapat dimuat")
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = filterCategory === "all" || p.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        category: product.category,
        stock: product.stock.toString(),
        isAvailable: product.isAvailable,
        image: product.image,
      })
    } else {
      setEditingProduct(null)
      setFormData({
        name: "",
        description: "",
        price: "",
        category: "MAKANAN",
        stock: "",
        isAvailable: true,
        image: "",
      })
    }
    setShowModal(true)
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const result = String(loadEvent.target?.result || "")
      if (!result) return
      setFormData((prev) => ({ ...prev, image: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (isSubmitting) return

    if (!formData.name || !formData.price || !formData.stock) {
      toast.error("Mohon lengkapi semua field yang diperlukan")
      return
    }

    const imagePayload = normalizeImagePayload(formData.image)
    const uploadedImagePayload = imagePayload?.startsWith("data:") ? imagePayload : undefined

    setIsSubmitting(true)
    try {
      if (editingProduct) {
        const payload: Record<string, unknown> = {
          name: formData.name,
          description: formData.description,
          price: Number(formData.price),
          category: formData.category,
          stock: Number(formData.stock),
          isAvailable: formData.isAvailable,
        }
        if (uploadedImagePayload) {
          payload.image = uploadedImagePayload
        }

        const res = await fetch(`/api/canteen-owner/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(String(payload?.error || "Gagal update"))
        }

        const data = await res.json()
        setProducts((prev) => prev.map((item) => (item.id === editingProduct.id ? data.product : item)))
        toast.success("Produk berhasil diperbarui")
      } else {
        if (!owner) {
          toast.error("Data owner belum terhubung")
          return
        }
        const res = await fetch("/api/canteen-owner/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canteenId: owner.canteenId,
            name: formData.name,
            description: formData.description,
            price: Number(formData.price),
            category: formData.category,
            stock: Number(formData.stock),
            isAvailable: formData.isAvailable,
            ...(uploadedImagePayload ? { image: uploadedImagePayload } : {}),
          }),
        })

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(String(payload?.error || "Gagal tambah"))
        }

        const data = await res.json()
        setProducts((prev) => [...prev, data.product])
        toast.success("Produk berhasil ditambahkan")
      }
      setShowModal(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan produk")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (product: Product) => {
    setDeleteTarget(product)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/canteen-owner/products/${deleteTarget.id}`, { method: "DELETE" })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal hapus"))
      }

      setProducts((prev) => prev.filter((item) => item.id !== deleteTarget.id))
      toast.success("Produk berhasil dihapus")
      setDeleteTarget(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus produk")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleAvailability = async (productId: string) => {
    const target = products.find((p) => p.id === productId)
    if (!target) return

    try {
      const res = await fetch(`/api/canteen-owner/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !target.isAvailable }),
      })
      if (!res.ok) throw new Error("Gagal update status")
      const data = await res.json()
      setProducts((prev) => prev.map((item) => (item.id === productId ? data.product : item)))
      toast.success("Status produk diperbarui")
    } catch {
      toast.error("Gagal memperbarui status produk")
    }
  }

  const getCategoryColor = (category: ProductCategory) => {
    switch (category) {
      case "MAKANAN": return "bg-orange-100 text-orange-700"
      case "MINUMAN": return "bg-blue-100 text-blue-700"
      case "SNACK": return "bg-purple-100 text-purple-700"
      default: return "bg-slate-100 text-slate-700"
    }
  }

  if (isLoading) {
    return <RouteLoading />
  }

  if (!owner) {
    return (
      <DashboardLayout role="CANTEEN_OWNER" userName="Owner" userAvatar="/placeholder-user.jpg">
        <div className="max-w-4xl mx-auto px-1">
          <GlassCard className="p-6 text-center text-slate-600">
            <p className="font-medium text-slate-700">Data owner belum terhubung</p>
            <p className="text-sm mt-2 text-slate-500">
              {loadError || "Silakan buka halaman profil owner untuk melengkapi data kantin."}
            </p>
            <Link href="/canteen-owner/profile" className="inline-flex mt-4 text-sm text-blue-600 hover:text-blue-700">
              Buka Profil Owner
            </Link>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="CANTEEN_OWNER" userName={owner.name} userAvatar={owner.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
        {loadError ? (
          <GlassCard className="p-3 border border-amber-200 bg-amber-50 text-amber-700 text-sm">
            {loadError}
          </GlassCard>
        ) : null}
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/canteen-owner" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Kelola Produk</h1>
              <p className="text-slate-500 text-sm">{products.length} produk terdaftar</p>
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

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari produk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {[
              { value: "all", label: "Semua" },
              { value: "MAKANAN", label: "Makanan" },
              { value: "MINUMAN", label: "Minuman" },
              { value: "SNACK", label: "Snack" },
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setFilterCategory(filter.value)}
                className={cn(
                  "px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap",
                  filterCategory === filter.value
                    ? "bg-blue-500 text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.map(product => (
            <GlassCard key={product.id} className={cn("p-4", !product.isAvailable && "opacity-60")}>
              <div className="flex gap-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-20 h-20 rounded-xl object-cover bg-slate-100"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-slate-800 truncate">{product.name}</h3>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getCategoryColor(product.category))}>
                        {product.category}
                      </span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenModal(product)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-1">{product.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-bold text-blue-600">Rp {product.price.toLocaleString()}</p>
                    <p className="text-xs text-slate-500">Stok: {product.stock}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-600">Status:</span>
                <button
                  onClick={() => handleToggleAvailability(product.id)}
                  className={cn(
                    "relative w-12 h-6 rounded-full transition-colors",
                    product.isAvailable ? "bg-green-500" : "bg-slate-300"
                  )}
                >
                  <span className={cn(
                    "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                    product.isAvailable ? "left-6" : "left-0.5"
                  )} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <GlassCard className="p-6 text-center">
            <p className="font-medium text-slate-700">Produk belum tersedia</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery || filterCategory !== "all"
                ? "Tidak ada produk yang cocok dengan filter saat ini."
                : "Tambahkan produk pertama untuk mulai menerima pesanan."}
            </p>
          </GlassCard>
        )}

        {/* Add/Edit Modal */}
        <GlassModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title={editingProduct ? "Edit Produk" : "Tambah Produk Baru"}
        >
          <div className="space-y-4 p-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nama Produk *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contoh: Nasi Goreng Spesial"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                placeholder="Deskripsi singkat produk..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Foto Produk</label>
              <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
                <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                <ImageIcon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-600">Upload foto</span>
              </label>
              {formData.image ? (
                <img src={formData.image} alt="Preview produk" className="mt-3 w-full h-32 object-cover rounded-xl border border-slate-200" />
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Harga *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="15000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stok *</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ProductCategory })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MAKANAN">Makanan</option>
                <option value="MINUMAN">Minuman</option>
                <option value="SNACK">Snack</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Tersedia untuk dijual</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  formData.isAvailable ? "bg-green-500" : "bg-slate-300"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  formData.isAvailable ? "left-6" : "left-0.5"
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
                disabled={isSubmitting}
                className="flex-1 py-2.5 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                {isSubmitting ? "Menyimpan..." : editingProduct ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </GlassModal>

        <GlassModal
          isOpen={!!deleteTarget}
          onClose={() => {
            if (isDeleting) return
            setDeleteTarget(null)
          }}
          title="Hapus Produk"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Apakah Anda yakin ingin menghapus produk <span className="font-semibold text-slate-800">{deleteTarget?.name}</span>? Data ini tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
              >
                {isDeleting ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
