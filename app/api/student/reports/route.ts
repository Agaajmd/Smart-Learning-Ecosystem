import { NextResponse } from "next/server"
import {
  getDbStudentReports,
  setDbStudentReports,
  type StudentReport,
} from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const studentId = String(url.searchParams.get("studentId") || "").trim()

  if (!studentId) {
    return NextResponse.json({ error: "studentId wajib diisi" }, { status: 400 })
  }

  const reports = getDbStudentReports()
    .filter((report) => report.studentId === studentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return NextResponse.json({ reports })
}

export async function POST(request: Request) {
  const body = await request.json()
  const studentId = String(body.studentId || "").trim()
  const assetId = String(body.assetId || "").trim()
  const damageType = String(body.damageType || "").trim()
  const description = String(body.description || "").trim()
  const location = String(body.location || "").trim()

  if (!studentId || !assetId || !damageType || !description || !location) {
    return NextResponse.json({ error: "Data laporan belum lengkap" }, { status: 400 })
  }

  const next: StudentReport = {
    id: `RPT${Date.now()}`,
    studentId,
    assetId,
    assetName: String(body.assetName || assetId),
    damageType,
    description,
    status: "pending",
    createdAt: new Date().toISOString(),
    location,
  }

  const reports = [next, ...getDbStudentReports()]
  setDbStudentReports(reports)

  logAudit({
    actorId: studentId,
    action: "CREATE",
    entityName: "STUDENT_REPORT",
    entityId: next.id,
    oldValue: null,
    newValue: next,
  })

  return NextResponse.json({ success: true, report: next })
}
