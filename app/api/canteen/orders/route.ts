import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/server/session-user"
import { getDbOrders, setDbOrders } from "@/lib/server/data-store"

type CheckoutItem = {
  productId: string
  productName: string
  quantity: number
  price: number
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    canteenId?: string
    items?: CheckoutItem[]
    notes?: string
  }

  const canteenId = String(body.canteenId || "").trim()
  const items = Array.isArray(body.items) ? body.items : []

  if (!canteenId || items.length === 0) {
    return NextResponse.json({ error: "Data pesanan tidak valid" }, { status: 400 })
  }

  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Anda harus login untuk membuat pesanan" }, { status: 401 })
  }

  const totalAmount = items.reduce((acc, item) => acc + Number(item.price || 0), 0)
  const nowIso = new Date().toISOString()

  const order = {
    id: `ord-${Date.now()}`,
    canteenId,
    customerId: user.id,
    customerRole: user.role,
    customerName: user.name,
    items: items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
    })),
    totalAmount,
    status: "PENDING" as const,
    createdAt: nowIso,
    notes: body.notes ? String(body.notes) : undefined,
  }

  setDbOrders([...getDbOrders(), order])

  return NextResponse.json({ order }, { status: 201 })
}