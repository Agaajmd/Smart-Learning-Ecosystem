import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getAllDbActivityPointsFromSheet } from "@/lib/server/google-sheets-activity-points"
import { getAllDbSchedules } from "@/lib/server/google-sheets-schedules"
import { getAllDbGradesFromSheet } from "@/lib/server/google-sheets-grades"
import { getAllDbAttendanceRecords } from "@/lib/server/google-sheets-attendance"
import { getSessionUser } from "@/lib/server/session-user"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { resolveParentChildIds } from "@/lib/server/parent-child-links"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"
import {
  getDbAttendance,
  getDbClasses,
  getDbGrades,
  getDbParents,
  getDbPayments,
  getDbSchedules,
  getDbStudents,
} from "@/lib/server/persistent-store"

async function loadActivityPointsFromSheet() {
  try {
    return await getAllDbActivityPointsFromSheet()
  } catch {
    return []
  }
}

async function loadSchedules() {
  try {
    return await getAllDbSchedules()
  } catch {
    return getDbSchedules()
  }
}

async function loadGrades() {
  try {
    return await getAllDbGradesFromSheet()
  } catch {
    return getDbGrades()
  }
}

async function loadAttendance() {
  try {
    return await getAllDbAttendanceRecords()
  } catch {
    return getDbAttendance()
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminViewer = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isParentViewer = sessionUser.role === "PARENT"
  if (!isAdminViewer && !isParentViewer) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const resolveAvatar = (value: unknown) => normalizeDriveMediaUrl(value) || "/placeholder-user.jpg"

  const [users, classes] = await Promise.all([
    getAllDbUsers(),
    getAllDbClasses().catch(() => getDbClasses()),
  ])
  const { resolveClassId } = createClassIdResolver(classes)
  const parentUsers = users.filter((user) => user.role === "PARENT" && user.isActive)
  const parentId =
    (isParentViewer ? sessionUser.id : undefined) ||
    String(url.searchParams.get("parentId") || "").trim() ||
    parentUsers[0]?.id

  const parentUser = parentUsers.find((user) => user.id === parentId) || parentUsers[0]
  if (!parentUser) {
    return NextResponse.json({ error: "Parent tidak ditemukan" }, { status: 404 })
  }

  const parentMap = getDbParents().find((item) => item.id === parentUser.id || item.email === parentUser.email) || null
  type ParentStudentRow = {
    id: string
    name: string
    email: string
    phone?: string
    avatar: string
    role: "STUDENT"
    classId: string
    paymentStatus: "PAID" | "UNPAID" | "PARTIAL"
    behaviorScore: number
    attendance: "PRESENT" | "SICK" | "ALPHA"
    seatRow: number
    seatCol: number
    coins: number
    streak: number
    level: number
    xp: number
  }
  const studentsFromUsers: ParentStudentRow[] = users
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
      seatRow: 0,
      seatCol: 0,
      coins: 0,
      streak: 0,
      level: 0,
      xp: 0,
    }))
  const studentsFromStore: ParentStudentRow[] = getDbStudents().map((student) => ({
    id: student.id,
    name: student.name,
    email: student.email,
    phone: student.phone,
    avatar: resolveAvatar(student.avatar),
    role: "STUDENT",
    classId: resolveClassId(student.classId),
    paymentStatus: student.paymentStatus || "UNPAID",
    behaviorScore: Number(student.behaviorScore || 0),
    attendance: student.attendance || "PRESENT",
    seatRow: Number(student.seatRow || 0),
    seatCol: Number(student.seatCol || 0),
    coins: Number(student.coins || 0),
    streak: Number(student.streak || 0),
    level: Number(student.level || 0),
    xp: Number(student.xp || 0),
  }))
  const studentMap = new Map<string, ParentStudentRow>()
  for (const student of studentsFromStore) {
    studentMap.set(student.id, {
      ...student,
      classId: resolveClassId(student.classId),
    })
  }
  for (const student of studentsFromUsers) {
    studentMap.set(student.id, {
      ...(studentMap.get(student.id) || student),
      ...student,
      avatar: resolveAvatar(student.avatar),
      classId: student.classId || studentMap.get(student.id)?.classId || "",
    })
  }
  const students = [...studentMap.values()]
  const teacherUsers = users
    .filter((user) => user.role === "EMPLOYEE" && user.isActive)
    .map((user) => ({
      ...user,
      avatar: resolveAvatar(user.avatar),
    }))

  const childIds = resolveParentChildIds({
    students,
    classes,
    parentChildrenIds: parentMap?.childrenIds,
    parentRelationField: parentUser.classId,
    resolveClassId,
  })
  const children = students.filter((student) => childIds.includes(student.id))
  const selectedChildId = url.searchParams.get("childId") || children[0]?.id
  const selectedChild = children.find((child) => child.id === selectedChildId) || children[0] || null

  const childClass = selectedChild
    ? classes.find((classRoom) => classRoom.id === resolveClassId(selectedChild.classId)) ||
      getDbClasses().find((classRoom) => classRoom.id === resolveClassId(selectedChild.classId)) ||
      null
    : null
  const allSchedules = await loadSchedules()
  const schedules = selectedChild
    ? allSchedules.filter((schedule) => resolveClassId(schedule.classId) === resolveClassId(selectedChild.classId))
    : []
  const classmates = selectedChild
    ? students.filter((student) => resolveClassId(student.classId) === resolveClassId(selectedChild.classId))
    : []
  const allActivityPoints = await loadActivityPointsFromSheet()
  const pointSummaryByStudentId = allActivityPoints.reduce((acc, point) => {
    const bucket = acc[point.studentId] || { positivePoints: 0, negativePoints: 0 }
    if (point.type === "NEGATIVE") {
      bucket.negativePoints += Math.abs(Number(point.points) || 0)
    } else {
      bucket.positivePoints += Math.abs(Number(point.points) || 0)
    }
    acc[point.studentId] = bucket
    return acc
  }, {} as Record<string, { positivePoints: number; negativePoints: number }>)

  const childrenWithPoints = children.map((child) => ({
    ...child,
    ...(pointSummaryByStudentId[child.id] || { positivePoints: 0, negativePoints: 0 }),
  }))

  const selectedChildWithPoints = selectedChild
    ? {
        ...selectedChild,
        ...(pointSummaryByStudentId[selectedChild.id] || { positivePoints: 0, negativePoints: 0 }),
      }
    : null

  const classmatesWithPoints = classmates.map((child) => ({
    ...child,
    ...(pointSummaryByStudentId[child.id] || { positivePoints: 0, negativePoints: 0 }),
  }))
  const allGrades = await loadGrades()
  const teacherNameById = new Map(teacherUsers.map((teacher) => [teacher.id, teacher.name]))
  const grades = selectedChild
    ? allGrades
        .filter((grade) => grade.studentId === selectedChild.id)
        .map((grade) => ({
          ...grade,
          teacherName: teacherNameById.get(grade.teacherId) || "Guru",
        }))
    : []
  const teacherIds = [...new Set([...grades.map((grade) => grade.teacherId), ...schedules.map((schedule) => schedule.teacherId)])]
  const teachers = teacherUsers.filter((teacher) => teacherIds.includes(teacher.id))

  const allAttendance = await loadAttendance()
  const attendance = selectedChild ? allAttendance.filter((item) => item.studentId === selectedChild.id) : []
  const activityPoints = selectedChild
    ? allActivityPoints.filter((item) => item.studentId === selectedChild.id)
    : []
  const payments = selectedChild ? getDbPayments().filter((item) => item.studentId === selectedChild.id) : []

  const parent = {
    id: parentUser.id,
    name: parentUser.name,
    email: parentUser.email,
    avatar: resolveAvatar(parentUser.avatar),
    role: "PARENT" as const,
    phone: parentUser.phone || parentMap?.phone || "",
    childrenIds: childIds,
  }

  return NextResponse.json({
    parent,
    children: childrenWithPoints,
    selectedChild: selectedChildWithPoints,
    childClass,
    schedules,
    classmates: classmatesWithPoints,
    teachers,
    grades,
    attendance,
    activityPoints,
    payments,
  })
}
