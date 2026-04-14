import { NextResponse } from "next/server"
import type { Employee, User } from "@/lib/data-model"
import { createDbUser, ensurePrincipalSeeded, getAllDbUsers } from "@/lib/server/google-sheets-auth"
import {
  getDbAdmins,
  getDbSchedules,
  getDbSuperAdmins,
  getDbTeachers,
  setDbAdmins,
  setDbTeachers,
} from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"
import { getSessionUser } from "@/lib/server/session-user"

type StaffType = "teacher" | "admin"

export async function GET() {
  await ensurePrincipalSeeded()
  const users = await getAllDbUsers()
  const sessionUser = await getSessionUser()
  const superAdmin =
    (sessionUser?.role === "SUPER_ADMIN"
      ? users.find((user) => user.id === sessionUser.id && user.role === "SUPER_ADMIN" && user.isActive) || null
      : null) || getDbSuperAdmins()[0] || null
  const teachers = getDbTeachers()
  const admins = getDbAdmins()
  const schedules = getDbSchedules()

  return NextResponse.json({ superAdmin, teachers, admins, schedules })
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    type?: StaffType
    name?: string
    email?: string
    password?: string
    subject?: string
  }

  const type = body.type || "teacher"
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")
  const subject = String(body.subject || "").trim()

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nama, email, dan password wajib diisi" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  const createdUser = await createDbUser({
    name,
    email,
    password,
    role: type === "teacher" ? "EMPLOYEE" : "ADMIN",
    avatar: "/placeholder-user.jpg",
  })

  if (type === "teacher") {
    const teachers = getDbTeachers()
    const newTeacher: Employee = {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      avatar: createdUser.avatar,
      role: "EMPLOYEE",
      subject: subject || "General",
      rating: 4.5,
      classesCount: 0,
    }
    setDbTeachers([...teachers, newTeacher])
    logAudit({
      actorId: createdUser.id,
      action: "CREATE",
      entityName: "staff",
      entityId: newTeacher.id,
      oldValue: null,
      newValue: newTeacher,
    })

    return NextResponse.json({ staff: newTeacher }, { status: 201 })
  }

  const admins = getDbAdmins()
  const newAdmin: User = {
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    avatar: createdUser.avatar,
    role: "ADMIN",
  }
  setDbAdmins([...admins, newAdmin])
  logAudit({
    actorId: createdUser.id,
    action: "CREATE",
    entityName: "staff",
    entityId: newAdmin.id,
    oldValue: null,
    newValue: newAdmin,
  })

  return NextResponse.json({ staff: newAdmin }, { status: 201 })
}
