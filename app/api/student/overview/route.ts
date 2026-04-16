import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getAllDbSchedules } from "@/lib/server/google-sheets-schedules"
import { getAllDbTasks } from "@/lib/server/google-sheets-tasks"
import { getAllDbTaskSubmissions } from "@/lib/server/google-sheets-task-submissions"
import { getAllDbActivityPointsFromSheet } from "@/lib/server/google-sheets-activity-points"
import { getSessionUser } from "@/lib/server/session-user"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { assignStudentSeatsToClasses } from "@/lib/server/class-seat-layout"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"
import {
  getDbAttendance,
  getDbClasses,
  getDbGrades,
  getDbPayments,
  getDbSchedules,
  getDbStudentReports,
  getDbTaskSubmissions,
  getDbTasks,
  getDbStudents,
  setDbTaskSubmissions,
  setDbTasks,
  type StudentReport,
} from "@/lib/server/persistent-store"

async function loadTasksFromSheetOrStore() {
  try {
    const tasks = await getAllDbTasks()
    setDbTasks(tasks)
    return tasks
  } catch {
    return getDbTasks()
  }
}

async function loadActivityPointsFromSheet() {
  try {
    return await getAllDbActivityPointsFromSheet()
  } catch {
    return []
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

export async function GET(request: Request) {
  const url = new URL(request.url)
  const [users, classesFromSheet, schedulesFromSheet] = await Promise.all([
    getAllDbUsers(),
    getAllDbClasses(),
    getAllDbSchedules(),
  ])
  const { resolveClassId } = createClassIdResolver(classesFromSheet)
  const sessionUser = await getSessionUser()

  const resolveAvatar = (value: unknown) => normalizeDriveMediaUrl(value) || "/placeholder-user.jpg"

  const sheetStudents = users
    .filter((user) => user.role === "STUDENT" && user.isActive)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: resolveAvatar(user.avatar),
      role: "STUDENT" as const,
      classId: resolveClassId(user.classId),
      paymentStatus: "UNPAID" as const,
      behaviorScore: 0,
      attendance: "PRESENT" as const,
      seatRow: Number((user as any).seatRow ?? 0),
      seatCol: Number((user as any).seatCol ?? 0),
      coins: 0,
      streak: Number((user as any).streak ?? 0),
      level: Number((user as any).level ?? 0),
      xp: Number((user as any).xp ?? 0),
    }))

  const storeStudents = getDbStudents().map((student) => ({
    ...student,
    avatar: resolveAvatar(student.avatar),
    classId: resolveClassId(student.classId),
  }))

  const studentMap = new Map<string, (typeof storeStudents)[number]>()
  for (const student of storeStudents) {
    studentMap.set(student.id, student)
  }
  for (const student of sheetStudents) {
    const existing = studentMap.get(student.id)
    studentMap.set(student.id, {
      ...(existing || student),
      ...student,
      classId: student.classId || existing?.classId || "",
      seatRow: Number(student.seatRow ?? existing?.seatRow ?? 0),
      seatCol: Number(student.seatCol ?? existing?.seatCol ?? 0),
      streak: Number(student.streak ?? existing?.streak ?? 0),
      level: Number(student.level ?? existing?.level ?? 0),
      xp: Number(student.xp ?? existing?.xp ?? 0),
    })
  }

  const mergedStudents = [...studentMap.values()].filter((student) => Boolean(student.classId))
  const students = assignStudentSeatsToClasses(classesFromSheet, mergedStudents as any)
  const teachers = users.filter((user) => user.role === "EMPLOYEE" && user.isActive)

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

  const classId = resolveClassId(student.classId)
  const schedules = schedulesFromSheet
    .map((item) => ({ ...item, classId: resolveClassId(item.classId) }))
    .filter((item) => item.classId === classId)

  const teachersById = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.teacherId]) {
      const teacherInfo = teachers.find((item) => item.id === schedule.teacherId)
      if (teacherInfo?.name) {
        acc[schedule.teacherId] = teacherInfo.name
      }
    }
    return acc
  }, {} as Record<string, string>)

  const nextClass = schedules[0] || null
  const teacherRaw = nextClass ? teachers.find((item) => item.id === nextClass.teacherId) || null : null
  const teacher = teacherRaw
    ? {
        ...teacherRaw,
        avatar: resolveAvatar(teacherRaw.avatar),
      }
    : null
  const studentClass = classesFromSheet.find((item) => item.id === classId) || getDbClasses().find((item) => item.id === classId) || null
  const classmates = students.filter((item) => item.classId === classId)
  const classmateIds = new Set(classmates.map((item) => item.id))
  const className = studentClass?.name || student.classId || "-"
  const classGrade = studentClass?.grade || ""

  const allActivityPoints = await loadActivityPointsFromSheet()
  const pointSummaryByStudentId = allActivityPoints.reduce((acc, point) => {
    if (!classmateIds.has(point.studentId)) {
      return acc
    }
    const bucket = acc[point.studentId] || { positivePoints: 0, negativePoints: 0, totalPoints: 0 }
    if (point.type === "NEGATIVE") {
      bucket.negativePoints += Math.abs(Number(point.points) || 0)
    } else {
      bucket.positivePoints += Math.abs(Number(point.points) || 0)
    }
    bucket.totalPoints = bucket.positivePoints - bucket.negativePoints
    acc[point.studentId] = bucket
    return acc
  }, {} as Record<string, { positivePoints: number; negativePoints: number; totalPoints: number }>)

  const classmatesWithPoints = classmates.map((item) => {
    const summary = pointSummaryByStudentId[item.id] || { positivePoints: 0, negativePoints: 0, totalPoints: 0 }
    return {
      ...item,
      className,
      classGrade,
      positivePoints: summary.positivePoints,
      negativePoints: summary.negativePoints,
      totalPoints: summary.totalPoints,
      points: summary.totalPoints,
    }
  })

  const studentPointSummary = pointSummaryByStudentId[student.id] || { positivePoints: 0, negativePoints: 0, totalPoints: 0 }
  const studentWithPoints = {
    ...student,
    className,
    classGrade,
    positivePoints: studentPointSummary.positivePoints,
    negativePoints: studentPointSummary.negativePoints,
    totalPoints: studentPointSummary.totalPoints,
    points: studentPointSummary.totalPoints,
  }

  const tasks = (await loadTasksFromSheetOrStore()).filter((task) => resolveClassId(task.classId) === classId)
  const taskSubmissions = (await loadTaskSubmissionsFromSheetOrStore()).filter(
    (submission) => submission.studentId === student.id,
  )
  const grades = getDbGrades().filter((grade) => grade.studentId === student.id)
  const activityPoints = allActivityPoints.filter((point) => point.studentId === student.id)
  const attendance = getDbAttendance().filter((record) => record.studentId === student.id)
  const payments = getDbPayments().filter((payment) => payment.studentId === student.id)
  const reports = getDbStudentReports().filter((report) => report.studentId === student.id)

  return NextResponse.json({
    student: studentWithPoints,
    teacher,
    nextClass,
    studentClass,
    classmates: classmatesWithPoints,
    studentPointSummary,
    pointSummaryByStudentId,
    teachersById,
    schedules,
    tasks,
    taskSubmissions,
    grades,
    activityPoints,
    attendance,
    payments,
    reports,
  })
}
