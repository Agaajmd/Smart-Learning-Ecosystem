import "server-only"

import { google } from "googleapis"
import type { SppDefault } from "@/lib/data-model"

const SPP_DEFAULTS_SHEET_PRIMARY_NAME = "spp_defaults"
const SPP_DEFAULTS_SHEET_CANDIDATES = ["spp_defaults", "spp_default", "grade_spp", "spp"]
const SPP_DEFAULTS_COLUMNS = ["id", "grade", "amount", "due_day", "is_active", "updated_at"]

const SPP_DEFAULTS_READY_TTL_MS = 5 * 60_000
const SPP_DEFAULTS_CACHE_TTL_MS = 60_000

let sppDefaultsSheetReadyAt = 0
let sppDefaultsSheetName = SPP_DEFAULTS_SHEET_PRIMARY_NAME
let sppDefaultsCache: { expiresAt: number; data: SppDefault[] } | null = null

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

function getSpreadsheetId() {
  const rawSpreadsheetId = String(process.env.GOOGLE_SHEETS_ID || "").trim()
  if (!rawSpreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID belum di-set.")
  }

  const normalized = rawSpreadsheetId.replace(/^['\"]|['\"]$/g, "").trim()
  const directMatch = normalized.match(/^[A-Za-z0-9_-]{15,}$/)
  if (directMatch) {
    return directMatch[0]
  }

  const pathMatch = normalized.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{15,})/i)
  if (pathMatch?.[1]) {
    return pathMatch[1]
  }

  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsedUrl = new URL(normalized)
      const queryId = String(parsedUrl.searchParams.get("id") || "").trim()
      if (/^[A-Za-z0-9_-]{15,}$/.test(queryId)) {
        return queryId
      }

      const pathnameMatch = String(parsedUrl.pathname || "").match(/\/d\/([A-Za-z0-9_-]{15,})/i)
      if (pathnameMatch?.[1]) {
        return pathnameMatch[1]
      }
    } catch {
      // Continue to explicit validation error below.
    }
  }

  throw new Error("GOOGLE_SHEETS_ID tidak valid. Gunakan Spreadsheet ID atau URL Google Sheets yang benar.")
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

function resolveExistingSheetName(existingTitles: Set<string>, candidates: string[], fallback: string) {
  return candidates.find((title) => existingTitles.has(title)) || fallback
}

function normalizeAmount(value: unknown) {
  const next = Number(value)
  if (!Number.isFinite(next)) {
    return 0
  }
  return Math.max(0, Math.round(next))
}

function normalizeDueDay(value: unknown) {
  const next = Number(value)
  if (!Number.isFinite(next)) {
    return 10
  }

  const rounded = Math.round(next)
  if (rounded < 1) return 1
  if (rounded > 31) return 31
  return rounded
}

function normalizeIsActive(value: unknown) {
  const next = String(value || "").trim().toLowerCase()
  if (!next) return true
  return !(next === "false" || next === "0" || next === "no")
}

function normalizeGrade(value: unknown) {
  return String(value || "").trim().toUpperCase()
}

function normalizeSppDefault(input: SppDefault): SppDefault {
  return {
    id: String(input.id || `spp-${Date.now()}`).trim(),
    grade: normalizeGrade(input.grade),
    amount: normalizeAmount(input.amount),
    dueDay: normalizeDueDay(input.dueDay),
    isActive: input.isActive !== false,
  }
}

function normalizeSppDefaultRow(row: string[]): SppDefault {
  return normalizeSppDefault({
    id: String(row[0] || "").trim(),
    grade: String(row[1] || "").trim(),
    amount: normalizeAmount(row[2]),
    dueDay: normalizeDueDay(row[3]),
    isActive: normalizeIsActive(row[4]),
  })
}

function toSppDefaultSheetRow(sppDefault: SppDefault, updatedAt: string) {
  return [
    sppDefault.id,
    sppDefault.grade,
    String(sppDefault.amount),
    String(sppDefault.dueDay),
    String(sppDefault.isActive),
    updatedAt,
  ]
}

function invalidateSppDefaultsCache() {
  sppDefaultsCache = null
}

export async function ensureSppDefaultsSheetReady() {
  if (Date.now() - sppDefaultsSheetReadyAt < SPP_DEFAULTS_READY_TTL_MS) {
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

  sppDefaultsSheetName = resolveExistingSheetName(
    existingTitles,
    SPP_DEFAULTS_SHEET_CANDIDATES,
    SPP_DEFAULTS_SHEET_PRIMARY_NAME,
  )

  if (!existingTitles.has(sppDefaultsSheetName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sppDefaultsSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sppDefaultsSheetName}!A1:F1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length !== SPP_DEFAULTS_COLUMNS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sppDefaultsSheetName}!A1:F1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [SPP_DEFAULTS_COLUMNS],
      },
    })
  }

  sppDefaultsSheetReadyAt = Date.now()
}

async function replaceAllDbSppDefaultsInSheet(sppDefaults: SppDefault[]) {
  await ensureSppDefaultsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sppDefaultsSheetName}!A2:F`,
  })

  if (sppDefaults.length > 0) {
    const updatedAt = new Date().toISOString()
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sppDefaultsSheetName}!A2:F${sppDefaults.length + 1}`,
      valueInputOption: "RAW",
      requestBody: {
        values: sppDefaults.map((item) => toSppDefaultSheetRow(item, updatedAt)),
      },
    })
  }

  invalidateSppDefaultsCache()
}

export async function getAllDbSppDefaultsFromSheet(): Promise<SppDefault[]> {
  if (sppDefaultsCache && sppDefaultsCache.expiresAt > Date.now()) {
    return sppDefaultsCache.data
  }

  await ensureSppDefaultsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sppDefaultsSheetName}!A2:F`,
  })

  const rows = rowsRes.data.values || []
  const data = rows
    .map((row) => normalizeSppDefaultRow(row as string[]))
    .filter((item) => Boolean(item.id && item.grade))

  sppDefaultsCache = {
    expiresAt: Date.now() + SPP_DEFAULTS_CACHE_TTL_MS,
    data,
  }

  return data
}

export async function createDbSppDefault(input: SppDefault): Promise<SppDefault> {
  const next = normalizeSppDefault(input)
  if (!next.grade) {
    throw new Error("Grade wajib diisi")
  }
  if (next.amount <= 0) {
    throw new Error("Nominal SPP harus lebih dari 0")
  }

  const existing = await getAllDbSppDefaultsFromSheet()
  if (existing.some((item) => normalizeGrade(item.grade) === next.grade)) {
    throw new Error("Default SPP untuk grade ini sudah ada")
  }

  await ensureSppDefaultsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sppDefaultsSheetName}!A1:F1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toSppDefaultSheetRow(next, new Date().toISOString())],
    },
  })

  invalidateSppDefaultsCache()
  return next
}

export async function updateDbSppDefaultById(input: Partial<SppDefault> & { id: string }) {
  const id = String(input.id || "").trim()
  if (!id) {
    throw new Error("ID default SPP wajib diisi")
  }

  const defaults = await getAllDbSppDefaultsFromSheet()
  const existing = defaults.find((item) => item.id === id)
  if (!existing) {
    throw new Error("Default SPP tidak ditemukan")
  }

  const next = normalizeSppDefault({
    ...existing,
    ...input,
    id: existing.id,
  })

  if (!next.grade) {
    throw new Error("Grade wajib diisi")
  }
  if (next.amount <= 0) {
    throw new Error("Nominal SPP harus lebih dari 0")
  }

  const duplicate = defaults.find((item) => item.id !== id && normalizeGrade(item.grade) === normalizeGrade(next.grade))
  if (duplicate) {
    throw new Error("Default SPP untuk grade ini sudah ada")
  }

  await replaceAllDbSppDefaultsInSheet(defaults.map((item) => (item.id === id ? next : item)))
  return next
}

export async function deleteDbSppDefaultById(id: string) {
  const normalizedId = String(id || "").trim()
  if (!normalizedId) {
    throw new Error("ID default SPP wajib diisi")
  }

  const defaults = await getAllDbSppDefaultsFromSheet()
  const existing = defaults.find((item) => item.id === normalizedId)
  if (!existing) {
    throw new Error("Default SPP tidak ditemukan")
  }

  await replaceAllDbSppDefaultsInSheet(defaults.filter((item) => item.id !== normalizedId))
}

export async function migrateDbSppDefaultsToSheet(sourceDefaults: SppDefault[]) {
  const candidates = Array.isArray(sourceDefaults) ? sourceDefaults : []
  if (candidates.length === 0) {
    return getAllDbSppDefaultsFromSheet()
  }

  const existing = await getAllDbSppDefaultsFromSheet()
  const existingIds = new Set(existing.map((item) => item.id))
  const missing = candidates
    .map((item) => normalizeSppDefault(item))
    .filter((item) => Boolean(item.id && item.grade && !existingIds.has(item.id)))

  if (missing.length === 0) {
    return existing
  }

  await ensureSppDefaultsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const updatedAt = new Date().toISOString()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sppDefaultsSheetName}!A1:F1`,
    valueInputOption: "RAW",
    requestBody: {
      values: missing.map((item) => toSppDefaultSheetRow(item, updatedAt)),
    },
  })

  invalidateSppDefaultsCache()
  return getAllDbSppDefaultsFromSheet()
}

export async function loadDbSppDefaultsWithMigration(
  localDefaults: SppDefault[],
  options?: { migrateOnEmpty?: boolean },
) {
  try {
    const fromSheet = await getAllDbSppDefaultsFromSheet()
    if (fromSheet.length > 0) {
      return fromSheet
    }

    if (!Array.isArray(localDefaults) || localDefaults.length === 0) {
      return fromSheet
    }

    if (!options?.migrateOnEmpty) {
      return fromSheet
    }

    return await migrateDbSppDefaultsToSheet(localDefaults)
  } catch {
    return Array.isArray(localDefaults) ? localDefaults : []
  }
}
