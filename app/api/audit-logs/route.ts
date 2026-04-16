import { NextResponse } from "next/server"
import { getDbAuditLogs } from "@/lib/server/persistent-store"
import { getSessionUser } from "@/lib/server/session-user"

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isAdminViewer = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  if (!isAdminViewer) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(request.url)
  const entity = url.searchParams.get("entity")
  const action = url.searchParams.get("action")
  const limit = Number(url.searchParams.get("limit") || 50)

  const logs = getDbAuditLogs().filter((log) => {
    if (entity && log.entityName !== entity) return false
    if (action && log.action !== action) return false
    return true
  })

  return NextResponse.json({ logs: logs.slice(0, Math.max(1, limit)) })
}
