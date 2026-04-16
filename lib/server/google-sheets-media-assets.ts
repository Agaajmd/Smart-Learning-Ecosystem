import "server-only"

import crypto from "crypto"
import path from "path"
import { Readable } from "node:stream"
import { google } from "googleapis"
import { getImageUrl } from "@/lib/google-drive"
import {
  createGoogleDriveAuth,
  createGoogleJwtAuth,
  GOOGLE_SCOPE_DRIVE_FILE,
  GOOGLE_SCOPE_SHEETS,
} from "@/lib/server/google-auth"

const MEDIA_ASSETS_SHEET_PRIMARY_NAME = "media_assets"
const MEDIA_ASSETS_SHEET_CANDIDATES = [
  "media_assets",
  "mediaassets",
  "assets_media",
]

const MEDIA_ASSETS_COLUMNS = [
  "row_id",
  "asset_id",
  "file_id",
  "file_url",
  "mime_type",
  "file_name",
  "owner_type",
  "owner_id",
  "created_at",
]

const MEDIA_ASSETS_READY_TTL_MS = 5 * 60_000
const MAX_MEDIA_SIZE_BYTES = 10 * 1024 * 1024
const MEDIA_ASSET_ROUTE_PATTERN = /^\/api\/media-assets\/([A-Za-z0-9_%\-]+)(?:\?.*)?$/

let mediaAssetsSheetReadyAt = 0
let mediaAssetsSheetName = MEDIA_ASSETS_SHEET_PRIMARY_NAME
const mediaAssetBufferCache = new Map<
  string,
  {
    data: {
      assetId: string
      mimeType: string
      fileName: string
      buffer: Buffer
      createdAt: string
    }
  }
>()

const MIME_EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "text/plain": ".txt",
}

function getSpreadsheetId(): string {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_ID belum di-set.")
  }

  return spreadsheetId
}

function getDriveFolderId(): string {
  const folderId = String(process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim()
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID belum di-set.")
  }

  return folderId
}

async function getGoogleClients() {
  const sheetsAuth = await createGoogleJwtAuth([GOOGLE_SCOPE_SHEETS])
  const { auth: driveAuth, mode: driveAuthMode } = await createGoogleDriveAuth([GOOGLE_SCOPE_DRIVE_FILE])

  return {
    sheets: google.sheets({ version: "v4", auth: sheetsAuth }),
    drive: google.drive({ version: "v3", auth: driveAuth }),
    driveAuthMode,
  }
}

function normalizeMaybeString(value: unknown) {
  const next = String(value || "").trim()
  return next || undefined
}

function parseDataUrl(dataUrl: string) {
  if (!dataUrl.startsWith("data:")) {
    throw new Error("Format file tidak valid")
  }

  const commaIndex = dataUrl.indexOf(",")
  if (commaIndex < 0) {
    throw new Error("Format file tidak valid")
  }

  const header = dataUrl.slice(5, commaIndex)
  if (!header.includes(";base64")) {
    throw new Error("Format file harus base64")
  }

  const mimeType = header.split(";")[0]?.toLowerCase() || "application/octet-stream"
  const isValidMime = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mimeType)
  if (!isValidMime) {
    throw new Error("Format mime file tidak valid")
  }

  const payload = dataUrl.slice(commaIndex + 1)
  const buffer = Buffer.from(payload, "base64")

  if (!buffer.length) {
    throw new Error("File tidak boleh kosong")
  }

  if (buffer.length > MAX_MEDIA_SIZE_BYTES) {
    throw new Error("Ukuran file maksimal 10MB")
  }

  return {
    mimeType,
    buffer,
  }
}

function buildFileName(mimeType: string, originalFileName?: string) {
  const originalExtension = originalFileName ? path.extname(originalFileName).toLowerCase() : ""
  const normalizedOriginalExtension =
    originalExtension && /^\.[a-z0-9]+$/.test(originalExtension) ? originalExtension : ""
  const extensionFromMime = MIME_EXTENSION_BY_TYPE[mimeType] || ""
  const mimeSuffix = mimeType.split("/")[1]?.replace(/[^a-z0-9]+/g, "-") || "bin"
  const extension = normalizedOriginalExtension || extensionFromMime || `.${mimeSuffix}`

  return `media-${Date.now()}-${crypto.randomUUID().slice(0, 8)}${extension}`
}

export function buildMediaAssetUrl(assetId: string) {
  if (assetId.startsWith("legacy-")) {
    return `/api/media-assets/${encodeURIComponent(assetId)}`
  }

  return getImageUrl(assetId)
}

function normalizeHeaderRow(value: unknown[]) {
  return value.map((item) => String(item || "").trim())
}

function extractDriveFileId(raw: unknown) {
  const value = String(raw || "").trim()
  if (!value) return ""

  if (/^[a-zA-Z0-9_-]{10,}$/.test(value)) {
    return value
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value)
      const fromQuery = String(url.searchParams.get("id") || "").trim()
      if (fromQuery) return fromQuery

      const parts = url.pathname.split("/").filter(Boolean)
      const idx = parts.findIndex((part) => part === "d")
      if (idx >= 0 && parts[idx + 1]) {
        return parts[idx + 1]
      }
    } catch {
      return ""
    }
  }

  return ""
}

function extractMediaAssetIdFromRoute(raw: unknown) {
  const value = String(raw || "").trim()
  if (!value) return ""

  const directMatch = value.match(MEDIA_ASSET_ROUTE_PATTERN)
  if (directMatch?.[1]) {
    return decodeURIComponent(directMatch[1]).trim()
  }

  if (!/^https?:\/\//i.test(value)) {
    return ""
  }

  try {
    const url = new URL(value)
    const urlMatch = String(url.pathname || "").match(MEDIA_ASSET_ROUTE_PATTERN)
    if (urlMatch?.[1]) {
      return decodeURIComponent(urlMatch[1]).trim()
    }
  } catch {
    return ""
  }

  return ""
}

export function extractMediaAssetIdFromReference(raw: unknown) {
  const fromRoute = extractMediaAssetIdFromRoute(raw)
  if (fromRoute) {
    return fromRoute
  }

  const fileId = extractDriveFileId(raw)
  return fileId || undefined
}

type DriveFileMetadata = {
  id: string
  name: string
  mimeType: string
  createdTime: string
  parents: string[]
}

async function getDriveFileMetadata(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
): Promise<DriveFileMetadata | null> {
  try {
    const metadataRes = await drive.files.get({
      fileId,
      fields: "id,name,mimeType,createdTime,parents",
      supportsAllDrives: true,
    })

    return {
      id: String(metadataRes.data.id || "").trim(),
      name: String(metadataRes.data.name || "").trim(),
      mimeType: String(metadataRes.data.mimeType || "application/octet-stream"),
      createdTime: String(metadataRes.data.createdTime || "").trim(),
      parents: Array.isArray(metadataRes.data.parents)
        ? metadataRes.data.parents.map((parent) => String(parent || "").trim()).filter(Boolean)
        : [],
    }
  } catch {
    return null
  }
}

function isDriveFileInConfiguredFolder(file: DriveFileMetadata | null, configuredFolderId: string) {
  if (!file) return false
  return file.parents.includes(configuredFolderId)
}

async function deleteDriveFileIfAllowed(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  configuredFolderId: string,
) {
  const metadata = await getDriveFileMetadata(drive, fileId)
  if (!isDriveFileInConfiguredFolder(metadata, configuredFolderId)) {
    return false
  }

  await drive.files.delete({
    fileId,
    supportsAllDrives: true,
  })

  mediaAssetBufferCache.delete(fileId)
  return true
}

function extractErrorMessage(error: unknown) {
  const err = error as {
    message?: string
    response?: { data?: { error?: { message?: string } } }
    errors?: Array<{ message?: string }>
  }

  return String(
    err?.response?.data?.error?.message ||
      err?.errors?.[0]?.message ||
      err?.message ||
      "",
  )
}

function isServiceAccountQuotaError(error: unknown) {
  const err = error as { code?: number; status?: number }
  const message = extractErrorMessage(error).toLowerCase()
  const isForbidden = err?.code === 403 || err?.status === 403

  return isForbidden && message.includes("service accounts do not have storage quota")
}

type DriveMetadataRow = {
  assetId: string
  fileId: string
  fileUrl: string
  mimeType: string
  fileName: string
  createdAt: string
}

function parseDriveMetadataRow(row: string[]): DriveMetadataRow | null {
  const assetId = String(row[1] || "").trim()
  const fileId = extractDriveFileId(row[2])
  const fileUrl = String(row[3] || "").trim()
  const mimeType = String(row[4] || "").trim()
  const fileName = String(row[5] || "").trim()
  const createdAt = String(row[8] || "").trim()

  if (!assetId || !fileId || !mimeType || !fileName) {
    return null
  }

  return {
    assetId,
    fileId,
    fileUrl,
    mimeType,
    fileName,
    createdAt: createdAt || new Date().toISOString(),
  }
}

export async function ensureMediaAssetsSheetReady() {
  if (Date.now() - mediaAssetsSheetReadyAt < MEDIA_ASSETS_READY_TTL_MS) {
    return
  }

  const { sheets } = await getGoogleClients()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const existingTitles = new Set(
    (spreadsheet.data.sheets || [])
      .map((sheet) => String(sheet.properties?.title || ""))
      .filter(Boolean),
  )
  const matched = MEDIA_ASSETS_SHEET_CANDIDATES.find((title) => existingTitles.has(title))

  if (matched) {
    mediaAssetsSheetName = matched
  }

  if (!matched) {
    mediaAssetsSheetName = MEDIA_ASSETS_SHEET_PRIMARY_NAME
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: mediaAssetsSheetName,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${mediaAssetsSheetName}!A1:I1`,
  })

  const firstRow = normalizeHeaderRow(headerRes.data.values?.[0] || [])
  const isHeaderMatch =
    firstRow.length === MEDIA_ASSETS_COLUMNS.length &&
    MEDIA_ASSETS_COLUMNS.every((column, index) => column === firstRow[index])

  if (!isHeaderMatch) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${mediaAssetsSheetName}!A1:I1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [MEDIA_ASSETS_COLUMNS],
      },
    })
  }

  mediaAssetsSheetReadyAt = Date.now()
}

export async function createDbMediaAssetFromDataUrl(input: {
  dataUrl: string
  ownerType?: string
  ownerId?: string
  originalFileName?: string
  replaceAssetId?: string
}): Promise<{ assetId: string; url: string; fileName: string }> {
  const parsed = parseDataUrl(input.dataUrl)
  const fileName = buildFileName(parsed.mimeType, input.originalFileName)
  const createdAt = new Date().toISOString()
  const ownerType = normalizeMaybeString(input.ownerType) || "asset_report"
  const ownerId = normalizeMaybeString(input.ownerId) || "-"
  const replaceAssetId = extractMediaAssetIdFromReference(input.replaceAssetId)

  const driveFolderId = getDriveFolderId()
  const { drive, driveAuthMode } = await getGoogleClients()

  let fileId = ""
  try {
    const created = await drive.files.create({
      requestBody: {
        name: fileName,
        mimeType: parsed.mimeType,
        parents: [driveFolderId],
        description: `owner_type=${ownerType};owner_id=${ownerId};uploaded_at=${createdAt}`,
      },
      media: {
        mimeType: parsed.mimeType,
        body: Readable.from(parsed.buffer),
      },
      supportsAllDrives: true,
      fields: "id",
    })

    fileId = String(created.data.id || "").trim()
    if (!fileId) {
      throw new Error("Gagal upload file ke Google Drive")
    }

    await drive.permissions.create({
      fileId,
      supportsAllDrives: true,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    })
  } catch (error) {
    if (isServiceAccountQuotaError(error)) {
      if (driveAuthMode === "oauth-refresh-token") {
        throw new Error(
          "Upload gagal karena kuota Google Drive akun OAuth tidak mencukupi. Bersihkan storage akun Drive, atau ganti akun OAuth yang masih punya kuota.",
        )
      }

      throw new Error(
        "Upload gagal: Service Account tidak punya kuota My Drive. Gunakan folder Shared Drive untuk GOOGLE_DRIVE_FOLDER_ID, atau set GOOGLE_DRIVE_OAUTH_CLIENT_ID/GOOGLE_DRIVE_OAUTH_CLIENT_SECRET/GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN agar upload memakai akun Google biasa.",
      )
    }

    throw error
  }

  const fileUrl = getImageUrl(fileId)
  const assetId = fileId

  if (replaceAssetId && replaceAssetId !== assetId) {
    try {
      await deleteDriveFileIfAllowed(drive, replaceAssetId, driveFolderId)
    } catch {
      // Keep new upload result even if old-file cleanup fails.
    }
  }

  mediaAssetBufferCache.set(assetId, {
    data: {
      assetId,
      mimeType: parsed.mimeType,
      fileName,
      buffer: parsed.buffer,
      createdAt,
    },
  })

  return {
    assetId,
    url: fileUrl,
    fileName,
  }
}

export async function getDbMediaAssetById(assetId: string): Promise<{
  assetId: string
  mimeType: string
  fileName: string
  buffer: Buffer
  createdAt: string
} | null> {
  const normalizedAssetId = String(assetId || "").trim()
  if (!normalizedAssetId) return null

  const cached = mediaAssetBufferCache.get(normalizedAssetId)
  if (cached) {
    return cached.data
  }

  const { drive } = await getGoogleClients()
  const driveFolderId = getDriveFolderId()

  // Prefer direct fetch by Drive file ID. New uploads are Drive-only and no longer use media_assets rows.
  if (!normalizedAssetId.startsWith("legacy-") && /^[a-zA-Z0-9_-]{10,}$/.test(normalizedAssetId)) {
    try {
      const metadata = await getDriveFileMetadata(drive, normalizedAssetId)
      if (!isDriveFileInConfiguredFolder(metadata, driveFolderId)) {
        return null
      }

      const driveRes = await drive.files.get(
        {
          fileId: normalizedAssetId,
          alt: "media",
          supportsAllDrives: true,
        },
        {
          responseType: "arraybuffer",
        },
      )

      const mimeType = String(metadata?.mimeType || "application/octet-stream")
      const fileName = String(metadata?.name || `${normalizedAssetId}.bin`)
      const createdAt = String(metadata?.createdTime || new Date().toISOString())
      const buffer = Buffer.from(driveRes.data as ArrayBuffer)

      if (!buffer.length) {
        return null
      }

      const data = {
        assetId: normalizedAssetId,
        mimeType,
        fileName,
        buffer,
        createdAt,
      }

      mediaAssetBufferCache.set(normalizedAssetId, {
        data,
      })

      return data
    } catch {
      // Continue to legacy sheet lookup when direct Drive read fails.
    }
  }

  await ensureMediaAssetsSheetReady()
  const { sheets } = await getGoogleClients()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${mediaAssetsSheetName}!A2:I`,
  })

  const rows = (rowsRes.data.values || []).map((row) => row as string[])

  const byAssetRow =
    rows.find((row) => String(row[1] || "").trim() === normalizedAssetId && parseDriveMetadataRow(row)) ||
    rows.find((row) => extractDriveFileId(row[2]) === normalizedAssetId && parseDriveMetadataRow(row)) ||
    null

  if (byAssetRow) {
    const metadata = parseDriveMetadataRow(byAssetRow)
    if (metadata) {
      const driveMetadata = await getDriveFileMetadata(drive, metadata.fileId)
      if (!isDriveFileInConfiguredFolder(driveMetadata, driveFolderId)) {
        return null
      }

      const driveRes = await drive.files.get(
        {
          fileId: metadata.fileId,
          alt: "media",
          supportsAllDrives: true,
        },
        {
          responseType: "arraybuffer",
        },
      )

      const data = {
        assetId: metadata.assetId,
        mimeType: metadata.mimeType,
        fileName: metadata.fileName,
        buffer: Buffer.from(driveRes.data as ArrayBuffer),
        createdAt: metadata.createdAt,
      }

      mediaAssetBufferCache.set(metadata.assetId, {
        data,
      })

      return data
    }
  }

  // Backward compatibility: old rows where file binary was chunked in column F.
  const chunkRows = rows
    .filter((row) => String(row[1] || "").trim() === normalizedAssetId)
    .sort((left, right) => Number(left[2] || 0) - Number(right[2] || 0))

  if (chunkRows.length === 0) return null

  const mimeType = normalizeMaybeString(chunkRows[0][3]) || "application/octet-stream"
  const fileName = normalizeMaybeString(chunkRows[0][4]) || `${normalizedAssetId}.bin`
  const createdAt = normalizeMaybeString(chunkRows[0][8]) || new Date().toISOString()
  const payload = chunkRows.map((row) => String(row[5] || "")).join("")

  if (!payload) return null

  const data = {
    assetId: normalizedAssetId,
    mimeType,
    fileName,
    buffer: Buffer.from(payload, "base64"),
    createdAt,
  }

  if (!data.buffer.length) return null

  mediaAssetBufferCache.set(normalizedAssetId, {
    data,
  })

  return data
}
