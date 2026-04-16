import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import {
  createDbCanteen,
  getAllDbCanteens,
  updateDbCanteenByOwnerId,
} from "@/lib/server/google-sheets-canteens"
import {
  createDbMediaAssetFromDataUrl,
  extractMediaAssetIdFromReference,
} from "@/lib/server/google-sheets-media-assets"
import { getSessionUser } from "@/lib/server/session-user"
import { logAudit } from "@/lib/server/audit-log"
import { getDbCanteenOwners, getDbCanteens, setDbCanteenOwners, setDbCanteens } from "@/lib/server/persistent-store"

function parseOptionalBoolean(input: unknown): boolean | undefined {
  if (input == null) return undefined
  if (typeof input === "boolean") return input

  const normalized = String(input).trim().toLowerCase()
  if (!normalized) return undefined
  if (["true", "1", "yes", "y", "on", "open", "buka"].includes(normalized)) return true
  if (["false", "0", "no", "n", "off", "closed", "close", "tutup"].includes(normalized)) return false
  return undefined
}

async function normalizeCanteenImage(input: unknown, ownerId: string, currentImage?: string) {
  const source = String(input || "").trim()
  if (!source) return undefined

  const normalizedCurrent = String(currentImage || "").trim()
  if (!source.startsWith("data:")) {
    if (source === normalizedCurrent || source.startsWith("/")) {
      return source
    }

    throw new Error("Gambar kantin harus diupload dari aplikasi.")
  }

  const replaceAssetId = extractMediaAssetIdFromReference(normalizedCurrent)

  const media = await createDbMediaAssetFromDataUrl({
    dataUrl: source,
    ownerType: "canteen_store",
    ownerId,
    originalFileName: `canteen-${ownerId}-${Date.now()}.png`,
    replaceAssetId,
  })

  return media.url
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminViewer = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isOwnerViewer = sessionUser.role === "CANTEEN_OWNER"
  if (!isAdminViewer && !isOwnerViewer) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(request.url)
  const requestedOwnerId = String(url.searchParams.get("ownerId") || "").trim()
  const targetOwnerId = isOwnerViewer ? sessionUser.id : requestedOwnerId
  if (!targetOwnerId) {
    return NextResponse.json({ error: "ownerId wajib diisi" }, { status: 400 })
  }

  const users = await getAllDbUsers()
  const ownerUsers = users.filter((item) => item.role === "CANTEEN_OWNER" && item.isActive)
  const ownerUser = targetOwnerId
    ? ownerUsers.find((item) => item.id === targetOwnerId) || null
    : null

  if (!ownerUser) {
    return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
  }

  let canteens = getDbCanteens()
  try {
    const canteensFromSheet = await getAllDbCanteens()
    if (canteensFromSheet.length > 0) {
      canteens = canteensFromSheet
      setDbCanteens(canteensFromSheet)
    }
  } catch {
    // Fallback ke store lokal jika Google Sheets gagal diakses.
  }

  const ownerMap = getDbCanteenOwners().find((item) => item.id === ownerUser.id || item.email === ownerUser.email) || null
  const canteen =
    canteens.find((item) => item.ownerId === ownerUser.id) ||
    (ownerMap?.canteenId ? canteens.find((item) => item.id === ownerMap.canteenId) || null : null)
  const owner = {
    id: ownerUser.id,
    name: ownerUser.name,
    email: ownerUser.email,
    avatar: ownerUser.avatar,
    role: "CANTEEN_OWNER" as const,
    phone: ownerUser.phone || ownerMap?.phone || "",
    canteenId: canteen?.id || ownerMap?.canteenId || "",
    canteenName: canteen?.name || ownerMap?.canteenName || "",
    canteenDescription: canteen?.description || "",
    canteenImage: canteen?.image || "",
    canteenIsOpen: canteen?.isOpen ?? false,
    isActive: ownerUser.isActive,
  }

  return NextResponse.json({ owner, canteen })
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminEditor = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isOwnerEditor = sessionUser.role === "CANTEEN_OWNER"
  if (!isAdminEditor && !isOwnerEditor) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = (await request.json()) as Record<string, unknown>
  const requestedOwnerId = String(body.id || "").trim()
  const targetOwnerId = isOwnerEditor ? sessionUser.id : requestedOwnerId

  if (!targetOwnerId) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  if (isOwnerEditor && requestedOwnerId && requestedOwnerId !== sessionUser.id) {
    return NextResponse.json({ error: "Tidak diizinkan mengubah profil owner lain" }, { status: 403 })
  }

  const users = await getAllDbUsers()
  const ownerUser = users.find((item) => item.id === targetOwnerId && item.role === "CANTEEN_OWNER") || null
  if (!ownerUser) {
    return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
  }

  const name = body.name != null ? String(body.name).trim() : undefined
  const email = body.email != null ? String(body.email).trim().toLowerCase() : undefined
  const phone = body.phone != null ? String(body.phone).trim() : undefined
  const avatar = body.avatar != null ? String(body.avatar) : undefined
  const password = body.password != null ? String(body.password).trim() : ""
  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }
  const canteenName = body.canteenName != null ? String(body.canteenName).trim() : undefined
  const canteenDescription = body.canteenDescription != null ? String(body.canteenDescription).trim() : undefined
  const rawCanteenIsOpen = body.canteenIsOpen ?? body.isOpen
  const canteenIsOpen = parseOptionalBoolean(rawCanteenIsOpen)
  const shouldUpdateCanteenIsOpen = rawCanteenIsOpen != null
  if (shouldUpdateCanteenIsOpen && canteenIsOpen == null) {
    return NextResponse.json({ error: "Nilai status buka/tutup kantin tidak valid" }, { status: 400 })
  }

  let updatedUser
  try {
    updatedUser = await updateDbUserById({
      id: targetOwnerId,
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      avatar: avatar || undefined,
      password: password || undefined,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui profil owner" },
      { status: 400 },
    )
  }

  const owners = getDbCanteenOwners()
  const ownerIndex = owners.findIndex((item) => item.id === targetOwnerId || item.email === ownerUser.email)
  const ownerBefore = ownerIndex >= 0 ? owners[ownerIndex] : null

  let canteens = getDbCanteens()
  try {
    const canteensFromSheet = await getAllDbCanteens()
    if (canteensFromSheet.length > 0) {
      canteens = canteensFromSheet
      setDbCanteens(canteensFromSheet)
    }
  } catch {
    // Fallback ke store lokal jika Google Sheets gagal diakses.
  }

  const existingCanteen =
    canteens.find((item) => item.ownerId === targetOwnerId) ||
    (ownerBefore?.canteenId ? canteens.find((item) => item.id === ownerBefore.canteenId) || null : null)

  let canteenImage: string | undefined
  if (body.canteenImage != null) {
    try {
      canteenImage = await normalizeCanteenImage(body.canteenImage, targetOwnerId, existingCanteen?.image)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Gagal memproses gambar kantin" },
        { status: 400 },
      )
    }
  }

  const shouldUpdateCanteen =
    canteenName != null || canteenDescription != null || canteenImage != null || shouldUpdateCanteenIsOpen

  let nextCanteen = existingCanteen
  if (shouldUpdateCanteen) {
    try {
      if (existingCanteen) {
        nextCanteen = await updateDbCanteenByOwnerId({
          ownerId: targetOwnerId,
          name: canteenName,
          description: canteenDescription,
          image: canteenImage,
          isOpen: canteenIsOpen,
        })
      } else {
        const nameForCreate = canteenName || ownerBefore?.canteenName || ""
        if (!nameForCreate) {
          return NextResponse.json(
            { error: "Nama kantin wajib diisi untuk membuat data kantin baru" },
            { status: 400 },
          )
        }

        nextCanteen = await createDbCanteen({
          id: ownerBefore?.canteenId || `can-${Date.now()}`,
          name: nameForCreate,
          ownerId: targetOwnerId,
          description: canteenDescription || "",
          image: canteenImage || "",
          rating: 0,
          totalOrders: 0,
          isOpen: canteenIsOpen ?? true,
        })
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Gagal memperbarui data kantin" },
        { status: 400 },
      )
    }

    if (nextCanteen) {
      const resolvedCanteen = nextCanteen
      const nextCanteenId = resolvedCanteen.id
      const hasCanteen = canteens.some((item) => item.id === nextCanteenId)
      const nextCanteens: typeof canteens = hasCanteen
        ? canteens.map((item) => (item.id === nextCanteenId ? resolvedCanteen : item))
        : [...canteens, resolvedCanteen]
      setDbCanteens(nextCanteens)
      canteens = nextCanteens
    }
  }

  const nextOwner = {
    id: targetOwnerId,
    name: updatedUser.name,
    email: updatedUser.email,
    avatar: updatedUser.avatar,
    role: "CANTEEN_OWNER" as const,
    phone: updatedUser.phone || ownerBefore?.phone || "",
    canteenId: nextCanteen?.id || ownerBefore?.canteenId || "",
    canteenName: nextCanteen?.name || canteenName || ownerBefore?.canteenName || "",
    isActive: ownerUser.isActive,
  }

  if (ownerIndex >= 0) {
    const nextOwners = [...owners]
    nextOwners[ownerIndex] = nextOwner
    setDbCanteenOwners(nextOwners)
  } else {
    setDbCanteenOwners([...owners, nextOwner])
  }

  logAudit({
    actorId: sessionUser.id,
    action: "UPDATE",
    entityName: "canteen_owner_profile",
    entityId: targetOwnerId,
    oldValue: {
      owner: ownerBefore,
      canteen: existingCanteen,
    },
    newValue: {
      owner: nextOwner,
      canteen: nextCanteen,
    },
  })

  return NextResponse.json({
    owner: {
      ...nextOwner,
      canteenDescription: nextCanteen?.description || "",
      canteenImage: nextCanteen?.image || "",
      canteenIsOpen: nextCanteen?.isOpen ?? false,
    },
    canteen: nextCanteen,
  })
}
