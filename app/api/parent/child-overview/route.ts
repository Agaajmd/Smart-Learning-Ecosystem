import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbActivityPoints,
  getDbAttendance,
  getDbClasses,
  getDbGrades,
  getDbParents,
  getDbPayments,
  getDbSchedules,
} from "@/lib/server/data-store"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const users = await getAllDbUsers()
  const sessionUser = await getSessionUser()
  const parentUsers = users.filter((user) => user.role === "PARENT" && user.isActive)
  const parentId =
    url.searchParams.get("parentId") ||
    (sessionUser?.role === "PARENT" ? sessionUser.id : undefined) ||
    parentUsers[0]?.id

  const parentUser = parentUsers.find((user) => user.id === parentId) || parentUsers[0]
  if (!parentUser) {
    return NextResponse.json({ error: "Parent tidak ditemukan" }, { status: 404 })
  }

  const parentMap = getDbParents().find((item) => item.id === parentUser.id || item.email === parentUser.email) || null
  const studentUsers = users.filter((user) => user.role === "STUDENT" && user.isActive)
  const teacherUsers = users.filter((user) => user.role === "EMPLOYEE" && user.isActive)

  const childIds = parentMap?.childrenIds || []
  const children = studentUsers.filter((student) => childIds.includes(student.id))
  const selectedChildId = url.searchParams.get("childId") || children[0]?.id
  const selectedChild = children.find((child) => child.id === selectedChildId) || children[0] || null

  const childClass = selectedChild
    ? getDbClasses().find((classRoom) => classRoom.id === selectedChild.classId) || null
    : null
  const schedules = selectedChild
    ? getDbSchedules().filter((schedule) => schedule.classId === selectedChild.classId)
    : []
  const classmates = selectedChild
    ? studentUsers.filter((student) => student.classId === selectedChild.classId)
    : []
  const grades = selectedChild ? getDbGrades().filter((grade) => grade.studentId === selectedChild.id) : []
  const teacherIds = [...new Set(grades.map((grade) => grade.teacherId))]
  const teachers = teacherUsers.filter((teacher) => teacherIds.includes(teacher.id))

  const attendance = selectedChild ? getDbAttendance().filter((item) => item.studentId === selectedChild.id) : []
  const activityPoints = selectedChild
    ? getDbActivityPoints().filter((item) => item.studentId === selectedChild.id)
    : []
  const payments = selectedChild ? getDbPayments().filter((item) => item.studentId === selectedChild.id) : []

  const parent = {
    id: parentUser.id,
    name: parentUser.name,
    email: parentUser.email,
    avatar: parentUser.avatar,
    role: "PARENT" as const,
    phone: parentUser.phone || parentMap?.phone || "",
    childrenIds: childIds,
  }

  return NextResponse.json({
    parent,
    children,
    selectedChild,
    childClass,
    schedules,
    classmates,
    teachers,
    grades,
    attendance,
    activityPoints,
    payments,
  })
}
