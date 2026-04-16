import "server-only"

import { google } from "googleapis"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"

const ASSET_REPORTS_SHEET_PRIMARY_NAME = "asset_reports"
const ASSET_REPORTS_SHEET_CANDIDATES = [
  "asset_reports",
  "asset_report",
  "assetreports",
  "reports_assets",
]
const ASSET_REPORTS_COLUMNS = [
  "id",
  "student_id",
  "asset_id",
  "asset_name",
  "damage_type",
  "description",
  "status",
  "location",
  "created_at",
  "updated_at",
  "resolved_at",
  "resolution",
  "handled_by",
  "image_url",
]

const ASSET_REPORTS_CACHE_TTL_MS = 60_000
const ASSET_REPORTS_READY_TTL_MS = 5 * 60_000

let assetReportsCache: { expiresAt: number; data: DbAssetReport[] } | null = null
let assetReportsSheetReadyAt = 0
let assetReportsSheetName = ASSET_REPORTS_SHEET_PRIMARY_NAME

function invalidateAssetReportsCache() {
  assetReportsCache = null
}

type ServiceAccount = {
  client_email: string
  private_key: string
}

export type DbAssetReportStatus = "pending" | "in_progress" | "resolved"

export interface DbAssetReport {
  id: string
  studentId: string
  assetId: string
  assetName: string
  damageType: string
  description: string
  imageUrl?: string
  status: DbAssetReportStatus
  location: string
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  resolution?: string
  handledBy?: string
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

function normalizeAssetReportStatus(value: unknown): DbAssetReportStatus {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")

  if (normalized === "resolved") return "resolved"
  if (normalized === "in_progress" || normalized === "inprogress") return "in_progress"
  return "pending"
}

function normalizeAssetReportRow(row: string[]): DbAssetReport {
  return {
    id: row[0] || "",
    studentId: row[1] || "",
    assetId: row[2] || "",
    assetName: row[3] || "",
    damageType: row[4] || "",
    description: row[5] || "",
    imageUrl: normalizeDriveMediaUrl(row[13]),
    status: normalizeAssetReportStatus(row[6]),
    location: row[7] || "",
    createdAt: row[8] || new Date().toISOString(),
    updatedAt: row[9] || row[8] || new Date().toISOString(),
    resolvedAt: normalizeMaybeString(row[10]),
    resolution: normalizeMaybeString(row[11]),
    handledBy: normalizeMaybeString(row[12]),
  }
}

function toAssetReportSheetRow(report: DbAssetReport): string[] {
  return [
    report.id,
    report.studentId,
    report.assetId,
    report.assetName,
    report.damageType,
    report.description,
    report.status,
    report.location,
    report.createdAt,
    report.updatedAt,
    report.resolvedAt || "",
    report.resolution || "",
    report.handledBy || "",
    report.imageUrl || "",
  ]
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

export async function ensureAssetReportsSheetReady() {
  if (Date.now() - assetReportsSheetReadyAt < ASSET_REPORTS_READY_TTL_MS) {
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
  const matched = ASSET_REPORTS_SHEET_CANDIDATES.find((title) => existingTitles.has(title))

  if (matched) {
    assetReportsSheetName = matched
  }

  if (!matched) {
    assetReportsSheetName = ASSET_REPORTS_SHEET_PRIMARY_NAME
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: assetReportsSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${assetReportsSheetName}!A1:N1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === ASSET_REPORTS_COLUMNS.length) {
    assetReportsSheetReadyAt = Date.now()
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${assetReportsSheetName}!A1:N1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [ASSET_REPORTS_COLUMNS],
    },
  })

  assetReportsSheetReadyAt = Date.now()
}

export async function getAllDbAssetReports(): Promise<DbAssetReport[]> {
  if (assetReportsCache && assetReportsCache.expiresAt > Date.now()) {
    return assetReportsCache.data
  }

  try {
    await ensureAssetReportsSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${assetReportsSheetName}!A2:N`,
    })

    const rows = rowsRes.data.values || []
    const data = rows
      .filter((row) => row[0] && row[1])
      .map((row) => normalizeAssetReportRow(row as string[]))

    assetReportsCache = {
      expiresAt: Date.now() + ASSET_REPORTS_CACHE_TTL_MS,
      data,
    }

    return data
  } catch (error) {
    if (assetReportsCache?.data?.length && isQuotaExceededError(error)) {
      return assetReportsCache.data
    }
    throw error
  }
}

async function getDbAssetReportRowById(id: string): Promise<{ report: DbAssetReport; rowNumber: number } | null> {
  await ensureAssetReportsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${assetReportsSheetName}!A2:N`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    if ((row[0] || "") === id) {
      return {
        report: normalizeAssetReportRow(row),
        rowNumber: index + 2,
      }
    }
  }

  return null
}

export async function createDbAssetReport(input: {
  studentId: string
  assetId: string
  assetName: string
  damageType: string
  description: string
  location: string
  imageUrl?: string
  status?: DbAssetReportStatus
}): Promise<DbAssetReport> {
  await ensureAssetReportsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const now = new Date().toISOString()
  const next: DbAssetReport = {
    id: `RPT${Date.now()}`,
    studentId: String(input.studentId || "").trim(),
    assetId: String(input.assetId || "").trim(),
    assetName: String(input.assetName || input.assetId || "").trim(),
    damageType: String(input.damageType || "").trim(),
    description: String(input.description || "").trim(),
    imageUrl: normalizeDriveMediaUrl(input.imageUrl),
    status: input.status || "pending",
    location: String(input.location || "").trim(),
    createdAt: now,
    updatedAt: now,
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${assetReportsSheetName}!A:N`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toAssetReportSheetRow(next)],
    },
  })

  invalidateAssetReportsCache()
  return next
}

export async function updateDbAssetReportById(input: {
  id: string
  status?: DbAssetReportStatus
  handledBy?: string
  resolution?: string
  resolvedAt?: string
}): Promise<DbAssetReport> {
  const target = await getDbAssetReportRowById(input.id)
  if (!target) {
    throw new Error("Laporan aset tidak ditemukan")
  }

  const current = target.report
  const nextStatus = input.status || current.status
  const nextResolvedAt =
    input.resolvedAt !== undefined
      ? normalizeMaybeString(input.resolvedAt)
      : nextStatus === "resolved"
        ? current.resolvedAt || new Date().toISOString()
        : current.resolvedAt

  const next: DbAssetReport = {
    ...current,
    status: nextStatus,
    handledBy: input.handledBy !== undefined ? normalizeMaybeString(input.handledBy) : current.handledBy,
    resolution: input.resolution !== undefined ? normalizeMaybeString(input.resolution) : current.resolution,
    resolvedAt: nextResolvedAt,
    updatedAt: new Date().toISOString(),
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${assetReportsSheetName}!A${target.rowNumber}:N${target.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toAssetReportSheetRow(next)],
    },
  })

  invalidateAssetReportsCache()
  return next
}
