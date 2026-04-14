import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getSessionUser } from "@/lib/server/session-user"
import { getDbTaskSubmissions, getDbTasks, setDbTaskSubmissions } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const users = await getAllDbUsers()
  const sessionUser = await getSessionUser()
  const students = users.filter((user) => user.role === "STUDENT" && user.isActive)

  const studentId =
    url.searchParams.get("studentId") ||
    (sessionUser?.role === "STUDENT" ? sessionUser.id : undefined) ||
    students[0]?.id
  if (!studentId) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  const student = students.find((item) => item.id === studentId)
  if (!student) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  const tasks = getDbTasks().filter((task) => task.classId === student.classId)
  const submissions = getDbTaskSubmissions().filter((submission) => submission.studentId === studentId)

  return NextResponse.json({ student, tasks, submissions })
}

export async function POST(request: Request) {
  const body = await request.json()
  const studentId = String(body.studentId || "").trim()
  const taskId = String(body.taskId || "").trim()

  if (!studentId || !taskId) {
    return NextResponse.json({ error: "studentId dan taskId wajib diisi" }, { status: 400 })
  }

  const allSubmissions = getDbTaskSubmissions()
  const existing = allSubmissions.find((submission) => submission.studentId === studentId && submission.taskId === taskId)

  const nextSubmission = {
    id: existing?.id || `sub-${Date.now()}`,
    taskId,
    studentId,
    submittedAt: new Date().toISOString(),
    attachmentUrl: body.attachmentUrl ? String(body.attachmentUrl) : undefined,
    imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
    attachmentName: body.attachmentName ? String(body.attachmentName) : undefined,
    status: "SUBMITTED" as const,
    score: existing?.score,
    feedback: existing?.feedback,
  }

  const nextSubmissions = existing
    ? allSubmissions.map((submission) => (submission.id === existing.id ? nextSubmission : submission))
    : [nextSubmission, ...allSubmissions]

  setDbTaskSubmissions(nextSubmissions)
  logAudit({
    actorId: studentId,
    action: existing ? "UPDATE" : "CREATE",
    entityName: "TASK_SUBMISSION",
    entityId: nextSubmission.id,
    oldValue: existing || null,
    newValue: nextSubmission,
  })

  return NextResponse.json({ success: true, submission: nextSubmission })
}
