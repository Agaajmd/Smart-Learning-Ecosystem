import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getDbCanteenOwners, setDbCanteenOwners } from "@/lib/server/data-store"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const ownerId = url.searchParams.get("ownerId")
  const users = await getAllDbUsers()
  const ownerUser = ownerId
    ? users.find((item) => item.id === ownerId && item.role === "CANTEEN_OWNER" && item.isActive) || null
    : users.find((item) => item.role === "CANTEEN_OWNER" && item.isActive) || null

  if (!ownerUser) {
    return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
  }

  const ownerMap = getDbCanteenOwners().find((item) => item.id === ownerUser.id || item.email === ownerUser.email) || null
  const owner = {
    id: ownerUser.id,
    name: ownerUser.name,
    email: ownerUser.email,
    avatar: ownerUser.avatar,
    role: "CANTEEN_OWNER" as const,
    phone: ownerUser.phone || ownerMap?.phone || "",
    canteenId: ownerMap?.canteenId || "",
    canteenName: ownerMap?.canteenName || "",
    isActive: ownerUser.isActive,
  }

  if (!owner) {
    return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
  }

  return NextResponse.json({ owner })
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
    phone: body.phone ? String(body.phone) : undefined,
    avatar: body.avatar ? String(body.avatar) : undefined,
  })

  const owners = getDbCanteenOwners()
  const index = owners.findIndex((item) => item.id === id)
  let canteenId = ""
  let canteenName = ""
  let isActive = true
  if (index >= 0) {
    const nextOwners = [...owners]
    nextOwners[index] = {
      ...nextOwners[index],
      name: updatedUser.name,
      email: updatedUser.email,
      phone: body.phone ? String(body.phone) : nextOwners[index].phone,
      avatar: updatedUser.avatar,
    }
    canteenId = nextOwners[index].canteenId
    canteenName = nextOwners[index].canteenName
    isActive = nextOwners[index].isActive
    setDbCanteenOwners(nextOwners)
  }

  return NextResponse.json({
    owner: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      role: "CANTEEN_OWNER" as const,
      phone: body.phone ? String(body.phone) : "",
      canteenId,
      canteenName,
      isActive,
    },
  })
}
