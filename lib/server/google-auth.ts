import "server-only"

import { google } from "googleapis"
import type { JWT, OAuth2Client } from "google-auth-library"

export const GOOGLE_SCOPE_SHEETS = "https://www.googleapis.com/auth/spreadsheets"
export const GOOGLE_SCOPE_DRIVE_FILE = "https://www.googleapis.com/auth/drive.file"
export const GOOGLE_SCOPE_DRIVE = "https://www.googleapis.com/auth/drive"

export type GoogleDriveAuthMode = "oauth-refresh-token" | "service-account-jwt"

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

export async function createGoogleJwtAuth(
  scopes: string[] = [GOOGLE_SCOPE_SHEETS, GOOGLE_SCOPE_DRIVE_FILE],
) {
  const serviceAccount = await getServiceAccount()
  const subject = String(process.env.GOOGLE_WORKSPACE_IMPERSONATE_USER || "").trim() || undefined

  return new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes,
    subject,
  })
}

function getDriveOAuthCredentials() {
  const clientId = String(process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID || "").trim()
  const clientSecret = String(process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET || "").trim()
  const refreshToken = String(process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN || "").trim()

  const filledCount = [clientId, clientSecret, refreshToken].filter(Boolean).length
  if (filledCount > 0 && filledCount < 3) {
    throw new Error(
      "Konfigurasi OAuth Drive tidak lengkap. Isi GOOGLE_DRIVE_OAUTH_CLIENT_ID, GOOGLE_DRIVE_OAUTH_CLIENT_SECRET, dan GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN sekaligus, atau kosongkan semuanya untuk fallback ke service account.",
    )
  }

  if (!clientId || !clientSecret || !refreshToken) {
    return null
  }

  return {
    clientId,
    clientSecret,
    refreshToken,
  }
}

export async function createGoogleDriveAuth(
  scopes: string[] = [GOOGLE_SCOPE_DRIVE_FILE],
): Promise<{ auth: OAuth2Client | JWT; mode: GoogleDriveAuthMode }> {
  const oauth = getDriveOAuthCredentials()
  if (oauth) {
    const auth = new google.auth.OAuth2(oauth.clientId, oauth.clientSecret)
    auth.setCredentials({
      refresh_token: oauth.refreshToken,
      scope: scopes.join(" "),
    })

    return {
      auth,
      mode: "oauth-refresh-token",
    }
  }

  return {
    auth: await createGoogleJwtAuth(scopes),
    mode: "service-account-jwt",
  }
}
