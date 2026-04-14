import { NextResponse } from "next/server"
import { deactivateDbUserById, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getDbStudents, setDbStudents } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()

  const students = getDbStudents()
  const target = students.find((item) => item.id === id)
  if (!target) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  await updateDbUserById({
    id,
    name: body.name ? String(body.name) : undefined,
    email: body.email ? String(body.email) : undefined,
    password: body.password ? String(body.password) : undefined,
  })

  const next = {
    ...target,
    name: body.name ? String(body.name) : target.name,
    email: body.email ? String(body.email) : target.email,
    classId: body.classId ? String(body.classId) : target.classId,
  }

  setDbStudents(students.map((item) => (item.id === id ? next : item)))
  logAudit({
    actorId: id,
    action: "UPDATE",
    entityName: "students",
    entityId: id,
    oldValue: target,
    newValue: next,
  })

  return NextResponse.json({ student: next })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const students = getDbStudents()
  const target = students.find((item) => item.id === id)
  if (!target) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  setDbStudents(students.filter((item) => item.id !== id))
  await deactivateDbUserById(id)
  logAudit({
    actorId: id,
    action: "DELETE",
    entityName: "students",
    entityId: id,
    oldValue: target,
    newValue: null,
  })

  return NextResponse.json({ success: true })
}
