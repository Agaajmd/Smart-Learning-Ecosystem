import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getDbClasses } from "@/lib/server/persistent-store"
import { getSessionUser } from "@/lib/server/session-user"

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminViewer = sessionUser.role === "ADMIN"
  const isSuperAdminViewer = sessionUser.role === "SUPER_ADMIN"
  if (!isAdminViewer && !isSuperAdminViewer) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(request.url)
  const requestedAdminId = String(url.searchParams.get("adminId") || "").trim()
  const targetAdminId = isAdminViewer ? sessionUser.id : requestedAdminId
  if (!targetAdminId) {
    return NextResponse.json({ error: "adminId wajib diisi" }, { status: 400 })
  }

  const users = await getAllDbUsers()
  const adminRaw = users.find((user) => user.id === targetAdminId && user.role === "ADMIN" && user.isActive) || null

  if (!adminRaw) {
    return NextResponse.json({ error: "Admin tidak ditemukan" }, { status: 404 })
  }

  const admin = adminRaw
    ? { id: adminRaw.id, name: adminRaw.name, email: adminRaw.email, avatar: adminRaw.avatar, role: adminRaw.role }
    : null
  const studentsCount = users.filter((user) => user.role === "STUDENT" && user.isActive).length
  const employeesCount = users.filter((user) => user.role === "EMPLOYEE" && user.isActive).length
  const classesCount = getDbClasses().length

  return NextResponse.json({
    admin,
    stats: {
      studentsCount,
      employeesCount,
      classesCount,
    },
  })
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminEditor = sessionUser.role === "ADMIN"
  const isSuperAdminEditor = sessionUser.role === "SUPER_ADMIN"
  if (!isAdminEditor && !isSuperAdminEditor) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = await request.json()
  const requestedAdminId = String(body.id || "").trim()
  const targetAdminId = isAdminEditor ? sessionUser.id : requestedAdminId
  if (!targetAdminId) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  if (isAdminEditor && requestedAdminId && requestedAdminId !== sessionUser.id) {
    return NextResponse.json({ error: "Tidak diizinkan mengubah profil admin lain" }, { status: 403 })
  }

  const users = await getAllDbUsers()
  const targetAdmin = users.find((user) => user.id === targetAdminId && user.role === "ADMIN" && user.isActive) || null
  if (!targetAdmin) {
    return NextResponse.json({ error: "Admin tidak ditemukan" }, { status: 404 })
  }

  const password = body.password != null ? String(body.password).trim() : ""
  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  try {
    const updated = await updateDbUserById({
      id: targetAdminId,
      name: body.name ? String(body.name) : undefined,
      email: body.email ? String(body.email) : undefined,
      avatar: body.avatar ? String(body.avatar) : undefined,
      password: password || undefined,
    })

    return NextResponse.json({
      admin: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        avatar: updated.avatar,
        role: updated.role,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui profil admin" },
      { status: 400 },
    )
  }
}
