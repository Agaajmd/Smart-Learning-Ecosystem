"use client"

import type React from "react"

import { BottomNavigation } from "@/components/organisms/bottom-navigation"
import { Sidebar } from "@/components/organisms/sidebar"
import type { UserRole } from "@/lib/mock-data"

interface DashboardLayoutProps {
  children: React.ReactNode
  role: UserRole
  userName: string
  userAvatar: string
}

export const DashboardLayout = ({ children, role, userName, userAvatar }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-cyan-50/30">
      <Sidebar role={role} userName={userName} userAvatar={userAvatar} />
      <BottomNavigation role={role} userName={userName} userAvatar={userAvatar} />
      <main className="md:ml-72 pb-28 md:pb-8 px-4 sm:px-6 py-6 md:py-8">
        <div className="page-enter">
          {children}
        </div>
      </main>
    </div>
  )
}
