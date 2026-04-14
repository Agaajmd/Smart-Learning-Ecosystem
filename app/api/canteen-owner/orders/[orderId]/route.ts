import { NextResponse } from "next/server"
import { type OrderStatus } from "@/lib/data-model"
import { getDbOrders, setDbOrders } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params
  const payload = (await request.json()) as { status?: OrderStatus }

  if (!payload.status) {
    return NextResponse.json({ error: "Status wajib diisi" }, { status: 400 })
  }

  const orders = getDbOrders()
  const target = orders.find((o) => o.id === orderId)

  if (!target) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
  }

  const next = {
    ...target,
    status: payload.status,
    completedAt: payload.status === "COMPLETED" ? new Date().toISOString() : target.completedAt,
  }

  setDbOrders(orders.map((o) => (o.id === orderId ? next : o)))
  logAudit({
    action: "UPDATE",
    entityName: "orders",
    entityId: orderId,
    oldValue: target,
    newValue: next,
  })
  return NextResponse.json({ order: next })
}
