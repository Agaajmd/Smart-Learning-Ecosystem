"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { 
  ArrowLeft,
  Wallet,
  TrendingUp,
  ShoppingBag,
  Calendar,
  Download,
  BarChart3,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type Owner = { id: string; name: string; avatar: string }
type OrderItem = { productName: string; quantity: number; price: number }
type Order = {
  id: string
  status: string
  createdAt: string
  totalAmount: number
  customerName: string
  items?: OrderItem[]
}

export default function CanteenOwnerFinancePage() {
  const [owner, setOwner] = useState<Owner | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>("today")
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const ordersRes = await fetch("/api/canteen-owner/orders", { cache: "no-store" })
        const ordersPayload = await ordersRes.json().catch(() => ({}))

        if (ordersRes.ok) {
          if (!active) return
          if (ordersPayload.owner) setOwner(ordersPayload.owner)
          if (Array.isArray(ordersPayload.orders)) setOrders(ordersPayload.orders)
          return
        }

        const dashboardRes = await fetch("/api/dashboard/canteen-owner", { cache: "no-store" })
        const dashboardPayload = await dashboardRes.json().catch(() => ({}))
        if (!dashboardRes.ok) {
          throw new Error(
            String(
              ordersPayload?.error ||
                dashboardPayload?.error ||
                "Gagal memuat data keuangan kantin",
            ),
          )
        }

        if (!active) return
        if (dashboardPayload.owner) setOwner(dashboardPayload.owner)
        if (Array.isArray(dashboardPayload.orders)) setOrders(dashboardPayload.orders)
      } catch (error) {
        if (!active) return
        setLoadError(error instanceof Error ? error.message : "Gagal memuat data keuangan kantin")
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    load().catch(() => {})

    return () => {
      active = false
    }
  }, [])

  const completedOrders = useMemo(() => orders.filter((o) => o.status === "COMPLETED"), [orders])
  const todayDate = useMemo(() => new Date(), [])
  const startOfToday = useMemo(() => {
    const date = new Date(todayDate)
    date.setHours(0, 0, 0, 0)
    return date
  }, [todayDate])

  const todayOrders = useMemo(
    () => completedOrders.filter((o) => new Date(o.createdAt) >= startOfToday),
    [completedOrders, startOfToday],
  )
  const todayRevenue = useMemo(
    () => todayOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0),
    [todayOrders],
  )

  const weekRevenueData = useMemo(() => {
    const weekAgo = new Date(startOfToday)
    weekAgo.setDate(weekAgo.getDate() - 6)
    const weekOrders = completedOrders.filter((o) => new Date(o.createdAt) >= weekAgo)
    const weekRevenue = weekOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0)
    return { weekOrders, weekRevenue }
  }, [completedOrders, startOfToday])

  const monthRevenue = useMemo(
    () => completedOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0),
    [completedOrders],
  )

  const dailyRevenue = useMemo(() => {
    const result = [] as { date: string; revenue: number; orders: number }[]
    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(startOfToday)
      day.setDate(day.getDate() - offset)
      const key = day.toISOString().slice(0, 10)
      const dayOrders = completedOrders.filter((o) => String(o.createdAt).slice(0, 10) === key)
      const revenue = dayOrders.reduce((acc, o) => acc + Number(o.totalAmount || 0), 0)
      result.push({
        date: day.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
        revenue,
        orders: dayOrders.length,
      })
    }
    return result
  }, [completedOrders, startOfToday])

  const topProducts = useMemo(() => {
    const productMap = new Map<string, { name: string; sold: number; revenue: number }>()
    for (const order of completedOrders) {
      for (const item of order.items || []) {
        const key = item.productName
        const current = productMap.get(key) || { name: key, sold: 0, revenue: 0 }
        current.sold += Number(item.quantity || 0)
        current.revenue += Number(item.price || 0) * Number(item.quantity || 0)
        productMap.set(key, current)
      }
    }
    return [...productMap.values()].sort((a, b) => b.sold - a.sold).slice(0, 5)
  }, [completedOrders])

  const maxRevenue = Math.max(...dailyRevenue.map((d) => d.revenue), 1)

  if (isLoading) {
    return <RouteLoading />
  }

  if (!owner) {
    return (
      <DashboardLayout role="CANTEEN_OWNER" userName="Pemilik Kantin" userAvatar="/placeholder-user.jpg">
        <div className="max-w-2xl mx-auto px-1">
          <GlassCard className="p-6 border border-amber-200 bg-amber-50 text-amber-700">
            {loadError || "Data owner belum tersedia. Hubungi admin untuk sinkronisasi akun owner dengan kantin."}
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  const periods = [
    { value: "today", label: "Hari Ini" },
    { value: "week", label: "Minggu Ini" },
    { value: "month", label: "Bulan Ini" },
  ]

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
              <h1 className="text-xl font-bold text-slate-800">Laporan Keuangan</h1>
              <p className="text-slate-500 text-sm">Ringkasan pendapatan dan penjualan</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {periods.map(period => (
            <button
              key={period.value}
              onClick={() => setSelectedPeriod(period.value)}
              className={cn(
                "flex-1 py-2.5 rounded-xl text-sm font-medium transition-all",
                selectedPeriod === period.value
                  ? "bg-blue-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className={cn(
            "p-5 relative overflow-hidden",
            selectedPeriod === "today" ? "ring-2 ring-blue-500" : ""
          )}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-green-600 mb-2">
                <Wallet className="w-5 h-5" />
                <span className="text-sm font-medium">Hari Ini</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">Rp {todayRevenue.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">{todayOrders.length} order selesai</p>
            </div>
          </GlassCard>

          <GlassCard className={cn(
            "p-5 relative overflow-hidden",
            selectedPeriod === "week" ? "ring-2 ring-blue-500" : ""
          )}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">Minggu Ini</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">Rp {weekRevenueData.weekRevenue.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">{weekRevenueData.weekOrders.length} order selesai</p>
            </div>
          </GlassCard>

          <GlassCard className={cn(
            "p-5 relative overflow-hidden",
            selectedPeriod === "month" ? "ring-2 ring-blue-500" : ""
          )}>
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">Bulan Ini</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">Rp {monthRevenue.toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-1">{completedOrders.length} order selesai</p>
            </div>
          </GlassCard>
        </div>

        {/* Revenue Chart */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Pendapatan 7 Hari Terakhir</h3>
            <BarChart3 className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex items-end justify-between gap-2 h-40">
            {dailyRevenue.map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col items-center">
                  <span className="text-xs text-slate-600 font-medium mb-1">
                    Rp {(day.revenue / 1000).toFixed(0)}k
                  </span>
                  <div 
                    className={cn(
                      "w-full rounded-t-lg transition-all",
                      idx === dailyRevenue.length - 1 ? "bg-blue-500" : "bg-blue-200"
                    )}
                    style={{ height: `${(day.revenue / maxRevenue) * 100}px` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{day.date}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Top Products */}
        <GlassCard className="p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Produk Terlaris</h3>
          <div className="space-y-3">
            {topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    idx === 0 ? "bg-yellow-100 text-yellow-700" :
                    idx === 1 ? "bg-slate-200 text-slate-700" :
                    idx === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-slate-100 text-slate-600"
                  )}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-slate-800">{product.name}</p>
                    <p className="text-sm text-slate-500">{product.sold} terjual</p>
                  </div>
                </div>
                <p className="font-semibold text-slate-800">Rp {product.revenue.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Recent Transactions */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Transaksi Terakhir</h3>
            <Link href="/canteen-owner/orders" className="text-sm text-blue-500">
              Lihat Semua
            </Link>
          </div>
          <div className="space-y-3">
            {completedOrders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-100">
                    <ShoppingBag className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">#{order.id.toUpperCase()}</p>
                    <p className="text-sm text-slate-500">{order.customerName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">+Rp {order.totalAmount.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  )
}
