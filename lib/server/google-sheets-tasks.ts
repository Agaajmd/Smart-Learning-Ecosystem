import "server-only"

import { google } from "googleapis"
import { normalizeDriveMediaUrlList } from "@/lib/google-drive"
import type { Task } from "@/lib/data-model"

const TASKS_SHEET_NAME = "tasks"
const TASKS_COLUMNS = [
  "id",
  "title",
  "description",
  "subject",
  "class_id",
  "teacher_id",
  "due_date",
  "created_at",
  "attachment_url",
  "attachment_name",
  "image_url",
  "max_score",
  "updated_at",
]

const TASKS_CACHE_TTL_MS = 60_000
const TASKS_READY_TTL_MS = 5 * 60_000

let tasksCache: { expiresAt: number; data: Task[] } | null = null
let tasksSheetReadyAt = 0

function invalidateTasksCache() {
  tasksCache = null
}

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

function toNumber(value: string, fallback: number) {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
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

function normalizeTaskRow(row: string[]): Task {
  const maxScore = toNumber(row[11] || "", 100)
  const attachmentUrls = normalizeDriveMediaUrlList(parseSerializedUrlList(row[8] || ""))
  const imageUrls = normalizeDriveMediaUrlList(parseSerializedUrlList(row[10] || ""))
  return {
    id: row[0] || "",
    title: row[1] || "",
    description: row[2] || "",
    subject: row[3] || "",
    classId: row[4] || "",
    teacherId: row[5] || "",
    dueDate: row[6] || "",
    createdAt: row[7] || new Date().toISOString(),
    attachmentUrl: attachmentUrls[0] || undefined,
    attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
    attachmentName: row[9] || undefined,
    imageUrl: imageUrls[0] || undefined,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    maxScore,
  }
}

function isQuotaExceededError(error: unknown) {
  const err = error as { code?: number; status?: number; message?: string }
  return err?.code === 429 || err?.status === 429 || /quota exceeded/i.test(String(err?.message || ""))
}

function toTaskSheetRow(task: Task, updatedAt: string) {
  const attachmentUrlsRaw = Array.isArray(task.attachmentUrls)
    ? task.attachmentUrls
    : task.attachmentUrl
      ? [task.attachmentUrl]
      : []
  const imageUrlsRaw = Array.isArray(task.imageUrls)
    ? task.imageUrls
    : task.imageUrl
      ? [task.imageUrl]
      : []
  const attachmentUrls = normalizeDriveMediaUrlList(attachmentUrlsRaw)
  const imageUrls = normalizeDriveMediaUrlList(imageUrlsRaw)

  return [
    task.id,
    task.title,
    task.description,
    task.subject,
    task.classId,
    task.teacherId,
    task.dueDate,
    task.createdAt,
    serializeUrlList(attachmentUrls),
    task.attachmentName || "",
    serializeUrlList(imageUrls),
    String(task.maxScore || 100),
    updatedAt,
  ]
}

export async function ensureTasksSheetReady() {
  if (Date.now() - tasksSheetReadyAt < TASKS_READY_TTL_MS) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId })
  const hasTasksSheet =
    spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === TASKS_SHEET_NAME) ?? false

  if (!hasTasksSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: TASKS_SHEET_NAME,
              },
            },
          },
        ],
      },
    })
  }

  const headerRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TASKS_SHEET_NAME}!A1:M1`,
  })

  const firstRow = headerRes.data.values?.[0] || []
  if (firstRow.length === TASKS_COLUMNS.length) {
    tasksSheetReadyAt = Date.now()
    return
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TASKS_SHEET_NAME}!A1:M1`,
    valueInputOption: "RAW",
    requestBody: {
      values: [TASKS_COLUMNS],
    },
  })

  tasksSheetReadyAt = Date.now()
}

export async function getAllDbTasks(): Promise<Task[]> {
  if (tasksCache && tasksCache.expiresAt > Date.now()) {
    return tasksCache.data
  }

  try {
    await ensureTasksSheetReady()
    const sheets = await getSheetsClient()
    const spreadsheetId = getSpreadsheetId()

    const rowsRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${TASKS_SHEET_NAME}!A2:M`,
    })

    const rows = rowsRes.data.values || []
    const data = rows
      .filter((row) => row[0] && row[1] && row[5])
      .map((row) => normalizeTaskRow(row as string[]))

    tasksCache = {
      expiresAt: Date.now() + TASKS_CACHE_TTL_MS,
      data,
    }

    return data
  } catch (error) {
    if (tasksCache?.data?.length && isQuotaExceededError(error)) {
      return tasksCache.data
    }
    throw error
  }
}

async function getDbTaskRowById(id: string): Promise<{ task: Task; rowNumber: number } | null> {
  await ensureTasksSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${TASKS_SHEET_NAME}!A2:M`,
  })

  const rows = rowsRes.data.values || []
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] as string[]
    if ((row[0] || "") === id) {
      return {
        task: normalizeTaskRow(row),
        rowNumber: index + 2,
      }
    }
  }

  return null
}

export async function createDbTask(input: Omit<Task, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<Task> {
  const now = new Date().toISOString()
  const attachmentUrls = normalizeDriveMediaUrlList([
    ...(Array.isArray(input.attachmentUrls) ? input.attachmentUrls : []),
    ...(input.attachmentUrl ? [input.attachmentUrl] : []),
  ])
  const imageUrls = normalizeDriveMediaUrlList([
    ...(Array.isArray(input.imageUrls) ? input.imageUrls : []),
    ...(input.imageUrl ? [input.imageUrl] : []),
  ])

  const next: Task = {
    id: input.id || `task-${Date.now()}`,
    title: String(input.title || "").trim(),
    description: String(input.description || "").trim(),
    subject: String(input.subject || "").trim(),
    classId: String(input.classId || "").trim(),
    teacherId: String(input.teacherId || "").trim(),
    dueDate: String(input.dueDate || "").trim(),
    createdAt: input.createdAt || now,
    attachmentUrl: attachmentUrls[0] || undefined,
    attachmentUrls: attachmentUrls.length > 0 ? [...new Set(attachmentUrls)] : undefined,
    attachmentName: input.attachmentName || undefined,
    imageUrl: imageUrls[0] || undefined,
    imageUrls: imageUrls.length > 0 ? [...new Set(imageUrls)] : undefined,
    maxScore: Number(input.maxScore) || 100,
  }

  await ensureTasksSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${TASKS_SHEET_NAME}!A:M`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toTaskSheetRow(next, now)],
    },
  })

  invalidateTasksCache()
  return next
}

export async function updateDbTaskById(input: Partial<Task> & { id: string }): Promise<Task> {
  const target = await getDbTaskRowById(input.id)
  if (!target) {
    throw new Error("Tugas tidak ditemukan")
  }

  const current = target.task
  const now = new Date().toISOString()
  const nextAttachmentUrls =
    input.attachmentUrls != null
      ? input.attachmentUrls
      : input.attachmentUrl != null
        ? [input.attachmentUrl]
        : current.attachmentUrls || (current.attachmentUrl ? [current.attachmentUrl] : [])
  const nextImageUrls =
    input.imageUrls != null
      ? input.imageUrls
      : input.imageUrl != null
        ? [input.imageUrl]
        : current.imageUrls || (current.imageUrl ? [current.imageUrl] : [])

  const normalizedAttachmentUrls = nextAttachmentUrls
    .map((item) => String(item || "").trim())
    .filter(Boolean)
  const normalizedImageUrls = nextImageUrls
    .map((item) => String(item || "").trim())
    .filter(Boolean)
  const safeAttachmentUrls = normalizeDriveMediaUrlList(normalizedAttachmentUrls)
  const safeImageUrls = normalizeDriveMediaUrlList(normalizedImageUrls)

  const next: Task = {
    id: current.id,
    title: input.title != null ? String(input.title).trim() : current.title,
    description: input.description != null ? String(input.description).trim() : current.description,
    subject: input.subject != null ? String(input.subject).trim() : current.subject,
    classId: input.classId != null ? String(input.classId).trim() : current.classId,
    teacherId: input.teacherId != null ? String(input.teacherId).trim() : current.teacherId,
    dueDate: input.dueDate != null ? String(input.dueDate).trim() : current.dueDate,
    createdAt: current.createdAt,
    attachmentUrl: safeAttachmentUrls[0] || undefined,
    attachmentUrls: safeAttachmentUrls.length > 0 ? [...new Set(safeAttachmentUrls)] : undefined,
    attachmentName: input.attachmentName != null ? input.attachmentName : current.attachmentName,
    imageUrl: safeImageUrls[0] || undefined,
    imageUrls: safeImageUrls.length > 0 ? [...new Set(safeImageUrls)] : undefined,
    maxScore: input.maxScore != null ? Number(input.maxScore) || 100 : current.maxScore,
  }

  await ensureTasksSheetReady()
  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${TASKS_SHEET_NAME}!A${target.rowNumber}:M${target.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [toTaskSheetRow(next, now)],
    },
  })

  invalidateTasksCache()
  return next
}

export async function deleteDbTaskById(id: string): Promise<void> {
  const target = await getDbTaskRowById(id)
  if (!target) {
    return
  }

  const sheets = await getSheetsClient()
  const spreadsheetId = getSpreadsheetId()
  const sheetRes = await sheets.spreadsheets.get({ spreadsheetId })
  const tasksSheet = sheetRes.data.sheets?.find((sheet) => sheet.properties?.title === TASKS_SHEET_NAME)
  const sheetId = tasksSheet?.properties?.sheetId

  if (typeof sheetId !== "number") {
    throw new Error("Sheet tasks tidak ditemukan")
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

  invalidateTasksCache()
}
