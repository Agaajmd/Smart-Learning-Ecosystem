import { NextResponse } from "next/server"
import { deleteDbUserById, getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbActivityPointsFromSheet } from "@/lib/server/google-sheets-activity-points"
import { getSessionUser } from "@/lib/server/session-user"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"
import {
  getDbAdmins,
  getDbCanteenOwners,
  getDbCanteens,
  getDbParents,
  getDbStudents,
  getDbSuperAdmins,
  getDbTeachers,
  setDbAdmins,
  setDbCanteenOwners,
  setDbCanteens,
  setDbParents,
  setDbStudents,
  setDbSuperAdmins,
  setDbTeachers,
} from "@/lib/server/persistent-store"

export async function GET() {
  const sessionUser = await getSessionUser()
  const users = await getAllDbUsers()
  const studentsFromStore = getDbStudents()
  const studentsById = new Map(studentsFromStore.map((student) => [student.id, student]))

  let activityPoints = [] as Awaited<ReturnType<typeof getAllDbActivityPointsFromSheet>>
  try {
    activityPoints = await getAllDbActivityPointsFromSheet()
  } catch {
    activityPoints = []
  }

  const pointSummaryByStudentId = activityPoints.reduce((acc, point) => {
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

  const resolveAvatar = (value: unknown) => normalizeDriveMediaUrl(value) || "/placeholder-user.jpg"

  const visibleUsers = users
    .filter((user) => (sessionUser?.id ? user.id !== sessionUser.id : true))
    .map((user) => {
      const baseUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: resolveAvatar(user.avatar),
        role: user.role,
        classId: user.classId || null,
        isActive: user.isActive,
      }

      if (user.role !== "STUDENT") {
        return baseUser
      }

      const summary = pointSummaryByStudentId[user.id] || { positivePoints: 0, negativePoints: 0, totalPoints: 0 }
      const storedStudent = studentsById.get(user.id)

      return {
        ...baseUser,
        paymentStatus: storedStudent?.paymentStatus || "UNPAID",
        positivePoints: summary.positivePoints,
        negativePoints: summary.negativePoints,
        totalPoints: summary.totalPoints,
        points: summary.totalPoints,
      }
    })

  return NextResponse.json({ users: visibleUsers })
}

export async function DELETE(request: Request) {
  const body = await request.json()
  const id = String(body.id || "").trim()
  if (!id) {
    return NextResponse.json({ error: "ID user wajib diisi" }, { status: 400 })
  }

  const sessionUser = await getSessionUser()
  if (sessionUser?.id === id) {
    return NextResponse.json({ error: "Akun sendiri tidak dapat dihapus" }, { status: 400 })
  }

  const users = await getAllDbUsers()
  const target = users.find((user) => user.id === id)
  if (!target) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 })
  }

  if (target.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Akun superadmin tidak dapat dihapus" }, { status: 403 })
  }

  await deleteDbUserById(id)

  setDbStudents(getDbStudents().filter((item) => item.id !== id))
  setDbTeachers(getDbTeachers().filter((item) => item.id !== id))
  setDbAdmins(getDbAdmins().filter((item) => item.id !== id))
  setDbSuperAdmins(getDbSuperAdmins().filter((item) => item.id !== id))
  setDbParents(getDbParents().filter((item) => item.id !== id))
  setDbCanteenOwners(getDbCanteenOwners().filter((item) => item.id !== id))
  setDbCanteens(getDbCanteens().filter((item) => item.ownerId !== id))

  return NextResponse.json({ success: true })
}
