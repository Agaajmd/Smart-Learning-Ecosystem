import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbAttendance,
  getDbAuditLogs,
  getDbClasses,
  getDbGrades,
  getDbOrders,
  getDbPayments,
  getDbSuperAdmins,
  getDbTasks,
  getDbTeachers,
} from "@/lib/server/data-store"

export async function GET() {
  const users = await getAllDbUsers()
  const sessionUser = await getSessionUser()

  const toPercent = (value: number) => Math.max(0, Math.min(100, Number(value.toFixed(1))))
  const now = Date.now()
  const formatRelative = (isoDate: string) => {
    const ts = new Date(isoDate).getTime()
    if (!Number.isFinite(ts)) return "baru saja"
    const diffMs = Math.max(0, now - ts)
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 1) return "baru saja"
    if (diffHours < 24) return `${diffHours} jam lalu`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} hari lalu`
  }

  const paymentsByMonth = new Map<string, { income: number; expenses: number }>()
  const payments = getDbPayments()
  const orders = getDbOrders()
  const grades = getDbGrades()
  const attendance = getDbAttendance()
  const teachers = getDbTeachers()
  const tasks = getDbTasks()
  const auditLogs = getDbAuditLogs()

  payments.forEach((payment) => {
    const month = String(payment.dueDate || "").slice(0, 7) || "unknown"
    const current = paymentsByMonth.get(month) || { income: 0, expenses: 0 }
    if (payment.status === "PAID") {
      current.income += Number(payment.amount || 0)
    }
    paymentsByMonth.set(month, current)
  })

  orders.forEach((order) => {
    const month = String(order.createdAt || "").slice(0, 7) || "unknown"
    const current = paymentsByMonth.get(month) || { income: 0, expenses: 0 }
    current.income += Number(order.totalAmount || 0)
    paymentsByMonth.set(month, current)
  })

  const financialData = [...paymentsByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => ({
      month,
      income: totals.income,
      expenses: totals.expenses,
    }))

  const avgKnowledge =
    grades.length > 0 ? grades.reduce((acc, item) => acc + Number(item.knowledge || 0), 0) / grades.length : 0
  const avgSkill =
    grades.length > 0 ? grades.reduce((acc, item) => acc + Number(item.skill || 0), 0) / grades.length : 0
  const academicScore = toPercent((avgKnowledge + avgSkill) / 2)
  const attendanceRate =
    attendance.length > 0
      ? toPercent((attendance.filter((item) => item.status === "PRESENT").length / attendance.length) * 100)
      : 0
  const teacherPerformance =
    teachers.length > 0
      ? toPercent((teachers.reduce((acc, teacher) => acc + Number(teacher.rating || 0), 0) / teachers.length) * 20)
      : 0
  const paidCount = payments.filter((item) => item.status === "PAID").length
  const parentSatisfaction = payments.length > 0 ? toPercent((paidCount / payments.length) * 100) : 0

  const schoolPerformance = {
    academicScore,
    attendanceRate,
    teacherPerformance,
    parentSatisfaction,
  }

  const announcements = [
    ...tasks
      .filter((task) => Boolean(task.dueDate))
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 2)
      .map((task, index) => ({
        id: index + 1,
        title: `Deadline tugas: ${task.title}`,
        date: task.dueDate,
        priority: "medium",
      })),
    ...payments
      .filter((payment) => payment.status !== "PAID")
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 1)
      .map((payment, index) => ({
        id: index + 101,
        title: `Tagihan ${payment.type} jatuh tempo`,
        date: payment.dueDate,
        priority: "high",
      })),
  ].slice(0, 3)

  const recentActivities = [
    ...auditLogs
      .slice(-2)
      .reverse()
      .map((log, index) => ({
        id: index + 1,
        action: `${log.entityName} di-${log.action.toLowerCase()}`,
        time: formatRelative(log.createdAt),
        type: "staff",
      })),
    ...orders
      .slice(-1)
      .reverse()
      .map((order, index) => ({
        id: index + 11,
        action: `Pesanan kantin ${order.id} berstatus ${order.status.toLowerCase()}`,
        time: formatRelative(order.createdAt),
        type: "finance",
      })),
    ...payments
      .slice(-1)
      .reverse()
      .map((payment, index) => ({
        id: index + 21,
        action: `Pembayaran ${payment.type} ${payment.status.toLowerCase()}`,
        time: formatRelative(payment.dueDate),
        type: "academic",
      })),
  ].slice(0, 3)

  const expenseSource = new Map<string, number>()
  for (const payment of payments) {
    const key = payment.type
    expenseSource.set(key, (expenseSource.get(key) || 0) + Number(payment.amount || 0))
  }
  expenseSource.set(
    "Kantin",
    orders.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0),
  )
  const totalBreakdown = [...expenseSource.values()].reduce((acc, value) => acc + value, 0)
  const expenseBreakdown = [...expenseSource.entries()].map(([category, amount]) => ({
    category,
    amount,
    percentage: totalBreakdown > 0 ? Math.round((amount / totalBreakdown) * 100) : 0,
  }))

  const superAdmin =
    (sessionUser?.role === "SUPER_ADMIN"
      ? users.find((user) => user.id === sessionUser.id && user.isActive)
      : null) ||
    users.find((user) => user.role === "SUPER_ADMIN" && user.isActive) ||
    getDbSuperAdmins()[0] ||
    null

  return NextResponse.json({
    superAdmin,
    financialData,
    employees: users.filter((user) => user.role === "EMPLOYEE" && user.isActive),
    students: users.filter((user) => user.role === "STUDENT" && user.isActive),
    classes: getDbClasses(),
    schoolPerformance,
    announcements,
    recentActivities,
    expenseBreakdown,
  })
}
