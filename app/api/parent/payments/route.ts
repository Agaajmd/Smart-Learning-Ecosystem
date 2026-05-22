import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import {
  createDbStudentPayment,
  loadDbStudentPaymentsWithMigration,
  updateDbStudentPaymentById,
} from "@/lib/server/google-sheets-student-payments"
import { loadDbSppDefaultsWithMigration } from "@/lib/server/google-sheets-spp-defaults"
import { getSessionUser } from "@/lib/server/session-user"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { resolveParentChildIds } from "@/lib/server/parent-child-links"
import {
  getDbClasses,
  getDbParents,
  getDbPayments,
  getDbSppDefaults,
  getDbStudents,
  setDbPayments,
  setDbSppDefaults,
} from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"
import { loadDbParentChildLinksWithMigration } from "@/lib/server/google-sheets-parent-children"
import { calculateWalletSnapshot } from "@/lib/server/wallet-balance"

function normalizeGrade(value: unknown) {
  return String(value || "").trim().toUpperCase()
}

function getCurrentPeriodKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

function buildDueDate(periodKey: string, dueDay: number) {
  const [yearValue, monthValue] = String(periodKey || "").split("-")
  const year = Number(yearValue)
  const month = Number(monthValue)
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return new Date().toISOString()
  }

  const maxDay = new Date(year, month, 0).getDate()
  const day = Math.max(1, Math.min(Number(dueDay) || 10, maxDay))
  return new Date(year, month - 1, day).toISOString()
}

function buildSppDescription(grade: string, date = new Date()) {
  const monthLabel = date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
  return `SPP Grade ${grade} - ${monthLabel}`
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser || sessionUser.role !== "PARENT") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as { childId?: string }
  const childId = String(body.childId || "").trim()
  if (!childId) {
    return NextResponse.json({ error: "ID anak wajib diisi" }, { status: 400 })
  }

  const [users, classes] = await Promise.all([
    getAllDbUsers(),
    getAllDbClasses().catch(() => getDbClasses()),
  ])
  const { resolveClassId } = createClassIdResolver(classes)

  const parentUser = users.find((user) => user.id === sessionUser.id && user.role === "PARENT" && user.isActive)
  if (!parentUser) {
    return NextResponse.json({ error: "Akun parent tidak ditemukan" }, { status: 404 })
  }

  const parentMap = getDbParents().find((item) => item.id === parentUser.id || item.email === parentUser.email) || null
  const parentChildLinks = await loadDbParentChildLinksWithMigration(getDbParents())
  const parentChildLink =
    parentChildLinks.find(
      (item) =>
        String(item.parentId || "").trim().toLowerCase() === String(parentUser.id || "").trim().toLowerCase() ||
        String(item.parentEmail || "").trim().toLowerCase() === String(parentUser.email || "").trim().toLowerCase(),
    ) || null
  const parentChildrenIds =
    (Array.isArray(parentChildLink?.childrenIds) && parentChildLink?.childrenIds.length > 0
      ? parentChildLink.childrenIds
      : parentMap?.childrenIds) || []
  const students = getDbStudents().map((student) => ({
    ...student,
    classId: resolveClassId(student.classId),
  }))

  const childrenIds = resolveParentChildIds({
    students,
    classes,
    parentChildrenIds,
    parentRelationField: parentUser.classId,
    resolveClassId,
  })

  if (!childrenIds.includes(childId)) {
    return NextResponse.json({ error: "Anak tidak ditemukan pada akun parent ini" }, { status: 403 })
  }

  const child = students.find((student) => student.id === childId)
  if (!child) {
    return NextResponse.json({ error: "Data anak tidak ditemukan" }, { status: 404 })
  }

  const childClass = classes.find((item) => item.id === resolveClassId(child.classId)) || null
  const childGrade = normalizeGrade(childClass?.grade)
  if (!childGrade) {
    return NextResponse.json({ error: "Grade anak belum terdeteksi" }, { status: 400 })
  }

  const sppDefaults = await loadDbSppDefaultsWithMigration(getDbSppDefaults())
  setDbSppDefaults(sppDefaults)

  const currentDefault = sppDefaults.find((item) => item.isActive && normalizeGrade(item.grade) === childGrade) || null
  if (!currentDefault) {
    return NextResponse.json({ error: `Default SPP untuk grade ${childGrade} belum diatur` }, { status: 400 })
  }

  const currentDate = new Date()
  const periodKey = getCurrentPeriodKey(currentDate)
  const dueDate = buildDueDate(periodKey, currentDefault.dueDay)
  const description = buildSppDescription(childGrade, currentDate)

  const payments = await loadDbStudentPaymentsWithMigration(getDbPayments())
  const existingPayment = payments.find(
    (payment) => payment.studentId === child.id && payment.type === "SPP" && payment.semester === periodKey,
  )

  if (existingPayment?.status === "PAID") {
    return NextResponse.json({ payment: existingPayment, alreadyPaid: true })
  }

  const walletSnapshot = await calculateWalletSnapshot(sessionUser.id)
  if (currentDefault.amount > walletSnapshot.walletBalance) {
    logAudit({
      actorId: sessionUser.id,
      action: "UPDATE",
      entityName: "student_payment_wallet_guard",
      entityId: existingPayment?.id || `pay-spp-${child.id}-${periodKey}`,
      oldValue: {
        walletBalance: walletSnapshot.walletBalance,
        approvedTopupAmount: walletSnapshot.approvedTopupAmount,
        pendingTopupAmount: walletSnapshot.pendingTopupAmount,
        spentAmount: walletSnapshot.spentAmount,
      },
      newValue: {
        result: "INSUFFICIENT_BALANCE",
        requiredAmount: currentDefault.amount,
        studentId: child.id,
        semester: periodKey,
      },
    })

    return NextResponse.json(
      {
        error: `Saldo dompet tidak cukup untuk membayar SPP. Saldo tersedia: Rp ${walletSnapshot.walletBalance.toLocaleString("id-ID")}`,
      },
      { status: 400 },
    )
  }

  const paidDate = new Date().toISOString()

  try {
    if (existingPayment) {
      const updated = await updateDbStudentPaymentById({
        id: existingPayment.id,
        amount: currentDefault.amount,
        dueDate,
        paidDate,
        status: "PAID",
        description,
        paidByUserId: sessionUser.id,
        paidVia: "WALLET",
      })

      const nextPayments = payments.map((payment) => (payment.id === existingPayment.id ? updated : payment))
      setDbPayments(nextPayments)

      logAudit({
        actorId: sessionUser.id,
        action: "UPDATE",
        entityName: "student_payment",
        entityId: updated.id,
        oldValue: existingPayment,
        newValue: {
          ...updated,
          walletSnapshot,
        },
      })

      return NextResponse.json({ payment: updated, alreadyPaid: false })
    }

    const created = await createDbStudentPayment({
      id: `pay-spp-${child.id}-${Date.now()}`,
      studentId: child.id,
      type: "SPP",
      description,
      amount: currentDefault.amount,
      dueDate,
      paidDate,
      status: "PAID",
      semester: periodKey,
      paidByUserId: sessionUser.id,
      paidVia: "WALLET",
    })

    setDbPayments([...payments, created])

    logAudit({
      actorId: sessionUser.id,
      action: "CREATE",
      entityName: "student_payment",
      entityId: created.id,
      oldValue: null,
      newValue: {
        ...created,
        walletSnapshot,
      },
    })

    return NextResponse.json({ payment: created, alreadyPaid: false }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memproses pembayaran SPP"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
