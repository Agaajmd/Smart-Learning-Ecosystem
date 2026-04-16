import { NextResponse } from "next/server"
import { deleteDbUserById, getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import {
  deleteDbCanteenByOwnerId,
  getAllDbCanteens,
  updateDbCanteenByOwnerId,
} from "@/lib/server/google-sheets-canteens"
import {
  getDbCanteenOwners,
  setDbCanteenOwners,
  setDbCanteens,
} from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/

function normalizeWhatsappNumber(raw: string) {
  return raw.trim().replace(/[\s-]/g, "")
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const name = body.name ? String(body.name).trim() : undefined
  const email = body.email ? String(body.email).trim().toLowerCase() : undefined
  const phone = body.phone != null ? normalizeWhatsappNumber(String(body.phone)) : undefined
  const password = body.password ? String(body.password) : undefined
  const canteenName = body.canteenName ? String(body.canteenName).trim() : undefined
  const canteenDescription = body.canteenDescription != null ? String(body.canteenDescription).trim() : undefined
  const isActive = body.isActive != null ? Boolean(body.isActive) : undefined

  if (email && !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
  }

  if (phone != null && phone !== "" && !WHATSAPP_REGEX.test(phone)) {
    return NextResponse.json({ error: "Format nomor WhatsApp Indonesia tidak valid" }, { status: 400 })
  }

  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  const owners = getDbCanteenOwners()
  const target = owners.find((item) => item.id === id)
  const users = await getAllDbUsers()
  const canteensFromSheet = await getAllDbCanteens()
  setDbCanteens(canteensFromSheet)
  const userTarget = users.find((item) => item.id === id && item.role === "CANTEEN_OWNER")

  if (!target && !userTarget) {
    return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
  }

  await updateDbUserById({
    id,
    name,
    email,
    phone,
    password,
  })

  const baseTarget = target || {
    id,
    name: userTarget?.name || "",
    email: userTarget?.email || "",
    avatar: userTarget?.avatar || "",
    role: "CANTEEN_OWNER" as const,
    canteenId: canteensFromSheet.find((item) => item.ownerId === id)?.id || "",
    canteenName: canteensFromSheet.find((item) => item.ownerId === id)?.name || "",
    phone: userTarget?.phone || "",
    isActive: userTarget?.isActive ?? true,
  }

  const nextOwner = {
    ...baseTarget,
    name: name || baseTarget.name,
    email: email || baseTarget.email,
    phone: phone != null ? phone : baseTarget.phone,
    canteenName: canteenName || baseTarget.canteenName,
    isActive: isActive != null ? isActive : baseTarget.isActive,
  }

  if (target) {
    setDbCanteenOwners(owners.map((item) => (item.id === id ? nextOwner : item)))
  } else {
    setDbCanteenOwners([...owners, nextOwner])
  }
  const existingCanteen = canteensFromSheet.find((item) => item.ownerId === id) || null
  if (existingCanteen) {
    const updatedCanteen = await updateDbCanteenByOwnerId({
      ownerId: id,
      name: canteenName,
      description: canteenDescription,
      isOpen: isActive,
    })
    setDbCanteens(
      canteensFromSheet.map((item) => (item.id === updatedCanteen.id ? updatedCanteen : item)),
    )
  }

  logAudit({
    actorId: id,
    action: "UPDATE",
    entityName: "canteen_owners",
    entityId: id,
    oldValue: target || userTarget || null,
    newValue: nextOwner,
  })

  return NextResponse.json({ owner: nextOwner })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const owners = getDbCanteenOwners()
  const target = owners.find((item) => item.id === id)
  const users = await getAllDbUsers()
  const canteensFromSheet = await getAllDbCanteens()
  setDbCanteens(canteensFromSheet)
  const userTarget = users.find((item) => item.id === id && item.role === "CANTEEN_OWNER")
  if (!target && !userTarget) {
    return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
  }

  setDbCanteenOwners(owners.filter((item) => item.id !== id))
  await deleteDbCanteenByOwnerId(id)
  setDbCanteens(canteensFromSheet.filter((item) => item.ownerId !== id))
  await deleteDbUserById(id)
  logAudit({
    actorId: id,
    action: "DELETE",
    entityName: "canteen_owners",
    entityId: id,
    oldValue: target || userTarget || null,
    newValue: null,
  })

  return NextResponse.json({ success: true })
}
