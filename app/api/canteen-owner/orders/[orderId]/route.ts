import { NextResponse } from "next/server"
import { type Order, type OrderStatus } from "@/lib/data-model"
import { getAllDbOrdersFromSheet, migrateDbOrdersToSheet, updateDbOrderById } from "@/lib/server/google-sheets-orders"
import { getAllDbProductsFromSheet, updateDbProductById } from "@/lib/server/google-sheets-products"
import {
  getDbOrders,
  getDbProducts,
  setDbOrders,
  setDbProducts,
} from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"
import { getSessionUser } from "@/lib/server/session-user"
import { hasOwnedCanteenAccess, resolveCanteenOwnerContext } from "@/lib/server/canteen-owner-context"

const ALLOWED_ORDER_STATUSES = new Set<OrderStatus>([
  "PENDING",
  "PREPARING",
  "READY",
  "COMPLETED",
  "CANCELLED",
])

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
}

function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus) {
  return ORDER_STATUS_TRANSITIONS[current].includes(next)
}

const loadOrdersFromSheet = async () => {
  const fromSheet = await getAllDbOrdersFromSheet()
  if (fromSheet.length > 0) {
    setDbOrders(fromSheet)
    return fromSheet
  }

  const localOrders = getDbOrders()
  if (localOrders.length === 0) {
    setDbOrders(fromSheet)
    return fromSheet
  }

  const migratedOrders = await migrateDbOrdersToSheet(localOrders)
  setDbOrders(migratedOrders)
  return migratedOrders
}

const loadProductsFromSheetOrStore = async () => {
  try {
    const fromSheet = await getAllDbProductsFromSheet()
    if (fromSheet.length > 0) {
      setDbProducts(fromSheet)
      return fromSheet
    }
  } catch {
    // fallback ke store lokal
  }

  return getDbProducts()
}

export async function PATCH(request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminEditor = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isOwnerEditor = sessionUser.role === "CANTEEN_OWNER"
  if (!isAdminEditor && !isOwnerEditor) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const { orderId } = await params
  const payload = (await request.json()) as { status?: OrderStatus }

  if (!payload.status) {
    return NextResponse.json({ error: "Status wajib diisi" }, { status: 400 })
  }

  if (!ALLOWED_ORDER_STATUSES.has(payload.status)) {
    return NextResponse.json({ error: "Status order tidak valid" }, { status: 400 })
  }

  let orders: Order[] = []
  try {
    orders = await loadOrdersFromSheet()
  } catch {
    return NextResponse.json(
      { error: "Backend order sedang tidak tersedia. Silakan coba beberapa saat lagi." },
      { status: 503 },
    )
  }
  const target = orders.find((o) => o.id === orderId)

  if (!target) {
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
  }

  if (payload.status === target.status) {
    return NextResponse.json({ order: target })
  }

  if (!canTransitionOrderStatus(target.status, payload.status)) {
    return NextResponse.json(
      {
        error: `Status order tidak dapat diubah dari ${target.status} ke ${payload.status}`,
      },
      { status: 400 },
    )
  }

  if (isOwnerEditor) {
    const ownerContext = await resolveCanteenOwnerContext({ ownerId: sessionUser.id })
    if (!ownerContext || !hasOwnedCanteenAccess(ownerContext.ownedCanteenIds, target.canteenId)) {
      return NextResponse.json({ error: "Tidak diizinkan mengubah order kantin lain" }, { status: 403 })
    }
  }

  if (payload.status === "CANCELLED") {
    const products = await loadProductsFromSheetOrStore()
    const restoreQtyByProduct = new Map<string, number>()
    for (const item of target.items) {
      const productId = String(item.productId || "").trim()
      if (!productId) continue
      const quantity = Math.max(0, Number(item.quantity || 0))
      restoreQtyByProduct.set(productId, (restoreQtyByProduct.get(productId) || 0) + quantity)
    }

    if (restoreQtyByProduct.size > 0) {
      const changedProducts: typeof products = []
      const nextProducts = products.map((product) => {
        const restoreQty = restoreQtyByProduct.get(product.id)
        if (!restoreQty) return product

        const currentStock = Number(product.stock || 0)
        const nextStock = currentStock + restoreQty
        const becameAvailableAgain = currentStock <= 0 && nextStock > 0

        const nextProduct = {
          ...product,
          stock: nextStock,
          isAvailable: becameAvailableAgain ? true : product.isAvailable,
        }
        changedProducts.push(nextProduct)
        return nextProduct
      })

      try {
        await Promise.all(changedProducts.map((product) => updateDbProductById(product)))
      } catch {
        return NextResponse.json(
          { error: "Gagal memperbarui stok produk di backend. Silakan coba beberapa saat lagi." },
          { status: 503 },
        )
      }

      setDbProducts(nextProducts)
    }
  }

  const next: Order = {
    ...target,
    status: payload.status,
    completedAt: payload.status === "COMPLETED" ? new Date().toISOString() : undefined,
  }

  let savedOrder: Order = next
  try {
    savedOrder = await updateDbOrderById({
      id: next.id,
      status: next.status,
      completedAt: next.completedAt,
    })
  } catch {
    return NextResponse.json(
      { error: "Gagal memperbarui status order di backend. Silakan coba beberapa saat lagi." },
      { status: 503 },
    )
  }

  setDbOrders(orders.map((order) => (order.id === orderId ? savedOrder : order)))
  logAudit({
    actorId: sessionUser.id,
    action: "UPDATE",
    entityName: "orders",
    entityId: orderId,
    oldValue: target,
    newValue: savedOrder,
  })
  return NextResponse.json({ order: savedOrder })
}
