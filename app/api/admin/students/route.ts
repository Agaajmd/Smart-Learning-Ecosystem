import { NextResponse } from "next/server"
import { createDbUser } from "@/lib/server/google-sheets-auth"
import { getDbStudents, setDbStudents } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function POST(request: Request) {
  const body = await request.json()
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")
  const classId = String(body.classId || "").trim()

  if (!name || !email || !password || !classId) {
    return NextResponse.json({ error: "Data siswa belum lengkap" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  const authUser = await createDbUser({
    name,
    email,
    password,
    role: "STUDENT",
    classId,
    avatar: "/placeholder-user.jpg",
  })

  const next = {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    avatar: authUser.avatar,
    role: "STUDENT" as const,
    classId,
    paymentStatus: "UNPAID" as const,
    behaviorScore: 100,
    attendance: "PRESENT" as const,
    seatRow: 0,
    seatCol: 0,
    coins: 0,
    streak: 0,
    level: 1,
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
