import { NextResponse } from "next/server"
import { deleteDbUserById, getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getAllDbTasks } from "@/lib/server/google-sheets-tasks"
import { getAllDbTaskSubmissions } from "@/lib/server/google-sheets-task-submissions"
import {
  getDbAdmins,
  getDbClasses,
  getDbSchedules,
  getDbTasks,
  getDbTaskSubmissions,
  getDbTeachers,
  setDbAdmins,
  setDbTaskSubmissions,
  setDbTasks,
  setDbTeachers,
} from "@/lib/server/persistent-store"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { logAudit } from "@/lib/server/audit-log"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/

function normalizeWhatsappNumber(raw: string) {
  return raw.trim().replace(/[\s-]/g, "")
}

async function loadTasksFromSheetOrStore() {
  try {
    const tasks = await getAllDbTasks()
    setDbTasks(tasks)
    return tasks
  } catch {
    return getDbTasks()
  }
}

async function loadTaskSubmissionsFromSheetOrStore() {
  try {
    const submissions = await getAllDbTaskSubmissions()
    setDbTaskSubmissions(submissions)
    return submissions
  } catch {
    return getDbTaskSubmissions()
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const users = await getAllDbUsers()
  const targetUser = users.find((item) => item.id === id && (item.role === "EMPLOYEE" || item.role === "ADMIN"))
  const teacher = getDbTeachers().find((item) => item.id === id)
  const admin = getDbAdmins().find((item) => item.id === id)

  if (!teacher && !admin && !targetUser) {
    return NextResponse.json({ error: "Staff tidak ditemukan" }, { status: 404 })
  }

  if ((admin && !targetUser) || targetUser?.role === "ADMIN") {
    const resolvedAdmin = admin || {
      id: id,
      name: targetUser?.name || "",
      email: targetUser?.email || "",
      phone: targetUser?.phone,
      avatar: targetUser?.avatar || "",
      role: "ADMIN" as const,
    }

    return NextResponse.json({
      staff: resolvedAdmin,
      type: "admin",
      schedules: [],
      tasks: [],
      taskSubmissions: [],
      classes: [],
    })
  }

  const resolvedTeacher = teacher || {
    id: id,
    name: targetUser?.name || "",
    email: targetUser?.email || "",
    phone: targetUser?.phone,
    avatar: targetUser?.avatar || "",
    role: "EMPLOYEE" as const,
    subject: targetUser?.subject || "",
    rating: 0,
    classesCount: 0,
    homeroomClassId: undefined,
  }

  const [tasksFromSource, submissionsFromSource] = await Promise.all([
    loadTasksFromSheetOrStore(),
    loadTaskSubmissionsFromSheetOrStore(),
  ])

  const schedules = getDbSchedules().filter((schedule) => schedule.teacherId === id)
  const tasks = tasksFromSource.filter((task) => task.teacherId === id)
  const taskIds = new Set(tasks.map((task) => task.id))
  const taskSubmissions = submissionsFromSource.filter((submission) => taskIds.has(submission.taskId))
  const classesFromStore = getDbClasses()
  const { resolveClassId } = createClassIdResolver(classesFromStore)
  const scheduleClassIds = new Set(schedules.map((schedule) => resolveClassId(schedule.classId)).filter(Boolean))
  const classes = classesFromStore.filter((classRoom) => scheduleClassIds.has(classRoom.id))

  return NextResponse.json({
    staff: resolvedTeacher,
    type: "teacher",
    schedules,
    tasks,
    taskSubmissions,
    classes,
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const users = await getAllDbUsers()
  const targetUser = users.find((item) => item.id === id && (item.role === "EMPLOYEE" || item.role === "ADMIN"))
  const body = (await request.json()) as {
    type?: "teacher" | "admin"
    name?: string
    email?: string
    password?: string
    phone?: string
    subject?: string
  }

  const teacher = getDbTeachers().find((item) => item.id === id)
  const admin = getDbAdmins().find((item) => item.id === id)

  if (!teacher && !admin && !targetUser) {
    return NextResponse.json({ error: "Staff tidak ditemukan" }, { status: 404 })
  }

  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const phone = normalizeWhatsappNumber(String(body.phone || ""))
  const subject = String(body.subject || "").trim()
  const password = body.password ? String(body.password) : undefined

  if (!name || !email || !phone) {
    return NextResponse.json({ error: "Nama, email, dan nomor WhatsApp wajib diisi" }, { status: 400 })
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
  }

  if (!WHATSAPP_REGEX.test(phone)) {
    return NextResponse.json({ error: "Format nomor WhatsApp Indonesia tidak valid" }, { status: 400 })
  }

  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  const isTeacher = Boolean(teacher || targetUser?.role === "EMPLOYEE")
  const nextType = body.type || (isTeacher ? "teacher" : "admin")

  if (nextType === "teacher" && !subject && !teacher?.subject) {
    return NextResponse.json({ error: "Mata pelajaran guru wajib diisi" }, { status: 400 })
  }

  const updatedUser = await updateDbUserById({
    id,
    name,
    email,
    phone,
    password,
    subject: nextType === "teacher" ? (subject || undefined) : undefined,
    role: nextType === "teacher" ? "EMPLOYEE" : "ADMIN",
  })

  if (nextType === "teacher") {
    const nextTeacher = {
      ...(teacher || {
        id,
        role: "EMPLOYEE" as const,
        subject,
        rating: 0,
        classesCount: 0,
      }),
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      avatar: updatedUser.avatar,
      subject: subject || teacher?.subject || "",
    }

    const remainingAdmins = getDbAdmins().filter((item) => item.id !== id)
    setDbAdmins(remainingAdmins)

    const teachers = getDbTeachers()
    if (teacher) {
      setDbTeachers(teachers.map((item) => (item.id === id ? nextTeacher : item)))
    } else {
      setDbTeachers([...teachers, nextTeacher])
    }

    logAudit({
      actorId: id,
      action: "UPDATE",
      entityName: "staff",
      entityId: id,
      oldValue: teacher || admin || null,
      newValue: nextTeacher,
    })

    return NextResponse.json({ staff: nextTeacher })
  }

  const nextAdmin = {
    id,
    name: updatedUser.name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    avatar: updatedUser.avatar,
    role: "ADMIN" as const,
  }

  const remainingTeachers = getDbTeachers().filter((item) => item.id !== id)
  setDbTeachers(remainingTeachers)

  const admins = getDbAdmins()
  if (admin) {
    setDbAdmins(admins.map((item) => (item.id === id ? nextAdmin : item)))
  } else {
    setDbAdmins([...admins, nextAdmin])
  }

  logAudit({
    actorId: id,
    action: "UPDATE",
    entityName: "staff",
    entityId: id,
    oldValue: teacher || admin || null,
    newValue: nextAdmin,
  })

  return NextResponse.json({ staff: nextAdmin })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const users = await getAllDbUsers()
  const targetUser = users.find((item) => item.id === id && (item.role === "EMPLOYEE" || item.role === "ADMIN"))

  const teacher = getDbTeachers().find((item) => item.id === id)
  const admin = getDbAdmins().find((item) => item.id === id)
  const target = teacher || admin || targetUser

  if (!target) {
    return NextResponse.json({ error: "Staff tidak ditemukan" }, { status: 404 })
  }

  setDbTeachers(getDbTeachers().filter((item) => item.id !== id))
  setDbAdmins(getDbAdmins().filter((item) => item.id !== id))
  await deleteDbUserById(id)

  logAudit({
    actorId: id,
    action: "DELETE",
    entityName: "staff",
    entityId: id,
    oldValue: target,
    newValue: null,
  })

  return NextResponse.json({ success: true })
}
