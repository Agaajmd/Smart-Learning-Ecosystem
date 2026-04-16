import { NextResponse } from "next/server"
import { createDbUser, ensurePrincipalSeeded } from "@/lib/server/google-sheets-auth"
import type { UserRole } from "@/lib/data-model"
import { logAudit } from "@/lib/server/audit-log"

const ALLOWED_ROLES: UserRole[] = ["STUDENT", "EMPLOYEE", "ADMIN", "SUPER_ADMIN", "PARENT", "CANTEEN_OWNER"]

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const name = String(body?.name || "").trim()
    const email = String(body?.email || "").trim().toLowerCase()
    const password = String(body?.password || "")
    const role = String(body?.role || "PARENT") as UserRole

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nama, email, dan password wajib diisi" }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 })
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Role tidak valid" }, { status: 400 })
    }

    await ensurePrincipalSeeded()

    const user = await createDbUser({
      name,
      email,
      password,
      role,
      avatar: "",
    })

    logAudit({
      actorId: user.id,
      action: "CREATE",
      entityName: "users",
      entityId: user.id,
      oldValue: null,
      newValue: user,
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Terjadi kesalahan saat registrasi"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
