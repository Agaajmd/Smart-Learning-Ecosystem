import "server-only"

import { google } from "googleapis"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"
import type { UserRole } from "@/lib/data-model"

const WALLET_TOPUPS_SHEET_NAME = "wallet_topups"
const WALLET_TOPUPS_COLUMNS = [
  "id",
  "user_id",
  "user_name",
  "user_role",
  "amount",
  "method",
  "destination_account",
  "destination_name",
  "proof_reference",
  "proof_url",
  "status",
  "requested_at",
  "processed_at",
  "processed_by",
  "admin_note",
]

const WALLET_TOPUPS_CACHE_TTL_MS = 60_000
const WALLET_TOPUPS_READY_TTL_MS = 5 * 60_000

let walletTopupsCache: { expiresAt: number; data: WalletTopupRecord[] } | null = null
let walletTopupsSheetReadyAt = 0

function invalidateWalletTopupsCache() {
  walletTopupsCache = null
}

type ServiceAccount = {
  client_email: string
  private_key: string
}

export type WalletTopupStatus = "PENDING" | "APPROVED" | "REJECTED"

export interface WalletTopupRecord {
  id: string
  userId: string
  userName: string
  userRole: UserRole
  amount: number
  method: string
  destinationAccount: string
  destinationName: string
  proofReference?: string
  proofUrl?: string
  status: WalletTopupStatus
  requestedAt: string
  processedAt?: string
  processedBy?: string
  adminNote?: string
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

function normalizeRole(raw: unknown): UserRole {
  const value = String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")

  if (
    value === "STUDENT" ||
    value === "EMPLOYEE" ||
    value === "ADMIN" ||
    value === "SUPER_ADMIN" ||
    value === "PARENT" ||
    value === "CANTEEN_OWNER"
  ) {
    return value
  }

  return "STUDENT"
}

function normalizeStatus(raw: unknown): WalletTopupStatus {
  const value = String(raw || "").trim().toUpperCase()
  if (value === "APPROVED" || value === "REJECTED") {
    return value
  }
  return "PENDING"
}

function normalizeAmount(raw: unknown): number {
  const amount = Number(raw)
  return Number.isFinite(amount) ? Math.max(0, amount) : 0
}

function normalizeWalletTopupRow(row: string[]): WalletTopupRecord {
  return {
    id: row[0] || "",
    userId: row[1] || "",
    userName: row[2] || "",
    userRole: normalizeRole(row[3]),
    amount: normalizeAmount(row[4]),
    method: row[5] || "",
    destinationAccount: row[6] || "",
    destinationName: row[7] || "",
    proofReference: normalizeMaybeString(row[8]),
    proofUrl: normalizeDriveMediaUrl(row[9]),
    status: normalizeStatus(row[10]),
    requestedAt: row[11] || new Date().toISOString(),
    processedAt: normalizeMaybeString(row[12]),
    processedBy: normalizeMaybeString(row[13]),
    adminNote: normalizeMaybeString(row[14]),
  }
}

function toWalletTopupSheetRow(record: WalletTopupRecord): string[] {
  return [
    record.id,
    record.userId,
    record.userName,
    record.userRole,
    String(record.amount),
    record.method,
    record.destinationAccount,
    record.destinationName,
    record.proofReference || "",
    record.proofUrl || "",
    record.status,
    record.requestedAt,
    record.processedAt || "",
    record.processedBy || "",
    record.adminNote || "",
  ]
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

export async function ensureWalletTopupsSheetReady() {
  if (Date.now() - walletTopupsSheetReadyAt < WALLET_TOPUPS_READY_TTL_MS) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const hasSheet =
    spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === WALLET_TOPUPS_SHEET_NAME) ?? false

  if (!hasSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: WALLET_TOPUPS_SHEET_NAME,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${WALLET_TOPUPS_SHEET_NAME}!A1:O1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === WALLET_TOPUPS_COLUMNS.length) {
    walletTopupsSheetReadyAt = Date.now()
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${WALLET_TOPUPS_SHEET_NAME}!A1:O1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [WALLET_TOPUPS_COLUMNS],
    },
  })

  walletTopupsSheetReadyAt = Date.now()
}

export async function getAllDbWalletTopups(): Promise<WalletTopupRecord[]> {
  if (walletTopupsCache && walletTopupsCache.expiresAt > Date.now()) {
    return walletTopupsCache.data
  }

  try {
    await ensureWalletTopupsSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${WALLET_TOPUPS_SHEET_NAME}!A2:O`,
    })

    const rows = rowsRes.data.values || []
    const data = rows
      .filter((row) => row[0] && row[1])
      .map((row) => normalizeWalletTopupRow(row as string[]))

    walletTopupsCache = {
      expiresAt: Date.now() + WALLET_TOPUPS_CACHE_TTL_MS,
      data,
    }

    return data
  } catch (error) {
    if (walletTopupsCache?.data?.length && isQuotaExceededError(error)) {
      return walletTopupsCache.data
    }
    throw error
  }
}

async function getDbWalletTopupRowById(id: string): Promise<{ record: WalletTopupRecord; rowNumber: number } | null> {
  await ensureWalletTopupsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${WALLET_TOPUPS_SHEET_NAME}!A2:O`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    if ((row[0] || "") === id) {
      return {
        record: normalizeWalletTopupRow(row),
        rowNumber: index + 2,
      }
    }
  }

  return null
}

export async function createDbWalletTopup(input: {
  userId: string
  userName: string
  userRole: UserRole
  amount: number
  method: string
  destinationAccount: string
  destinationName: string
  proofReference?: string
  proofUrl?: string
}): Promise<WalletTopupRecord> {
  await ensureWalletTopupsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const next: WalletTopupRecord = {
    id: `TOPUP-${Date.now()}`,
    userId: String(input.userId || "").trim(),
    userName: String(input.userName || "").trim(),
    userRole: normalizeRole(input.userRole),
    amount: normalizeAmount(input.amount),
    method: String(input.method || "").trim(),
    destinationAccount: String(input.destinationAccount || "").trim(),
    destinationName: String(input.destinationName || "").trim(),
    proofReference: normalizeMaybeString(input.proofReference),
    proofUrl: normalizeDriveMediaUrl(input.proofUrl),
    status: "PENDING",
    requestedAt: new Date().toISOString(),
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${WALLET_TOPUPS_SHEET_NAME}!A:O`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toWalletTopupSheetRow(next)],
    },
  })

  invalidateWalletTopupsCache()
  return next
}

export async function updateDbWalletTopupStatusById(input: {
  id: string
  status: WalletTopupStatus
  processedBy?: string
  adminNote?: string
}): Promise<WalletTopupRecord> {
  const target = await getDbWalletTopupRowById(input.id)
  if (!target) {
    throw new Error("Permintaan topup tidak ditemukan")
  }

  const next: WalletTopupRecord = {
    ...target.record,
    status: normalizeStatus(input.status),
    processedBy: normalizeMaybeString(input.processedBy) || target.record.processedBy,
    adminNote: input.adminNote !== undefined ? normalizeMaybeString(input.adminNote) : target.record.adminNote,
    processedAt: new Date().toISOString(),
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${WALLET_TOPUPS_SHEET_NAME}!A${target.rowNumber}:O${target.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toWalletTopupSheetRow(next)],
    },
  })

  invalidateWalletTopupsCache()
  return next
}
