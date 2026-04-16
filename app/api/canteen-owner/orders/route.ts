import { NextResponse } from "next/server"
import { getAllDbOrdersFromSheet, migrateDbOrdersToSheet } from "@/lib/server/google-sheets-orders"
import { getDbOrders, setDbOrders } from "@/lib/server/persistent-store"
import { getSessionUser } from "@/lib/server/session-user"
import { resolveCanteenOwnerContext } from "@/lib/server/canteen-owner-context"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sessionUser = await getSessionUser()
  const requestedOwnerId = String(url.searchParams.get("ownerId") || "").trim()

  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminViewer = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isOwnerViewer = sessionUser.role === "CANTEEN_OWNER"

  if (!isAdminViewer && !isOwnerViewer) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const ownerContext = await resolveCanteenOwnerContext({
    ownerId: isOwnerViewer ? sessionUser.id : requestedOwnerId || undefined,
  })
  const owner = ownerContext?.owner || null

  if (!owner) {
    return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
  }

  let ordersSource = [] as Awaited<ReturnType<typeof getAllDbOrdersFromSheet>>
  try {
    const fromSheet = await getAllDbOrdersFromSheet()
    if (fromSheet.length > 0) {
      ordersSource = fromSheet
      setDbOrders(fromSheet)
    } else {
      const localOrders = getDbOrders()
      if (localOrders.length > 0) {
        const migratedOrders = await migrateDbOrdersToSheet(localOrders)
        ordersSource = migratedOrders
        setDbOrders(migratedOrders)
      } else {
        ordersSource = fromSheet
        setDbOrders(fromSheet)
      }
    }
  } catch {
    return NextResponse.json(
      { error: "Backend order sedang tidak tersedia. Silakan coba beberapa saat lagi." },
      { status: 503 },
    )
  }

  const orders = ordersSource
    .filter((order) => order.canteenId === owner.canteenId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  return NextResponse.json({ owner, orders })
}
