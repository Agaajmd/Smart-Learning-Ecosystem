import { NextResponse } from "next/server"
import {
  getDbClasses,
  getDbStudents,
  setDbClasses,
  setDbStudents,
} from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function PATCH(request: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const body = await request.json()

  const classes = getDbClasses()
  const target = classes.find((item) => item.id === classId)
  if (!target) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })
  }

  const next = {
    ...target,
    name: body.name ? String(body.name) : target.name,
    grade: body.grade ? String(body.grade) : target.grade,
    rows: body.rows != null ? Number(body.rows) : target.rows,
    cols: body.cols != null ? Number(body.cols) : target.cols,
    teacherId: body.teacherId != null ? String(body.teacherId) : target.teacherId,
  }

  setDbClasses(classes.map((item) => (item.id === classId ? next : item)))
  logAudit({
    action: "UPDATE",
    entityName: "classes",
    entityId: classId,
    oldValue: target,
    newValue: next,
  })

  return NextResponse.json({ classItem: next })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const classes = getDbClasses()
  const target = classes.find((item) => item.id === classId)
  if (!target) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })
  }

  setDbClasses(classes.filter((item) => item.id !== classId))
  setDbStudents(getDbStudents().filter((student) => student.classId !== classId))
  logAudit({
    action: "DELETE",
    entityName: "classes",
    entityId: classId,
    oldValue: target,
    newValue: null,
  })

  return NextResponse.json({ success: true })
}
