import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getDbClasses, getDbOrders, getDbPayments } from "@/lib/server/data-store"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const superAdminId = url.searchParams.get("superAdminId")
  const users = await getAllDbUsers()
  const superAdminRaw = superAdminId
    ? users.find((user) => user.id === superAdminId && user.role === "SUPER_ADMIN" && user.isActive) || null
    : users.find((user) => user.role === "SUPER_ADMIN" && user.isActive) || null
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
    superAdmin: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatar: updated.avatar,
      role: updated.role,
    },
  })
}
