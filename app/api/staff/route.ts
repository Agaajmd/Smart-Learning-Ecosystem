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
} from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"
import { getSessionUser } from "@/lib/server/session-user"

type StaffType = "teacher" | "admin"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/

function normalizeWhatsappNumber(raw: string) {
  return raw.trim().replace(/[\s-]/g, "")
}

export async function GET() {
  await ensurePrincipalSeeded()
  const users = await getAllDbUsers()
  const sessionUser = await getSessionUser()
  const superAdmin =
    (sessionUser?.role === "SUPER_ADMIN"
      ? users.find((user) => user.id === sessionUser.id && user.role === "SUPER_ADMIN" && user.isActive) || null
      : null) || getDbSuperAdmins()[0] || null
  const teacherMap = new Map(getDbTeachers().map((teacher) => [teacher.id, teacher]))
  const adminMap = new Map(getDbAdmins().map((admin) => [admin.id, admin]))

  const teachersFromUsers = users
    .filter((user) => user.role === "EMPLOYEE")
    .map((user) => {
      const detail = teacherMap.get(user.id)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        role: "EMPLOYEE" as const,
        subject: detail?.subject || user.subject || "",
        rating: detail?.rating ?? 0,
        classesCount: detail?.classesCount ?? 0,
        homeroomClassId: detail?.homeroomClassId,
        isActive: user.isActive,
      }
    })

  const adminsFromUsers = users
    .filter((user) => user.role === "ADMIN")
    .map((user) => {
      const detail = adminMap.get(user.id)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: detail?.avatar || user.avatar,
        role: "ADMIN" as const,
        isActive: user.isActive,
      }
    })

  const teachersById = new Map(teachersFromUsers.map((teacher) => [teacher.id, teacher]))
  for (const teacher of getDbTeachers()) {
    if (!teachersById.has(teacher.id)) {
      teachersById.set(teacher.id, {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        avatar: teacher.avatar,
        role: "EMPLOYEE" as const,
        subject: teacher.subject || "",
        rating: teacher.rating,
        classesCount: teacher.classesCount,
        homeroomClassId: teacher.homeroomClassId,
        isActive: true,
      })
    }
  }

  const adminsById = new Map(adminsFromUsers.map((admin) => [admin.id, admin]))
  for (const admin of getDbAdmins()) {
    if (!adminsById.has(admin.id)) {
      adminsById.set(admin.id, {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        avatar: admin.avatar,
        role: "ADMIN" as const,
        isActive: true,
      })
    }
  }

  const teachers = Array.from(teachersById.values())
  const admins = Array.from(adminsById.values())

  const schedules = getDbSchedules()

  return NextResponse.json({ superAdmin, teachers, admins, schedules })
}

export async function POST(request: Request) {
  const users = await getAllDbUsers()
  const body = (await request.json()) as {
    type?: StaffType
    name?: string
    email?: string
    password?: string
    phone?: string
    subject?: string
  }

  const type = body.type || "teacher"
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")
  const phone = normalizeWhatsappNumber(String(body.phone || ""))
  const subject = String(body.subject || "").trim()

  if (!name || !email || !password || !phone) {
    return NextResponse.json({ error: "Nama, email, password, dan nomor WhatsApp wajib diisi" }, { status: 400 })
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
  }

  if (!WHATSAPP_REGEX.test(phone)) {
    return NextResponse.json({ error: "Format nomor WhatsApp Indonesia tidak valid" }, { status: 400 })
  }

  if (type === "teacher" && !subject) {
    return NextResponse.json({ error: "Mata pelajaran guru wajib diisi" }, { status: 400 })
  }

  if (users.some((user) => normalizeWhatsappNumber(user.phone || "") === phone)) {
    return NextResponse.json({ error: "Nomor WhatsApp sudah terdaftar" }, { status: 409 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  const createdUser = await createDbUser({
    name,
    email,
    password,
    phone,
    subject: type === "teacher" ? subject : undefined,
    role: type === "teacher" ? "EMPLOYEE" : "ADMIN",
    avatar: "",
  })

  if (type === "teacher") {
    const teachers = getDbTeachers()
    const newTeacher: Employee = {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      phone: createdUser.phone,
      avatar: createdUser.avatar,
      role: "EMPLOYEE",
      subject,
      rating: 0,
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
    phone: createdUser.phone,
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
