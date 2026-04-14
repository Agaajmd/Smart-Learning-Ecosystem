import { NextResponse } from "next/server"
import { deactivateDbUserById, updateDbUserById } from "@/lib/server/google-sheets-auth"
import {
  getDbAdmins,
  getDbClasses,
  getDbSchedules,
  getDbTasks,
  getDbTaskSubmissions,
  getDbTeachers,
  setDbAdmins,
  setDbTeachers,
} from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teacher = getDbTeachers().find((item) => item.id === id)
  const admin = getDbAdmins().find((item) => item.id === id)

  if (!teacher && !admin) {
    return NextResponse.json({ error: "Staff tidak ditemukan" }, { status: 404 })
  }

  if (admin) {
    return NextResponse.json({
      staff: admin,
      type: "admin",
      schedules: [],
      tasks: [],
      taskSubmissions: [],
      classes: [],
    })
  }

  const schedules = getDbSchedules().filter((schedule) => schedule.teacherId === id)
  const tasks = getDbTasks().filter((task) => task.teacherId === id)
  const taskIds = new Set(tasks.map((task) => task.id))
  const taskSubmissions = getDbTaskSubmissions().filter((submission) => taskIds.has(submission.taskId))
  const classes = getDbClasses().filter((classRoom) => schedules.some((schedule) => schedule.classId === classRoom.id))

  return NextResponse.json({
    staff: teacher,
    type: "teacher",
    schedules,
    tasks,
    taskSubmissions,
    classes,
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = (await request.json()) as {
    type?: "teacher" | "admin"
    name?: string
    email?: string
    password?: string
    subject?: string
  }

  const teacher = getDbTeachers().find((item) => item.id === id)
  const admin = getDbAdmins().find((item) => item.id === id)

  if (!teacher && !admin) {
    return NextResponse.json({ error: "Staff tidak ditemukan" }, { status: 404 })
  }

  const isTeacher = Boolean(teacher)
  const nextType = body.type || (isTeacher ? "teacher" : "admin")

  const updatedUser = await updateDbUserById({
    id,
    name: body.name,
    email: body.email,
    password: body.password,
    role: nextType === "teacher" ? "EMPLOYEE" : "ADMIN",
  })

  if (nextType === "teacher") {
    const nextTeacher = {
      ...(teacher || {
        id,
        role: "EMPLOYEE" as const,
        rating: 4.5,
        classesCount: 0,
      }),
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      subject: body.subject || teacher?.subject || "General",
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

  const teacher = getDbTeachers().find((item) => item.id === id)
  const admin = getDbAdmins().find((item) => item.id === id)
  const target = teacher || admin

  if (!target) {
    return NextResponse.json({ error: "Staff tidak ditemukan" }, { status: 404 })
  }

  setDbTeachers(getDbTeachers().filter((item) => item.id !== id))
  setDbAdmins(getDbAdmins().filter((item) => item.id !== id))
  await deactivateDbUserById(id)

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
