import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getDbTeachers, setDbTeachers } from "@/lib/server/data-store"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const employeeId = url.searchParams.get("employeeId")
  const users = await getAllDbUsers()
  const user = employeeId
    ? users.find((item) => item.id === employeeId && item.role === "EMPLOYEE" && item.isActive) || null
    : users.find((item) => item.role === "EMPLOYEE" && item.isActive) || null
  const teacher = user ? getDbTeachers().find((item) => item.id === user.id) || null : null
  const employee = user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: "EMPLOYEE" as const,
        subject: teacher?.subject || "General",
        rating: teacher?.rating || 0,
        classesCount: teacher?.classesCount || 0,
        homeroomClassId: teacher?.homeroomClassId,
      }
    : null
  return NextResponse.json({ employee })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const id = String(body.id || "").trim()

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  const updatedUser = await updateDbUserById({
    id,
    name: body.name ? String(body.name) : undefined,
    email: body.email ? String(body.email) : undefined,
    avatar: body.avatar ? String(body.avatar) : undefined,
  })

  const teachers = getDbTeachers()
  const index = teachers.findIndex((item) => item.id === id)
  let subject = body.subject ? String(body.subject) : "General"
  let rating = 0
  let classesCount = 0
  let homeroomClassId: string | undefined = undefined

  if (index >= 0) {
    const nextTeachers = [...teachers]
    nextTeachers[index] = {
      ...nextTeachers[index],
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      subject: body.subject ? String(body.subject) : nextTeachers[index].subject,
    }
    setDbTeachers(nextTeachers)
    subject = nextTeachers[index].subject
    rating = nextTeachers[index].rating
    classesCount = nextTeachers[index].classesCount
    homeroomClassId = nextTeachers[index].homeroomClassId
  }

  return NextResponse.json({
    employee: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      role: "EMPLOYEE" as const,
      subject,
      rating,
      classesCount,
      homeroomClassId,
    },
  })
}
