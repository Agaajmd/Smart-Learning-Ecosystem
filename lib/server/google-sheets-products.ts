import "server-only"

import { google } from "googleapis"
import type { Product, ProductCategory } from "@/lib/data-model"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"

const PRODUCTS_SHEET_NAME = "products"
const PRODUCTS_COLUMNS = [
  "id",
  "canteen_id",
  "name",
  "description",
  "price",
  "image",
  "category",
  "stock",
  "is_available",
  "created_at",
  "updated_at",
]

const PRODUCTS_READY_TTL_MS = 5 * 60_000
const PRODUCTS_CACHE_TTL_MS = 60_000

let productsSheetReadyAt = 0
let productsCache: { expiresAt: number; data: Product[] } | null = null

const PRODUCT_CATEGORY_SET = new Set<ProductCategory>(["MAKANAN", "MINUMAN", "SNACK"])

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

function invalidateProductsCache() {
  productsCache = null
}

function normalizeCategory(input: unknown): ProductCategory {
  const next = String(input || "").trim().toUpperCase() as ProductCategory
  if (PRODUCT_CATEGORY_SET.has(next)) {
    return next
  }
  return "MAKANAN"
}

function normalizeBoolean(input: unknown) {
  const next = String(input || "").trim().toLowerCase()
  if (next === "false" || next === "0" || next === "no" || next === "off") {
    return false
  }
  return true
}

function normalizeProductRow(row: string[]): Product {
  return {
    id: String(row[0] || "").trim(),
    canteenId: String(row[1] || "").trim(),
    name: String(row[2] || "").trim(),
    description: String(row[3] || "").trim(),
    price: Number(row[4] || 0),
    image: normalizeDriveMediaUrl(row[5]) || "",
    category: normalizeCategory(row[6]),
    stock: Math.max(0, Number(row[7] || 0)),
    isAvailable: normalizeBoolean(row[8]),
  }
}

function toProductSheetRow(product: Product, createdAt: string, updatedAt: string) {
  return [
    product.id,
    product.canteenId,
    product.name,
    product.description || "",
    String(Number(product.price || 0)),
    normalizeDriveMediaUrl(product.image) || "",
    normalizeCategory(product.category),
    String(Math.max(0, Number(product.stock || 0))),
    String(Boolean(product.isAvailable)),
    createdAt,
    updatedAt,
  ]
}

async function getProductRowById(id: string): Promise<{ rowNumber: number; product: Product; createdAt: string } | null> {
  await ensureProductsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${PRODUCTS_SHEET_NAME}!A2:K`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    if (String(row[0] || "").trim() !== id) continue

    return {
      rowNumber: index + 2,
      product: normalizeProductRow(row),
      createdAt: String(row[9] || "").trim() || new Date().toISOString(),
    }
  }

  return null
}

export async function ensureProductsSheetReady() {
  if (Date.now() - productsSheetReadyAt < PRODUCTS_READY_TTL_MS) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const hasProductsSheet =
    spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === PRODUCTS_SHEET_NAME) ?? false

  if (!hasProductsSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: PRODUCTS_SHEET_NAME,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${PRODUCTS_SHEET_NAME}!A1:K1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length !== PRODUCTS_COLUMNS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${PRODUCTS_SHEET_NAME}!A1:K1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [PRODUCTS_COLUMNS],
      },
    })
  }

  productsSheetReadyAt = Date.now()
}

export async function getAllDbProductsFromSheet(): Promise<Product[]> {
  if (productsCache && productsCache.expiresAt > Date.now()) {
    return productsCache.data
  }

  await ensureProductsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${PRODUCTS_SHEET_NAME}!A2:K`,
  })

  const rows = rowsRes.data.values || []
  const data = rows
    .filter((row) => row[0] && row[1] && row[2])
    .map((row) => normalizeProductRow(row as string[]))

  productsCache = {
    expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS,
    data,
  }

  return data
}

export async function createDbProduct(input: Product): Promise<Product> {
  const now = new Date().toISOString()
  const next: Product = {
    ...input,
    image: normalizeDriveMediaUrl(input.image) || "",
    category: normalizeCategory(input.category),
    stock: Math.max(0, Number(input.stock || 0)),
    isAvailable: Boolean(input.isAvailable),
  }

  await ensureProductsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${PRODUCTS_SHEET_NAME}!A:K`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toProductSheetRow(next, now, now)],
    },
  })

  invalidateProductsCache()
  return next
}

export async function updateDbProductById(input: Product): Promise<Product> {
  const target = await getProductRowById(input.id)
  if (!target) {
    throw new Error("Produk tidak ditemukan")
  }

  const now = new Date().toISOString()
  const next: Product = {
    ...target.product,
    ...input,
    image: normalizeDriveMediaUrl(input.image) || "",
    category: normalizeCategory(input.category),
    stock: Math.max(0, Number(input.stock || 0)),
    isAvailable: Boolean(input.isAvailable),
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${PRODUCTS_SHEET_NAME}!A${target.rowNumber}:K${target.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toProductSheetRow(next, target.createdAt, now)],
    },
  })

  invalidateProductsCache()
  return next
}

export async function deleteDbProductById(id: string): Promise<void> {
  const target = await getProductRowById(id)
  if (!target) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const sheetRes = await sheets.spreadsheets.get({ spreadsheetId })
  const productsSheet = sheetRes.data.sheets?.find((sheet) => sheet.properties?.title === PRODUCTS_SHEET_NAME)
  const sheetId = productsSheet?.properties?.sheetId

  if (typeof sheetId !== "number") {
    throw new Error("Sheet products tidak ditemukan")
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: target.rowNumber - 1,
              endIndex: target.rowNumber,
            },
          },
        },
      ],
    },
  })

  invalidateProductsCache()
}
