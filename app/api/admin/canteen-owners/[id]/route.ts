import { NextResponse } from "next/server"
import { deactivateDbUserById, updateDbUserById } from "@/lib/server/google-sheets-auth"
import {
  getDbCanteenOwners,
  getDbCanteens,
  setDbCanteenOwners,
  setDbCanteens,
} from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await request.json()
  const owners = getDbCanteenOwners()
  const target = owners.find((item) => item.id === id)

  if (!target) {
    return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
  }

  await updateDbUserById({
    id,
    name: body.name ? String(body.name) : undefined,
    email: body.email ? String(body.email) : undefined,
    password: body.password ? String(body.password) : undefined,
  })

  const nextOwner = {
    ...target,
    name: body.name ? String(body.name) : target.name,
    email: body.email ? String(body.email) : target.email,
    phone: body.phone != null ? String(body.phone) : target.phone,
    canteenName: body.canteenName ? String(body.canteenName) : target.canteenName,
    isActive: body.isActive != null ? Boolean(body.isActive) : target.isActive,
  }

  setDbCanteenOwners(owners.map((item) => (item.id === id ? nextOwner : item)))
  setDbCanteens(
    getDbCanteens().map((item) =>
      item.ownerId === id
        ? {
            ...item,
            name: body.canteenName ? String(body.canteenName) : item.name,
            description: body.canteenDescription != null ? String(body.canteenDescription) : item.description,
            isOpen: body.isActive != null ? Boolean(body.isActive) : item.isOpen,
          }
        : item,
    ),
  )

  logAudit({
    actorId: id,
    action: "UPDATE",
    entityName: "canteen_owners",
    entityId: id,
    oldValue: target,
    newValue: nextOwner,
  })

  return NextResponse.json({ owner: nextOwner })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const owners = getDbCanteenOwners()
  const target = owners.find((item) => item.id === id)
  if (!target) {
    return NextResponse.json({ error: "Pemilik kantin tidak ditemukan" }, { status: 404 })
  }

  setDbCanteenOwners(owners.filter((item) => item.id !== id))
  setDbCanteens(getDbCanteens().filter((item) => item.ownerId !== id))
  await deactivateDbUserById(id)
  logAudit({
    actorId: id,
    action: "DELETE",
    entityName: "canteen_owners",
    entityId: id,
    oldValue: target,
    newValue: null,
  })

  return NextResponse.json({ success: true })
}
