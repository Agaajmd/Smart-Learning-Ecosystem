import "server-only"

import { google } from "googleapis"
import type { Canteen } from "@/lib/data-model"
import { getImageUrl, normalizeDriveMediaUrl } from "@/lib/google-drive"

const CANTEENS_SHEET_NAME = "canteens"
const CANTEENS_COLUMNS = [
  "id",
  "name",
  "owner_id",
  "description",
  "image",
  "rating",
  "total_orders",
  "is_open",
  "created_at",
  "updated_at",
]

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

function normalizeCanteenRow(row: string[]): Canteen {
  return {
    id: row[0] || "",
    name: row[1] || "",
    ownerId: row[2] || "",
    description: row[3] || "",
    image: getImageUrl(row[4], ""),
    rating: Number(row[5] || 0),
    totalOrders: Number(row[6] || 0),
    isOpen: String(row[7] || "true").toLowerCase() !== "false",
  }
}

export async function ensureCanteensSheetReady() {
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const hasCanteensSheet =
    spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === CANTEENS_SHEET_NAME) ?? false

  if (!hasCanteensSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: CANTEENS_SHEET_NAME,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CANTEENS_SHEET_NAME}!A1:J1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === CANTEENS_COLUMNS.length) {
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${CANTEENS_SHEET_NAME}!A1:J1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [CANTEENS_COLUMNS],
    },
  })
}

export async function getAllDbCanteens(): Promise<Canteen[]> {
  await ensureCanteensSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CANTEENS_SHEET_NAME}!A2:J`,
  })

  const rows = rowsRes.data.values || []
  return rows
    .filter((row) => row[0] && row[1] && row[2])
    .map((row) => normalizeCanteenRow(row as string[]))
}

async function getDbCanteenRowById(id: string): Promise<{ canteen: Canteen; rowNumber: number } | null> {
  await ensureCanteensSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${CANTEENS_SHEET_NAME}!A2:J`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    if ((row[0] || "") === id) {
      return {
        canteen: normalizeCanteenRow(row),
        rowNumber: index + 2,
      }
    }
  }

  return null
}

export async function createDbCanteen(input: {
  id?: string
  name: string
  ownerId: string
  description?: string
  image?: string
  rating?: number
  totalOrders?: number
  isOpen?: boolean
}): Promise<Canteen> {
  const now = new Date().toISOString()
  const next: Canteen = {
    id: input.id || `can-${Date.now()}`,
    name: input.name.trim(),
    ownerId: input.ownerId,
    description: input.description || "",
    image: normalizeDriveMediaUrl(input.image) || "",
    rating: Number(input.rating || 0),
    totalOrders: Number(input.totalOrders || 0),
    isOpen: input.isOpen !== false,
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${CANTEENS_SHEET_NAME}!A:J`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        next.id,
        next.name,
        next.ownerId,
        next.description,
        next.image,
        String(next.rating),
        String(next.totalOrders),
        String(next.isOpen),
        now,
        now,
      ]],
    },
  })

  return next
}

export async function updateDbCanteenById(input: {
  id: string
  name?: string
  ownerId?: string
  description?: string
  image?: string
  rating?: number
  totalOrders?: number
  isOpen?: boolean
}): Promise<Canteen> {
  const target = await getDbCanteenRowById(input.id)
  if (!target) {
    throw new Error("Kantin tidak ditemukan")
  }

  const current = target.canteen
  const now = new Date().toISOString()
  const next: Canteen = {
    id: current.id,
    name: input.name?.trim() || current.name,
    ownerId: input.ownerId || current.ownerId,
    description: input.description != null ? input.description : current.description,
    image: input.image != null ? normalizeDriveMediaUrl(input.image) || "" : current.image,
    rating: input.rating != null ? Number(input.rating) : current.rating,
    totalOrders: input.totalOrders != null ? Number(input.totalOrders) : current.totalOrders,
    isOpen: input.isOpen != null ? Boolean(input.isOpen) : current.isOpen,
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${CANTEENS_SHEET_NAME}!A${target.rowNumber}:J${target.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        next.id,
        next.name,
        next.ownerId,
        next.description,
        next.image,
        String(next.rating),
        String(next.totalOrders),
        String(next.isOpen),
        "",
        now,
      ]],
    },
  })

  return next
}

export async function updateDbCanteenByOwnerId(input: {
  ownerId: string
  name?: string
  description?: string
  image?: string
  rating?: number
  totalOrders?: number
  isOpen?: boolean
}): Promise<Canteen> {
  const canteens = await getAllDbCanteens()
  const target = canteens.find((item) => item.ownerId === input.ownerId)
  if (!target) {
    throw new Error("Kantin tidak ditemukan")
  }
  return updateDbCanteenById({
    id: target.id,
    ownerId: target.ownerId,
    name: input.name,
    description: input.description,
    image: input.image,
    rating: input.rating,
    totalOrders: input.totalOrders,
    isOpen: input.isOpen,
  })
}

export async function deleteDbCanteenById(id: string): Promise<void> {
  const target = await getDbCanteenRowById(id)
  if (!target) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const sheetRes = await sheets.spreadsheets.get({ spreadsheetId })
  const canteensSheet = sheetRes.data.sheets?.find((sheet) => sheet.properties?.title === CANTEENS_SHEET_NAME)
  const sheetId = canteensSheet?.properties?.sheetId

  if (typeof sheetId !== "number") {
    throw new Error("Sheet canteens tidak ditemukan")
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
}

export async function deleteDbCanteenByOwnerId(ownerId: string): Promise<void> {
  const canteens = await getAllDbCanteens()
  const target = canteens.find((item) => item.ownerId === ownerId)
  if (!target) {
    return
  }
  await deleteDbCanteenById(target.id)
}