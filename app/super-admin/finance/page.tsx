"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  Filter,
  CreditCard,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
} from "recharts"

export default function SuperAdminFinance() {
  const [superAdmin, setSuperAdmin] = useState<{ name: string; avatar: string } | null>(null)
  const [financialData, setFinancialData] = useState<Array<{ month: string; income: number; expenses: number }>>([])
  const [students, setStudents] = useState<Array<{ paymentStatus?: string }>>([])
  const [expenseBreakdown, setExpenseBreakdown] = useState<Array<{ category: string; amount: number; percentage: number }>>([])
  const [selectedPeriod, setSelectedPeriod] = useState<"month" | "quarter" | "year">("month")

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
        if (Array.isArray(data.students)) setStudents(data.students)
        if (Array.isArray(data.expenseBreakdown)) setExpenseBreakdown(data.expenseBreakdown)
      } catch {
        // Keep fallback values.
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

  const paidStudents = students.filter((s) => s.paymentStatus === "PAID").length
  const unpaidStudents = students.filter((s) => s.paymentStatus === "UNPAID").length

  const paymentData = [
    { name: "Paid", value: paidStudents, color: "#22c55e" },
    { name: "Unpaid", value: unpaidStudents, color: "#ef4444" },
  ]

  const formatCurrency = (value: number) => `Rp ${(value / 1000000).toFixed(0)}M`

  if (!superAdmin) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={superAdmin.name} userAvatar={superAdmin.avatar}>
      <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Financial Overview</h1>
            <p className="text-sm sm:text-base text-slate-500">School finance dashboard</p>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 hover:bg-slate-200 transition-colors">
              <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Filter</span>
            </button>
            <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500/50 to-pink-500/50 rounded-xl text-xs sm:text-sm text-white hover:shadow-lg transition-all">
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-1.5 sm:gap-2">
          {(["month", "quarter", "year"] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all capitalize ${
                selectedPeriod === period
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {period}ly
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-green-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                <span className="flex items-center text-[10px] sm:text-xs text-green-500">
                  <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  12%
                </span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-slate-800">{formatCurrency(totalIncome)}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Total Income</p>
            </div>
          </GlassCard>

          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-red-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                <span className="flex items-center text-[10px] sm:text-xs text-red-500">
                  <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  5%
                </span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-slate-800">{formatCurrency(totalExpenses)}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Total Expenses</p>
            </div>
          </GlassCard>

          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-purple-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                <span className="flex items-center text-[10px] sm:text-xs text-green-500">
                  <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  18%
                </span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-slate-800">{formatCurrency(profit)}</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Net Profit</p>
            </div>
          </GlassCard>

          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <PieChart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-slate-800">{profitMargin}%</p>
              <p className="text-[10px] sm:text-xs text-slate-500">Profit Margin</p>
            </div>
          </GlassCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Income vs Expenses Chart */}
          <GlassCard>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                Income vs Expenses
              </h2>
            </div>
            <div className="h-48 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    tickFormatter={(value) => `${value / 1000000}M`}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Payment Status */}
          <GlassCard>
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                Payment Status
              </h2>
            </div>
            <div className="flex items-center justify-center h-36 sm:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={paymentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {paymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 sm:gap-6 mt-2">
              {paymentData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs sm:text-sm text-slate-500">
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Expense Breakdown */}
        <GlassCard>
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
            Expense Breakdown
          </h2>

          <div className="space-y-2.5 sm:space-y-3">
            {expenseBreakdown.map((expense) => (
              <div key={expense.category} className="space-y-1.5 sm:space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-800">{expense.category}</span>
                  <span className="text-slate-500">
                    {formatCurrency(expense.amount)} ({expense.percentage}%)
                  </span>
                </div>
                <div className="h-1.5 sm:h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${expense.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Trend Chart */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              Monthly Trend
            </h2>
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={financialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  tickFormatter={(value) => `${value / 1000000}M`}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255,255,255,0.1)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", strokeWidth: 2, r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>
    </DashboardLayout>
  )
}
