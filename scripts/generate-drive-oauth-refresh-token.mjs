#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import readline from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"
import { google } from "googleapis"

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
const DEFAULT_REDIRECT_URI = "https://developers.google.com/oauthplayground"

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const result = {}
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separatorIndex = trimmed.indexOf("=")
    if (separatorIndex < 1) {
      continue
    }

    const key = trimmed.slice(0, separatorIndex).trim()
    const rawValue = trimmed.slice(separatorIndex + 1)
    result[key] = rawValue
  }

  return result
}

function readWorkspaceEnv() {
  const cwd = process.cwd()
  const localEnvPath = path.join(cwd, ".env.local")
  const defaultEnvPath = path.join(cwd, ".env")

  return {
    ...parseEnvFile(defaultEnvPath),
    ...parseEnvFile(localEnvPath),
    ...process.env,
  }
}

function getArgValue(argv, name) {
  const withEquals = argv.find((entry) => entry.startsWith(`${name}=`))
  if (withEquals) {
    return withEquals.slice(name.length + 1)
  }

  const index = argv.findIndex((entry) => entry === name)
  if (index >= 0 && argv[index + 1]) {
    return argv[index + 1]
  }

  return undefined
}

async function main() {
  const env = readWorkspaceEnv()
  const argv = process.argv.slice(2)

  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Generate Google Drive OAuth refresh token for upload fallback.")
    console.log("\nUsage:")
    console.log("  npm run drive:oauth:token")
    console.log("  npm run drive:oauth:token -- --client-id=... --client-secret=... [--redirect-uri=https://developers.google.com/oauthplayground]")
    console.log("\nEnv options:")
    console.log("  GOOGLE_DRIVE_OAUTH_CLIENT_ID")
    console.log("  GOOGLE_DRIVE_OAUTH_CLIENT_SECRET")
    console.log(`  GOOGLE_DRIVE_OAUTH_REDIRECT_URI (optional, default ${DEFAULT_REDIRECT_URI})`)
    return
  }

  const clientId = String(getArgValue(argv, "--client-id") || env.GOOGLE_DRIVE_OAUTH_CLIENT_ID || "").trim()
  const clientSecret = String(
    getArgValue(argv, "--client-secret") || env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET || "",
  ).trim()
  const redirectUri = String(
    getArgValue(argv, "--redirect-uri") || env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI || DEFAULT_REDIRECT_URI,
  ).trim()

  if (!clientId || !clientSecret) {
    console.error("Missing OAuth client configuration.")
    console.error("Set GOOGLE_DRIVE_OAUTH_CLIENT_ID and GOOGLE_DRIVE_OAUTH_CLIENT_SECRET in .env.local")
    console.error("or pass --client-id and --client-secret.")
    process.exit(1)
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [DRIVE_SCOPE],
  })

  console.log("\nOpen this URL in your browser and approve access:\n")
  console.log(authUrl)
  console.log("\nAfter approval, copy the `code` parameter from the redirect URL and paste it here.\n")

  const rl = readline.createInterface({ input, output })
  const code = (await rl.question("Authorization code: ")).trim()
  rl.close()

  if (!code) {
    console.error("Authorization code is required.")
    process.exit(1)
  }

  const tokenRes = await oauth2.getToken(code)
  const refreshToken = String(tokenRes.tokens.refresh_token || "").trim()

  if (!refreshToken) {
    console.error("No refresh_token returned.")
    console.error("Tips: revoke previous app access, then rerun and ensure prompt=consent is shown.")
    process.exit(1)
  }

  console.log("\nAdd these values to .env.local:\n")
  console.log(`GOOGLE_DRIVE_OAUTH_CLIENT_ID=${clientId}`)
  console.log(`GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=${clientSecret}`)
  console.log(`GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=${refreshToken}`)
  console.log("\nDone. Restart the dev server after updating env.")
}

main().catch((error) => {
  const message = error?.response?.data?.error_description || error?.response?.data?.error || error?.message || String(error)
  console.error(`Failed to generate refresh token: ${message}`)
  process.exit(1)
})
