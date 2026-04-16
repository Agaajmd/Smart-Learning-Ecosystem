import { NextResponse } from "next/server"
import type { UserRole } from "@/lib/data-model"
import {
  PAGE_FEATURE_DEFINITIONS,
  PAGE_FEATURE_ROLE_LABELS,
  getPageFeatureDefinitionByKey,
  isPageFeatureEnabled,
  type PageFeatureKey,
} from "@/lib/page-features"
import { getSessionUser } from "@/lib/server/session-user"
import { logAudit } from "@/lib/server/audit-log"
import {
  getEffectivePageFeatureStateMap,
  setPageFeatureState,
} from "@/lib/server/page-features-state"

const MANAGED_ROLES: UserRole[] = ["STUDENT", "PARENT", "EMPLOYEE", "ADMIN", "CANTEEN_OWNER"]

function toManagedFeatureList(state: Record<string, boolean>) {
  return PAGE_FEATURE_DEFINITIONS
    .filter((feature) => feature.roles.some((role) => MANAGED_ROLES.includes(role)))
    .map((feature) => ({
      key: feature.key,
      label: feature.label,
      description: feature.description,
      href: feature.href,
      pathPrefix: feature.pathPrefix,
      roles: feature.roles.filter((role) => MANAGED_ROLES.includes(role)),
      roleLabels: feature.roles
        .filter((role) => MANAGED_ROLES.includes(role))
        .map((role) => PAGE_FEATURE_ROLE_LABELS[role]),
      enabled: isPageFeatureEnabled(feature.key, state),
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

async function requireSuperAdmin() {
  const user = await getSessionUser()
  if (!user || user.role !== "SUPER_ADMIN") {
    return null
  }
  return user
}

export async function GET() {
  const user = await requireSuperAdmin()
  if (!user) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const state = await getEffectivePageFeatureStateMap()

  return NextResponse.json({
    features: toManagedFeatureList(state),
    state,
  })
}

export async function PATCH(request: Request) {
  const user = await requireSuperAdmin()
  if (!user) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const updates = Array.isArray(body?.updates)
    ? body.updates
    : body?.key
      ? [{ key: body.key, enabled: body.enabled }]
      : []

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: "Payload update tidak valid" }, { status: 400 })
  }

  const applied: Array<{ key: PageFeatureKey; enabled: boolean }> = []

  for (const update of updates) {
    const key = String(update?.key || "").trim() as PageFeatureKey
    const definition = getPageFeatureDefinitionByKey(key)

    if (!definition || !definition.roles.some((role) => MANAGED_ROLES.includes(role))) {
      return NextResponse.json({ error: `Feature key tidak valid: ${key}` }, { status: 400 })
    }

    const enabled = Boolean(update?.enabled)
    await setPageFeatureState({ key, enabled, updatedBy: user.id })

    applied.push({ key, enabled })

    logAudit({
      actorId: user.id,
      action: "UPDATE",
      entityName: "PAGE_FEATURE",
      entityId: key,
      oldValue: null,
      newValue: { key, enabled },
    })
  }

  const state = await getEffectivePageFeatureStateMap()

  return NextResponse.json({
    success: true,
    applied,
    features: toManagedFeatureList(state),
    state,
  })
}
