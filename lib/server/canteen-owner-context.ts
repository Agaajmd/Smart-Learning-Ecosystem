import "server-only"

import type { Canteen, CanteenOwner } from "@/lib/data-model"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"
import { getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { getAllDbCanteens } from "@/lib/server/google-sheets-canteens"
import { getDbCanteenOwners, getDbCanteens, setDbCanteens } from "@/lib/server/persistent-store"

const normalizeId = (value: unknown) => String(value || "").trim().toLowerCase()
const normalizeText = (value: unknown) => String(value || "").trim().toLowerCase()

const sameId = (left: unknown, right: unknown) => {
  const normalizedLeft = normalizeId(left)
  const normalizedRight = normalizeId(right)
  return Boolean(normalizedLeft) && normalizedLeft === normalizedRight
}

async function getSyncedCanteens() {
  let canteens = getDbCanteens()
  try {
    const fromSheet = await getAllDbCanteens()
    if (fromSheet.length > 0) {
      canteens = fromSheet
      setDbCanteens(fromSheet)
    }
  } catch {
    // Fallback ke store lokal ketika Google Sheets tidak tersedia.
  }

  return canteens
}

export type CanteenOwnerContext = {
  owner: CanteenOwner
  ownerMap: CanteenOwner | null
  canteen: Canteen | null
  canteens: Canteen[]
  ownedCanteenIds: string[]
}

export async function resolveCanteenOwnerContext(input?: { ownerId?: string }) {
  const users = await getAllDbUsers()
  const ownerUsers = users.filter((user) => user.role === "CANTEEN_OWNER" && user.isActive)

  const requestedOwnerId = normalizeId(input?.ownerId)
  const ownerUser = requestedOwnerId
    ? ownerUsers.find((user) => sameId(user.id, requestedOwnerId)) || null
    : ownerUsers[0] || null

  if (!ownerUser) {
    return null
  }

  const ownerMap =
    getDbCanteenOwners().find(
      (item) => sameId(item.id, ownerUser.id) || normalizeText(item.email) === normalizeText(ownerUser.email),
    ) || null

  const canteens = await getSyncedCanteens()
  const ownedByOwnerId = canteens.filter((item) => sameId(item.ownerId, ownerUser.id))
  const mappedByOwnerMapId = ownerMap?.canteenId
    ? canteens.find((item) => sameId(item.id, ownerMap.canteenId)) || null
    : null
  const mappedByOwnerMapName = ownerMap?.canteenName
    ? canteens.find((item) => normalizeText(item.name) === normalizeText(ownerMap.canteenName)) || null
    : null

  const canteen = ownedByOwnerId[0] || mappedByOwnerMapId || mappedByOwnerMapName || null
  const ownedCanteenIds = [...new Set([
    ...ownedByOwnerId.map((item) => String(item.id || "").trim()).filter(Boolean),
    String(ownerMap?.canteenId || "").trim(),
  ].filter(Boolean))]

  const owner: CanteenOwner = {
    id: ownerUser.id,
    name: ownerUser.name,
    email: ownerUser.email,
    avatar: normalizeDriveMediaUrl(ownerUser.avatar) || "",
    role: "CANTEEN_OWNER",
    phone: ownerUser.phone || ownerMap?.phone || "",
    canteenId: canteen?.id || ownerMap?.canteenId || "",
    canteenName: canteen?.name || ownerMap?.canteenName || "",
    isActive: ownerUser.isActive,
  }

  return {
    owner,
    ownerMap,
    canteen,
    canteens,
    ownedCanteenIds,
  } satisfies CanteenOwnerContext
}

export function hasOwnedCanteenAccess(ownedCanteenIds: string[], canteenId: string) {
  const target = normalizeId(canteenId)
  if (!target) return false

  return ownedCanteenIds.some((item) => normalizeId(item) === target)
}
