import { NextResponse } from "next/server"
import { getEffectivePageFeatureStateMap } from "@/lib/server/page-features-state"

export async function GET() {
  const state = await getEffectivePageFeatureStateMap()
  return NextResponse.json({ state })
}
