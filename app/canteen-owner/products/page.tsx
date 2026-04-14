"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
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

export default function CanteenOwnerProductsPage() {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "MAKANAN" as ProductCategory,
    stock: "",
    isAvailable: true,
  })

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`/api/canteen-owner/products?ownerId=${owner.id}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (data.owner) setOwner(data.owner)
        setProducts(data.products || [])
      } catch {
        // Keep fallback data on error.
      }
    }

    fetchProducts()
  }, [owner.id])

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
      })
    }
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.stock) {
      toast.error("Mohon lengkapi semua field yang diperlukan")
      return
    }

    try {
      if (editingProduct) {
        const res = await fetch(`/api/canteen-owner/products/${editingProduct.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            price: parseInt(formData.price),
            category: formData.category,
            stock: parseInt(formData.stock),
            isAvailable: formData.isAvailable,
          }),
        })
        if (!res.ok) throw new Error("Gagal update")
        const data = await res.json()
        setProducts(products.map(p => p.id === editingProduct.id ? data.product : p))
        toast.success("Produk berhasil diperbarui")
      } else {
        const res = await fetch("/api/canteen-owner/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canteenId: owner.canteenId,
            name: formData.name,
            description: formData.description,
            price: parseInt(formData.price),
            category: formData.category,
            stock: parseInt(formData.stock),
            isAvailable: formData.isAvailable,
          }),
        })
        if (!res.ok) throw new Error("Gagal tambah")
        const data = await res.json()
        setProducts([...products, data.product])
        toast.success("Produk berhasil ditambahkan")
      }
      setShowModal(false)
    } catch {
      toast.error("Gagal menyimpan produk")
    }
  }

  const handleDelete = async (productId: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      try {
        const res = await fetch(`/api/canteen-owner/products/${productId}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Gagal hapus")
        setProducts(products.filter(p => p.id !== productId))
        toast.success("Produk berhasil dihapus")
      } catch {
        toast.error("Gagal menghapus produk")
      }
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
      setProducts(products.map(p => p.id === productId ? data.product : p))
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

  if (!owner) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="CANTEEN_OWNER" userName={owner.name} userAvatar={owner.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
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
                        onClick={() => handleDelete(product.id)}
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
          <GlassCard>
            <EmptySkeleton rows={3} className="py-4" />
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
                className="flex-1 py-2.5 px-4 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
              >
                {editingProduct ? "Simpan" : "Tambah"}
              </button>
            </div>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
