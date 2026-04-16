"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { 
  ArrowLeft,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  ChefHat,
  ShoppingBag,
  Filter,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type OrderStatus = "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"

type Owner = { id: string; name: string; avatar: string; canteenId: string }
type OrderItem = { productName: string; quantity: number; price: number }
type Order = {
  id: string
  canteenId: string
  customerName: string
  customerRole: string
  createdAt: string
  completedAt?: string
  totalAmount: number
  status: OrderStatus
  items: OrderItem[]
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

export default function CanteenOwnerOrdersPage() {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoadError(null)
        const res = await fetchWithTimeout("/api/canteen-owner/orders", { cache: "no-store" })
        const payload = await res.json().catch(() => ({}))
        if (res.ok) {
          if (payload.owner) setOwner(payload.owner)
          setOrders(Array.isArray(payload.orders) ? payload.orders : [])
          return
        }

        setLoadError(String(payload?.error || "Data order belum dapat dimuat"))

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
          if (Array.isArray(dashboardData.orders)) {
            setOrders(dashboardData.orders)
          }
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          setLoadError("Waktu memuat data order terlalu lama. Coba lagi.")
        } else {
          setLoadError("Data order belum dapat dimuat")
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchOrders()
  }, [])

  const filteredOrders = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase()
    return orders.filter((order) => {
      const matchesSearch = !query || order.customerName.toLowerCase().includes(query) || order.id.toLowerCase().includes(query)
      const matchesStatus = filterStatus === "all" || order.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [orders, filterStatus, debouncedSearchQuery])

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
        throw new Error(String(payload?.error || "Gagal update status"))
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

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "PENDING": return <Clock className="w-4 h-4" />
      case "PREPARING": return <ChefHat className="w-4 h-4" />
      case "READY": return <CheckCircle className="w-4 h-4" />
      case "COMPLETED": return <CheckCircle className="w-4 h-4" />
      case "CANCELLED": return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const statusCounts = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc[order.status] += 1
        return acc
      },
      {
        PENDING: 0,
        PREPARING: 0,
        READY: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      },
    )
  }, [orders])

  const statusFilters = useMemo(
    () => [
      { value: "all", label: "Semua", count: orders.length },
      { value: "PENDING", label: "Menunggu", count: statusCounts.PENDING },
      { value: "PREPARING", label: "Diproses", count: statusCounts.PREPARING },
      { value: "READY", label: "Siap", count: statusCounts.READY },
      { value: "COMPLETED", label: "Selesai", count: statusCounts.COMPLETED },
      { value: "CANCELLED", label: "Batal", count: statusCounts.CANCELLED },
    ],
    [orders.length, statusCounts],
  )

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
        <div className="flex items-center gap-3">
          <Link href="/canteen-owner" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Manajemen Order</h1>
            <p className="text-slate-500 text-sm">{orders.length} total order</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari order atau nama pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statusFilters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value)}
              className={cn(
                "px-3 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2",
                filterStatus === filter.value
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {filter.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded-full text-xs",
                filterStatus === filter.value ? "bg-white/20" : "bg-slate-100"
              )}>
                {filter.count}
              </span>
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.map(order => (
            <GlassCard key={order.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">#{order.id.toUpperCase()}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1", getStatusColor(order.status))}>
                      {getStatusIcon(order.status)}
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{order.customerName}</p>
                  <p className="text-xs text-slate-400">
                    {order.customerRole} • {new Date(order.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-800">Rp {order.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-slate-500">{order.items.length} item</p>
                </div>
              </div>

              <div className="space-y-1 mb-3 py-3 border-y border-slate-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{item.quantity}x {item.productName}</span>
                    <span className="text-slate-500">Rp {item.price.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {order.notes && (
                <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded-lg mb-3">
                  📝 Catatan: {order.notes}
                </p>
              )}

              {order.completedAt && (
                <p className="text-sm text-green-600 mb-3">
                  ✓ Selesai: {new Date(order.completedAt).toLocaleString('id-ID')}
                </p>
              )}

              {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                <div className="flex gap-2">
                  {order.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, "PREPARING")}
                        disabled={updatingOrderId === order.id}
                        className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <ChefHat className="w-4 h-4" />
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
                      className="flex-1 py-2 px-4 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {updatingOrderId === order.id ? "Menyimpan..." : "Siap Diambil"}
                    </button>
                  )}
                  {order.status === "READY" && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, "COMPLETED")}
                      disabled={updatingOrderId === order.id}
                      className="flex-1 py-2 px-4 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {updatingOrderId === order.id ? "Menyimpan..." : "Selesai"}
                    </button>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <GlassCard className="p-6 text-center">
            <p className="font-medium text-slate-700">Belum ada order</p>
            <p className="text-sm text-slate-500 mt-1">
              {searchQuery || filterStatus !== "all"
                ? "Tidak ada order yang cocok dengan pencarian atau filter status."
                : "Order akan muncul otomatis saat ada transaksi baru dari siswa."}
            </p>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  )
}
