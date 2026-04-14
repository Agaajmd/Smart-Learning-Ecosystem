import { NextResponse } from "next/server"
import type { Task } from "@/lib/data-model"
import { getDbTasks, getDbTaskSubmissions, setDbTasks, setDbTaskSubmissions } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const teacherId = url.searchParams.get("teacherId")

  const tasks = teacherId
    ? getDbTasks().filter((task) => task.teacherId === teacherId)
    : getDbTasks()

  return NextResponse.json({
    tasks,
    submissions: getDbTaskSubmissions(),
  })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Task

  if (!payload.title || !payload.description || !payload.teacherId || !payload.classId || !payload.dueDate) {
    return NextResponse.json({ error: "Data tugas belum lengkap" }, { status: 400 })
  }

  const tasks = getDbTasks()
  const task: Task = {
    ...payload,
    id: payload.id || `task-${Date.now()}`,
    createdAt: payload.createdAt || new Date().toISOString(),
  }

  setDbTasks([task, ...tasks])
  logAudit({
    actorId: payload.teacherId,
    action: "CREATE",
    entityName: "tasks",
    entityId: task.id,
    newValue: task,
  })

  return NextResponse.json({ task })
}

export async function PATCH(request: Request) {
  const payload = (await request.json()) as Partial<Task> & { id?: string }
  if (!payload.id) {
    return NextResponse.json({ error: "ID tugas wajib diisi" }, { status: 400 })
  }

  const tasks = getDbTasks()
  const existing = tasks.find((task) => task.id === payload.id)
  if (!existing) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })
  }

  const updated = { ...existing, ...payload, id: existing.id, createdAt: existing.createdAt }
  setDbTasks(tasks.map((task) => (task.id === existing.id ? updated : task)))

  logAudit({
    actorId: updated.teacherId,
    action: "UPDATE",
    entityName: "tasks",
    entityId: updated.id,
    oldValue: existing,
    newValue: updated,
  })

  return NextResponse.json({ task: updated })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "ID tugas wajib diisi" }, { status: 400 })
  }

  const tasks = getDbTasks()
  const existing = tasks.find((task) => task.id === id)
  if (!existing) {
    return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 })
  }

  setDbTasks(tasks.filter((task) => task.id !== id))
  const submissions = getDbTaskSubmissions()
  setDbTaskSubmissions(submissions.filter((submission) => submission.taskId !== id))

  logAudit({
    actorId: existing.teacherId,
    action: "DELETE",
    entityName: "tasks",
    entityId: existing.id,
    oldValue: existing,
  })

  return NextResponse.json({ success: true })
}
