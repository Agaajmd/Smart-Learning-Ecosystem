import "server-only"

import { google } from "googleapis"
import { normalizeDriveMediaUrlList } from "@/lib/google-drive"
import type { TaskStatus, TaskSubmission } from "@/lib/data-model"

const PRIMARY_SUBMISSIONS_SHEET_NAME = "Tugas Saya"
const SUBMISSIONS_SHEET_FALLBACK_NAMES = [
  PRIMARY_SUBMISSIONS_SHEET_NAME,
  "task_submissions",
  "task_submission",
  "submissions",
]

const SUBMISSIONS_COLUMNS = [
  "id",
  "task_id",
  "student_id",
  "submitted_at",
  "attachment_url",
  "image_url",
  "attachment_name",
  "score",
  "feedback",
  "status",
  "updated_at",
]

const SUBMISSIONS_CACHE_TTL_MS = 60_000
const SUBMISSIONS_READY_TTL_MS = 5 * 60_000

let submissionsCache: { expiresAt: number; data: TaskSubmission[] } | null = null
let submissionsSheetReadyAt = 0
let submissionsSheetName: string | null = null

type ServiceAccount = {
  client_email: string
  private_key: string
}

type SubmissionRow = {
  row: string[]
  rowNumber: number
}

type SheetResolution = {
  sheetName: string
  created: boolean
}

function invalidateSubmissionsCache() {
  submissionsCache = null
}

function normalizeSheetKey(value: string) {
  return value.toLowerCase().replace(/[\s_-]+/g, "")
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

function normalizeTaskStatus(value: unknown): TaskStatus {
  const upper = String(value || "").trim().toUpperCase()
  if (upper === "PENDING" || upper === "SUBMITTED" || upper === "GRADED" || upper === "LATE") {
    return upper
  }
  return "SUBMITTED"
}

function normalizeMaybeString(value: unknown) {
  if (value == null) return undefined
  const next = String(value).trim()
  return next || undefined
}

function parseScore(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? next : undefined
}

function parseSerializedUrlList(value: string) {
  const raw = String(value || "").trim()
  if (!raw) return [] as string[]

  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      }
    } catch {
      // Fallback to legacy single-url format.
    }
  }

  return [raw]
}

function serializeUrlList(list: string[]) {
  const normalized = list.map((item) => String(item || "").trim()).filter(Boolean)
  if (normalized.length === 0) return ""
  if (normalized.length === 1) return normalized[0]
  return JSON.stringify(normalized)
}

function isHeaderRow(row: string[]) {
  const first = normalizeSheetKey(row[0] || "")
  const second = normalizeSheetKey(row[1] || "")
  const third = normalizeSheetKey(row[2] || "")
  return first === "id" && second === "taskid" && third === "studentid"
}

function normalizeSubmissionRow(row: string[]): TaskSubmission {
  const attachmentUrls = normalizeDriveMediaUrlList(parseSerializedUrlList(row[4] || ""))
  const imageUrls = normalizeDriveMediaUrlList(parseSerializedUrlList(row[5] || ""))
  return {
    id: row[0] || "",
    taskId: row[1] || "",
    studentId: row[2] || "",
    submittedAt: row[3] || new Date().toISOString(),
    attachmentUrl: attachmentUrls[0] || undefined,
    attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
    imageUrl: imageUrls[0] || undefined,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    attachmentName: normalizeMaybeString(row[6]),
    score: parseScore(row[7]),
    feedback: normalizeMaybeString(row[8]),
    status: normalizeTaskStatus(row[9]),
  }
}

function toSubmissionSheetRow(submission: TaskSubmission, updatedAt: string) {
  const attachmentUrlsRaw = Array.isArray(submission.attachmentUrls)
    ? submission.attachmentUrls
    : submission.attachmentUrl
      ? [submission.attachmentUrl]
      : []
  const imageUrlsRaw = Array.isArray(submission.imageUrls)
    ? submission.imageUrls
    : submission.imageUrl
      ? [submission.imageUrl]
      : []
  const attachmentUrls = normalizeDriveMediaUrlList(attachmentUrlsRaw)
  const imageUrls = normalizeDriveMediaUrlList(imageUrlsRaw)

  return [
    submission.id,
    submission.taskId,
    submission.studentId,
    submission.submittedAt,
    serializeUrlList(attachmentUrls),
    serializeUrlList(imageUrls),
    submission.attachmentName || "",
    submission.score == null ? "" : String(submission.score),
    submission.feedback || "",
    submission.status,
    updatedAt,
  ]
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

async function resolveSubmissionsSheetName(
  sheets: Awaited<ReturnType<typeof getSheetsClient>>,
  spreadsheetId: string,
): Promise<SheetResolution> {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const allTitles = (spreadsheet.data.sheets || [])
    .map((sheet) => String(sheet.properties?.title || "").trim())
    .filter(Boolean)

  const expectedTitleKeys = new Set(SUBMISSIONS_SHEET_FALLBACK_NAMES.map((name) => normalizeSheetKey(name)))
  const existingTitle = allTitles.find((title) => expectedTitleKeys.has(normalizeSheetKey(title)))

  if (existingTitle) {
    return {
      sheetName: existingTitle,
      created: false,
    }
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: PRIMARY_SUBMISSIONS_SHEET_NAME,
            },
          },
        },
      ],
    },
  })

  return {
    sheetName: PRIMARY_SUBMISSIONS_SHEET_NAME,
    created: true,
  }
}

async function getRowsWithNumbers(): Promise<SubmissionRow[]> {
  await ensureTaskSubmissionsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const sheetName = submissionsSheetName || PRIMARY_SUBMISSIONS_SHEET_NAME

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:K`,
  })

  const rows = (rowsRes.data.values || []).map((row) => (Array.isArray(row) ? row.map((cell) => String(cell || "")) : []))

  const hasHeader = rows.length > 0 && isHeaderRow(rows[0])
  const dataRows = hasHeader ? rows.slice(1) : rows
  const baseRowNumber = hasHeader ? 2 : 1

  return dataRows.map((row, index) => ({
    row,
    rowNumber: baseRowNumber + index,
  }))
}

export async function ensureTaskSubmissionsSheetReady() {
  if (submissionsSheetName && Date.now() - submissionsSheetReadyAt < SUBMISSIONS_READY_TTL_MS) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const resolution = await resolveSubmissionsSheetName(sheets, spreadsheetId)

  submissionsSheetName = resolution.sheetName

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${resolution.sheetName}!A1:K1`,
  })

  const firstRow = (headerRes.data.values?.[0] || []).map((cell) => String(cell || ""))
  const shouldWriteHeader = resolution.created || firstRow.length === 0

  if (shouldWriteHeader) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${resolution.sheetName}!A1:K1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [SUBMISSIONS_COLUMNS],
      },
    })
  }

  submissionsSheetReadyAt = Date.now()
}

export async function getAllDbTaskSubmissions(): Promise<TaskSubmission[]> {
  if (submissionsCache && submissionsCache.expiresAt > Date.now()) {
    return submissionsCache.data
  }

  try {
    await ensureTaskSubmissionsSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()
    const sheetName = submissionsSheetName || PRIMARY_SUBMISSIONS_SHEET_NAME

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:K`,
    })

    const rows = (rowsRes.data.values || []).map((row) => (Array.isArray(row) ? row.map((cell) => String(cell || "")) : []))

    const dataRows = rows.length > 0 && isHeaderRow(rows[0]) ? rows.slice(1) : rows
    const data = dataRows
      .filter((row) => row[0] && row[1] && row[2])
      .map((row) => normalizeSubmissionRow(row))

    submissionsCache = {
      expiresAt: Date.now() + SUBMISSIONS_CACHE_TTL_MS,
      data,
    }

    return data
  } catch (error) {
    if (submissionsCache?.data?.length && isQuotaExceededError(error)) {
      return submissionsCache.data
    }
    throw error
  }
}

export async function upsertDbTaskSubmission(input: TaskSubmission): Promise<TaskSubmission> {
  const rows = await getRowsWithNumbers()
  const existing = rows.find(
    ({ row }) => row[0] === input.id || (row[1] === input.taskId && row[2] === input.studentId),
  )

  const existingSubmission = existing ? normalizeSubmissionRow(existing.row) : null
  const now = new Date().toISOString()

  const nextAttachmentUrlsRaw =
    input.attachmentUrls != null
      ? input.attachmentUrls
      : input.attachmentUrl != null
        ? [input.attachmentUrl]
        : existingSubmission?.attachmentUrls || (existingSubmission?.attachmentUrl ? [existingSubmission.attachmentUrl] : [])
  const nextImageUrlsRaw =
    input.imageUrls != null
      ? input.imageUrls
      : input.imageUrl != null
        ? [input.imageUrl]
        : existingSubmission?.imageUrls || (existingSubmission?.imageUrl ? [existingSubmission.imageUrl] : [])

  const nextAttachmentUrls = nextAttachmentUrlsRaw
    .map((item) => normalizeMaybeString(item))
    .filter((item): item is string => Boolean(item))
  const nextImageUrls = nextImageUrlsRaw
    .map((item) => normalizeMaybeString(item))
    .filter((item): item is string => Boolean(item))
  const safeAttachmentUrls = normalizeDriveMediaUrlList(nextAttachmentUrls)
  const safeImageUrls = normalizeDriveMediaUrlList(nextImageUrls)

  const next: TaskSubmission = {
    id: input.id || existingSubmission?.id || `sub-${Date.now()}`,
    taskId: String(input.taskId || existingSubmission?.taskId || "").trim(),
    studentId: String(input.studentId || existingSubmission?.studentId || "").trim(),
    submittedAt: input.submittedAt || existingSubmission?.submittedAt || now,
    attachmentUrl: safeAttachmentUrls[0],
    attachmentUrls: safeAttachmentUrls.length > 0 ? [...new Set(safeAttachmentUrls)] : undefined,
    imageUrl: safeImageUrls[0],
    imageUrls: safeImageUrls.length > 0 ? [...new Set(safeImageUrls)] : undefined,
    attachmentName: normalizeMaybeString(input.attachmentName),
    score: input.score != null ? Number(input.score) : existingSubmission?.score,
    feedback: input.feedback != null ? String(input.feedback) : existingSubmission?.feedback,
    status: normalizeTaskStatus(input.status || existingSubmission?.status || "SUBMITTED"),
  }

  if (!next.taskId || !next.studentId) {
    throw new Error("taskId dan studentId wajib diisi")
  }

  await ensureTaskSubmissionsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const sheetName = submissionsSheetName || PRIMARY_SUBMISSIONS_SHEET_NAME

  if (existing) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A${existing.rowNumber}:K${existing.rowNumber}`,
      valueInputOption: "RAW",
      requestBody: {
        values: [toSubmissionSheetRow(next, now)],
      },
    })
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:K`,
      valueInputOption: "RAW",
      requestBody: {
        values: [toSubmissionSheetRow(next, now)],
      },
    })
  }

  invalidateSubmissionsCache()
  return next
}

export async function deleteDbTaskSubmissionsByTaskId(taskId: string): Promise<void> {
  const normalizedTaskId = String(taskId || "").trim()
  if (!normalizedTaskId) return

  const rows = await getRowsWithNumbers()
  const rowsToDelete = rows
    .filter(({ row }) => row[1] === normalizedTaskId)
    .map(({ rowNumber }) => rowNumber)
    .sort((left, right) => right - left)

  if (rowsToDelete.length === 0) {
    return
  }

  await ensureTaskSubmissionsSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const sheetName = submissionsSheetName || PRIMARY_SUBMISSIONS_SHEET_NAME
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const targetSheet = (spreadsheet.data.sheets || []).find((sheet) => sheet.properties?.title === sheetName)
  const sheetId = targetSheet?.properties?.sheetId

  if (typeof sheetId !== "number") {
    throw new Error(`Sheet ${sheetName} tidak ditemukan`)
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: rowsToDelete.map((rowNumber) => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: "ROWS",
            startIndex: rowNumber - 1,
            endIndex: rowNumber,
          },
        },
      })),
    },
  })

  invalidateSubmissionsCache()
}
