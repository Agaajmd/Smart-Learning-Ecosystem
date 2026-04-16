import { NextResponse } from "next/server"
import { createDbUser, getAllDbUsers } from "@/lib/server/google-sheets-auth"
import { createDbCanteen, getAllDbCanteens } from "@/lib/server/google-sheets-canteens"
import { getSessionUser } from "@/lib/server/session-user"
import {
  getDbAdmins,
  getDbCanteenOwners,
  getDbCanteens,
  setDbCanteenOwners,
  setDbCanteens,
} from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/

function normalizeWhatsappNumber(raw: string) {
  return raw.trim().replace(/[\s-]/g, "")
}

export async function GET() {
  const users = await getAllDbUsers()
  const canteensFromSheet = await getAllDbCanteens()
  const sessionUser = await getSessionUser()
  const adminFromSession =
    sessionUser?.role === "ADMIN" && sessionUser.isActive
      ? {
          id: sessionUser.id,
          name: sessionUser.name,
          email: sessionUser.email,
          avatar: sessionUser.avatar,
          role: "ADMIN" as const,
        }
      : null
  const adminFromUsers =
    users.find((user) => user.role === "ADMIN" && user.isActive) ||
    users.find((user) => user.role === "SUPER_ADMIN" && user.isActive) ||
    null
  const admin =
    adminFromSession ||
    (adminFromUsers
      ? {
          id: adminFromUsers.id,
          name: adminFromUsers.name,
          email: adminFromUsers.email,
          avatar: adminFromUsers.avatar,
          role: adminFromUsers.role,
        }
      : null) ||
    getDbAdmins()[0] ||
    null

  const ownersFromStore = getDbCanteenOwners()
  const canteens = canteensFromSheet
  setDbCanteens(canteensFromSheet)
  const canteenByOwnerId = new Map(canteens.map((canteen) => [canteen.ownerId, canteen]))
  const ownersFromUsers = users
    .filter((user) => user.role === "CANTEEN_OWNER" && user.isActive)
    .map((user) => {
      const mappedCanteen = canteenByOwnerId.get(user.id)
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: "CANTEEN_OWNER" as const,
        canteenId: mappedCanteen?.id || "",
        canteenName: mappedCanteen?.name || "-",
        phone: user.phone || "",
        isActive: true,
      }
    })

  const ownerMap = new Map<string, (typeof ownersFromStore)[number]>()
  for (const owner of ownersFromUsers) {
    ownerMap.set(owner.id, owner)
  }
  for (const owner of ownersFromStore) {
    ownerMap.set(owner.id, {
      ...ownerMap.get(owner.id),
      ...owner,
    })
  }
  const owners = [...ownerMap.values()]
  setDbCanteenOwners(owners)

  return NextResponse.json({
    admin,
    owners,
    canteens,
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const password = String(body.password || "")
  const phone = normalizeWhatsappNumber(String(body.phone || ""))
  const canteenName = String(body.canteenName || "").trim()
  const canteenDescription = String(body.canteenDescription || "").trim()
  const isActive = body.isActive !== false

  if (!name || !email || !password || !phone || !canteenName) {
    return NextResponse.json({ error: "Data pemilik kantin belum lengkap" }, { status: 400 })
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
  }

  if (!WHATSAPP_REGEX.test(phone)) {
    return NextResponse.json({ error: "Format nomor WhatsApp Indonesia tidak valid" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  const user = await createDbUser({
    name,
    email,
    password,
    role: "CANTEEN_OWNER",
    phone,
    avatar: "",
  })

  const canteenId = `can-${Date.now()}`
  const owner = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: "CANTEEN_OWNER" as const,
    canteenId,
    canteenName,
    phone,
    isActive,
  }

  const canteen = await createDbCanteen({
    id: canteenId,
    name: canteenName,
    ownerId: user.id,
    description: canteenDescription,
    image: "",
    rating: 0,
    totalOrders: 0,
    isOpen: isActive,
  })

  setDbCanteenOwners([...getDbCanteenOwners(), owner])
  setDbCanteens([...getDbCanteens(), canteen])
  logAudit({
    actorId: user.id,
    action: "CREATE",
    entityName: "canteen_owners",
    entityId: owner.id,
    oldValue: null,
    newValue: owner,
  })

  return NextResponse.json({ owner, canteen }, { status: 201 })
}
