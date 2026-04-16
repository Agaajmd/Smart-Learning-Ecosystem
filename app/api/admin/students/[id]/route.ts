import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { deleteDbUserById, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getDbStudents, setDbStudents } from "@/lib/server/persistent-store"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { logAudit } from "@/lib/server/audit-log"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/

function normalizeWhatsappNumber(raw: string) {
  return raw.trim().replace(/[\s-]/g, "")
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const nextName = body.name ? String(body.name).trim() : undefined
  const nextEmail = body.email ? String(body.email).trim().toLowerCase() : undefined
  const nextPhone = body.phone != null ? normalizeWhatsappNumber(String(body.phone)) : undefined
  const nextPassword = body.password ? String(body.password) : undefined

  if (nextEmail && !EMAIL_REGEX.test(nextEmail)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
  }

  if (nextPhone != null && nextPhone !== "" && !WHATSAPP_REGEX.test(nextPhone)) {
    return NextResponse.json({ error: "Format nomor WhatsApp Indonesia tidak valid" }, { status: 400 })
  }

  if (nextPassword && nextPassword.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  const nextClassIdRaw = body.classId ? String(body.classId).trim() : undefined
  let normalizedNextClassId: string | undefined = undefined
  if (nextClassIdRaw !== undefined) {
    const classes = await getAllDbClasses()
    const { resolveClassId } = createClassIdResolver(classes)
    normalizedNextClassId = resolveClassId(nextClassIdRaw)
    if (!normalizedNextClassId || !classes.some((item) => item.id === normalizedNextClassId)) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })
    }
  }

  const students = getDbStudents()
  const target = students.find((item) => item.id === id)
  const users = await getAllDbUsers()
  const userTarget = users.find((item) => item.id === id && item.role === "STUDENT" && item.isActive)
  if (!target && !userTarget) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  await updateDbUserById({
    id,
    name: nextName,
    email: nextEmail,
    phone: nextPhone,
    password: nextPassword,
  })

  const next = {
    id,
    name: nextName || (target?.name || userTarget?.name || ""),
    email: nextEmail || (target?.email || userTarget?.email || ""),
    phone: nextPhone != null ? nextPhone : (target?.phone || userTarget?.phone),
    avatar: target?.avatar || userTarget?.avatar || "",
    role: "STUDENT" as const,
    classId: normalizedNextClassId ?? (target?.classId || userTarget?.classId || ""),
    paymentStatus: target?.paymentStatus || "UNPAID" as const,
    behaviorScore: target?.behaviorScore ?? 0,
    attendance: target?.attendance || "PRESENT" as const,
    seatRow: target?.seatRow ?? 0,
    seatCol: target?.seatCol ?? 0,
    coins: target?.coins ?? 0,
    streak: target?.streak ?? 0,
    level: target?.level ?? 0,
    xp: target?.xp ?? 0,
  }

  if (target) {
    setDbStudents(students.map((item) => (item.id === id ? next : item)))
  } else {
    setDbStudents([...students, next])
  }
  logAudit({
    actorId: id,
    action: "UPDATE",
    entityName: "students",
    entityId: id,
    oldValue: target || userTarget || null,
    newValue: next,
  })

  return NextResponse.json({ student: next })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const students = getDbStudents()
  const target = students.find((item) => item.id === id)
  const users = await getAllDbUsers()
  const userTarget = users.find((item) => item.id === id && item.role === "STUDENT")
  if (!target && !userTarget) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  setDbStudents(students.filter((item) => item.id !== id))
  await deleteDbUserById(id)
  logAudit({
    actorId: id,
    action: "DELETE",
    entityName: "students",
    entityId: id,
    oldValue: target || userTarget || null,
    newValue: null,
  })

  return NextResponse.json({ success: true })
}
