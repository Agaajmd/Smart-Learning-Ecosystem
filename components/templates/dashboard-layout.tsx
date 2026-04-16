"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AlertTriangle } from "lucide-react"

import { BottomNavigation } from "@/components/organisms/bottom-navigation"
import { Sidebar } from "@/components/organisms/sidebar"
import type { UserRole } from "@/lib/data-model"
import {
  getPageFeatureKeyForPath,
  isPageFeatureEnabled,
  type PageFeatureStateMap,
} from "@/lib/page-features"

interface DashboardLayoutProps {
  children: React.ReactNode
  role: UserRole
  userName: string
  userAvatar: string
}

export const DashboardLayout = ({ children, role, userName, userAvatar }: DashboardLayoutProps) => {
  const pathname = usePathname()
  const [featureState, setFeatureState] = useState<PageFeatureStateMap>({})

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const res = await fetch("/api/page-features", { cache: "no-store" })
        if (!res.ok) return
        const payload = await res.json()
        if (!active) return
        if (payload?.state && typeof payload.state === "object") {
          setFeatureState(payload.state as PageFeatureStateMap)
        }
      } catch {
        // Keep default state when config endpoint is unavailable.
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const blockedFeatureKey = useMemo(() => {
    const key = getPageFeatureKeyForPath(pathname, role)
    if (!key) return null
    return isPageFeatureEnabled(key, featureState) ? null : key
  }, [featureState, pathname, role])

  const dashboardPath = `/${role.toLowerCase().replace("_", "-")}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-cyan-50/30">
      <Sidebar role={role} userName={userName} userAvatar={userAvatar} featureState={featureState} />
      <BottomNavigation role={role} userName={userName} userAvatar={userAvatar} featureState={featureState} />
      <main className="md:ml-72 pb-28 md:pb-8 px-4 sm:px-6 py-6 md:py-8">
        <div className="page-enter">
          {blockedFeatureKey ? (
            <div className="max-w-2xl mx-auto mt-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-100 text-amber-700">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-800">Halaman Sedang Dinonaktifkan</h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Fitur ini dinonaktifkan oleh Kepala Sekolah melalui manajemen page/fitur.
                  </p>
                  <div className="mt-4">
                    <Link
                      href={dashboardPath}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Kembali ke Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  )
}
