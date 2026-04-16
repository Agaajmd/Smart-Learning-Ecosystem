"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { 
  Package,
  ShoppingBag,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  Bell,
  ChevronRight,
  Store,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type OrderStatus = "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
type Owner = { id: string; name: string; avatar: string; canteenId: string }
type Canteen = { id: string; name: string; isOpen: boolean; rating: number }
type Product = { id: string; canteenId: string; isAvailable: boolean }
type Order = {
  id: string
  canteenId: string
  status: OrderStatus
  totalAmount: number
  createdAt: string
  customerName: string
  customerRole: string
  items: Array<{ productName: string; quantity: number; price: number }>
  notes?: string
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

export default function CanteenOwnerDashboard() {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [canteen, setCanteen] = useState<Canteen | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const res = await fetchWithTimeout("/api/dashboard/canteen-owner", { cache: "no-store" })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(String(payload?.error || "Gagal memuat data kantin"))
        }
        const data = await res.json()
        if (!active) return
        if (data.owner) setOwner(data.owner)
        setCanteen(data.canteen || null)
        if (Array.isArray(data.products)) setProducts(data.products)
        if (Array.isArray(data.orders)) setOrders(data.orders)
      } catch (error) {
        if (!active) return
        if (error instanceof Error && error.name === "AbortError") {
          setLoadError("Waktu memuat data terlalu lama. Silakan coba lagi.")
        } else {
          setLoadError(error instanceof Error ? error.message : "Gagal memuat data kantin")
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

  // Calculate statistics
  const todayKey = new Date().toISOString().slice(0, 10)
  const todayOrders = orders.filter((o) => String(o.createdAt || "").startsWith(todayKey))
  const pendingOrders = orders.filter(o => o.status === "PENDING")
  const preparingOrders = orders.filter(o => o.status === "PREPARING")
  const readyOrders = orders.filter(o => o.status === "READY")
  const completedOrders = orders.filter(o => o.status === "COMPLETED")
  const historicalOrders = useMemo(
    () =>
      orders
        .filter((order) => order.status === "COMPLETED" || order.status === "CANCELLED")
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 6),
    [orders],
  )
  
  const todayRevenue = todayOrders
    .filter(o => o.status === "COMPLETED")
    .reduce((acc, o) => acc + o.totalAmount, 0)
  const totalRevenue = completedOrders.reduce((acc, o) => acc + o.totalAmount, 0)

  const availableProducts = products.filter(p => p.isAvailable).length

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (updatingOrderId) return

    setUpdatingOrderId(orderId)
    try {
      const res = await fetch(`/api/canteen-owner/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal update status order"))
      }

      const data = await res.json()
      setOrders((prev) => prev.map((item) => (item.id === orderId ? data.order : item)))
      toast.success(`Order berhasil di-update ke ${getStatusLabel(newStatus)}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal update status order")
    } finally {
      setUpdatingOrderId(null)
    }
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "PENDING": return "bg-amber-100 text-amber-700 border-amber-200"
      case "PREPARING": return "bg-blue-100 text-blue-700 border-blue-200"
      case "READY": return "bg-green-100 text-green-700 border-green-200"
      case "COMPLETED": return "bg-slate-100 text-slate-700 border-slate-200"
      case "CANCELLED": return "bg-red-100 text-red-700 border-red-200"
      default: return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case "PENDING": return "Menunggu"
      case "PREPARING": return "Diproses"
      case "READY": return "Siap Diambil"
      case "COMPLETED": return "Selesai"
      case "CANCELLED": return "Dibatalkan"
      default: return status
    }
  }

  if (isLoading) {
    return <RouteLoading />
  }

  if (!owner) {
    return (
      <DashboardLayout role="CANTEEN_OWNER" userName="Pemilik Kantin" userAvatar="/placeholder-user.jpg">
        <div className="max-w-2xl mx-auto px-1">
          <GlassCard className="p-6 border border-amber-200 bg-amber-50">
            <h1 className="text-lg font-semibold text-amber-800">Data Kantin Belum Siap</h1>
            <p className="text-sm text-amber-700 mt-2">
              {loadError || "Akun ini belum terhubung ke data kantin. Hubungi admin untuk melengkapi data owner dan kantin."}
            </p>
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
        <div className="pb-2">
          <h1 className="text-xl font-bold text-slate-800">Selamat Datang, {owner.name}</h1>
          <p className="text-slate-500">{canteen?.name}</p>
        </div>

        {/* Canteen Status */}
        <GlassCard className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-400 to-red-500">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">{canteen?.name}</p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    canteen?.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {canteen?.isOpen ? "Buka" : "Tutup"}
                  </span>
                  <span className="text-xs text-slate-500">⭐ {canteen?.rating}</span>
                </div>
              </div>
            </div>
            <Link href="/canteen-owner/profile" className="text-sm text-blue-500">
              Pengaturan
            </Link>
          </div>
        </GlassCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100">
                <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{todayOrders.length}</p>
                <p className="text-xs text-slate-500">Order Hari Ini</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-100">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-bold text-slate-800 break-words">Rp {todayRevenue.toLocaleString()}</p>
                <p className="text-xs text-slate-600">Pendapatan Hari Ini</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-100">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{availableProducts}</p>
                <p className="text-xs text-slate-500">Produk Tersedia</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{pendingOrders.length}</p>
                <p className="text-xs text-slate-500">Order Pending</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/canteen-owner/products">
            <GlassCard className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100">
                  <Package className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-700">Kelola Produk</p>
                  <p className="text-xs text-slate-600">{products.length} produk</p>
                </div>
              </div>
            </GlassCard>
          </Link>
          <Link href="/canteen-owner/finance">
            <GlassCard className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-700">Keuangan</p>
                  <p className="text-xs text-slate-600">Lihat laporan</p>
                </div>
              </div>
            </GlassCard>
          </Link>
        </div>

        {/* Active Orders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Order Aktif</h2>
            <Link href="/canteen-owner/orders" className="text-sm text-blue-500 flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Order Status Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <div className={cn("px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1", "bg-amber-100 text-amber-700")}>
              <Clock className="w-4 h-4" />
              Pending ({pendingOrders.length})
            </div>
            <div className={cn("px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1", "bg-blue-100 text-blue-700")}>
              <ChefHat className="w-4 h-4" />
              Diproses ({preparingOrders.length})
            </div>
            <div className={cn("px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1", "bg-green-100 text-green-700")}>
              <CheckCircle className="w-4 h-4" />
              Siap ({readyOrders.length})
            </div>
          </div>

          {/* Order List */}
          <div className="space-y-3">
            {[...pendingOrders, ...preparingOrders, ...readyOrders].slice(0, 5).map(order => (
              <GlassCard key={order.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">#{order.id.toUpperCase()}</span>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", getStatusColor(order.status))}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 break-words">{order.customerName} • {order.customerRole}</p>
                  </div>
                    <p className="font-bold text-slate-800 text-right">Rp {order.totalAmount.toLocaleString()}</p>
                </div>

                <div className="space-y-1 mb-3">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.quantity}x {item.productName}</span>
                      <span className="text-slate-500">Rp {item.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {order.notes && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg mb-3">
                    📝 {order.notes}
                  </p>
                )}

                <div className="flex gap-2">
                  {order.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, "PREPARING")}
                        disabled={updatingOrderId === order.id}
                        className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        {updatingOrderId === order.id ? "Menyimpan..." : "Proses Order"}
                      </button>
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, "CANCELLED")}
                        disabled={updatingOrderId === order.id}
                        className="py-2 px-4 bg-red-100 text-red-600 rounded-xl text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {order.status === "PREPARING" && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, "READY")}
                      disabled={updatingOrderId === order.id}
                      className="flex-1 py-2 px-4 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      {updatingOrderId === order.id ? "Menyimpan..." : "Siap Diambil"}
                    </button>
                  )}
                  {order.status === "READY" && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, "COMPLETED")}
                      disabled={updatingOrderId === order.id}
                      className="flex-1 py-2 px-4 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition-colors"
                    >
                      {updatingOrderId === order.id ? "Menyimpan..." : "Selesai"}
                    </button>
                  )}
                </div>
              </GlassCard>
            ))}

            {pendingOrders.length === 0 && preparingOrders.length === 0 && readyOrders.length === 0 && (
              <GlassCard className="p-5 text-center">
                <p className="font-medium text-slate-700">Belum ada order aktif</p>
                <p className="text-sm text-slate-500 mt-1">Order baru akan muncul di sini saat siswa mulai memesan.</p>
              </GlassCard>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Riwayat Pesanan</h2>
            <Link href="/canteen-owner/orders" className="text-sm text-blue-500 flex items-center gap-1">
              Lihat Semua <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {historicalOrders.length === 0 ? (
            <GlassCard className="p-5 text-center">
              <p className="font-medium text-slate-700">Belum ada riwayat pesanan</p>
              <p className="text-sm text-slate-500 mt-1">Order selesai atau dibatalkan akan muncul di bagian ini.</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {historicalOrders.map((order) => (
                <GlassCard key={`${order.id}-history`} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">#{order.id.toUpperCase()}</p>
                      <p className="text-sm text-slate-500 mt-1 break-words">
                        {order.customerName} • {new Date(order.createdAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", getStatusColor(order.status))}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-slate-500">Status pesanan terkini: {getStatusLabel(order.status)}</p>
                    <p className="font-semibold text-slate-800">Rp {order.totalAmount.toLocaleString()}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
