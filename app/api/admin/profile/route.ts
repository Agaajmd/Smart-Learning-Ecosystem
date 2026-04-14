import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getDbClasses } from "@/lib/server/data-store"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const adminId = url.searchParams.get("adminId")
  const users = await getAllDbUsers()
  const adminRaw = adminId
    ? users.find((user) => user.id === adminId && user.role === "ADMIN" && user.isActive) || null
    : users.find((user) => user.role === "ADMIN" && user.isActive) || null
  const admin = adminRaw
    ? { id: adminRaw.id, name: adminRaw.name, email: adminRaw.email, avatar: adminRaw.avatar, role: adminRaw.role }
    : null
  const studentsCount = users.filter((user) => user.role === "STUDENT" && user.isActive).length
  const employeesCount = users.filter((user) => user.role === "EMPLOYEE" && user.isActive).length
  const classesCount = getDbClasses().length

  const recentActivities = [
    { action: "Menyetujui laporan aset", time: "2 jam lalu", status: "success" },
    { action: "Memperbarui data siswa", time: "4 jam lalu", status: "success" },
    { action: "Membuat laporan bulanan", time: "1 hari lalu", status: "success" },
    { action: "Menyelesaikan masalah pembayaran", time: "2 hari lalu", status: "warning" },
  ]

  return NextResponse.json({
    admin,
    stats: {
      studentsCount,
      employeesCount,
      classesCount,
    },
    recentActivities,
  })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const id = String(body.id || "").trim()
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  const updated = await updateDbUserById({
    id,
    name: body.name ? String(body.name) : undefined,
    email: body.email ? String(body.email) : undefined,
    avatar: body.avatar ? String(body.avatar) : undefined,
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
}
