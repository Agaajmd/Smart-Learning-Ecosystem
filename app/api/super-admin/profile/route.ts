import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getDbClasses, getDbOrders, getDbPayments } from "@/lib/server/persistent-store"
import { getSessionUser } from "@/lib/server/session-user"

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  if (sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(request.url)
  const requestedSuperAdminId = String(url.searchParams.get("superAdminId") || "").trim()
  const targetSuperAdminId = requestedSuperAdminId || sessionUser.id
  const users = await getAllDbUsers()
  const superAdminRaw =
    users.find((user) => user.id === targetSuperAdminId && user.role === "SUPER_ADMIN" && user.isActive) || null

  if (!superAdminRaw) {
    return NextResponse.json({ error: "Super admin tidak ditemukan" }, { status: 404 })
  }

  const superAdmin = superAdminRaw
    ? {
        id: superAdminRaw.id,
        name: superAdminRaw.name,
        email: superAdminRaw.email,
        avatar: superAdminRaw.avatar,
        role: superAdminRaw.role,
      }
    : null

  const paidIncome = getDbPayments()
    .filter((item) => item.status === "PAID")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0)
  const totalOrderValue = getDbOrders().reduce((acc, item) => acc + Number(item.totalAmount || 0), 0)

  return NextResponse.json({
    superAdmin,
    stats: {
      studentsCount: users.filter((user) => user.role === "STUDENT" && user.isActive).length,
      employeesCount: users.filter((user) => user.role === "EMPLOYEE" && user.isActive).length,
      classesCount: getDbClasses().length,
      profit: paidIncome + totalOrderValue,
    },
  })
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  if (sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = await request.json()
  const requestedSuperAdminId = String(body.id || "").trim()
  const targetSuperAdminId = requestedSuperAdminId || sessionUser.id

  if (!targetSuperAdminId) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  if (requestedSuperAdminId && requestedSuperAdminId !== sessionUser.id) {
    return NextResponse.json({ error: "Tidak diizinkan mengubah profil super admin lain" }, { status: 403 })
  }

  const users = await getAllDbUsers()
  const targetSuperAdmin =
    users.find((user) => user.id === targetSuperAdminId && user.role === "SUPER_ADMIN" && user.isActive) || null

  if (!targetSuperAdmin) {
    return NextResponse.json({ error: "Super admin tidak ditemukan" }, { status: 404 })
  }

  const password = body.password != null ? String(body.password).trim() : ""
  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  try {
    const updated = await updateDbUserById({
      id: targetSuperAdminId,
      name: body.name ? String(body.name) : undefined,
      email: body.email ? String(body.email) : undefined,
      avatar: body.avatar ? String(body.avatar) : undefined,
      password: password || undefined,
    })

    return NextResponse.json({
      superAdmin: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        avatar: updated.avatar,
        role: updated.role,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui profil super admin" },
      { status: 400 },
    )
  }
}
