import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getDbTeachers, setDbTeachers } from "@/lib/server/persistent-store"
import { getSessionUser } from "@/lib/server/session-user"

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isEmployeeViewer = sessionUser.role === "EMPLOYEE"
  const isAdminViewer = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  if (!isEmployeeViewer && !isAdminViewer) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(request.url)
  const requestedEmployeeId = String(url.searchParams.get("employeeId") || "").trim()
  const targetEmployeeId = isEmployeeViewer ? sessionUser.id : requestedEmployeeId
  if (!targetEmployeeId) {
    return NextResponse.json({ error: "employeeId wajib diisi" }, { status: 400 })
  }

  const users = await getAllDbUsers()
  const user = users.find((item) => item.id === targetEmployeeId && item.role === "EMPLOYEE" && item.isActive) || null
  if (!user) {
    return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 })
  }

  const teacher = user ? getDbTeachers().find((item) => item.id === user.id) || null : null
  const employee = user
    ? {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: "EMPLOYEE" as const,
        rating: teacher?.rating || 0,
        classesCount: teacher?.classesCount || 0,
        homeroomClassId: teacher?.homeroomClassId,
      }
    : null
  return NextResponse.json({ employee })
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isEmployeeEditor = sessionUser.role === "EMPLOYEE"
  const isAdminEditor = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  if (!isEmployeeEditor && !isAdminEditor) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = await request.json()
  const requestedEmployeeId = String(body.id || "").trim()
  const targetEmployeeId = isEmployeeEditor ? sessionUser.id : requestedEmployeeId

  if (!targetEmployeeId) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  if (isEmployeeEditor && requestedEmployeeId && requestedEmployeeId !== sessionUser.id) {
    return NextResponse.json({ error: "Tidak diizinkan mengubah profil guru lain" }, { status: 403 })
  }

  const users = await getAllDbUsers()
  const targetEmployee =
    users.find((item) => item.id === targetEmployeeId && item.role === "EMPLOYEE" && item.isActive) || null
  if (!targetEmployee) {
    return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 })
  }

  const password = body.password != null ? String(body.password).trim() : ""
  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  let updatedUser
  try {
    updatedUser = await updateDbUserById({
      id: targetEmployeeId,
      name: body.name ? String(body.name) : undefined,
      email: body.email ? String(body.email) : undefined,
      avatar: body.avatar ? String(body.avatar) : undefined,
      password: password || undefined,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui profil guru" },
      { status: 400 },
    )
  }

  const teachers = getDbTeachers()
  const index = teachers.findIndex((item) => item.id === targetEmployeeId)
  let subject = ""
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
