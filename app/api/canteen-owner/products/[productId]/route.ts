import { NextResponse } from "next/server"
import type { ProductCategory } from "@/lib/data-model"
import { getDbProducts, setDbProducts } from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"
import {
  createDbMediaAssetFromDataUrl,
  extractMediaAssetIdFromReference,
} from "@/lib/server/google-sheets-media-assets"
import {
  deleteDbProductById,
  getAllDbProductsFromSheet,
  updateDbProductById,
} from "@/lib/server/google-sheets-products"
import { getSessionUser } from "@/lib/server/session-user"
import { hasOwnedCanteenAccess, resolveCanteenOwnerContext } from "@/lib/server/canteen-owner-context"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"

const PRODUCT_CATEGORY_SET = new Set<ProductCategory>(["MAKANAN", "MINUMAN", "SNACK"])

function normalizePositivePrice(input: unknown): number | null {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.round(parsed)
}

function normalizeNonNegativeStock(input: unknown): number | null {
  const parsed = Number(input)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.floor(parsed)
}

function normalizeCategory(input: unknown): ProductCategory | null {
  const parsed = String(input || "").trim().toUpperCase() as ProductCategory
  if (!PRODUCT_CATEGORY_SET.has(parsed)) return null
  return parsed
}

async function normalizeProductImage(input: unknown, canteenId: string, currentImage?: string) {
  const source = String(input || "").trim()
  if (!source) return undefined

  const normalizedCurrent = String(currentImage || "").trim()
  const normalizedCurrentPublicUrl = normalizeDriveMediaUrl(normalizedCurrent) || ""

  if (!source.startsWith("data:")) {
    if (source === normalizedCurrent || source === normalizedCurrentPublicUrl || source.startsWith("/")) {
      if (source === normalizedCurrentPublicUrl && normalizedCurrent) {
        return normalizedCurrent
      }
      return source
    }

    throw new Error("Gambar produk harus diupload dari aplikasi.")
  }

  const replaceAssetId = extractMediaAssetIdFromReference(normalizedCurrent)

  const media = await createDbMediaAssetFromDataUrl({
    dataUrl: source,
    ownerType: "canteen_product",
    ownerId: canteenId,
    originalFileName: `product-${canteenId}-${Date.now()}.png`,
    replaceAssetId,
  })

  return media.url
}

async function loadProductsFromSheetOrStore() {
  try {
    const fromSheet = await getAllDbProductsFromSheet()
    setDbProducts(fromSheet)
    return fromSheet
  } catch {
    return getDbProducts()
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminEditor = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isOwnerEditor = sessionUser.role === "CANTEEN_OWNER"
  if (!isAdminEditor && !isOwnerEditor) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const { productId } = await params
  const payload = (await request.json()) as Record<string, unknown>

  const products = await loadProductsFromSheetOrStore()
  const target = products.find((p) => p.id === productId)

  if (!target) {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 })
  }

  if (isOwnerEditor) {
    const ownerContext = await resolveCanteenOwnerContext({ ownerId: sessionUser.id })
    if (!ownerContext || !hasOwnedCanteenAccess(ownerContext.ownedCanteenIds, target.canteenId)) {
      return NextResponse.json({ error: "Tidak diizinkan mengubah produk kantin lain" }, { status: 403 })
    }
  }

  let normalizedImage: string | undefined
  if (payload.image != null) {
    try {
      normalizedImage = await normalizeProductImage(payload.image, target.canteenId, target.image)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Gagal memproses gambar produk" },
        { status: 400 },
      )
    }
  }

  const nextName = payload.name != null ? String(payload.name).trim() : target.name
  if (!nextName) {
    return NextResponse.json({ error: "Nama produk wajib diisi" }, { status: 400 })
  }

  const nextCategory =
    payload.category != null ? normalizeCategory(payload.category) : (target.category as ProductCategory)
  if (!nextCategory) {
    return NextResponse.json({ error: "Kategori produk tidak valid" }, { status: 400 })
  }

  const nextPrice = payload.price != null ? normalizePositivePrice(payload.price) : target.price
  if (nextPrice == null) {
    return NextResponse.json({ error: "Harga produk harus lebih dari 0" }, { status: 400 })
  }

  const nextStock = payload.stock != null ? normalizeNonNegativeStock(payload.stock) : target.stock
  if (nextStock == null) {
    return NextResponse.json({ error: "Stok produk harus angka 0 atau lebih" }, { status: 400 })
  }

  const requestedAvailability = payload.isAvailable != null ? Boolean(payload.isAvailable) : target.isAvailable
  if (requestedAvailability && nextStock <= 0) {
    return NextResponse.json(
      { error: "Stok harus lebih dari 0 jika produk ingin diaktifkan" },
      { status: 400 },
    )
  }

  const nextAvailability = nextStock > 0 ? requestedAvailability : false

  const updated = {
    ...target,
    name: nextName,
    ...(payload.description != null ? { description: String(payload.description) } : {}),
    category: nextCategory,
    price: nextPrice,
    stock: nextStock,
    isAvailable: nextAvailability,
    ...(payload.image != null ? { image: normalizedImage || target.image } : {}),
  }

  let savedProduct: typeof updated
  try {
    savedProduct = await updateDbProductById(updated)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui produk di backend" },
      { status: 503 },
    )
  }

  setDbProducts(products.map((p) => (p.id === productId ? savedProduct : p)))
  logAudit({
    actorId: sessionUser.id,
    action: "UPDATE",
    entityName: "products",
    entityId: productId,
    oldValue: target,
    newValue: savedProduct,
  })
  return NextResponse.json({ product: savedProduct })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ productId: string }> }) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminEditor = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isOwnerEditor = sessionUser.role === "CANTEEN_OWNER"
  if (!isAdminEditor && !isOwnerEditor) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const { productId } = await params
  const products = await loadProductsFromSheetOrStore()

  const target = products.find((p) => p.id === productId)

  if (!target) {
    return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 })
  }

  if (isOwnerEditor) {
    const ownerContext = await resolveCanteenOwnerContext({ ownerId: sessionUser.id })
    if (!ownerContext || !hasOwnedCanteenAccess(ownerContext.ownedCanteenIds, target.canteenId)) {
      return NextResponse.json({ error: "Tidak diizinkan menghapus produk kantin lain" }, { status: 403 })
    }
  }

  try {
    await deleteDbProductById(target.id)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menghapus produk di backend" },
      { status: 503 },
    )
  }

  setDbProducts(products.filter((p) => p.id !== productId))
  logAudit({
    actorId: sessionUser.id,
    action: "DELETE",
    entityName: "products",
    entityId: productId,
    oldValue: target,
    newValue: null,
  })
  return NextResponse.json({ success: true })
}
