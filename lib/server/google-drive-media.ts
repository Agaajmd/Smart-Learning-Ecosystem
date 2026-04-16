import "server-only"

import { Readable } from "node:stream"
import { google } from "googleapis"
import { getImageUrl } from "@/lib/google-drive"
import {
  createGoogleDriveAuth,
  GOOGLE_SCOPE_DRIVE_FILE,
} from "@/lib/server/google-auth"

async function getGoogleClients() {
  const { auth: driveAuth, mode: driveAuthMode } = await createGoogleDriveAuth([GOOGLE_SCOPE_DRIVE_FILE])

  return {
    drive: google.drive({ version: "v3", auth: driveAuth }),
    driveAuthMode,
  }
}

function getDriveFolderId() {
  const folderId = String(process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim()
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID belum di-set.")
  }

  return folderId
}

function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    throw new Error("Format data URL tidak valid")
  }

  return {
    mimeType: match[1] || "application/octet-stream",
    buffer: Buffer.from(match[2], "base64"),
  }
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

export async function uploadMediaDataUrlToDrive(input: {
  dataUrl: string
  fileName: string
  ownerType: string
  ownerId: string
  usage: string
}): Promise<{ fileId: string; url: string }> {
  const { drive, driveAuthMode } = await getGoogleClients()
  const folderId = getDriveFolderId()
  const { mimeType, buffer } = parseDataUrl(input.dataUrl)

  let fileId = ""
  try {
    const created = await drive.files.create({
      requestBody: {
        name: input.fileName,
        mimeType,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      supportsAllDrives: true,
      fields: "id",
    })

    fileId = String(created.data.id || "")
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

  const publicUrl = getImageUrl(fileId)

  return {
    fileId,
    url: publicUrl,
  }
}