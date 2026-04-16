import "server-only"

import { google } from "googleapis"
import type { Order, OrderItem, OrderStatus, UserRole } from "@/lib/data-model"

const ORDER_SHEET_PRIMARY_NAME = "order"
const ORDER_SHEET_CANDIDATES = ["order", "orders"]
const ORDER_ITEMS_SHEET_PRIMARY_NAME = "order_items"
const ORDER_ITEMS_SHEET_CANDIDATES = ["order_items", "orderitems", "order_item"]

const ORDER_COLUMNS = [
  "id",
  "canteen_id",
  "customer_id",
  "customer_role",
  "customer_name",
  "total_amount",
  "status",
  "created_at",
  "completed_at",
  "notes",
  "updated_at",
]

const ORDER_ITEMS_COLUMNS = [
  "order_id",
  "item_index",
  "product_id",
  "product_name",
  "quantity",
  "price",
  "line_total",
  "created_at",
  "updated_at",
]

const ORDER_STATUS_SET = new Set<OrderStatus>(["PENDING", "PREPARING", "READY", "COMPLETED", "CANCELLED"])
const USER_ROLE_SET = new Set<UserRole>(["STUDENT", "EMPLOYEE", "ADMIN", "SUPER_ADMIN", "PARENT", "CANTEEN_OWNER"])

const ORDERS_READY_TTL_MS = 5 * 60_000
const ORDERS_CACHE_TTL_MS = 60_000

let ordersSheetReadyAt = 0
let orderSheetName = ORDER_SHEET_PRIMARY_NAME
let orderItemsSheetName = ORDER_ITEMS_SHEET_PRIMARY_NAME
let ordersCache: { expiresAt: number; data: Order[] } | null = null

type ServiceAccount = {
  client_email: string
  private_key: string
}

function parseServiceAccount(raw: string): ServiceAccount {
  const parsed = JSON.parse(raw)
  const clientEmail = String(parsed.client_email || "")
  const privateKey = String(parsed.private_key || "").replace(/\\n/g, "\n")

  if (!clientEmail || !privateKey) {
    throw new Error("Service account tidak valid. Pastikan client_email dan private_key tersedia.")
  }

  return {
    client_email: clientEmail,
    private_key: privateKey,
  }
}

async function getServiceAccount(): Promise<ServiceAccount> {
  const fromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!fromEnv) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON belum di-set.")
  }

  return parseServiceAccount(fromEnv)
}

function getSpreadsheetId(): string {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID belum di-set.")
  }

  return spreadsheetId
}

async function getSheetsClient() {
  const serviceAccount = await getServiceAccount()
  const auth = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })

  return google.sheets({ version: "v4", auth })
}

function normalizeMaybeString(value: unknown) {
  const next = String(value || "").trim()
  return next || undefined
}

function normalizeOrderStatus(value: unknown): OrderStatus {
  const next = String(value || "").trim().toUpperCase() as OrderStatus
  if (ORDER_STATUS_SET.has(next)) return next
  return "PENDING"
}

function normalizeUserRole(value: unknown): UserRole {
  const next = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_") as UserRole

  if (USER_ROLE_SET.has(next)) return next
  return "STUDENT"
}

function normalizeOrderItem(input: OrderItem): OrderItem {
  return {
    productId: String(input.productId || "").trim(),
    productName: String(input.productName || "").trim() || "Produk",
    quantity: Math.max(0, Math.floor(Number(input.quantity || 0))),
    price: Math.max(0, Number(input.price || 0)),
  }
}

function normalizeOrderRow(row: string[]): Omit<Order, "items"> {
  return {
    id: String(row[0] || "").trim(),
    canteenId: String(row[1] || "").trim(),
    customerId: String(row[2] || "").trim(),
    customerRole: normalizeUserRole(row[3]),
    customerName: String(row[4] || "").trim(),
    totalAmount: Math.max(0, Number(row[5] || 0)),
    status: normalizeOrderStatus(row[6]),
    createdAt: String(row[7] || "").trim() || new Date().toISOString(),
    completedAt: normalizeMaybeString(row[8]),
    notes: normalizeMaybeString(row[9]),
  }
}

function normalizeOrderItemRow(row: string[]) {
  const orderId = String(row[0] || "").trim()
  if (!orderId) return null

  const itemIndex = Number(row[1] || 0)
  const item = normalizeOrderItem({
    productId: String(row[2] || "").trim(),
    productName: String(row[3] || "").trim(),
    quantity: Number(row[4] || 0),
    price: Number(row[5] || 0),
  })

  if (!item.productId || item.quantity <= 0) {
    return null
  }

  return {
    orderId,
    itemIndex: Number.isFinite(itemIndex) ? itemIndex : 0,
    item,
  }
}

function toOrderSheetRow(order: Order, updatedAt: string) {
  return [
    order.id,
    order.canteenId,
    order.customerId,
    normalizeUserRole(order.customerRole),
    order.customerName,
    String(Math.max(0, Number(order.totalAmount || 0))),
    normalizeOrderStatus(order.status),
    order.createdAt,
    order.completedAt || "",
    order.notes || "",
    updatedAt,
  ]
}

function toOrderItemSheetRow(orderId: string, itemIndex: number, item: OrderItem, createdAt: string, updatedAt: string) {
  const lineTotal = Math.max(0, Number(item.quantity || 0)) * Math.max(0, Number(item.price || 0))
  return [
    orderId,
    String(itemIndex),
    item.productId,
    item.productName,
    String(Math.max(0, Math.floor(Number(item.quantity || 0)))),
    String(Math.max(0, Number(item.price || 0))),
    String(lineTotal),
    createdAt,
    updatedAt,
  ]
}

function invalidateOrdersCache() {
  ordersCache = null
}

function resolveExistingSheetName(existingTitles: Set<string>, candidates: string[], fallback: string) {
  return candidates.find((title) => existingTitles.has(title)) || fallback
}

export async function ensureOrdersSheetsReady() {
  if (Date.now() - ordersSheetReadyAt < ORDERS_READY_TTL_MS) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const existingTitles = new Set(
    (spreadsheet.data.sheets || [])
      .map((sheet) => String(sheet.properties?.title || ""))
      .filter(Boolean),
  )

  orderSheetName = resolveExistingSheetName(existingTitles, ORDER_SHEET_CANDIDATES, ORDER_SHEET_PRIMARY_NAME)
  if (!existingTitles.has(orderSheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: orderSheetName,
              },
            },
          },
        ],
      },
    })
    existingTitles.add(orderSheetName)
  }

  orderItemsSheetName = resolveExistingSheetName(existingTitles, ORDER_ITEMS_SHEET_CANDIDATES, ORDER_ITEMS_SHEET_PRIMARY_NAME)
  if (!existingTitles.has(orderItemsSheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: orderItemsSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const [orderHeaderRes, orderItemsHeaderRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${orderSheetName}!A1:K1`,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${orderItemsSheetName}!A1:I1`,
    }),
  ])

  const firstOrderRow = orderHeaderRes.data.values?.[0] || []
  if (firstOrderRow.length !== ORDER_COLUMNS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${orderSheetName}!A1:K1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [ORDER_COLUMNS],
      },
    })
  }

  const firstOrderItemsRow = orderItemsHeaderRes.data.values?.[0] || []
  if (firstOrderItemsRow.length !== ORDER_ITEMS_COLUMNS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${orderItemsSheetName}!A1:I1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [ORDER_ITEMS_COLUMNS],
      },
    })
  }

  ordersSheetReadyAt = Date.now()
}

export async function getAllDbOrdersFromSheet(): Promise<Order[]> {
  if (ordersCache && ordersCache.expiresAt > Date.now()) {
    return ordersCache.data
  }

  await ensureOrdersSheetsReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const [ordersRes, orderItemsRes] = await Promise.all([
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${orderSheetName}!A2:K`,
    }),
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${orderItemsSheetName}!A2:I`,
    }),
  ])

  const orderRows = ordersRes.data.values || []
  const orderItemRows = orderItemsRes.data.values || []

  const itemsByOrderId = new Map<string, Array<{ itemIndex: number; item: OrderItem }>>()
  for (const row of orderItemRows) {
    const parsed = normalizeOrderItemRow(row as string[])
    if (!parsed) continue

    const bucket = itemsByOrderId.get(parsed.orderId) || []
    bucket.push({ itemIndex: parsed.itemIndex, item: parsed.item })
    itemsByOrderId.set(parsed.orderId, bucket)
  }

  const data = orderRows
    .map((row) => normalizeOrderRow(row as string[]))
    .filter((order) => Boolean(order.id && order.canteenId && order.customerId))
    .map((order) => ({
      ...order,
      items: (itemsByOrderId.get(order.id) || [])
        .sort((left, right) => left.itemIndex - right.itemIndex)
        .map((entry) => entry.item),
    }))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())

  ordersCache = {
    expiresAt: Date.now() + ORDERS_CACHE_TTL_MS,
    data,
  }

  return data
}

async function getOrderRowById(id: string): Promise<{ rowNumber: number; order: Omit<Order, "items"> } | null> {
  await ensureOrdersSheetsReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${orderSheetName}!A2:K`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    if (String(row[0] || "").trim() !== id) continue

    return {
      rowNumber: index + 2,
      order: normalizeOrderRow(row),
    }
  }

  return null
}

export async function createDbOrder(input: Order): Promise<Order> {
  const now = new Date().toISOString()
  const items = Array.isArray(input.items) ? input.items.map((item) => normalizeOrderItem(item)) : []

  const next: Order = {
    id: String(input.id || `ord-${Date.now()}`).trim(),
    canteenId: String(input.canteenId || "").trim(),
    customerId: String(input.customerId || "").trim(),
    customerRole: normalizeUserRole(input.customerRole),
    customerName: String(input.customerName || "").trim() || "Pelanggan",
    items,
    totalAmount: Math.max(0, Number(input.totalAmount || 0)),
    status: normalizeOrderStatus(input.status),
    createdAt: String(input.createdAt || now).trim() || now,
    completedAt: normalizeMaybeString(input.completedAt),
    notes: normalizeMaybeString(input.notes),
  }

  if (!next.id || !next.canteenId || !next.customerId) {
    throw new Error("Data order belum lengkap")
  }

  await ensureOrdersSheetsReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${orderSheetName}!A:K`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toOrderSheetRow(next, now)],
    },
  })

  if (items.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${orderItemsSheetName}!A:I`,
      valueInputOption: "RAW",
      requestBody: {
        values: items.map((item, index) => toOrderItemSheetRow(next.id, index + 1, item, now, now)),
      },
    })
  }

  invalidateOrdersCache()
  return next
}

export async function updateDbOrderById(input: Partial<Order> & { id: string }): Promise<Order> {
  const id = String(input.id || "").trim()
  if (!id) {
    throw new Error("ID order wajib diisi")
  }

  const [allOrders, targetRow] = await Promise.all([getAllDbOrdersFromSheet(), getOrderRowById(id)])
  if (!targetRow) {
    throw new Error("Order tidak ditemukan")
  }

  const current = allOrders.find((order) => order.id === id)
  if (!current) {
    throw new Error("Order tidak ditemukan")
  }

  const now = new Date().toISOString()
  const next: Order = {
    ...current,
    status: input.status != null ? normalizeOrderStatus(input.status) : current.status,
    totalAmount: input.totalAmount != null ? Math.max(0, Number(input.totalAmount || 0)) : current.totalAmount,
    completedAt: input.completedAt !== undefined ? normalizeMaybeString(input.completedAt) : current.completedAt,
    notes: input.notes !== undefined ? normalizeMaybeString(input.notes) : current.notes,
    customerName: input.customerName != null ? String(input.customerName).trim() : current.customerName,
    customerRole: input.customerRole != null ? normalizeUserRole(input.customerRole) : current.customerRole,
  }

  await ensureOrdersSheetsReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${orderSheetName}!A${targetRow.rowNumber}:K${targetRow.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toOrderSheetRow(next, now)],
    },
  })

  invalidateOrdersCache()
  return next
}

export async function migrateDbOrdersToSheet(sourceOrders: Order[]): Promise<Order[]> {
  const candidates = Array.isArray(sourceOrders) ? sourceOrders : []
  if (candidates.length === 0) {
    return getAllDbOrdersFromSheet()
  }

  const existing = await getAllDbOrdersFromSheet()
  const existingIds = new Set(existing.map((order) => order.id))
  const missing = candidates.filter((order) => {
    const id = String(order?.id || "").trim()
    return Boolean(id && !existingIds.has(id))
  })

  if (missing.length === 0) {
    return existing
  }

  for (const order of missing) {
    await createDbOrder(order)
  }

  return getAllDbOrdersFromSheet()
}
