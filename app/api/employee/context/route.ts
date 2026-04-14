import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbClasses,
  getDbPiketSchedules,
  getDbSchedules,
  getDbStudents,
  getDbTaskSubmissions,
  getDbTasks,
  getDbTeachers,
} from "@/lib/server/data-store"

export async function GET() {
  const sessionUser = await getSessionUser()
  const mappedTeacher =
    sessionUser?.role === "EMPLOYEE"
      ? getDbTeachers().find((teacher) => teacher.id === sessionUser.id) || null
      : null

  const employee = sessionUser?.role === "EMPLOYEE"
    ? {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        avatar: sessionUser.avatar,
        role: "EMPLOYEE" as const,
        subject: mappedTeacher?.subject || "General",
        rating: mappedTeacher?.rating || 0,
        classesCount: mappedTeacher?.classesCount || 0,
        homeroomClassId: mappedTeacher?.homeroomClassId,
      }
    : getDbTeachers()[0] || null

  const schedules = employee ? getDbSchedules().filter((schedule) => schedule.teacherId === employee.id) : []
  const classIds = new Set(schedules.map((schedule) => schedule.classId))
  const classes = getDbClasses().filter((classRoom) => classIds.has(classRoom.id))
  const students = getDbStudents().filter((student) => Boolean(student.classId) && classIds.has(student.classId || ""))
  const tasks = employee ? getDbTasks().filter((task) => task.teacherId === employee.id) : []
  const taskIds = new Set(tasks.map((task) => task.id))
  const taskSubmissions = getDbTaskSubmissions().filter((submission) => taskIds.has(submission.taskId))

  return NextResponse.json({
    employee,
    classes,
    schedules,
    students,
    piketSchedules: getDbPiketSchedules(),
    tasks,
    taskSubmissions,
  })
}
