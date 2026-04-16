import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import type { UserRole } from "@/lib/data-model"
import { getPageFeatureKeyForPath, type PageFeatureStateMap } from "@/lib/page-features"

const FEATURE_STATE_CACHE_TTL_MS = 60_000
const FEATURE_STATE_FETCH_TIMEOUT_MS = 1_200

const ROLE_SET = new Set<UserRole>([
  "STUDENT",
  "PARENT",
  "EMPLOYEE",
  "ADMIN",
  "CANTEEN_OWNER",
  "SUPER_ADMIN",
])

const ROLE_ROUTE_PREFIXES: Array<{ prefix: string; role: UserRole }> = [
  { prefix: "/student", role: "STUDENT" },
  { prefix: "/parent", role: "PARENT" },
  { prefix: "/employee", role: "EMPLOYEE" },
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/super-admin", role: "SUPER_ADMIN" },
  { prefix: "/canteen-owner", role: "CANTEEN_OWNER" },
]

const CANTEEN_SHARED_ROLES = new Set<UserRole>([
  "STUDENT",
  "PARENT",
  "EMPLOYEE",
  "ADMIN",
  "SUPER_ADMIN",
])

let featureStateCache: PageFeatureStateMap | null = null
let featureStateCacheAt = 0

function normalizeRole(value: unknown): UserRole | null {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")

  return ROLE_SET.has(normalized as UserRole) ? (normalized as UserRole) : null
}

function getRoleHomePath(role: UserRole) {
  return `/${role.toLowerCase().replace("_", "-")}`
}

function readSessionRole(request: NextRequest): UserRole | null {
  const raw = request.cookies.get("auth_user")?.value
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as { role?: string }
    return normalizeRole(parsed.role)
  } catch {
    return null
  }
}

function getExpectedRoleForPath(pathname: string): UserRole | null {
  for (const item of ROLE_ROUTE_PREFIXES) {
    if (pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)) {
      return item.role
    }
  }
  return null
}

function buildLoginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone()
  url.pathname = "/login"
  url.searchParams.set("next", request.nextUrl.pathname)
  return NextResponse.redirect(url)
}

function buildFeatureBlockedRedirect(request: NextRequest, featureKey: string) {
  const url = request.nextUrl.clone()
  url.pathname = "/feature-disabled"
  url.searchParams.set("from", request.nextUrl.pathname)
  url.searchParams.set("feature", featureKey)
  return NextResponse.redirect(url)
}

async function getFeatureState(request: NextRequest) {
  if (featureStateCache && Date.now() - featureStateCacheAt < FEATURE_STATE_CACHE_TTL_MS) {
    return featureStateCache
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FEATURE_STATE_FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(new URL("/api/page-features", request.nextUrl.origin), {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
      cache: "no-store",
      signal: controller.signal,
    })

    if (!res.ok) {
      return featureStateCache
    }

    const payload = (await res.json()) as { state?: PageFeatureStateMap }
    if (payload?.state && typeof payload.state === "object") {
      featureStateCache = payload.state
      featureStateCacheAt = Date.now()
      return featureStateCache
    }

    return featureStateCache
  } catch {
    return featureStateCache
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const sessionRole = readSessionRole(request)
  const expectedRole = getExpectedRoleForPath(pathname)

  if (expectedRole) {
    if (!sessionRole) {
      return buildLoginRedirect(request)
    }

    if (sessionRole !== expectedRole) {
      return NextResponse.redirect(new URL(getRoleHomePath(sessionRole), request.nextUrl.origin))
    }
  }

  if (pathname === "/canteen" || pathname.startsWith("/canteen/")) {
    if (!sessionRole) {
      return buildLoginRedirect(request)
    }

    if (!CANTEEN_SHARED_ROLES.has(sessionRole)) {
      return NextResponse.redirect(new URL(getRoleHomePath(sessionRole), request.nextUrl.origin))
    }
  }

  const currentRole = sessionRole
  if (!currentRole) {
    return NextResponse.next()
  }

  const featureState = await getFeatureState(request)
  if (!featureState) {
    return NextResponse.next()
  }

  const featureKey = getPageFeatureKeyForPath(pathname, currentRole)
  if (featureKey && featureState[featureKey] === false) {
    return buildFeatureBlockedRedirect(request, featureKey)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/student/:path*",
    "/parent/:path*",
    "/employee/:path*",
    "/admin/:path*",
    "/super-admin/:path*",
    "/canteen-owner/:path*",
    "/canteen/:path*",
  ],
}