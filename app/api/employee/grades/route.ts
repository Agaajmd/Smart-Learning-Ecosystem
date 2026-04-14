import { NextResponse } from "next/server"
import type { StudentGrade } from "@/lib/data-model"
import { getDbGrades, getDbStudents, setDbGrades } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const teacherId = url.searchParams.get("teacherId")
  const classId = url.searchParams.get("classId")

  const classStudentIds = classId
    ? new Set(getDbStudents().filter((s) => s.classId === classId).map((s) => s.id))
    : null

  const grades = getDbGrades().filter((grade) => {
    if (teacherId && grade.teacherId !== teacherId) return false
    if (classStudentIds && !classStudentIds.has(grade.studentId)) return false
    return true
  })

  return NextResponse.json({ grades })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as StudentGrade

  if (!payload.studentId || !payload.teacherId || !payload.subject) {
    return NextResponse.json({ error: "Data nilai belum lengkap" }, { status: 400 })
  }

  const grades = getDbGrades()
  const existingIndex = grades.findIndex(
    (grade) =>
      grade.studentId === payload.studentId &&
      grade.teacherId === payload.teacherId &&
      grade.subject === payload.subject,
  )

  let nextGrades = grades
  const previous = existingIndex >= 0 ? grades[existingIndex] : null
  if (existingIndex >= 0) {
    nextGrades = grades.map((grade, index) => (index === existingIndex ? { ...grade, ...payload } : grade))
  } else {
    nextGrades = [...grades, { ...payload, id: payload.id || `sg-${Date.now()}` }]
  }

  setDbGrades(nextGrades)
  const saved = nextGrades.find((grade) => grade.studentId === payload.studentId && grade.teacherId === payload.teacherId && grade.subject === payload.subject)
  if (saved) {
    logAudit({
      actorId: payload.teacherId,
      action: previous ? "UPDATE" : "CREATE",
      entityName: "student_grades",
      entityId: saved.id,
      oldValue: previous,
      newValue: saved,
    })
  }

  return NextResponse.json({ grade: saved })
}

export async function PUT(request: Request) {
  const payload = (await request.json()) as {
    teacherId?: string
    subject?: string
    classId?: string
    grades?: StudentGrade[]
  }

  if (!payload.teacherId || !payload.subject || !payload.classId || !payload.grades) {
    return NextResponse.json({ error: "Payload bulk update tidak valid" }, { status: 400 })
  }

  const classStudentIds = new Set(
    getDbStudents().filter((student) => student.classId === payload.classId).map((student) => student.id),
  )

  const currentGrades = getDbGrades()
  const base = currentGrades.filter(
    (grade) =>
      !(grade.teacherId === payload.teacherId && grade.subject === payload.subject && classStudentIds.has(grade.studentId)),
  )

  const normalized = payload.grades.map((grade) => ({
    ...grade,
    id: grade.id || `sg-${grade.studentId}-${payload.teacherId}`,
    teacherId: payload.teacherId as string,
    subject: payload.subject as string,
  }))

  setDbGrades([...base, ...normalized])
  logAudit({
    actorId: payload.teacherId,
    action: "UPDATE",
    entityName: "student_grades",
    entityId: `${payload.classId}:${payload.subject}`,
    oldValue: { count: currentGrades.length },
    newValue: { count: normalized.length, classId: payload.classId, subject: payload.subject },
  })
  return NextResponse.json({ count: normalized.length })
}
