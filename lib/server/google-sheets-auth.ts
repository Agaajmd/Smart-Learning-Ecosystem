import "server-only"

import { google } from "googleapis"
import { compare, hash } from "bcryptjs"
import type { UserRole } from "@/lib/data-model"
import { getImageUrl, normalizeDriveMediaUrl } from "@/lib/google-drive"
import {
  createDbMediaAssetFromDataUrl,
  extractMediaAssetIdFromReference,
} from "@/lib/server/google-sheets-media-assets"

const USERS_SHEET_NAME = "users"
const USERS_COLUMNS = [
  "id",
  "name",
  "email",
  "password_hash",
  "avatar",
  "role",
  "class_id",
  "phone",
  "is_active",
  "created_at",
  "updated_at",
  "subject",
]

const USERS_CACHE_TTL_MS = 60_000
const USERS_READY_TTL_MS = 5 * 60_000

let usersCache: { expiresAt: number; data: DbUser[] } | null = null
let usersSheetReadyAt = 0

function invalidateUsersCache() {
  usersCache = null
}

type ServiceAccount = {
  client_email: string
  private_key: string
}

export interface DbUser {
  id: string
  name: string
  email: string
  passwordHash: string
  avatar: string
  role: UserRole
  classId?: string
  phone?: string
  subject?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PublicUser {
  id: string
  name: string
  email: string
  phone?: string
  subject?: string
  avatar: string
  role: UserRole
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

function normalizeUserRow(row: string[]): DbUser {
  const normalizeUserRole = (value: unknown): UserRole => {
    const normalized = String(value || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_")

    if (
      normalized === "STUDENT" ||
      normalized === "EMPLOYEE" ||
      normalized === "ADMIN" ||
      normalized === "SUPER_ADMIN" ||
      normalized === "PARENT" ||
      normalized === "CANTEEN_OWNER"
    ) {
      return normalized
    }

    if (normalized === "TEACHER" || normalized === "GURU") {
      return "EMPLOYEE"
    }

    if (normalized === "SISWA" || normalized === "MURID" || normalized === "PELAJAR") {
      return "STUDENT"
    }

    if (
      normalized === "ORANGTUA" ||
      normalized === "ORANG_TUA" ||
      normalized === "ORANG_TUA_WALI" ||
      normalized === "WALI" ||
      normalized === "WALI_MURID"
    ) {
      return "PARENT"
    }

    if (
      normalized === "ADMINISTRATOR" ||
      normalized === "OPERATOR" ||
      normalized === "TU" ||
      normalized === "TATA_USAHA"
    ) {
      return "ADMIN"
    }

    if (normalized === "STAFF" || normalized === "KARYAWAN") {
      return "EMPLOYEE"
    }

    if (normalized === "PRINCIPAL" || normalized === "KEPALA_SEKOLAH") {
      return "SUPER_ADMIN"
    }

    if (normalized === "KEPSEK") {
      return "SUPER_ADMIN"
    }

    if (
      normalized === "CANTEENOWNER" ||
      normalized === "CANTEEN" ||
      normalized === "KANTIN_OWNER" ||
      normalized === "PENGELOLA_KANTIN" ||
      normalized === "PENJAGA_KANTIN"
    ) {
      return "CANTEEN_OWNER"
    }

    return "PARENT"
  }

  return {
    id: row[0] || "",
    name: row[1] || "",
    email: (row[2] || "").toLowerCase(),
    passwordHash: row[3] || "",
    avatar: getImageUrl(row[4], ""),
    role: normalizeUserRole(row[5]),
    classId: row[6] || undefined,
    phone: row[7] || undefined,
    isActive: String(row[8] || "true").toLowerCase() !== "false",
    createdAt: row[9] || new Date().toISOString(),
    updatedAt: row[10] || new Date().toISOString(),
    subject: row[11] || undefined,
  }
}

function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    subject: user.subject,
    avatar: normalizeDriveMediaUrl(user.avatar) || "",
    role: user.role,
  }
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

export async function ensureUsersSheetReady() {
  if (Date.now() - usersSheetReadyAt < USERS_READY_TTL_MS) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const hasUsersSheet =
    spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === USERS_SHEET_NAME) ?? false

  if (!hasUsersSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: USERS_SHEET_NAME,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${USERS_SHEET_NAME}!A1:L1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === USERS_COLUMNS.length) {
    usersSheetReadyAt = Date.now()
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${USERS_SHEET_NAME}!A1:L1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [USERS_COLUMNS],
    },
  })

  usersSheetReadyAt = Date.now()
}

export async function getAllDbUsers(): Promise<DbUser[]> {
  if (usersCache && usersCache.expiresAt > Date.now()) {
    return usersCache.data
  }

  try {
    await ensureUsersSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${USERS_SHEET_NAME}!A2:L`,
    })

    const rows = rowsRes.data.values || []
    const data = rows
      .filter((row) => row[0] && row[2])
      .map((row) => normalizeUserRow(row as string[]))
    usersCache = {
      expiresAt: Date.now() + USERS_CACHE_TTL_MS,
      data,
    }
    return data
  } catch (error) {
    if (usersCache?.data?.length && isQuotaExceededError(error)) {
      return usersCache.data
    }
    throw error
  }
}

export async function findDbUserByEmail(email: string): Promise<DbUser | null> {
  const users = await getAllDbUsers()
  const lower = email.trim().toLowerCase()
  return users.find((u) => u.email === lower) || null
}

export async function createDbUser(input: {
  name: string
  email: string
  password: string
  role: UserRole
  avatar?: string
  classId?: string
  phone?: string
  subject?: string
}): Promise<PublicUser> {
  const existing = await findDbUserByEmail(input.email)
  if (existing) {
    throw new Error("Email sudah terdaftar")
  }

  const now = new Date().toISOString()
  const passwordHash = await hash(input.password, 10)
  const newUser: DbUser = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    passwordHash,
    avatar: normalizeDriveMediaUrl(input.avatar) || "",
    role: input.role,
    classId: input.classId,
    phone: input.phone,
    subject: input.subject,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${USERS_SHEET_NAME}!A:L`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        newUser.id,
        newUser.name,
        newUser.email,
        newUser.passwordHash,
        newUser.avatar,
        newUser.role,
        newUser.classId || "",
        newUser.phone || "",
        String(newUser.isActive),
        newUser.createdAt,
        newUser.updatedAt,
        newUser.subject || "",
      ]],
    },
  })

  invalidateUsersCache()

  return toPublicUser(newUser)
}

export async function verifyDbLogin(email: string, password: string): Promise<PublicUser | null> {
  const existing = await findDbUserByEmail(email)
  if (!existing || !existing.isActive) {
    return null
  }

  const valid = await compare(password, existing.passwordHash)
  if (!valid) {
    return null
  }

  return toPublicUser(existing)
}

async function getDbUserRowById(id: string): Promise<{ user: DbUser; rowNumber: number } | null> {
  await ensureUsersSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${USERS_SHEET_NAME}!A2:L`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    if ((row[0] || "") === id) {
      return {
        user: normalizeUserRow(row),
        rowNumber: index + 2,
      }
    }
  }

  return null
}

export async function updateDbUserById(input: {
  id: string
  name?: string
  email?: string
  password?: string
  role?: UserRole
  avatar?: string
  classId?: string
  phone?: string
  subject?: string
}): Promise<PublicUser> {
  const target = await getDbUserRowById(input.id)
  if (!target) {
    throw new Error("User tidak ditemukan")
  }

  const current = target.user
  const nextEmail = (input.email || current.email).trim().toLowerCase()
  const duplicate = (await getAllDbUsers()).find((u) => u.id !== input.id && u.email === nextEmail)
  if (duplicate) {
    throw new Error("Email sudah digunakan user lain")
  }

  const now = new Date().toISOString()
  const nextPasswordHash = input.password ? await hash(input.password, 10) : current.passwordHash
  let nextAvatar = input.avatar != null ? normalizeDriveMediaUrl(input.avatar) || "" : current.avatar
  if (input.avatar && input.avatar.startsWith("data:")) {
    const replaceAssetId = extractMediaAssetIdFromReference(current.avatar)
    const uploaded = await createDbMediaAssetFromDataUrl({
      dataUrl: input.avatar,
      ownerType: "profile_avatar",
      ownerId: input.id,
      originalFileName: `profile-${input.id || current.id}-${Date.now()}.png`,
      replaceAssetId,
    })
    nextAvatar = uploaded.url
  }

  nextAvatar = normalizeDriveMediaUrl(nextAvatar) || ""

  const next: DbUser = {
    ...current,
    name: input.name?.trim() || current.name,
    email: nextEmail,
    role: input.role || current.role,
    avatar: nextAvatar,
    classId: input.classId ?? current.classId,
    phone: input.phone ?? current.phone,
    subject: input.subject ?? current.subject,
    passwordHash: nextPasswordHash,
    updatedAt: now,
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${USERS_SHEET_NAME}!A${target.rowNumber}:L${target.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        next.id,
        next.name,
        next.email,
        next.passwordHash,
        next.avatar,
        next.role,
        next.classId || "",
        next.phone || "",
        String(next.isActive),
        next.createdAt,
        next.updatedAt,
        next.subject || "",
      ]],
    },
  })

  invalidateUsersCache()

  return toPublicUser(next)
}

export async function deactivateDbUserById(id: string): Promise<void> {
  const target = await getDbUserRowById(id)
  if (!target) {
    return
  }

  const next: DbUser = {
    ...target.user,
    isActive: false,
    updatedAt: new Date().toISOString(),
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${USERS_SHEET_NAME}!A${target.rowNumber}:L${target.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        next.id,
        next.name,
        next.email,
        next.passwordHash,
        next.avatar,
        next.role,
        next.classId || "",
        next.phone || "",
        String(next.isActive),
        next.createdAt,
        next.updatedAt,
        next.subject || "",
      ]],
    },
  })

  invalidateUsersCache()
}

export async function deleteDbUserById(id: string): Promise<void> {
  const target = await getDbUserRowById(id)
  if (!target) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const sheetRes = await sheets.spreadsheets.get({ spreadsheetId })
  const usersSheet = sheetRes.data.sheets?.find((sheet) => sheet.properties?.title === USERS_SHEET_NAME)
  const sheetId = usersSheet?.properties?.sheetId

  if (typeof sheetId !== "number") {
    throw new Error("Sheet users tidak ditemukan")
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

  invalidateUsersCache()
}

export async function ensurePrincipalSeeded() {
  const seedEmail = String(process.env.SEED_PRINCIPAL_EMAIL || "").trim().toLowerCase()
  const seedPassword = String(process.env.SEED_PRINCIPAL_PASSWORD || "")
  const seedName = String(process.env.SEED_PRINCIPAL_NAME || "Principal").trim() || "Principal"

  if (!seedEmail && !seedPassword) {
    return
  }

  if (!seedEmail || !seedPassword) {
    throw new Error("SEED_PRINCIPAL_EMAIL dan SEED_PRINCIPAL_PASSWORD harus diisi bersamaan")
  }

  const existing = await findDbUserByEmail(seedEmail)
  if (existing) {
    return
  }

  await createDbUser({
    name: seedName,
    email: seedEmail,
    password: seedPassword,
    role: "SUPER_ADMIN",
    avatar: "",
  })
}
