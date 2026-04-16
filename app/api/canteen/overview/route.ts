import { NextResponse } from "next/server"
import { getAllDbCanteens } from "@/lib/server/google-sheets-canteens"
import { getAllDbProductsFromSheet } from "@/lib/server/google-sheets-products"
import { getSessionUser } from "@/lib/server/session-user"
import { getDbCanteens, getDbProducts, setDbCanteens, setDbProducts } from "@/lib/server/persistent-store"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"

const ALLOWED_VIEWER_ROLES = new Set([
  "STUDENT",
  "EMPLOYEE",
  "PARENT",
  "ADMIN",
  "SUPER_ADMIN",
  "CANTEEN_OWNER",
])

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Anda harus login untuk mengakses data kantin" }, { status: 401 })
  }

  if (!ALLOWED_VIEWER_ROLES.has(sessionUser.role)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  let canteensFromSheet = [] as Awaited<ReturnType<typeof getAllDbCanteens>>
  let productsFromSheet = [] as Awaited<ReturnType<typeof getAllDbProductsFromSheet>>
  try {
    canteensFromSheet = await getAllDbCanteens()
    if (canteensFromSheet.length > 0) {
      setDbCanteens(canteensFromSheet)
    }
  } catch {
    canteensFromSheet = []
  }

  try {
    productsFromSheet = await getAllDbProductsFromSheet()
    if (productsFromSheet.length > 0) {
      setDbProducts(productsFromSheet)
    }
  } catch {
    productsFromSheet = []
  }

  const canteens = (canteensFromSheet.length > 0 ? canteensFromSheet : getDbCanteens()).filter((canteen) => canteen.isOpen)
  const productsSource = productsFromSheet.length > 0 ? productsFromSheet : getDbProducts()
  const products = productsSource.filter((product) => {
    const canteen = canteens.find((item) => item.id === product.canteenId)
    return Boolean(canteen?.isOpen && product.isAvailable && Number(product.stock || 0) > 0)
  }).map((product) => ({
    ...product,
    image: normalizeDriveMediaUrl(product.image) || "",
  }))

  const normalizedCanteens = canteens.map((canteen) => ({
    ...canteen,
    image: normalizeDriveMediaUrl(canteen.image) || "",
  }))

  return NextResponse.json({
    viewer: {
      id: sessionUser.id,
      name: sessionUser.name,
      avatar: normalizeDriveMediaUrl(sessionUser.avatar) || "",
      role: sessionUser.role,
    },
    canteens: normalizedCanteens,
    products,
  })
}
