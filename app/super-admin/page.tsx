"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { FinancialChart } from "@/components/organisms/financial-chart"
import { EmployeeLeaderboard } from "@/components/organisms/employee-leaderboard"
import { SchoolWalletTopup } from "@/components/organisms/school-wallet-topup"
import { WalletCard } from "@/components/organisms/wallet-card"
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  GraduationCap, 
  Briefcase, 
  School,
  Award,
  Target,
  BarChart3,
  PieChart,
  SlidersHorizontal,
  Calendar,
  Bell,
  ChevronRight,
  Star,
  CheckCircle2,
  AlertCircle
} from "lucide-react"
import Link from "next/link"

export default function SuperAdminDashboard() {
  const [superAdmin, setSuperAdmin] = useState<{ name: string; avatar: string } | null>(null)
  const [financialData, setFinancialData] = useState<Array<{ month: string; income: number; expenses: number }>>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [performance, setPerformance] = useState({
    academicScore: 0,
    attendanceRate: 0,
    teacherPerformance: 0,
    parentSatisfaction: 0,
  })
  const [agenda, setAgenda] = useState<Array<{ id: number; title: string; date: string; priority: string }>>([])
  const [activities, setActivities] = useState<Array<{ id: number; action: string; time: string; type: string }>>([])
  const [selectedPeriod, setSelectedPeriod] = useState("year")

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch("/api/super-admin/overview", { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return
        if (data.superAdmin) setSuperAdmin(data.superAdmin)
        if (Array.isArray(data.financialData)) setFinancialData(data.financialData)
        if (Array.isArray(data.employees)) setEmployees(data.employees)
        if (Array.isArray(data.students)) setStudents(data.students)
        if (Array.isArray(data.classes)) setClasses(data.classes)
        if (data.schoolPerformance) setPerformance(data.schoolPerformance)
        if (Array.isArray(data.announcements)) setAgenda(data.announcements)
        if (Array.isArray(data.recentActivities)) setActivities(data.recentActivities)
      } catch {
        // Keep current state when API is unavailable.
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const totalIncome = financialData.reduce((acc, d) => acc + d.income, 0)
  const totalExpenses = financialData.reduce((acc, d) => acc + d.expenses, 0)
  const profit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : "0.0"

  const quickStats = [
    { icon: GraduationCap, label: "Total Siswa", value: students.length, change: "+12", color: "text-blue-600", bgColor: "bg-blue-50" },
    { icon: Briefcase, label: "Total Guru", value: employees.length, change: "+3", color: "text-emerald-600", bgColor: "bg-emerald-50" },
    { icon: School, label: "Total Kelas", value: classes.length, change: "0", color: "text-purple-600", bgColor: "bg-purple-50" },
    { icon: Award, label: "Prestasi", value: 24, change: "+5", color: "text-amber-600", bgColor: "bg-amber-50" },
  ]

  const financialStats = [
    { icon: TrendingUp, label: "Total Pendapatan", value: `Rp ${(totalIncome / 1000000).toFixed(0)}M`, color: "text-green-600", bgColor: "bg-green-50" },
    { icon: TrendingDown, label: "Total Pengeluaran", value: `Rp ${(totalExpenses / 1000000).toFixed(0)}M`, color: "text-red-600", bgColor: "bg-red-50" },
    { icon: DollarSign, label: "Laba Bersih", value: `Rp ${(profit / 1000000).toFixed(0)}M`, color: "text-blue-600", bgColor: "bg-blue-50" },
    { icon: PieChart, label: "Margin", value: `${profitMargin}%`, color: "text-purple-600", bgColor: "bg-purple-50" },
  ]

  const menuItems = [
    { href: "/super-admin/finance", icon: BarChart3, label: "Keuangan", description: "Kelola keuangan sekolah", color: "bg-emerald-500" },
    { href: "/super-admin/staff", icon: Users, label: "Manajemen Staff", description: "Kelola staff, admin, dan pengaturan akses", color: "bg-blue-500" },
    { href: "/super-admin/features", icon: SlidersHorizontal, label: "Manajemen Fitur", description: "Aktifkan/nonaktifkan page lintas role", color: "bg-purple-500" },
  ]

  if (!superAdmin) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={superAdmin.name} userAvatar={superAdmin.avatar}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                Kepala Sekolah
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Dashboard Eksekutif</h1>
            <p className="text-slate-500">Ringkasan performa dan statistik sekolah</p>
          </div>
          <div className="flex gap-2">
            {["month", "quarter", "year"].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  selectedPeriod === period
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {period === "month" ? "Bulan" : period === "quarter" ? "Kuartal" : "Tahun"}
              </button>
            ))}
          </div>
        </div>

        <SchoolWalletTopup
          role="SUPER_ADMIN"
          renderTrigger={({ openModal, walletBalance, pendingAmount, isLoading }) => (
            <WalletCard
              ownerName={superAdmin.name}
              secondaryLabel="Kepala Sekolah"
              walletBalance={walletBalance}
              pendingAmount={pendingAmount}
              isLoading={isLoading}
              onTopupClick={openModal}
            />
          )}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className={`${stat.bgColor} rounded-2xl p-4 border border-slate-100`}>
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                  {stat.change !== "0" && (
                    <span className={`text-xs font-medium ${stat.change.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                      {stat.change}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-600">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* School Performance Metrics */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-slate-600" />
              Performa Sekolah
            </h2>
            <span className="text-xs text-slate-500">Periode: {selectedPeriod === "month" ? "Bulan Ini" : selectedPeriod === "quarter" ? "Kuartal Ini" : "Tahun Ini"}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Nilai Akademik", value: performance.academicScore, icon: GraduationCap, color: "blue" },
              { label: "Kehadiran", value: performance.attendanceRate, icon: CheckCircle2, color: "green" },
              { label: "Kinerja Guru", value: performance.teacherPerformance, icon: Star, color: "amber" },
              { label: "Kepuasan Ortu", value: performance.parentSatisfaction, icon: Users, color: "purple" },
            ].map((metric) => {
              const Icon = metric.icon
              return (
                <div key={metric.label} className="text-center">
                  <div className="relative w-20 h-20 mx-auto mb-2">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-slate-100"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(metric.value / 100) * 226} 226`}
                        strokeLinecap="round"
                        className={`text-${metric.color}-500`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-slate-800">{metric.value}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600">{metric.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Financial Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {financialStats.map((stat) => {
            const Icon = stat.icon
            return (
              <div key={stat.label} className={`${stat.bgColor} rounded-2xl p-4 border border-slate-100`}>
                <Icon className={`w-5 h-5 ${stat.color} mb-2`} />
                <p className="text-lg font-bold text-slate-800">{stat.value}</p>
                <p className="text-xs text-slate-600">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Financial Chart */}
          <FinancialChart data={financialData} />

          {/* Employee Leaderboard */}
          <EmployeeLeaderboard employees={employees} />
        </div>

        {/* Quick Access Menu */}
        <div>
          <h2 className="font-semibold text-slate-800 mb-4">Menu Utama</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 hover:shadow-md transition-all duration-200 group">
                    <div className={`p-3 ${item.color} rounded-xl`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800">{item.label}</h3>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Announcements & Recent Activity */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Upcoming Agenda */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-600" />
                Agenda Mendatang
              </h2>
              <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">Lihat Semua</span>
            </div>
            <div className="divide-y divide-slate-100">
              {agenda.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${item.priority === "high" ? "bg-red-500" : "bg-yellow-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.date}</p>
                  </div>
                  {item.priority === "high" && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-600" />
                Aktivitas Terbaru
              </h2>
              <span className="text-xs text-blue-600 font-medium cursor-pointer hover:underline">Lihat Semua</span>
            </div>
            <div className="divide-y divide-slate-100">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition-colors">
                  <div className={`p-1.5 rounded-lg ${
                    activity.type === "finance" ? "bg-green-100 text-green-600" :
                    activity.type === "staff" ? "bg-blue-100 text-blue-600" :
                    "bg-purple-100 text-purple-600"
                  }`}>
                    {activity.type === "finance" ? <DollarSign className="w-4 h-4" /> :
                     activity.type === "staff" ? <Users className="w-4 h-4" /> :
                     <GraduationCap className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{activity.action}</p>
                    <p className="text-xs text-slate-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
