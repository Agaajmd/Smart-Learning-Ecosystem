import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { loadDbAuditLogsWithMigration } from "@/lib/server/google-sheets-audit-logs"
import { loadDbStudentPaymentsWithMigration } from "@/lib/server/google-sheets-student-payments"
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
  setDbAuditLogs,
} from "@/lib/server/persistent-store"

function getCurrentPeriodKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

async function loadPaymentsFromSheetOrStore() {
  return loadDbStudentPaymentsWithMigration(getDbPayments())
}

async function loadAuditLogsFromSheetOrStore() {
  const logs = await loadDbAuditLogsWithMigration(getDbAuditLogs())
  setDbAuditLogs(logs)
  return logs
}

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
  const payments = await loadPaymentsFromSheetOrStore()
  const orders = getDbOrders()
  const completedOrders = orders.filter((order) => order.status === "COMPLETED")
  const grades = getDbGrades()
  const attendance = getDbAttendance()
  const teachers = getDbTeachers()
  const tasks = getDbTasks()
  const auditLogs = await loadAuditLogsFromSheetOrStore()

  payments.forEach((payment) => {
    const month = String(payment.dueDate || "").slice(0, 7) || "unknown"
    const current = paymentsByMonth.get(month) || { income: 0, expenses: 0 }
    if (payment.status === "PAID") {
      current.income += Number(payment.amount || 0)
    }
    paymentsByMonth.set(month, current)
  })

  completedOrders.forEach((order) => {
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

  const studentUsers = users.filter((user) => user.role === "STUDENT" && user.isActive)
  const currentPeriodKey = getCurrentPeriodKey()
  const latestPaymentByStudentId = new Map<string, (typeof payments)[number]>()
  const sortedSppPayments = payments
    .filter((item) => item.type === "SPP")
    .sort((left, right) => {
      const leftSemester = String(left.semester || "")
      const rightSemester = String(right.semester || "")
      if (leftSemester !== rightSemester) {
        return rightSemester.localeCompare(leftSemester)
      }
      return String(right.dueDate || "").localeCompare(String(left.dueDate || ""))
    })

  for (const payment of sortedSppPayments) {
    if (!latestPaymentByStudentId.has(payment.studentId)) {
      latestPaymentByStudentId.set(payment.studentId, payment)
    }
  }

  const sortedCompletedOrders = [...completedOrders].sort((left, right) =>
    String(right.createdAt || "").localeCompare(String(left.createdAt || "")),
  )
  const sortedPayments = [...payments].sort((left, right) =>
    String(right.dueDate || "").localeCompare(String(left.dueDate || "")),
  )

  const studentsWithPaymentStatus = studentUsers.map((student) => {
    const currentSpp = payments.find(
      (item) =>
        item.studentId === student.id &&
        item.type === "SPP" &&
        item.semester === currentPeriodKey,
    )

    const latestSpp = latestPaymentByStudentId.get(student.id)
    return {
      ...student,
      paymentStatus: currentSpp?.status || latestSpp?.status || "UNPAID",
    }
  })

  const paidCount = studentsWithPaymentStatus.filter((item) => item.paymentStatus === "PAID").length
  const parentSatisfaction =
    studentsWithPaymentStatus.length > 0
      ? toPercent((paidCount / studentsWithPaymentStatus.length) * 100)
      : 0

  const schoolPerformance = {
    academicScore,
    attendanceRate,
    teacherPerformance,
    parentSatisfaction,
  }

  const teacherProfiles = getDbTeachers()
  const teacherProfileById = new Map(teacherProfiles.map((item) => [item.id, item]))
  const employeesFromUsers = users
    .filter((user) => user.role === "EMPLOYEE" && user.isActive)
    .map((user) => {
      const profile = teacherProfileById.get(user.id)
      return {
        ...user,
        subject: profile?.subject || user.subject || "-",
        rating: Number(profile?.rating || 0),
        classesCount: Number(profile?.classesCount || 0),
      }
    })

  const existingEmployeeIds = new Set(employeesFromUsers.map((item) => item.id))
  const mergedEmployees = [
    ...employeesFromUsers,
    ...teacherProfiles.filter((teacher) => !existingEmployeeIds.has(teacher.id)),
  ]

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
      .slice(0, 2)
      .map((log, index) => ({
        id: index + 1,
        action: `${log.entityName} di-${log.action.toLowerCase()}`,
        time: formatRelative(log.createdAt),
        type: "staff",
      })),
    ...sortedCompletedOrders
      .slice(0, 1)
      .map((order, index) => ({
        id: index + 11,
        action: `Pesanan kantin ${order.id} berstatus ${order.status.toLowerCase()}`,
        time: formatRelative(order.createdAt),
        type: "finance",
      })),
    ...sortedPayments
      .slice(0, 1)
      .map((payment, index) => ({
        id: index + 21,
        action: `Pembayaran ${payment.type} ${payment.status.toLowerCase()}`,
        time: formatRelative(payment.dueDate),
        type: "academic",
      })),
  ].slice(0, 3)

  const expenseSource = new Map<string, number>()
  for (const payment of payments) {
    if (payment.status !== "PAID") continue
    const key = payment.type
    expenseSource.set(key, (expenseSource.get(key) || 0) + Number(payment.amount || 0))
  }
  expenseSource.set(
    "Kantin",
    completedOrders.reduce((acc, order) => acc + Number(order.totalAmount || 0), 0),
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
    employees: mergedEmployees,
    students: studentsWithPaymentStatus,
    classes: getDbClasses(),
    schoolPerformance,
    announcements,
    recentActivities,
    expenseBreakdown,
    paymentSummary: {
      paid: studentsWithPaymentStatus.filter((item) => item.paymentStatus === "PAID").length,
      unpaid: studentsWithPaymentStatus.filter((item) => item.paymentStatus === "UNPAID").length,
      partial: studentsWithPaymentStatus.filter((item) => item.paymentStatus === "PARTIAL").length,
      totalStudents: studentsWithPaymentStatus.length,
    },
  })
}
