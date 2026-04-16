import { NextResponse } from "next/server"
import type { Order, OrderItem } from "@/lib/data-model"
import { getAllDbCanteens } from "@/lib/server/google-sheets-canteens"
import { createDbOrder, getAllDbOrdersFromSheet, migrateDbOrdersToSheet } from "@/lib/server/google-sheets-orders"
import { getAllDbProductsFromSheet, updateDbProductById } from "@/lib/server/google-sheets-products"
import { getAllDbWalletTopups } from "@/lib/server/google-sheets-wallet-topups"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbCanteens,
  getDbOrders,
  getDbProducts,
  getDbWalletTopups,
  setDbCanteens,
  setDbOrders,
  setDbProducts,
} from "@/lib/server/persistent-store"

type CheckoutItemInput = {
  productId: string
  quantity: number
}

const CANCELED_ORDER_STATUS = "CANCELLED"
const ALLOWED_ORDERER_ROLES = new Set(["STUDENT", "EMPLOYEE", "PARENT", "ADMIN", "SUPER_ADMIN"])

const loadCanteensFromSheetOrStore = async () => {
  try {
    const fromSheet = await getAllDbCanteens()
    if (fromSheet.length > 0) {
      setDbCanteens(fromSheet)
      return fromSheet
    }
  } catch {
    // fallback ke store lokal
  }

  return getDbCanteens()
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

const calculateApprovedTopupAmount = async (userId: string) => {
  const allTopups = await (async () => {
    try {
      return await getAllDbWalletTopups()
    } catch {
      return getDbWalletTopups().map((item) => ({
        userId: item.userId,
        amount: item.amount,
        status: item.status,
      }))
    }
  })()

  return allTopups
    .filter((item) => item.userId === userId && item.status === "APPROVED")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0)
}

const calculateSpentAmount = (userId: string, orders: Order[]) => {
  return orders
    .filter((order) => order.customerId === userId && order.status !== CANCELED_ORDER_STATUS)
    .reduce((acc, order) => acc + Number(order.totalAmount || 0), 0)
}

export async function GET() {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Anda harus login untuk melihat riwayat pesanan" }, { status: 401 })
  }

  if (!ALLOWED_ORDERER_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const canteens = await loadCanteensFromSheetOrStore()

  let ordersSource: Order[] = []
  try {
    ordersSource = await loadOrdersFromSheet()
  } catch {
    return NextResponse.json(
      { error: "Backend order sedang tidak tersedia. Silakan coba beberapa saat lagi." },
      { status: 503 },
    )
  }

  const canteenNameById = new Map(canteens.map((canteen) => [canteen.id, canteen.name]))
  const orders = ordersSource
    .filter((order) => order.customerId === user.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .map((order) => ({
      ...order,
      canteenName: canteenNameById.get(order.canteenId) || "Kantin",
    }))

  return NextResponse.json({ orders })
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    canteenId?: string
    items?: CheckoutItemInput[]
    notes?: string
  }

  const canteenId = String(body.canteenId || "").trim()
  const rawItems = Array.isArray(body.items) ? body.items : []

  if (!canteenId || rawItems.length === 0) {
    return NextResponse.json({ error: "Data pesanan tidak valid" }, { status: 400 })
  }

  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: "Anda harus login untuk membuat pesanan" }, { status: 401 })
  }

  if (!ALLOWED_ORDERER_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const canteens = await loadCanteensFromSheetOrStore()
  const canteen = canteens.find((item) => item.id === canteenId) || null
  if (!canteen || !canteen.isOpen) {
    return NextResponse.json({ error: "Kantin tidak tersedia atau sedang tutup" }, { status: 400 })
  }

  const quantityByProductId = new Map<string, number>()
  for (const item of rawItems) {
    const productId = String(item?.productId || "").trim()
    const quantity = Number(item?.quantity)
    const isValidQuantity = Number.isInteger(quantity) && quantity > 0
    if (!productId || !isValidQuantity) {
      return NextResponse.json({ error: "Produk atau jumlah pesanan tidak valid" }, { status: 400 })
    }

    quantityByProductId.set(productId, (quantityByProductId.get(productId) || 0) + quantity)
  }

  const products = await loadProductsFromSheetOrStore()
  const orderItems: OrderItem[] = []

  for (const [productId, quantity] of quantityByProductId) {
    const product = products.find((item) => item.id === productId) || null
    if (!product || product.canteenId !== canteenId) {
      return NextResponse.json({ error: "Produk tidak ditemukan di kantin yang dipilih" }, { status: 400 })
    }

    if (!product.isAvailable || product.stock <= 0) {
      return NextResponse.json(
        { error: `Produk ${product.name} sedang tidak tersedia` },
        { status: 400 },
      )
    }

    if (quantity > product.stock) {
      return NextResponse.json(
        { error: `Stok ${product.name} tidak mencukupi. Sisa stok: ${product.stock}` },
        { status: 400 },
      )
    }

    orderItems.push({
      productId: product.id,
      productName: product.name,
      quantity,
      price: Number(product.price),
    })
  }

  const totalAmount = orderItems.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.quantity || 0), 0)
  let existingOrders: Order[] = []
  try {
    existingOrders = await loadOrdersFromSheet()
  } catch {
    return NextResponse.json(
      { error: "Backend order sedang tidak tersedia. Silakan coba beberapa saat lagi." },
      { status: 503 },
    )
  }
  const approvedTopupAmount = await calculateApprovedTopupAmount(user.id)
  const spentAmount = calculateSpentAmount(user.id, existingOrders)
  const walletBalance = Math.max(0, approvedTopupAmount - spentAmount)

  if (totalAmount > walletBalance) {
    return NextResponse.json(
      {
        error: `Saldo dompet tidak cukup. Saldo tersedia: Rp ${walletBalance.toLocaleString("id-ID")}`,
      },
      { status: 400 },
    )
  }

  const nowIso = new Date().toISOString()

  const order: Order = {
    id: `ord-${Date.now()}`,
    canteenId,
    customerId: user.id,
    customerRole: user.role,
    customerName: user.name,
    items: orderItems,
    totalAmount,
    status: "PENDING" as const,
    createdAt: nowIso,
    notes: body.notes ? String(body.notes) : undefined,
  }

  const changedProducts: typeof products = []
  const nextProducts = products.map((product) => {
    const orderedQty = quantityByProductId.get(product.id)
    if (!orderedQty) return product

    const nextStock = Math.max(0, Number(product.stock || 0) - orderedQty)
    const nextProduct = {
      ...product,
      stock: nextStock,
      isAvailable: nextStock > 0 ? product.isAvailable : false,
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

  let savedOrder: Order
  try {
    savedOrder = await createDbOrder(order)
  } catch {
    return NextResponse.json(
      { error: "Gagal menyimpan pesanan ke backend. Silakan coba beberapa saat lagi." },
      { status: 503 },
    )
  }

  setDbProducts(nextProducts)
  setDbOrders([...existingOrders.filter((existingOrder) => existingOrder.id !== savedOrder.id), savedOrder])

  return NextResponse.json({ order: { ...savedOrder, canteenName: canteen.name } }, { status: 201 })
}