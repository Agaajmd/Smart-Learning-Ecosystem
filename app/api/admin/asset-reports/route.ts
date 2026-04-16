import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import {
  getAllDbAssetReports,
  updateDbAssetReportById,
} from "@/lib/server/google-sheets-asset-reports"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbStudentReports,
  setDbStudentReports,
  type StudentReport,
} from "@/lib/server/persistent-store"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { logAudit } from "@/lib/server/audit-log"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"

const ALLOWED_STATUSES = new Set(["pending", "in_progress", "resolved"])

function normalizeStatus(value: unknown): "pending" | "in_progress" | "resolved" {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")

  if (normalized === "resolved") return "resolved"
  if (normalized === "in_progress") return "in_progress"
  return "pending"
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (sessionUser && sessionUser.role !== "ADMIN" && sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const [users, classes] = await Promise.all([getAllDbUsers(), getAllDbClasses().catch(() => [])])
  const { resolveClassId } = createClassIdResolver(classes)

  let reports = [] as StudentReport[]
  try {
    reports = (await getAllDbAssetReports()).map((report) => ({
      id: report.id,
      studentId: report.studentId,
      assetId: report.assetId,
      assetName: report.assetName,
      damageType: report.damageType,
      description: report.description,
      imageUrl: normalizeDriveMediaUrl(report.imageUrl),
      status: report.status,
      createdAt: report.createdAt,
      location: report.location,
      assignedTo: report.handledBy,
      resolvedAt: report.resolvedAt,
      resolution: report.resolution,
    }))
  } catch {
    reports = getDbStudentReports()
  }

  const studentsById = new Map(
    users
      .filter((user) => user.role === "STUDENT" && user.isActive)
      .map((user) => [user.id, user]),
  )

  const classById = new Map(classes.map((item) => [item.id, item]))

  const normalizedReports = reports
    .map((report) => {
      const student = studentsById.get(report.studentId)
      const classInfo = student?.classId ? classById.get(resolveClassId(student.classId)) : null
      return {
        ...report,
        reportedBy: student?.name || report.studentId,
        reporterClass: classInfo?.name || student?.classId || "-",
      }
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return NextResponse.json({ reports: normalizedReports })
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser()
  if (sessionUser && sessionUser.role !== "ADMIN" && sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = await request.json()
  const id = String(body.id || "").trim()
  const status = normalizeStatus(body.status)
  const resolution = body.resolution != null ? String(body.resolution).trim() : undefined
  const assignedTo = body.assignedTo != null ? String(body.assignedTo).trim() : undefined

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Status laporan tidak valid" }, { status: 400 })
  }

  let next: StudentReport | null = null

  try {
    const updated = await updateDbAssetReportById({
      id,
      status,
      resolution,
      handledBy: assignedTo || sessionUser?.id,
      resolvedAt: status === "resolved" ? new Date().toISOString() : undefined,
    })

    next = {
      id: updated.id,
      studentId: updated.studentId,
      assetId: updated.assetId,
      assetName: updated.assetName,
      damageType: updated.damageType,
      description: updated.description,
      imageUrl: normalizeDriveMediaUrl(updated.imageUrl),
      status: updated.status,
      createdAt: updated.createdAt,
      location: updated.location,
      assignedTo: updated.handledBy,
      resolvedAt: updated.resolvedAt,
      resolution: updated.resolution,
    }
  } catch {
    const current = getDbStudentReports().find((item) => item.id === id)
    if (!current) {
      return NextResponse.json({ error: "Laporan aset tidak ditemukan" }, { status: 404 })
    }

    const nextResolvedAt =
      status === "resolved" ? current.resolvedAt || new Date().toISOString() : current.resolvedAt

    next = {
      ...current,
      status,
      assignedTo: assignedTo ?? current.assignedTo,
      resolution: resolution ?? current.resolution,
      resolvedAt: nextResolvedAt,
    }
  }

  const currentReports = getDbStudentReports()
  setDbStudentReports(currentReports.map((item) => (item.id === id ? (next as StudentReport) : item)))

  logAudit({
    actorId: sessionUser?.id || "admin",
    action: "UPDATE",
    entityName: "ASSET_REPORT",
    entityId: id,
    oldValue: currentReports.find((item) => item.id === id) || null,
    newValue: next,
  })

  return NextResponse.json({ report: next })
}
