import { NextResponse } from "next/server"
import { createDbUser, updateDbUserById, deactivateDbUserById } from "@/lib/server/google-sheets-auth"
import { getDbParents, getDbStudents, setDbParents } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const classId = String(url.searchParams.get("classId") || "").trim()

  const students = getDbStudents().filter((student) => (classId ? student.classId === classId : true))
  const studentIds = new Set(students.map((student) => student.id))
  const parents = getDbParents().filter((parent) => parent.childrenIds.some((childId) => studentIds.has(childId)))

  return NextResponse.json({ parents, students })
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")
  const childId = String(body.childId || "").trim()

  if (!name || !email || !password || !childId) {
    return NextResponse.json({ error: "Data orang tua belum lengkap" }, { status: 400 })
  }

  const user = await createDbUser({
    name,
    email,
    password,
    role: "PARENT",
    avatar: "/placeholder-user.jpg",
  })

  const next = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: "PARENT" as const,
    childrenIds: [childId],
    phone: "",
  }

  setDbParents([...getDbParents(), next])
  logAudit({
    actorId: user.id,
    action: "CREATE",
    entityName: "parents",
    entityId: next.id,
    oldValue: null,
    newValue: next,
  })

  return NextResponse.json({ parent: next }, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const id = String(body.id || "").trim()
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  const parents = getDbParents()
  const target = parents.find((item) => item.id === id)
  if (!target) {
    return NextResponse.json({ error: "Orang tua tidak ditemukan" }, { status: 404 })
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
    childrenIds: body.childId ? [String(body.childId)] : target.childrenIds,
  }

  setDbParents(parents.map((item) => (item.id === id ? next : item)))
  logAudit({
    actorId: id,
    action: "UPDATE",
    entityName: "parents",
    entityId: id,
    oldValue: target,
    newValue: next,
  })

  return NextResponse.json({ parent: next })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = String(url.searchParams.get("id") || "").trim()
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  const parents = getDbParents()
  const target = parents.find((item) => item.id === id)
  if (!target) {
    return NextResponse.json({ error: "Orang tua tidak ditemukan" }, { status: 404 })
  }

  setDbParents(parents.filter((item) => item.id !== id))
  await deactivateDbUserById(id)
  logAudit({
    actorId: id,
    action: "DELETE",
    entityName: "parents",
    entityId: id,
    oldValue: target,
    newValue: null,
  })

  return NextResponse.json({ success: true })
}
