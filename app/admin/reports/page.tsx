"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AdminReportsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/scan")
  }, [router])

  return null
}
