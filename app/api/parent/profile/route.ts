import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getSessionUser } from "@/lib/server/session-user"
import { logAudit } from "@/lib/server/audit-log"
import { getDbParents, setDbParents } from "@/lib/server/persistent-store"

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminViewer = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isParentViewer = sessionUser.role === "PARENT"
  if (!isAdminViewer && !isParentViewer) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(request.url)
  const requestedParentId = String(url.searchParams.get("parentId") || "").trim()
  const targetParentId = isParentViewer ? sessionUser.id : requestedParentId
  if (!targetParentId) {
    return NextResponse.json({ error: "parentId wajib diisi" }, { status: 400 })
  }

  const users = await getAllDbUsers()
  const parentUser = targetParentId
    ? users.find((item) => item.id === targetParentId && item.role === "PARENT" && item.isActive) || null
    : null

  if (!parentUser) {
    return NextResponse.json({ error: "Parent tidak ditemukan" }, { status: 404 })
  }

  const parentMap = getDbParents().find((item) => item.id === parentUser.id || item.email === parentUser.email) || null
  const parent = {
    id: parentUser.id,
    name: parentUser.name,
    email: parentUser.email,
    avatar: parentUser.avatar,
    role: "PARENT" as const,
    phone: parentUser.phone || parentMap?.phone || "",
    childrenIds: parentMap?.childrenIds || [],
  }

  return NextResponse.json({ parent })
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminEditor = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  const isParentEditor = sessionUser.role === "PARENT"
  if (!isAdminEditor && !isParentEditor) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = (await request.json()) as Record<string, unknown>
  const requestedParentId = String(body.id || "").trim()
  const targetParentId = isParentEditor ? sessionUser.id : requestedParentId

  if (!targetParentId) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  if (isParentEditor && requestedParentId && requestedParentId !== sessionUser.id) {
    return NextResponse.json({ error: "Tidak diizinkan mengubah profil parent lain" }, { status: 403 })
  }

  const users = await getAllDbUsers()
  const targetParent = users.find((item) => item.id === targetParentId && item.role === "PARENT") || null
  if (!targetParent) {
    return NextResponse.json({ error: "Parent tidak ditemukan" }, { status: 404 })
  }

  const password = body.password != null ? String(body.password).trim() : ""
  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  let updatedUser
  try {
    updatedUser = await updateDbUserById({
      id: targetParentId,
      name: body.name != null ? String(body.name).trim() : undefined,
      email: body.email != null ? String(body.email).trim().toLowerCase() : undefined,
      phone: body.phone != null ? String(body.phone).trim() : undefined,
      avatar: body.avatar != null ? String(body.avatar) : undefined,
      password: password || undefined,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui profil parent" },
      { status: 400 },
    )
  }

  const parents = getDbParents()
  const index = parents.findIndex((item) => item.id === targetParentId || item.email === targetParent.email)
  const oldParent = index >= 0 ? parents[index] : null
  let childrenIds: string[] = oldParent?.childrenIds || []

  if (index >= 0) {
    const nextParents = [...parents]
    nextParents[index] = {
      ...nextParents[index],
      id: targetParentId,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone || nextParents[index].phone,
      avatar: updatedUser.avatar,
    }
    childrenIds = nextParents[index].childrenIds || []
    setDbParents(nextParents)
  } else {
    setDbParents([
      ...parents,
      {
        id: targetParentId,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        role: "PARENT" as const,
        childrenIds,
        phone: updatedUser.phone || "",
      },
    ])
  }

  const nextParent = {
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    avatar: updatedUser.avatar,
    role: "PARENT" as const,
    phone: updatedUser.phone || oldParent?.phone || "",
    childrenIds,
  }

  logAudit({
    actorId: sessionUser.id,
    action: "UPDATE",
    entityName: "parent_profile",
    entityId: targetParentId,
    oldValue: oldParent,
    newValue: nextParent,
  })

  return NextResponse.json({
    parent: nextParent,
  })
}
