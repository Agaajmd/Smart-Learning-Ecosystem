import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbActivityPoints,
  getDbAttendance,
  getDbClasses,
  getDbGrades,
  getDbPayments,
  getDbSchedules,
  getDbStudentReports,
  getDbTaskSubmissions,
  getDbTasks,
  type StudentReport,
} from "@/lib/server/data-store"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const users = await getAllDbUsers()
  const sessionUser = await getSessionUser()

  const students = users.filter((user) => user.role === "STUDENT" && user.isActive)
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

  const schedules = getDbSchedules().filter((item) => item.classId === student.classId)
  const nextClass = schedules[0] || null
  const teacher = nextClass ? teachers.find((item) => item.id === nextClass.teacherId) || null : null
  const studentClass = getDbClasses().find((item) => item.id === student.classId) || null
  const classmates = students.filter((item) => item.classId === student.classId)

  const tasks = getDbTasks().filter((task) => task.classId === student.classId)
  const taskSubmissions = getDbTaskSubmissions().filter((submission) => submission.studentId === student.id)
  const grades = getDbGrades().filter((grade) => grade.studentId === student.id)
  const activityPoints = getDbActivityPoints().filter((point) => point.studentId === student.id)
  const attendance = getDbAttendance().filter((record) => record.studentId === student.id)
  const payments = getDbPayments().filter((payment) => payment.studentId === student.id)
  const reports = getDbStudentReports().filter((report) => report.studentId === student.id)

  return NextResponse.json({
    student,
    teacher,
    nextClass,
    studentClass,
    classmates,
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
