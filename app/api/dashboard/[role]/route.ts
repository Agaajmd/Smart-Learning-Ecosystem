import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getAllDbSchedules } from "@/lib/server/google-sheets-schedules"
import { getAllDbAssetReports } from "@/lib/server/google-sheets-asset-reports"
import { getAllDbOrdersFromSheet, migrateDbOrdersToSheet } from "@/lib/server/google-sheets-orders"
import { getAllDbProductsFromSheet } from "@/lib/server/google-sheets-products"
import { getSessionUser } from "@/lib/server/session-user"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { assignStudentSeatsToClasses } from "@/lib/server/class-seat-layout"
import { resolveParentChildIds } from "@/lib/server/parent-child-links"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"
import { resolveCanteenOwnerContext } from "@/lib/server/canteen-owner-context"
import {
  getDbActivityPoints,
  getDbAdmins,
  getDbAttendance,
  getDbAuditLogs,
  getDbCanteens,
  getDbClasses,
  getDbGrades,
  getDbOrders,
  getDbParents,
  getDbPayments,
  getDbProducts,
  getDbStudentReports,
  getDbStudents,
  getDbSuperAdmins,
  getDbTasks,
  getDbTeachers,
  setDbOrders,
  setDbProducts,
} from "@/lib/server/persistent-store"

const normalizeId = (value: unknown) => String(value || "").trim().toLowerCase()

const sameId = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeId(left)
  const normalizedRight = normalizeId(right)
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight
}

const normalizeDay = (value: unknown) => String(value || "").trim().toLowerCase()

const DAY_ALIASES: Record<string, string[]> = {
  monday: ["senin", "mon", "sen"],
  tuesday: ["selasa", "tue", "sel"],
  wednesday: ["rabu", "wed", "rab"],
  thursday: ["kamis", "thu", "kam"],
  friday: ["jumat", "jum'at", "fri", "jum"],
  saturday: ["sabtu", "sat", "sab"],
  sunday: ["minggu", "sun", "min"],
}

const getTodayDayKeys = () => {
  const todayEnglish = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date()).toLowerCase()
  const aliases = DAY_ALIASES[todayEnglish] || []
  return new Set([todayEnglish, ...aliases].map((item) => normalizeDay(item)).filter(Boolean))
}

export async function GET(request: Request, { params }: { params: Promise<{ role: string }> }) {
  const { role } = await params
  const url = new URL(request.url)
  const users = await getAllDbUsers()
  const [classesFromSheet, schedulesFromSheet] = await Promise.all([getAllDbClasses(), getAllDbSchedules()])
  const { resolveClassId } = createClassIdResolver(classesFromSheet)
  const sessionUser = await getSessionUser()

  switch (role) {
    case "student": {
      const mergedStudents = (() => {
        const sheetStudents = users
          .filter((user) => user.role === "STUDENT" && user.isActive)
          .map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatar: user.avatar,
            role: "STUDENT" as const,
            classId: resolveClassId(user.classId),
            paymentStatus: "UNPAID" as const,
            behaviorScore: 0,
            attendance: "PRESENT" as const,
            seatRow: Number((user as any).seatRow ?? 0),
            seatCol: Number((user as any).seatCol ?? 0),
            coins: 0,
            streak: Number((user as any).streak ?? 0),
            level: Number((user as any).level ?? 0),
            xp: Number((user as any).xp ?? 0),
          }))
        const storeStudents = getDbStudents().map((student) => ({ ...student, classId: resolveClassId(student.classId) }))
        const studentMap = new Map<string, (typeof storeStudents)[number]>()
        for (const student of storeStudents) studentMap.set(student.id, student)
        for (const student of sheetStudents) studentMap.set(student.id, { ...(studentMap.get(student.id) || student), ...student })
        return [...studentMap.values()]
      })()

      const student =
        (sessionUser?.role === "STUDENT" ? mergedStudents.find((user) => user.id === sessionUser.id) : null) ||
        mergedStudents[0] ||
        null
      if (!student) {
        return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
      }
      const classId = resolveClassId(student.classId)
      const schedules = schedulesFromSheet
        .map((schedule) => ({ ...schedule, classId: resolveClassId(schedule.classId) }))
        .filter((schedule) => schedule.classId === classId)
      const nextClass = schedules[0] || null
      const teacher = nextClass ? users.find((user) => user.id === nextClass.teacherId) || null : null
      const studentClass = classesFromSheet.find((classRoom) => classRoom.id === classId) || getDbClasses().find((classRoom) => classRoom.id === classId) || null
      const classmates = assignStudentSeatsToClasses(
        classesFromSheet,
        mergedStudents.filter((user) => resolveClassId(user.classId) === classId) as any,
      )

      return NextResponse.json({ student, nextClass, teacher, studentClass, classmates })
    }

    case "employee": {
      const employeeUser =
        (sessionUser?.role === "EMPLOYEE" ? users.find((user) => user.id === sessionUser.id && user.isActive) : null) ||
        users.find((user) => user.role === "EMPLOYEE" && user.isActive) ||
        null
      if (!employeeUser) {
        return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 })
      }

      const teacherMap = getDbTeachers().find((teacher) => sameId(teacher.id, employeeUser.id))
      const teacherId = employeeUser.id

      const taughtClassIds = new Set<string>()
      for (const schedule of schedulesFromSheet) {
        if (!sameId(schedule.teacherId, teacherId)) continue
        const normalizedClassId = resolveClassId(schedule.classId)
        if (normalizedClassId) {
          taughtClassIds.add(normalizedClassId)
        }
      }
      for (const classRoom of classesFromSheet) {
        if (sameId(classRoom.teacherId, teacherId)) {
          taughtClassIds.add(classRoom.id)
        }
      }
      for (const classRoom of getDbClasses()) {
        if (sameId(classRoom.teacherId, teacherId)) {
          const normalizedClassId = resolveClassId(classRoom.id)
          if (normalizedClassId) {
            taughtClassIds.add(normalizedClassId)
          }
        }
      }
      for (const task of getDbTasks()) {
        if (!sameId(task.teacherId, teacherId)) continue
        const normalizedClassId = resolveClassId(task.classId)
        if (normalizedClassId) {
          taughtClassIds.add(normalizedClassId)
        }
      }

      const todayDayKeys = getTodayDayKeys()
      const todayClasses = schedulesFromSheet
        .filter((schedule) => sameId(schedule.teacherId, teacherId) && todayDayKeys.has(normalizeDay(schedule.day)))
        .map((schedule) => ({
          ...schedule,
          classId: resolveClassId(schedule.classId),
        }))

      const employee = {
        id: employeeUser.id,
        name: employeeUser.name,
        email: employeeUser.email,
        avatar: employeeUser.avatar,
        role: "EMPLOYEE" as const,
        subject: employeeUser.subject || teacherMap?.subject || "-",
        rating: Number(teacherMap?.rating || 0),
        classesCount: Math.max(taughtClassIds.size, Number(teacherMap?.classesCount || 0)),
      }
      return NextResponse.json({ employee, todayClasses })
    }

    case "admin": {
      const adminUser =
        (sessionUser?.role === "ADMIN" ? users.find((user) => user.id === sessionUser.id && user.isActive) : null) ||
        users.find((user) => user.role === "ADMIN" && user.isActive) ||
        null
      const reportsSource = await (async () => {
        try {
          return (await getAllDbAssetReports()).map((report) => ({
            id: report.id,
            studentId: report.studentId,
            assetName: report.assetName,
            damageType: report.damageType,
            status: report.status,
            createdAt: report.createdAt,
          }))
        } catch {
          return getDbStudentReports().map((report) => ({
            id: report.id,
            studentId: report.studentId,
            assetName: report.assetName,
            damageType: report.damageType,
            status: report.status,
            createdAt: report.createdAt,
          }))
        }
      })()
      const reports = reportsSource.map((report) => ({
        id: report.id,
        type: report.damageType,
        title: report.assetName,
        status: report.status.replace("_", "-"),
        date: report.createdAt,
        reporter: users.find((item) => item.id === report.studentId)?.name || report.studentId,
        priority: report.status === "pending" ? "high" : report.status === "in_progress" ? "medium" : "low",
      }))
      const inventory = getDbCanteens().map((canteen) => {
        const products = getDbProducts().filter((product) => product.canteenId === canteen.id)
        const working = products.filter((product) => product.isAvailable).length
        const broken = Math.max(products.length - working, 0)
        return {
          id: canteen.id,
          name: canteen.name,
          total: products.length,
          working,
          broken,
        }
      })
      return NextResponse.json({ admin: adminUser || getDbAdmins()[0] || null, reports, inventory })
    }

    case "super-admin": {
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

      return NextResponse.json({
        superAdmin:
          (sessionUser?.role === "SUPER_ADMIN"
            ? users.find((user) => user.id === sessionUser.id && user.isActive)
            : null) ||
          users.find((user) => user.role === "SUPER_ADMIN" && user.isActive) ||
          getDbSuperAdmins()[0] ||
          null,
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

    case "parent": {
      const parent =
        (sessionUser?.role === "PARENT" ? users.find((user) => user.id === sessionUser.id && user.isActive) : null) ||
        users.find((user) => user.role === "PARENT" && user.isActive) ||
        null
      if (!parent) {
        return NextResponse.json({ error: "Parent tidak ditemukan" }, { status: 404 })
      }

      const parentMap = getDbParents().find((item) => item.id === parent.id || item.email === parent.email) || null
      type ParentStudentRow = {
        id: string
        name: string
        email: string
        phone?: string
        avatar: string
        role: "STUDENT"
        classId: string
        paymentStatus: "PAID" | "UNPAID" | "PARTIAL"
        behaviorScore: number
        attendance: "PRESENT" | "SICK" | "ALPHA"
        seatRow: number
        seatCol: number
        coins: number
        streak: number
        level: number
        xp: number
      }
      const studentsFromUsers: ParentStudentRow[] = users
        .filter((user) => user.role === "STUDENT" && user.isActive)
        .map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: "STUDENT" as const,
          classId: resolveClassId(user.classId),
          paymentStatus: "UNPAID" as const,
          behaviorScore: 0,
          attendance: "PRESENT" as const,
          seatRow: 0,
          seatCol: 0,
          coins: 0,
          streak: 0,
          level: 0,
          xp: 0,
        }))
      const studentsFromStore: ParentStudentRow[] = getDbStudents().map((student) => ({
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        avatar: student.avatar,
        role: "STUDENT",
        classId: resolveClassId(student.classId),
        paymentStatus: student.paymentStatus || "UNPAID",
        behaviorScore: Number(student.behaviorScore || 0),
        attendance: student.attendance || "PRESENT",
        seatRow: Number(student.seatRow || 0),
        seatCol: Number(student.seatCol || 0),
        coins: Number(student.coins || 0),
        streak: Number(student.streak || 0),
        level: Number(student.level || 0),
        xp: Number(student.xp || 0),
      }))
      const studentMap = new Map<string, ParentStudentRow>()
      for (const student of studentsFromStore) {
        studentMap.set(student.id, {
          ...student,
          classId: resolveClassId(student.classId),
        })
      }
      for (const student of studentsFromUsers) {
        studentMap.set(student.id, {
          ...(studentMap.get(student.id) || student),
          ...student,
          classId: student.classId || studentMap.get(student.id)?.classId || "",
        })
      }
      const mergedStudents = [...studentMap.values()]
      const childIds = resolveParentChildIds({
        students: mergedStudents,
        classes: classesFromSheet,
        parentChildrenIds: parentMap?.childrenIds,
        parentRelationField: parent.classId,
        resolveClassId,
      })
      const children = mergedStudents.filter((student) => childIds.includes(student.id))
      const selectedChildId = url.searchParams.get("childId") || children[0]?.id
      const selectedChild = children.find((item) => item.id === selectedChildId) || children[0] || null

      const data = selectedChild
        ? {
            payments: getDbPayments().filter((item) => item.studentId === selectedChild.id),
            attendance: getDbAttendance().filter((item) => item.studentId === selectedChild.id),
            activityPoints: getDbActivityPoints().filter((item) => item.studentId === selectedChild.id),
            grades: getDbGrades().filter((item) => item.studentId === selectedChild.id),
            childClass:
              classesFromSheet.find((item) => item.id === resolveClassId(selectedChild.classId)) ||
              getDbClasses().find((item) => item.id === resolveClassId(selectedChild.classId)) ||
              null,
          }
        : {
            payments: getDbPayments().filter(() => false),
            attendance: getDbStudents().filter(() => false),
            activityPoints: getDbActivityPoints().filter(() => false),
            grades: getDbGrades().filter(() => false),
            childClass: null,
          }

      return NextResponse.json({ parent, children, selectedChild, ...data })
    }

    case "canteen-owner": {
      if (!sessionUser) {
        return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
      }

      const isAdminViewer = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
      const isOwnerViewer = sessionUser.role === "CANTEEN_OWNER"
      if (!isAdminViewer && !isOwnerViewer) {
        return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
      }

      const requestedOwnerId = String(url.searchParams.get("ownerId") || "").trim()
      const ownerContext = await resolveCanteenOwnerContext({
        ownerId: isOwnerViewer ? sessionUser.id : requestedOwnerId || undefined,
      })
      if (!ownerContext) {
        return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
      }

      const owner = ownerContext.owner
      const canteen = ownerContext.canteen
      const canteenId = owner.canteenId
      let productsSource = getDbProducts()
      try {
        const fromSheet = await getAllDbProductsFromSheet()
        if (fromSheet.length > 0) {
          productsSource = fromSheet
          setDbProducts(fromSheet)
        }
      } catch {
        productsSource = getDbProducts()
      }

      const products = canteenId
        ? productsSource
            .filter((item) => item.canteenId === canteenId)
            .map((item) => ({
              ...item,
              image: normalizeDriveMediaUrl(item.image) || "",
            }))
        : []

      let ordersSource = [] as Awaited<ReturnType<typeof getAllDbOrdersFromSheet>>
      try {
        const fromSheet = await getAllDbOrdersFromSheet()
        if (fromSheet.length > 0) {
          ordersSource = fromSheet
          setDbOrders(fromSheet)
        } else {
          const localOrders = getDbOrders()
          if (localOrders.length > 0) {
            const migratedOrders = await migrateDbOrdersToSheet(localOrders)
            ordersSource = migratedOrders
            setDbOrders(migratedOrders)
          } else {
            ordersSource = fromSheet
            setDbOrders(fromSheet)
          }
        }
      } catch {
        ordersSource = []
      }

      const orders = canteenId
        ? ordersSource
            .filter((item) => item.canteenId === canteenId)
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        : []

      return NextResponse.json({ owner, canteen, products, orders })
    }

    default:
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 })
  }
}
