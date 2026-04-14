"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
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

export default function CanteenOwnerDashboard() {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [canteen, setCanteen] = useState<Canteen | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch("/api/dashboard/canteen-owner", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        if (data.owner) setOwner(data.owner)
        setCanteen(data.canteen || null)
        if (Array.isArray(data.products)) setProducts(data.products)
        if (Array.isArray(data.orders)) setOrders(data.orders)
      } catch {
        // Keep fallback empty state when API is unavailable.
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  // Calculate statistics
  const todayOrders = orders.filter(o => o.createdAt.startsWith("2025-12-30"))
  const pendingOrders = orders.filter(o => o.status === "PENDING")
  const preparingOrders = orders.filter(o => o.status === "PREPARING")
  const readyOrders = orders.filter(o => o.status === "READY")
  const completedOrders = orders.filter(o => o.status === "COMPLETED")
  
  const todayRevenue = todayOrders
    .filter(o => o.status === "COMPLETED")
    .reduce((acc, o) => acc + o.totalAmount, 0)
  const totalRevenue = completedOrders.reduce((acc, o) => acc + o.totalAmount, 0)

  const availableProducts = products.filter(p => p.isAvailable).length

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    toast.success(`Order berhasil di-update ke ${getStatusLabel(newStatus)}`)
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

  if (!owner) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="CANTEEN_OWNER" userName={owner.name} userAvatar={owner.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
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
            <Link href="/canteen-owner/settings" className="text-sm text-blue-500">
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
                        className="flex-1 py-2 px-4 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors"
                      >
                        Proses Order
                      </button>
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, "CANCELLED")}
                        className="py-2 px-4 bg-red-100 text-red-600 rounded-xl text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {order.status === "PREPARING" && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, "READY")}
                      className="flex-1 py-2 px-4 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors"
                    >
                      Siap Diambil
                    </button>
                  )}
                  {order.status === "READY" && (
                    <button
                      onClick={() => handleUpdateOrderStatus(order.id, "COMPLETED")}
                      className="flex-1 py-2 px-4 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition-colors"
                    >
                      Selesai
                    </button>
                  )}
                </div>
              </GlassCard>
            ))}

            {pendingOrders.length === 0 && preparingOrders.length === 0 && readyOrders.length === 0 && (
              <GlassCard>
                <EmptySkeleton rows={3} className="py-4" />
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
