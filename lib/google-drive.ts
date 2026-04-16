const DRIVE_HOST_PATTERN = /^https?:\/\/(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com|lh3\.googleusercontent\.com)\//i
const HTTP_URL_PATTERN = /^https?:\/\//i
const DATA_URL_PATTERN = /^data:/i
const MEDIA_ASSET_ROUTE_PATTERN = /^\/api\/media-assets\/([A-Za-z0-9_%\-]+)(?:\?.*)?$/
const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/

function buildMediaAssetRoute(assetId: string) {
  return `/api/media-assets/${encodeURIComponent(assetId)}`
}

function extractAssetIdFromMediaRoute(value: string) {
  const normalized = String(value || "").trim()
  if (!normalized) return ""

  const fromPath = normalized.match(MEDIA_ASSET_ROUTE_PATTERN)
  if (fromPath?.[1]) {
    return decodeURIComponent(fromPath[1]).trim()
  }

  if (!HTTP_URL_PATTERN.test(normalized)) {
    return ""
  }

  try {
    const url = new URL(normalized)
    const fromUrlPath = String(url.pathname || "").match(MEDIA_ASSET_ROUTE_PATTERN)
    if (fromUrlPath?.[1]) {
      return decodeURIComponent(fromUrlPath[1]).trim()
    }
  } catch {
    return ""
  }

  return ""
}

function extractDriveFileIdFromValue(value: string) {
  const normalized = String(value || "").trim()
  if (!normalized) return ""

  if (DRIVE_FILE_ID_PATTERN.test(normalized)) {
    return normalized
  }

  if (!HTTP_URL_PATTERN.test(normalized)) {
    return ""
  }

  try {
    const url = new URL(normalized)
    const hostname = String(url.hostname || "").toLowerCase()
    if (!hostname) {
      return ""
    }

    const isDriveHost =
      hostname === "drive.google.com" ||
      hostname === "docs.google.com" ||
      hostname === "drive.usercontent.google.com" ||
      hostname.endsWith(".googleusercontent.com")
    if (!isDriveHost) {
      return ""
    }

    const fromQuery = String(url.searchParams.get("id") || "").trim()
    if (DRIVE_FILE_ID_PATTERN.test(fromQuery)) {
      return fromQuery
    }

    const fromAltQuery = String(url.searchParams.get("fileId") || "").trim()
    if (DRIVE_FILE_ID_PATTERN.test(fromAltQuery)) {
      return fromAltQuery
    }

    const parts = url.pathname.split("/").filter(Boolean)
    const dIndex = parts.findIndex((part) => part === "d")
    const fromPath = dIndex >= 0 ? String(parts[dIndex + 1] || "").trim() : ""
    if (DRIVE_FILE_ID_PATTERN.test(fromPath)) {
      return fromPath
    }
  } catch {
    return ""
  }

  return ""
}

export function normalizeDriveMediaUrl(value: unknown) {
  const normalized = String(value || "").trim()
  if (!normalized) return undefined

  if (DATA_URL_PATTERN.test(normalized)) {
    return normalized
  }

  const routeAssetId = extractAssetIdFromMediaRoute(normalized)
  if (routeAssetId) {
    return buildMediaAssetRoute(routeAssetId)
  }

  if (DRIVE_HOST_PATTERN.test(normalized)) {
    const fileId = extractDriveFileIdFromValue(normalized)
    if (fileId) {
      return buildMediaAssetRoute(fileId)
    }
  }

  const fileId = extractDriveFileIdFromValue(normalized)
  if (fileId) {
    return buildMediaAssetRoute(fileId)
  }

  if (HTTP_URL_PATTERN.test(normalized) || normalized.startsWith("/")) {
    return normalized
  }

  return undefined
}

export function normalizeDriveMediaUrlList(values: unknown[] | undefined | null) {
  if (!Array.isArray(values)) return [] as string[]
  const next = values
    .map((value) => normalizeDriveMediaUrl(value))
    .filter((value): value is string => Boolean(value))

  return [...new Set(next)]
}

export function requireDriveMediaUrl(value: unknown, fieldName: string) {
  const normalized = normalizeDriveMediaUrl(value)
  if (!normalized) {
    throw new Error(`${fieldName} harus berupa file Google Drive yang valid.`)
  }

  return normalized
}

export function getImageUrl(fileId: unknown, fallback = "") {
  return normalizeDriveMediaUrl(fileId) || fallback
}
