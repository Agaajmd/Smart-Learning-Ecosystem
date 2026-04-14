import { NextResponse } from "next/server"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getDbCanteenOwners, getDbOrders } from "@/lib/server/data-store"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const ownerUsers = (await getAllDbUsers()).filter((user) => user.role === "CANTEEN_OWNER" && user.isActive)
  const ownerId = url.searchParams.get("ownerId") || ownerUsers[0]?.id
  const ownerUser = ownerUsers.find((item) => item.id === ownerId) || ownerUsers[0]

  const owner = ownerUser
    ? getDbCanteenOwners().find((item) => item.id === ownerUser.id || item.email === ownerUser.email) || null
    : null

  if (!owner) {
    return NextResponse.json({ error: "Owner tidak ditemukan" }, { status: 404 })
  }

  const orders = getDbOrders().filter((o) => o.canteenId === owner.canteenId)
  return NextResponse.json({ owner, orders })
}
