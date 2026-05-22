"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
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

type FinancialPoint = { month: string; income: number; expenses: number }

type PaymentSummary = {
  paid: number
  unpaid: number
  partial: number
  totalStudents: number
}

function parseMonthKey(value: string) {
  const normalized = String(value || "").trim()
  const [yearPart, monthPart] = normalized.split("-")
  const year = Number(yearPart)
  const month = Number(monthPart)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }
  return { year, month }
}

function aggregateByPeriod(data: FinancialPoint[], period: "month" | "quarter" | "year") {
  if (period === "month") {
    return [...data].sort((left, right) => left.month.localeCompare(right.month))
  }

  const bucket = new Map<string, { income: number; expenses: number }>()
  for (const item of data) {
    const parsed = parseMonthKey(item.month)
    if (!parsed) continue

    const key =
      period === "quarter"
        ? `${parsed.year}-Q${Math.floor((parsed.month - 1) / 3) + 1}`
        : `${parsed.year}`

    const current = bucket.get(key) || { income: 0, expenses: 0 }
    current.income += Number(item.income || 0)
    current.expenses += Number(item.expenses || 0)
    bucket.set(key, current)
  }

  return [...bucket.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, totals]) => ({
      month,
      income: totals.income,
      expenses: totals.expenses,
    }))
}

function calculateChangePercent(current: number, previous: number) {
  const safeCurrent = Number(current || 0)
  const safePrevious = Number(previous || 0)

  if (safePrevious <= 0) {
    return safeCurrent > 0 ? 100 : 0
  }

  return ((safeCurrent - safePrevious) / safePrevious) * 100
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

const formatMillionTick = (value: number) => `${Math.round(Number(value || 0) / 1_000_000)}M`

export default function SuperAdminFinance() {
  const [superAdmin, setSuperAdmin] = useState<{ name: string; avatar: string } | null>(null)
  const [financialData, setFinancialData] = useState<FinancialPoint[]>([])
  const [expenseBreakdown, setExpenseBreakdown] = useState<Array<{ category: string; amount: number; percentage: number }>>([])
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary>({
    paid: 0,
    unpaid: 0,
    partial: 0,
    totalStudents: 0,
  })
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
        if (Array.isArray(data.expenseBreakdown)) setExpenseBreakdown(data.expenseBreakdown)
        if (data.paymentSummary && typeof data.paymentSummary === "object") {
          setPaymentSummary({
            paid: Number(data.paymentSummary.paid || 0),
            unpaid: Number(data.paymentSummary.unpaid || 0),
            partial: Number(data.paymentSummary.partial || 0),
            totalStudents: Number(data.paymentSummary.totalStudents || 0),
          })
        }
      } catch {
        // Keep fallback values.
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const displayFinancialData = useMemo(
    () => aggregateByPeriod(financialData, selectedPeriod),
    [financialData, selectedPeriod],
  )

  const totalIncome = displayFinancialData.reduce((acc, d) => acc + d.income, 0)
  const totalExpenses = displayFinancialData.reduce((acc, d) => acc + d.expenses, 0)
  const profit = totalIncome - totalExpenses
  const profitMargin = totalIncome > 0 ? ((profit / totalIncome) * 100).toFixed(1) : "0.0"

  const latestPoint = displayFinancialData[displayFinancialData.length - 1]
  const previousPoint = displayFinancialData[displayFinancialData.length - 2]
  const incomeChange = calculateChangePercent(latestPoint?.income || 0, previousPoint?.income || 0)
  const expenseChange = calculateChangePercent(latestPoint?.expenses || 0, previousPoint?.expenses || 0)
  const profitChange = calculateChangePercent(
    (latestPoint?.income || 0) - (latestPoint?.expenses || 0),
    (previousPoint?.income || 0) - (previousPoint?.expenses || 0),
  )

  const paymentData = [
    { name: "Paid", value: paymentSummary.paid, color: "#22c55e" },
    { name: "Partial", value: paymentSummary.partial, color: "#f59e0b" },
    { name: "Unpaid", value: paymentSummary.unpaid, color: "#ef4444" },
  ]
  const hasPaymentData = paymentData.some((item) => item.value > 0)

  if (!superAdmin) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={superAdmin.name} userAvatar={superAdmin.avatar}>
      <div className="w-full max-w-5xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Keuangan Sekolah</h1>
            <p className="text-sm sm:text-base text-slate-500">Ringkasan keuangan berbasis data pembayaran aktual</p>
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
                  ? "bg-slate-800 text-white shadow-lg"
                  : "bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {period === "month" ? "Bulanan" : period === "quarter" ? "Kuartalan" : "Tahunan"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <GlassCard className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-12 h-12 sm:w-16 sm:h-16 bg-green-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                <span
                  className={`flex items-center text-[10px] sm:text-xs ${incomeChange >= 0 ? "text-green-600" : "text-rose-600"}`}
                >
                  {incomeChange >= 0 ? (
                    <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  ) : (
                    <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  )}
                  {Math.abs(incomeChange).toFixed(1)}%
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
                <span
                  className={`flex items-center text-[10px] sm:text-xs ${expenseChange >= 0 ? "text-rose-600" : "text-green-600"}`}
                >
                  {expenseChange >= 0 ? (
                    <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  ) : (
                    <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  )}
                  {Math.abs(expenseChange).toFixed(1)}%
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
                <span
                  className={`flex items-center text-[10px] sm:text-xs ${profitChange >= 0 ? "text-green-600" : "text-rose-600"}`}
                >
                  {profitChange >= 0 ? (
                    <ArrowUpRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  ) : (
                    <ArrowDownRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  )}
                  {Math.abs(profitChange).toFixed(1)}%
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
                <BarChart data={displayFinancialData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10 }} />
                  <YAxis
                    stroke="#64748b"
                    tickFormatter={(value) => formatMillionTick(Number(value))}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e2e8f0",
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
              {hasPaymentData ? (
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
              ) : (
                <p className="text-sm text-slate-500">Belum ada data status pembayaran siswa.</p>
              )}
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

          {expenseBreakdown.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data breakdown.</p>
          ) : (
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
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${expense.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Trend Chart */}
        <GlassCard>
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
              {selectedPeriod === "month" ? "Tren Bulanan" : selectedPeriod === "quarter" ? "Tren Kuartalan" : "Tren Tahunan"}
            </h2>
          </div>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayFinancialData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis
                  stroke="#64748b"
                  tickFormatter={(value) => formatMillionTick(Number(value))}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
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
