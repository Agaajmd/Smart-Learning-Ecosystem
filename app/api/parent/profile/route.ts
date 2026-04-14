import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getDbParents, setDbParents } from "@/lib/server/data-store"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const parentId = url.searchParams.get("parentId")
  const users = await getAllDbUsers()
  const parentUser = parentId
    ? users.find((item) => item.id === parentId && item.role === "PARENT" && item.isActive) || null
    : users.find((item) => item.role === "PARENT" && item.isActive) || null

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

  if (!parent) {
    return NextResponse.json({ error: "Parent tidak ditemukan" }, { status: 404 })
  }

  return NextResponse.json({ parent })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const id = String(body.id || "").trim()

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  const updatedUser = await updateDbUserById({
    id,
    name: body.name ? String(body.name) : undefined,
    email: body.email ? String(body.email) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
    avatar: body.avatar ? String(body.avatar) : undefined,
  })

  const parents = getDbParents()
  const index = parents.findIndex((item) => item.id === id)
  let childrenIds: string[] = []
  if (index >= 0) {
    const nextParents = [...parents]
    nextParents[index] = {
      ...nextParents[index],
      name: updatedUser.name,
      email: updatedUser.email,
      phone: body.phone ? String(body.phone) : nextParents[index].phone,
      avatar: updatedUser.avatar,
    }
    childrenIds = nextParents[index].childrenIds || []
    setDbParents(nextParents)
  }

  return NextResponse.json({
    parent: {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      avatar: updatedUser.avatar,
      role: "PARENT" as const,
      phone: body.phone ? String(body.phone) : "",
      childrenIds,
    },
  })
}
