import { NextResponse } from "next/server"
import { type ActivityPoint } from "@/lib/data-model"
import { getDbActivityPoints, setDbActivityPoints } from "@/lib/server/data-store"
import { logAudit } from "@/lib/server/audit-log"

export async function POST(request: Request) {
  const payload = (await request.json()) as ActivityPoint

  if (!payload.studentId || !payload.type || !payload.category || !payload.description || !payload.givenBy) {
    return NextResponse.json({ error: "Data poin aktivitas belum lengkap" }, { status: 400 })
  }

  const nextPoint: ActivityPoint = {
    ...payload,
    id: payload.id || `ap-${Date.now()}`,
    date: payload.date || new Date().toISOString().slice(0, 10),
  }

  setDbActivityPoints([...getDbActivityPoints(), nextPoint])
  logAudit({
    actorId: nextPoint.givenBy,
    action: "CREATE",
    entityName: "activity_points",
    entityId: nextPoint.id,
    oldValue: null,
    newValue: nextPoint,
  })
  return NextResponse.json({ point: nextPoint }, { status: 201 })
}
