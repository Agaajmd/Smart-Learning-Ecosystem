import { NextResponse } from "next/server"
import { createDbUser } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getDbStudents, setDbStudents } from "@/lib/server/persistent-store"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { logAudit } from "@/lib/server/audit-log"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/

function normalizeWhatsappNumber(raw: string) {
  return raw.trim().replace(/[\s-]/g, "")
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")
  const phone = normalizeWhatsappNumber(String(body.phone || ""))
  const classId = String(body.classId || "").trim()

  if (!name || !email || !password || !phone || !classId) {
    return NextResponse.json({ error: "Data siswa belum lengkap" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
  }

  if (!WHATSAPP_REGEX.test(phone)) {
    return NextResponse.json({ error: "Format nomor WhatsApp Indonesia tidak valid" }, { status: 400 })
  }

  const classes = await getAllDbClasses()
  const { resolveClassId } = createClassIdResolver(classes)
  const normalizedClassId = resolveClassId(classId)
  if (!normalizedClassId || !classes.some((item) => item.id === normalizedClassId)) {
    return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 })
  }

  const authUser = await createDbUser({
    name,
    email,
    password,
    phone,
    role: "STUDENT",
    classId: normalizedClassId,
    avatar: "",
  })

  const next = {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    phone: authUser.phone,
    avatar: authUser.avatar,
    role: "STUDENT" as const,
    classId: normalizedClassId,
    paymentStatus: "UNPAID" as const,
    behaviorScore: 0,
    attendance: "PRESENT" as const,
    seatRow: 0,
    seatCol: 0,
    coins: 0,
    streak: 0,
    level: 0,
    xp: 0,
  }

  setDbStudents([...getDbStudents(), next])
  logAudit({
    actorId: authUser.id,
    action: "CREATE",
    entityName: "students",
    entityId: next.id,
    oldValue: null,
    newValue: next,
  })

  return NextResponse.json({ student: next }, { status: 201 })
}
