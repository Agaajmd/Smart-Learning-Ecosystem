import { NextResponse } from "next/server"
import {
  createDbAssetReport,
  getAllDbAssetReports,
} from "@/lib/server/google-sheets-asset-reports"
import { createDbMediaAssetFromDataUrl } from "@/lib/server/google-sheets-media-assets"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbStudentReports,
  setDbStudentReports,
  type StudentReport,
} from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"

function normalizeMaybeString(value: unknown) {
  const next = String(value || "").trim()
  return next || undefined
}

async function normalizeReportImageUrl(input: unknown, reportKey: string) {
  const source = normalizeMaybeString(input)
  if (!source) return undefined

  if (!source.startsWith("data:")) {
    throw new Error("Gambar laporan harus diupload dari aplikasi.")
  }

  const stored = await createDbMediaAssetFromDataUrl({
    dataUrl: source,
    ownerType: "asset_report",
    ownerId: reportKey,
  })

  return stored.url
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const requestedStudentId = String(url.searchParams.get("studentId") || "").trim()
  const sessionUser = await getSessionUser()

  const studentId =
    (sessionUser?.role === "STUDENT" ? sessionUser.id : "") ||
    requestedStudentId

  if (
    sessionUser?.role === "STUDENT" &&
    requestedStudentId &&
    requestedStudentId !== sessionUser.id
  ) {
    return NextResponse.json({ error: "Akses laporan siswa ditolak" }, { status: 403 })
  }

  if (!studentId) {
    return NextResponse.json({ error: "studentId wajib diisi" }, { status: 400 })
  }

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

  const filteredReports = reports
    .filter((report) => report.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return NextResponse.json({ reports: filteredReports })
}

export async function POST(request: Request) {
  const body = await request.json()
  const sessionUser = await getSessionUser()
  const studentId = String(
    (sessionUser?.role === "STUDENT" ? sessionUser.id : body.studentId) || "",
  ).trim()
  const assetId = String(body.assetId || "").trim()
  const damageType = String(body.damageType || "").trim()
  const description = String(body.description || "").trim()
  const location = String(body.location || "").trim()
  let imageUrl: string | undefined

  try {
    imageUrl = await normalizeReportImageUrl(body.imageUrl, `report-${studentId || "student"}`)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses gambar" },
      { status: 400 },
    )
  }

  if (!studentId || !assetId || !damageType || !description || !location) {
    return NextResponse.json({ error: "Data laporan belum lengkap" }, { status: 400 })
  }

  let next: StudentReport
  try {
    const created = await createDbAssetReport({
      studentId,
      assetId,
      assetName: String(body.assetName || assetId),
      damageType,
      description,
      location,
      imageUrl,
      status: "pending",
    })

    next = {
      id: created.id,
      studentId: created.studentId,
      assetId: created.assetId,
      assetName: created.assetName,
      damageType: created.damageType,
      description: created.description,
      imageUrl: normalizeDriveMediaUrl(created.imageUrl),
      status: created.status,
      createdAt: created.createdAt,
      location: created.location,
      assignedTo: created.handledBy,
      resolvedAt: created.resolvedAt,
      resolution: created.resolution,
    }
  } catch {
    next = {
      id: `RPT${Date.now()}`,
      studentId,
      assetId,
      assetName: String(body.assetName || assetId),
      damageType,
      description,
      imageUrl: normalizeDriveMediaUrl(imageUrl),
      status: "pending",
      createdAt: new Date().toISOString(),
      location,
    }
  }

  setDbStudentReports([
    next,
    ...getDbStudentReports().filter((report) => report.id !== next.id),
  ])

  logAudit({
    actorId: studentId,
    action: "CREATE",
    entityName: "ASSET_REPORT",
    entityId: next.id,
    oldValue: null,
    newValue: next,
  })

  return NextResponse.json({ success: true, report: next })
}
