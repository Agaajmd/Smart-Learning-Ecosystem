import { NextResponse } from "next/server"
import type { Product, ProductCategory } from "@/lib/data-model"
import { getDbProducts, setDbProducts } from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"
import { createDbMediaAssetFromDataUrl } from "@/lib/server/google-sheets-media-assets"
import { createDbProduct, getAllDbProductsFromSheet } from "@/lib/server/google-sheets-products"
import { getSessionUser } from "@/lib/server/session-user"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"
import { resolveCanteenOwnerContext } from "@/lib/server/canteen-owner-context"

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

async function normalizeProductImage(input: unknown, canteenId: string) {
  const source = String(input || "").trim()
  if (!source) return undefined
  if (!source.startsWith("data:")) {
    if (source.startsWith("/")) {
      return source
    }

    throw new Error("Gambar produk harus diupload dari aplikasi.")
  }

  const media = await createDbMediaAssetFromDataUrl({
    dataUrl: source,
    ownerType: "canteen_product",
    ownerId: canteenId,
    originalFileName: `product-${canteenId}-${Date.now()}.png`,
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

export async function GET(request: Request) {
  const url = new URL(request.url)
  const sessionUser = await getSessionUser()
  const requestedOwnerId = String(url.searchParams.get("ownerId") || "").trim()

  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminViewer = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isOwnerViewer = sessionUser.role === "CANTEEN_OWNER"

  if (!isAdminViewer && !isOwnerViewer) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const ownerContext = await resolveCanteenOwnerContext({
    ownerId: isOwnerViewer ? sessionUser.id : requestedOwnerId || undefined,
  })
  const owner = ownerContext?.owner || null

  if (!owner) {
    return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
  }

  const products = (await loadProductsFromSheetOrStore())
    .filter((p) => p.canteenId === owner.canteenId)
    .map((product) => ({
      ...product,
      image: normalizeDriveMediaUrl(product.image) || "",
    }))
  return NextResponse.json({ owner, products })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminEditor = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isOwnerEditor = sessionUser.role === "CANTEEN_OWNER"

  if (!isAdminEditor && !isOwnerEditor) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const payload = (await request.json()) as Partial<Product>

  const ownerContext = isOwnerEditor
    ? await resolveCanteenOwnerContext({ ownerId: sessionUser.id })
    : null

  const targetCanteenId = isOwnerEditor
    ? ownerContext?.owner.canteenId
    : String(payload.canteenId || "").trim()
  const name = String(payload.name || "").trim()
  const category = normalizeCategory(payload.category)
  const price = normalizePositivePrice(payload.price)
  const stock = normalizeNonNegativeStock(payload.stock)

  if (isOwnerEditor && !targetCanteenId) {
    return NextResponse.json(
      { error: "Data kantin belum terhubung. Lengkapi profil owner terlebih dahulu." },
      { status: 400 },
    )
  }

  if (!targetCanteenId || !name || price == null || stock == null || !category) {
    return NextResponse.json({ error: "Data produk belum lengkap" }, { status: 400 })
  }

  let normalizedImage: string | undefined
  try {
    normalizedImage = await normalizeProductImage(payload.image, targetCanteenId)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses gambar produk" },
      { status: 400 },
    )
  }

  const products = await loadProductsFromSheetOrStore()
  const requestedAvailability = payload.isAvailable == null ? true : Boolean(payload.isAvailable)
  const normalizedAvailability = stock > 0 ? requestedAvailability : false

  const newProduct: Product = {
    id: `prod-${Date.now()}`,
    canteenId: targetCanteenId,
    name,
    description: String(payload.description || "").trim(),
    price,
    image: normalizedImage || "",
    category,
    stock,
    isAvailable: normalizedAvailability,
  }

  let savedProduct: Product
  try {
    savedProduct = await createDbProduct(newProduct)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal menyimpan produk ke backend" },
      { status: 503 },
    )
  }

  setDbProducts([...products.filter((item) => item.id !== savedProduct.id), savedProduct])
  logAudit({
    actorId: sessionUser.id,
    action: "CREATE",
    entityName: "products",
    entityId: savedProduct.id,
    oldValue: null,
    newValue: savedProduct,
  })
  return NextResponse.json({ product: savedProduct }, { status: 201 })
}
