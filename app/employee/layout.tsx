"use client"

import { useEffect, useState, type ReactNode } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"

type EmployeeSessionUser = {
  name: string
  avatar: string
}

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<EmployeeSessionUser | null>(null)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const res = await fetch("/api/dashboard/employee", { cache: "no-store" })
        if (!res.ok || !active) return

        const data = await res.json()
        if (data.employee && active) {
          setEmployee({
            name: data.employee.name || "",
            avatar: data.employee.avatar || "/placeholder-user.jpg",
          })
        }
      } catch {
        if (active) {
          setEmployee({ name: "", avatar: "/placeholder-user.jpg" })
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  if (!employee) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="EMPLOYEE" userName={employee.name} userAvatar={employee.avatar}>
      {children}
    </DashboardLayout>
  )
}
