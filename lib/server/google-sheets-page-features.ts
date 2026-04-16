import "server-only"

import { google } from "googleapis"
import type { PageFeatureKey, PageFeatureStateMap } from "@/lib/page-features"
import {
  PAGE_FEATURE_DEFINITIONS,
  getDefaultPageFeatureStateMap,
} from "@/lib/page-features"

const PAGE_FEATURES_SHEET_PRIMARY_NAME = "page_features"
const PAGE_FEATURES_SHEET_CANDIDATES = [
  "page_features",
  "feature_flags",
  "page_feature_settings",
]
const PAGE_FEATURES_COLUMNS = ["key", "enabled", "updated_at", "updated_by"]

const PAGE_FEATURES_CACHE_TTL_MS = 60_000
const PAGE_FEATURES_READY_TTL_MS = 5 * 60_000

let pageFeaturesCache: { expiresAt: number; data: DbPageFeatureSetting[] } | null = null
let pageFeaturesSheetReadyAt = 0
let pageFeaturesSheetName = PAGE_FEATURES_SHEET_PRIMARY_NAME

const VALID_PAGE_FEATURE_KEYS = new Set<PageFeatureKey>(
  PAGE_FEATURE_DEFINITIONS.map((item) => item.key),
)

type ServiceAccount = {
  client_email: string
  private_key: string
}

export interface DbPageFeatureSetting {
  key: PageFeatureKey
  enabled: boolean
  updatedAt: string
  updatedBy?: string
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

function invalidatePageFeaturesCache() {
  pageFeaturesCache = null
}

function normalizeMaybeString(value: unknown) {
  const next = String(value || "").trim()
  return next || undefined
}

function normalizePageFeatureKey(value: unknown): PageFeatureKey | null {
  const key = String(value || "").trim() as PageFeatureKey
  if (!key) return null
  if (!VALID_PAGE_FEATURE_KEYS.has(key)) return null
  return key
}

function normalizeBoolean(value: unknown) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()

  if (normalized === "0" || normalized === "false" || normalized === "no" || normalized === "off") {
    return false
  }

  return true
}

function normalizePageFeatureRow(row: string[]): DbPageFeatureSetting | null {
  const key = normalizePageFeatureKey(row[0])
  if (!key) return null

  return {
    key,
    enabled: normalizeBoolean(row[1]),
    updatedAt: row[2] || new Date().toISOString(),
    updatedBy: normalizeMaybeString(row[3]),
  }
}

function toPageFeatureSheetRow(setting: DbPageFeatureSetting): string[] {
  return [setting.key, setting.enabled ? "true" : "false", setting.updatedAt, setting.updatedBy || ""]
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

export async function ensurePageFeaturesSheetReady() {
  if (Date.now() - pageFeaturesSheetReadyAt < PAGE_FEATURES_READY_TTL_MS) {
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
  const matched = PAGE_FEATURES_SHEET_CANDIDATES.find((title) => existingTitles.has(title))

  if (matched) {
    pageFeaturesSheetName = matched
  }

  if (!matched) {
    pageFeaturesSheetName = PAGE_FEATURES_SHEET_PRIMARY_NAME
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: pageFeaturesSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${pageFeaturesSheetName}!A1:D1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length !== PAGE_FEATURES_COLUMNS.length) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${pageFeaturesSheetName}!A1:D1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [PAGE_FEATURES_COLUMNS],
      },
    })
  }

  pageFeaturesSheetReadyAt = Date.now()
}

export async function getAllDbPageFeatures(): Promise<DbPageFeatureSetting[]> {
  if (pageFeaturesCache && pageFeaturesCache.expiresAt > Date.now()) {
    return pageFeaturesCache.data
  }

  try {
    await ensurePageFeaturesSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${pageFeaturesSheetName}!A2:D`,
    })

    const rows = rowsRes.data.values || []
    const data = rows
      .map((row) => normalizePageFeatureRow(row as string[]))
      .filter(Boolean) as DbPageFeatureSetting[]

    pageFeaturesCache = {
      expiresAt: Date.now() + PAGE_FEATURES_CACHE_TTL_MS,
      data,
    }

    return data
  } catch (error) {
    if (pageFeaturesCache?.data?.length && isQuotaExceededError(error)) {
      return pageFeaturesCache.data
    }
    throw error
  }
}

async function getDbPageFeatureRowByKey(
  key: PageFeatureKey,
): Promise<{ setting: DbPageFeatureSetting; rowNumber: number } | null> {
  await ensurePageFeaturesSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${pageFeaturesSheetName}!A2:D`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    const currentKey = normalizePageFeatureKey(row[0])
    if (currentKey === key) {
      const normalized = normalizePageFeatureRow(row)
      if (!normalized) continue
      return {
        setting: normalized,
        rowNumber: index + 2,
      }
    }
  }

  return null
}

export async function upsertDbPageFeature(input: {
  key: PageFeatureKey
  enabled: boolean
  updatedBy?: string
}): Promise<DbPageFeatureSetting> {
  const key = normalizePageFeatureKey(input.key)
  if (!key) {
    throw new Error("Key page feature tidak valid")
  }

  const next: DbPageFeatureSetting = {
    key,
    enabled: Boolean(input.enabled),
    updatedAt: new Date().toISOString(),
    updatedBy: normalizeMaybeString(input.updatedBy),
  }

  const existing = await getDbPageFeatureRowByKey(key)
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${pageFeaturesSheetName}!A${existing.rowNumber}:D${existing.rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [toPageFeatureSheetRow(next)],
      },
    })
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${pageFeaturesSheetName}!A:D`,
      valueInputOption: "RAW",
      requestBody: {
        values: [toPageFeatureSheetRow(next)],
      },
    })
  }

  invalidatePageFeaturesCache()
  return next
}

export function toPageFeatureStateMap(records: DbPageFeatureSetting[]): PageFeatureStateMap {
  const state = getDefaultPageFeatureStateMap()

  for (const record of records) {
    state[record.key] = record.enabled
  }

  return state
}
