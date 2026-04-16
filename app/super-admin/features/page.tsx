"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { Switch } from "@/components/atoms/switch"
import { toast } from "sonner"
import { SlidersHorizontal, ShieldCheck, Link as LinkIcon } from "lucide-react"
import type { UserRole } from "@/lib/data-model"

type ManagedFeature = {
  key: string
  label: string
  description: string
  href: string
  pathPrefix: string
  roles: UserRole[]
  roleLabels: string[]
  enabled: boolean
}

type SessionUser = {
  id: string
  name: string
  avatar: string
  role: UserRole
}

export default function SuperAdminFeaturesPage() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [features, setFeatures] = useState<ManagedFeature[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const [sessionRes, featureRes] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/super-admin/page-features", { cache: "no-store" }),
        ])

        if (!active) return

        if (sessionRes.ok) {
          const sessionPayload = await sessionRes.json()
          if (sessionPayload?.user?.id && sessionPayload?.user?.role === "SUPER_ADMIN") {
            setSessionUser({
              id: sessionPayload.user.id,
              name: sessionPayload.user.name || "Kepala Sekolah",
              avatar: sessionPayload.user.avatar || "/placeholder-user.jpg",
              role: "SUPER_ADMIN",
            })
          }
        }

        if (featureRes.ok) {
          const featurePayload = await featureRes.json()
          if (Array.isArray(featurePayload?.features)) {
            setFeatures(featurePayload.features as ManagedFeature[])
          }
        }
      } catch {
        // Keep local state and show error in UI below.
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const groupedByRole = useMemo(() => {
    const roleOrder: UserRole[] = ["STUDENT", "PARENT", "EMPLOYEE", "ADMIN", "CANTEEN_OWNER", "SUPER_ADMIN"]
    const groups = roleOrder
      .map((role) => ({
        role,
        items: features.filter((item) => item.roles.includes(role)),
      }))
      .filter((group) => group.items.length > 0)

    return groups
  }, [features])

  const handleToggle = async (feature: ManagedFeature) => {
    const nextEnabled = !feature.enabled
    setSavingKey(feature.key)

    setFeatures((prev) => prev.map((item) => (item.key === feature.key ? { ...item, enabled: nextEnabled } : item)))

    try {
      const res = await fetch("/api/super-admin/page-features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: feature.key, enabled: nextEnabled }),
      })

      if (!res.ok) {
        throw new Error("Gagal menyimpan pengaturan fitur")
      }

      const payload = await res.json()
      if (Array.isArray(payload?.features)) {
        setFeatures(payload.features as ManagedFeature[])
      }

      toast.success(`Fitur ${nextEnabled ? "diaktifkan" : "dinonaktifkan"}`)
    } catch {
      setFeatures((prev) => prev.map((item) => (item.key === feature.key ? { ...item, enabled: feature.enabled } : item)))
      toast.error("Gagal menyimpan perubahan fitur")
    } finally {
      setSavingKey(null)
    }
  }

  if (isLoading || !sessionUser) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={sessionUser.name} userAvatar={sessionUser.avatar}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-purple-100 text-purple-700">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-800">Manajemen Page/Fitur</h1>
              <p className="text-slate-600 mt-1">
                Aktifkan atau nonaktifkan akses page pada sidebar dan bottom navigation untuk Student, Parent, Guru,
                Admin, dan Kantin.
              </p>
            </div>
          </div>
        </div>

        {groupedByRole.map((group) => (
          <section key={group.role} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-slate-600" />
                <h2 className="font-semibold text-slate-800">Role: {group.role.replace("_", " ")}</h2>
              </div>
              <span className="text-xs text-slate-500">{group.items.length} fitur</span>
            </div>

            <div className="divide-y divide-slate-100">
              {group.items.map((feature) => {
                const isSaving = savingKey === feature.key

                return (
                  <div key={`${group.role}-${feature.key}`} className="px-5 py-4 flex items-start gap-4">
                    <div className="mt-0.5">
                      <Switch
                        checked={feature.enabled}
                        disabled={isSaving}
                        onCheckedChange={() => handleToggle(feature)}
                        aria-label={`Toggle ${feature.label}`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800">{feature.label}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{feature.description}</p>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-slate-100 text-slate-700">
                          <LinkIcon className="w-3 h-3" />
                          {feature.href}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium ${
                            feature.enabled ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {feature.enabled ? "Aktif" : "Nonaktif"}
                        </span>
                        {isSaving ? (
                          <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">Menyimpan...</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </DashboardLayout>
  )
}
