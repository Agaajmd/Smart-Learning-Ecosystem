import { NextResponse } from "next/server"
import { getDbProducts, setDbProducts } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const payload = (await request.json()) as Record<string, unknown>

  const products = getDbProducts()
  const target = products.find((p) => p.id === productId)

  if (!target) {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 })
  }

  const updated = {
    ...target,
    ...(payload.name != null ? { name: String(payload.name) } : {}),
    ...(payload.description != null ? { description: String(payload.description) } : {}),
    ...(payload.category != null ? { category: payload.category as typeof target.category } : {}),
    ...(payload.price != null ? { price: Number(payload.price) } : {}),
    ...(payload.stock != null ? { stock: Number(payload.stock) } : {}),
    ...(payload.isAvailable != null ? { isAvailable: Boolean(payload.isAvailable) } : {}),
  }

  setDbProducts(products.map((p) => (p.id === productId ? updated : p)))
  logAudit({
    action: "UPDATE",
    entityName: "products",
    entityId: productId,
    oldValue: target,
    newValue: updated,
  })
  return NextResponse.json({ product: updated })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params
  const products = getDbProducts()

  if (!products.some((p) => p.id === productId)) {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 })
  }

  const deleted = products.find((p) => p.id === productId)
  setDbProducts(products.filter((p) => p.id !== productId))
  logAudit({
    action: "DELETE",
    entityName: "products",
    entityId: productId,
    oldValue: deleted || null,
    newValue: null,
  })
  return NextResponse.json({ success: true })
}
