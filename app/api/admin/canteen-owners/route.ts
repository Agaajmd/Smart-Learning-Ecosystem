import { NextResponse } from "next/server"
import { createDbUser } from "@/lib/server/google-sheets-auth"
import {
  getDbAdmins,
  getDbCanteenOwners,
  getDbCanteens,
  setDbCanteenOwners,
  setDbCanteens,
} from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function GET() {
  return NextResponse.json({
    admin: getDbAdmins()[0] || null,
    owners: getDbCanteenOwners(),
    canteens: getDbCanteens(),
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")
  const phone = String(body.phone || "").trim()
  const canteenName = String(body.canteenName || "").trim()
  const canteenDescription = String(body.canteenDescription || "").trim()
  const isActive = body.isActive !== false

  if (!name || !email || !password || !canteenName) {
    return NextResponse.json({ error: "Data pemilik kantin belum lengkap" }, { status: 400 })
  }

  const user = await createDbUser({
    name,
    email,
    password,
    role: "CANTEEN_OWNER",
    phone,
    avatar: "/placeholder-user.jpg",
  })

  const canteenId = `can-${Date.now()}`
  const owner = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: "CANTEEN_OWNER" as const,
    canteenId,
    canteenName,
    phone,
    isActive,
  }

  const canteen = {
    id: canteenId,
    name: canteenName,
    ownerId: user.id,
    description: canteenDescription,
    image: "/placeholder.svg?height=200&width=300&query=food+stall",
    rating: 0,
    totalOrders: 0,
    isOpen: isActive,
  }

  setDbCanteenOwners([...getDbCanteenOwners(), owner])
  setDbCanteens([...getDbCanteens(), canteen])
  logAudit({
    actorId: user.id,
    action: "CREATE",
    entityName: "canteen_owners",
    entityId: owner.id,
    oldValue: null,
    newValue: owner,
  })

  return NextResponse.json({ owner, canteen }, { status: 201 })
}
