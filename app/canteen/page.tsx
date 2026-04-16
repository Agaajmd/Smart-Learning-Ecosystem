"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { 
  Search,
  Store,
  Star,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Utensils,
  Coffee,
  Cookie,
  Home,
  Clock3,
  ChefHat,
  CheckCircle2,
  CircleX,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { UserRole } from "@/lib/data-model"

type Product = {
  id: string
  canteenId: string
  name: string
  description?: string
  price: number
  stock: number
  category: "MAKANAN" | "MINUMAN" | "SNACK"
  image: string
  isAvailable: boolean
}

type Canteen = {
  id: string
  name: string
  isOpen: boolean
  image?: string
  description?: string
  rating?: number
  totalOrders?: number
}

type Viewer = {
  id: string
  name: string
  avatar: string
  role: UserRole
}

type OrderItem = {
  productId: string
  productName: string
  quantity: number
  price: number
}

type OrderStatus = "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"

type CanteenOrderHistory = {
  id: string
  canteenId: string
  canteenName: string
  customerId: string
  customerRole: UserRole
  customerName: string
  items: OrderItem[]
  totalAmount: number
  status: OrderStatus
  createdAt: string
  completedAt?: string
  notes?: string
}

interface CartItem extends OrderItem {
  canteenId: string
  canteenName: string
}

const getOrderStatusMeta = (status: OrderStatus) => {
  switch (status) {
    case "PENDING":
      return {
        label: "Menunggu",
        className: "bg-amber-100 text-amber-700 border-amber-200",
        icon: Clock3,
      }
    case "PREPARING":
      return {
        label: "Diproses",
        className: "bg-blue-100 text-blue-700 border-blue-200",
        icon: ChefHat,
      }
    case "READY":
      return {
        label: "Siap Diambil",
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
      }
    case "COMPLETED":
      return {
        label: "Selesai",
        className: "bg-slate-100 text-slate-700 border-slate-200",
        icon: CheckCircle2,
      }
    case "CANCELLED":
      return {
        label: "Dibatalkan",
        className: "bg-rose-100 text-rose-700 border-rose-200",
        icon: CircleX,
      }
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-700 border-slate-200",
        icon: Clock3,
      }
  }
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

export default function CanteenPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCart, setShowCart] = useState(false)
  const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [viewer, setViewer] = useState<Viewer | null>(null)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)

  const [canteens, setCanteens] = useState<Canteen[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orderHistory, setOrderHistory] = useState<CanteenOrderHistory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const loadOrderHistory = useCallback(async () => {
    try {
      const res = await fetchWithTimeout("/api/canteen/orders", {
        cache: "no-store",
        credentials: "include",
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        if (res.status !== 401) {
          setHistoryError(String(payload?.error || "Riwayat pesanan belum tersedia"))
        }
        return
      }

      const payload = await res.json().catch(() => ({}))
      setOrderHistory(Array.isArray(payload.orders) ? payload.orders : [])
      setHistoryError(null)
    } catch {
      setHistoryError("Riwayat pesanan belum dapat dimuat")
    }
  }, [])

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const res = await fetchWithTimeout("/api/canteen/overview", { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(String(data?.error || "Data kantin belum tersedia"))
        }
        if (!active) return
        if (data?.viewer?.id && data?.viewer?.role) {
          setViewer({
            id: String(data.viewer.id),
            name: String(data.viewer.name || "User"),
            avatar: String(data.viewer.avatar || "/placeholder-user.jpg"),
            role: data.viewer.role as UserRole,
          })
        }
        if (Array.isArray(data.canteens)) setCanteens(data.canteens)
        if (Array.isArray(data.products)) setProducts(data.products)
      } catch (error) {
        if (!active) return
        if (error instanceof Error && error.name === "AbortError") {
          setLoadError("Waktu memuat kantin terlalu lama. Coba muat ulang.")
        } else {
          setLoadError(error instanceof Error ? error.message : "Data kantin belum tersedia")
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    void loadOrderHistory()
    const intervalId = window.setInterval(() => {
      void loadOrderHistory()
    }, 15000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [loadOrderHistory])

  const activeCanteens = useMemo(() => canteens.filter((canteen) => canteen.isOpen), [canteens])
  
  const allProducts = useMemo(
    () =>
      products.filter((product) => {
        const canteen = canteens.find((item) => item.id === product.canteenId)
        return canteen?.isOpen && product.isAvailable
      }),
    [canteens, products],
  )

  const filteredProducts = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase()
    return allProducts.filter((product) => {
      const matchesSearch = !query || product.name.toLowerCase().includes(query)
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      const matchesCanteen = !selectedCanteen || product.canteenId === selectedCanteen.id
      return matchesSearch && matchesCategory && matchesCanteen
    })
  }, [allProducts, selectedCategory, selectedCanteen, debouncedSearchQuery])

  const categories = [
    { value: "all", label: "Semua", icon: Store },
    { value: "MAKANAN", label: "Makanan", icon: Utensils },
    { value: "MINUMAN", label: "Minuman", icon: Coffee },
    { value: "SNACK", label: "Snack", icon: Cookie },
  ]

  const cartTotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [cart],
  )
  const cartItemCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart])

  const addToCart = useCallback((product: Product) => {
    const canteen = canteens.find(c => c.id === product.canteenId)
    if (!canteen) return

    const existingItem = cart.find((item) => item.productId === product.id)
    const currentQty = existingItem?.quantity || 0
    if (currentQty >= Number(product.stock || 0)) {
      toast.error(`Stok ${product.name} tidak mencukupi`, {
        description: `Maksimal ${product.stock} item per pesanan saat ini`,
      })
      return
    }

    // Check if cart has items from different canteen
    if (cart.length > 0 && cart[0].canteenId !== product.canteenId) {
      toast.error("Anda hanya bisa pesan dari satu kantin dalam satu waktu", {
        description: "Kosongkan keranjang terlebih dahulu",
      })
      return
    }

    if (existingItem) {
      setCart((prev) =>
        prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      )
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          canteenId: product.canteenId,
          canteenName: canteen.name,
        },
      ])
    }
    toast.success(`${product.name} ditambahkan ke keranjang`)
  }, [cart, canteens])

  const removeFromCart = useCallback((productId: string) => {
    const existingItem = cart.find(item => item.productId === productId)
    if (existingItem && existingItem.quantity > 1) {
      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        ),
      )
    } else {
      setCart((prev) => prev.filter((item) => item.productId !== productId))
    }
  }, [cart])

  const clearCart = useCallback(() => {
    setCart([])
    setShowCart(false)
  }, [])

  const handleCheckout = useCallback(async () => {
    if (cart.length === 0) return
    setIsCheckingOut(true)
    try {
      const canteenId = cart[0]?.canteenId
      if (!canteenId) {
        toast.error("Kantin tidak valid")
        return
      }

      const staleItem = cart.find((item) => !products.find((product) => product.id === item.productId))
      if (staleItem) {
        toast.error("Ada produk yang sudah tidak tersedia. Muat ulang halaman lalu coba lagi.")
        return
      }

      const res = await fetchWithTimeout("/api/canteen/orders", {
        method: "POST",
        cache: "no-store",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canteenId,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data?.error || "Gagal membuat pesanan")
      }

      const orderedQuantityByProduct = new Map<string, number>()
      for (const item of cart) {
        orderedQuantityByProduct.set(
          item.productId,
          (orderedQuantityByProduct.get(item.productId) || 0) + Number(item.quantity || 0),
        )
      }

      setProducts((prev) =>
        prev.map((product) => {
          const orderedQuantity = orderedQuantityByProduct.get(product.id)
          if (!orderedQuantity) return product

          const nextStock = Math.max(0, Number(product.stock || 0) - orderedQuantity)
          return {
            ...product,
            stock: nextStock,
            isAvailable: nextStock > 0 ? product.isAvailable : false,
          }
        }),
      )

      if (data?.order?.id) {
        const fallbackCanteenName = canteens.find((item) => item.id === canteenId)?.name || "Kantin"
        const nextOrder: CanteenOrderHistory = {
          ...data.order,
          canteenName: String(data.order.canteenName || fallbackCanteenName),
        }
        setOrderHistory((prev) => [nextOrder, ...prev.filter((item) => item.id !== nextOrder.id)])
      } else {
        void loadOrderHistory()
      }

      toast.success("Pesanan berhasil dibuat!", {
        description: "Pembayaran dipotong dari saldo dompet. Cek status pada Riwayat Pesanan.",
      })
      clearCart()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal membuat pesanan"
      toast.error(message)
    } finally {
      setIsCheckingOut(false)
    }
  }, [cart, canteens, clearCart, loadOrderHistory, products])

  const quantityByProduct = useMemo(() => {
    return cart.reduce<Record<string, number>>((acc, item) => {
      acc[item.productId] = item.quantity
      return acc
    }, {})
  }, [cart])

  const getItemQuantity = useCallback(
    (productId: string) => quantityByProduct[productId] ?? 0,
    [quantityByProduct],
  )

  const latestOrderHistory = useMemo(() => orderHistory.slice(0, 8), [orderHistory])

  const pageContent = (
    <>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {!viewer ? (
                <Link href="/" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors">
                  <Home className="w-5 h-5 text-slate-600" />
                </Link>
              ) : null}
              <div>
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <span className="text-2xl">🍽️</span> EduCanteen
                </h1>
                <p className="text-xs text-slate-500">Pesan makanan dari kantin sekolah</p>
              </div>
            </div>
            <button 
              onClick={() => setShowCart(true)}
              className="relative p-2.5 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari makanan atau minuman..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-32">
        {/* Category Filter */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-6">
          {categories.map(cat => {
            const Icon = cat.icon
            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-2xl font-medium transition-all whitespace-nowrap",
                  selectedCategory === cat.value
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            )
          })}
        </div>

        {loadError ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
            {loadError}
          </div>
        ) : null}

        {/* Canteen List */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Kantin Tersedia</h2>
            {selectedCanteen && (
              <button 
                onClick={() => setSelectedCanteen(null)}
                className="text-sm text-orange-500 font-medium"
              >
                Lihat Semua
              </button>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {isLoading ? (
              <div className="min-w-full bg-white rounded-2xl p-2">
                <EmptySkeleton rows={2} className="py-4" />
              </div>
            ) : activeCanteens.length === 0 ? (
              <div className="min-w-full rounded-2xl border border-slate-200 bg-white p-5 text-center">
                <p className="font-medium text-slate-700">Belum ada kantin yang buka</p>
                <p className="text-sm text-slate-500 mt-1">Silakan cek lagi nanti atau hubungi admin kantin.</p>
              </div>
            ) : (
              activeCanteens.map(canteen => (
                <button
                  key={canteen.id}
                  onClick={() => setSelectedCanteen(selectedCanteen?.id === canteen.id ? null : canteen)}
                  className={cn(
                    "min-w-[200px] bg-white rounded-2xl p-4 border-2 transition-all text-left",
                    selectedCanteen?.id === canteen.id 
                      ? "border-orange-500 shadow-lg shadow-orange-500/20" 
                      : "border-transparent shadow hover:shadow-md"
                  )}
                >
                  <img 
                    src={canteen.image} 
                    alt={canteen.name}
                    className="w-full h-24 object-cover rounded-xl mb-3"
                  />
                  <h3 className="font-semibold text-slate-800 truncate">{canteen.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">{canteen.rating}</span>
                    </div>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500">{canteen.totalOrders}+ order</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {/* Products */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            {selectedCanteen ? `Menu ${selectedCanteen.name}` : "Semua Menu"}
          </h2>
          {isLoading ? (
            <div className="bg-white rounded-2xl p-2">
              <EmptySkeleton rows={4} className="py-4" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center">
              <p className="font-medium text-slate-700">Menu belum tersedia</p>
              <p className="text-sm text-slate-500 mt-1">
                {selectedCanteen
                  ? `Belum ada menu aktif di ${selectedCanteen.name}.`
                  : "Tidak ada menu aktif yang cocok dengan filter saat ini."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map(product => {
                const canteen = canteens.find(c => c.id === product.canteenId)
                const quantity = getItemQuantity(product.id)

                return (
                  <div 
                    key={product.id}
                    className="bg-white rounded-2xl shadow hover:shadow-md transition-shadow overflow-hidden"
                  >
                    <div className="relative">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-28 object-cover"
                      />
                      <span className={cn(
                        "absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium",
                        product.category === "MAKANAN" ? "bg-orange-100 text-orange-700" :
                        product.category === "MINUMAN" ? "bg-blue-100 text-blue-700" :
                        "bg-purple-100 text-purple-700"
                      )}>
                        {product.category}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-slate-500 truncate">{canteen?.name}</p>
                      <h3 className="font-semibold text-slate-800 text-sm truncate mt-0.5">{product.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-1">{product.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <p className="font-bold text-orange-600">Rp {product.price.toLocaleString()}</p>
                        {quantity > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(product.id)}
                              className="p-1 rounded-full bg-orange-100 text-orange-600 hover:bg-orange-200"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-slate-800 w-6 text-center">{quantity}</span>
                            <button
                              onClick={() => addToCart(product)}
                              disabled={quantity >= product.stock}
                              className="p-1 rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            disabled={product.stock <= 0}
                            className="p-1.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Riwayat Pesanan</h2>
            <span className="text-xs text-slate-500">Status pesanan terkini</span>
          </div>

          {historyError ? (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              {historyError}
            </div>
          ) : null}

          {latestOrderHistory.length === 0 ? (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 text-center">
              <p className="font-medium text-slate-700">Belum ada riwayat pesanan</p>
              <p className="text-sm text-slate-500 mt-1">Riwayat akan tampil setelah Anda melakukan checkout pesanan.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {latestOrderHistory.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status)
                const StatusIcon = statusMeta.icon
                const orderItems = Array.isArray(order.items) ? order.items : []
                const orderDateLabel = new Date(order.createdAt).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })

                return (
                  <div key={order.id} className="bg-white rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800">Pesanan {orderDateLabel}</p>
                        <p className="text-xs text-slate-500 mt-1 break-words">
                          {order.canteenName} • {new Date(order.createdAt).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", statusMeta.className)}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1">
                      {orderItems.slice(0, 2).map((item, index) => (
                        <p key={`${order.id}-item-${index}`} className="text-sm text-slate-600">
                          {item.quantity}x {item.productName}
                        </p>
                      ))}
                      {orderItems.length > 2 ? (
                        <p className="text-xs text-slate-500">+{orderItems.length - 2} item lainnya</p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">
                        {order.completedAt
                          ? `Selesai: ${new Date(order.completedAt).toLocaleString("id-ID")}`
                          : `Status terakhir: ${statusMeta.label}`}
                      </p>
                      <p className="text-sm font-semibold text-slate-800">Rp {Number(order.totalAmount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* Floating Cart Button */}
      {cartItemCount > 0 && !showCart && (
        <div className="fixed bottom-6 left-4 right-4 z-40">
          <button
            onClick={() => setShowCart(true)}
            className="w-full max-w-4xl mx-auto bg-orange-500 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="font-bold">{cartItemCount} item</p>
                <p className="text-sm text-white/80">{cart[0]?.canteenName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">Rp {cartTotal.toLocaleString()}</p>
              <p className="text-sm text-white/80">Lihat Keranjang</p>
            </div>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Keranjang Belanja</h2>
                <button onClick={() => setShowCart(false)} className="p-2 rounded-xl hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              {cart.length > 0 && (
                <p className="text-sm text-slate-500 mt-1">dari {cart[0].canteenName}</p>
              )}
            </div>

            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {cart.length > 0 ? (
                <div className="space-y-4">
                  {cart.map(item => {
                    const product = products.find(p => p.id === item.productId)
                    return (
                      <div key={item.productId} className="flex items-center gap-3">
                        <img 
                          src={product?.image} 
                          alt={item.productName}
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-slate-800 truncate">{item.productName}</h4>
                          <p className="text-orange-600 font-bold">Rp {(item.price * item.quantity).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">@ Rp {item.price.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.productId)}
                            className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-slate-800 w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => product && addToCart(product)}
                            disabled={!product || item.quantity >= product.stock}
                            className="p-1.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500">Keranjang masih kosong</p>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Total</span>
                  <span className="text-xl font-bold text-slate-800">Rp {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={clearCart}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-2xl font-medium hover:bg-slate-200 transition-colors"
                  >
                    Kosongkan
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={isCheckingOut}
                    className="flex-1 py-3 px-4 bg-orange-500 text-white rounded-2xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isCheckingOut ? "Memproses..." : "Pesan Sekarang"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )

  if (viewer) {
    return (
      <DashboardLayout role={viewer.role} userName={viewer.name} userAvatar={viewer.avatar}>
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50/30 -mx-4 sm:-mx-6 md:-mx-0">
          {pageContent}
        </div>
      </DashboardLayout>
    )
  }

  return <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50/30">{pageContent}</div>
}
