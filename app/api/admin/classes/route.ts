import { NextResponse } from "next/server"
import { getDbAdmins, getDbClasses, getDbStudents, setDbClasses } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function GET() {
  return NextResponse.json({
    admin: getDbAdmins()[0] || null,
    classes: getDbClasses(),
    students: getDbStudents(),
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = String(body.name || "").trim()
  const grade = String(body.grade || "").trim()
  const rows = Number(body.rows || 0)
  const cols = Number(body.cols || 0)
  const teacherId = String(body.teacherId || "")

  if (!name || !grade || rows <= 0 || cols <= 0) {
    return NextResponse.json({ error: "Data kelas belum lengkap" }, { status: 400 })
  }

  const next = {
    id: `c-${Date.now()}`,
    name,
    grade,
    rows,
    cols,
    teacherId,
  }

  setDbClasses([...getDbClasses(), next])
  logAudit({
    action: "CREATE",
    entityName: "classes",
    entityId: next.id,
    oldValue: null,
    newValue: next,
  })

  return NextResponse.json({ classItem: next }, { status: 201 })
}
