import { NextResponse } from "next/server"
import type { Product } from "@/lib/data-model"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getDbProducts, setDbProducts } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"
import { getDbCanteenOwners } from "@/lib/server/data-store"

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

  const products = getDbProducts().filter((p) => p.canteenId === owner.canteenId)
  return NextResponse.json({ owner, products })
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<Product>

  if (!payload.canteenId || !payload.name || !payload.price || payload.stock == null || !payload.category) {
    return NextResponse.json({ error: "Data produk belum lengkap" }, { status: 400 })
  }

  const products = getDbProducts()
  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    canteenId: payload.canteenId,
    name: payload.name,
    description: payload.description || "",
    price: Number(payload.price),
    image: payload.image || "/placeholder.svg?height=150&width=150&query=food",
    category: payload.category,
    stock: Number(payload.stock),
    isAvailable: payload.isAvailable ?? true,
  }

  setDbProducts([...products, newProduct])
  logAudit({
    action: "CREATE",
    entityName: "products",
    entityId: newProduct.id,
    oldValue: null,
    newValue: newProduct,
  })
  return NextResponse.json({ product: newProduct }, { status: 201 })
}
