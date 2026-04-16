"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { toast } from "sonner"
import {
  Home,
  Calendar,
  LayoutGrid,
  QrCode,
  BarChart3,
  Users,
  BookOpen,
  LogOut,
  FileText,
  AlertTriangle,
  ChevronDown,
  User,
  Settings,
  Store,
  Wallet,
  Package,
  ShoppingBag,
  TrendingUp,
  Award,
  Utensils,
  SlidersHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import type { UserRole } from "@/lib/data-model"
import {
  getPageFeatureKeyForPath,
  isPageFeatureEnabled,
  type PageFeatureStateMap,
} from "@/lib/page-features"

interface SidebarProps {
  role: UserRole
  userName: string
  userAvatar: string
  featureState?: PageFeatureStateMap
}

type SidebarNavItem = {
  href: string
  icon: typeof Home
  label: string
  disabled?: boolean
  disabledReason?: string
}

export const Sidebar = ({ role, userName, userAvatar, featureState }: SidebarProps) => {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const profilePath = `/${role.toLowerCase().replace("_", "-")}/profile`
  const resolvedAvatar = (() => {
    const next = String(userAvatar || "").trim()
    if (!next || next === "null" || next === "undefined") {
      return "/placeholder-user.jpg"
    }
    return next
  })()

  const getNavItems = (): SidebarNavItem[] => {
    switch (role) {
      case "STUDENT":
        return [
          { href: "/student", icon: Home, label: "Dashboard" },
          { href: "/student/class", icon: LayoutGrid, label: "Kelas" },
          { href: "/student/assignments", icon: FileText, label: "Tugas" },
          { href: "/student/report", icon: AlertTriangle, label: "Laporan Aset" },
          { href: "/student/schedule", icon: Calendar, label: "Jadwal" },
          { href: "/canteen", icon: Utensils, label: "Kantin" },
        ]
      case "EMPLOYEE":
        return [
          { href: "/employee", icon: Home, label: "Dashboard" },
          { href: "/employee/assignments", icon: FileText, label: "Kelola Tugas" },
          { href: "/employee/schedule", icon: Calendar, label: "Jadwal" },
          { href: "/employee/class/c1", icon: LayoutGrid, label: "Kelas" },
          { href: "/employee/grades", icon: Award, label: "Poin Keaktifan" },
          { href: "/employee/rapor", icon: BookOpen, label: "AI Rapor" },
          { href: "/canteen", icon: Utensils, label: "Kantin" },
        ]
      case "ADMIN":
        return [
          { href: "/admin", icon: Home, label: "Dashboard" },
          { href: "/admin/class", icon: LayoutGrid, label: "Manajemen Kelas" },
          { href: "/admin/scan", icon: QrCode, label: "Scan & Laporan" },
          { href: "/admin/wallet-topups", icon: Wallet, label: "Konfirmasi Topup" },
          { href: "/admin/users", icon: Users, label: "Data Pengguna" },
          { href: "/admin/canteen", icon: Store, label: "Kelola Kantin" },
          { href: "/admin/schedule", icon: Calendar, label: "Jadwal" },
          { href: "/canteen", icon: Utensils, label: "Kantin" },
        ]
      case "SUPER_ADMIN":
        return [
          { href: "/super-admin", icon: Home, label: "Dashboard" },
          { href: "/super-admin/finance", icon: BarChart3, label: "Keuangan" },
          { href: "/super-admin/staff", icon: Users, label: "Manajemen Staff" },
          { href: "/super-admin/features", icon: SlidersHorizontal, label: "Manajemen Fitur" },
          { href: "/canteen", icon: Utensils, label: "Kantin" },
        ]
      case "PARENT":
        return [
          { href: "/parent", icon: Home, label: "Dashboard" },
          { href: "/parent/class", icon: LayoutGrid, label: "Kelas Anak" },
          { href: "/parent/finance", icon: Wallet, label: "Keuangan" },
          { href: "/parent/attendance", icon: Calendar, label: "Kehadiran" },
          { href: "/parent/points", icon: Award, label: "Poin Aktivitas" },
          { href: "/parent/grades", icon: BookOpen, label: "Nilai" },
          { href: "/parent/schedule", icon: Calendar, label: "Jadwal Anak" },
          { href: "/canteen", icon: Utensils, label: "Kantin" },
        ]
      case "CANTEEN_OWNER":
        return [
          { href: "/canteen-owner", icon: Home, label: "Dashboard" },
          { href: "/canteen-owner/products", icon: Package, label: "Produk" },
          { href: "/canteen-owner/orders", icon: ShoppingBag, label: "Order" },
          { href: "/canteen-owner/finance", icon: TrendingUp, label: "Keuangan" },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems().map((item) => {
    const featureKey = getPageFeatureKeyForPath(item.href, role)
    if (!featureKey) return item
    if (isPageFeatureEnabled(featureKey, featureState)) return item

    return {
      ...item,
      disabled: true,
      disabledReason: "Fitur ini dinonaktifkan oleh Kepala Sekolah",
    }
  })

  const roleLabels: Record<UserRole, string> = {
    STUDENT: "Student",
    EMPLOYEE: "Teacher",
    ADMIN: "Admin",
    SUPER_ADMIN: "Principal",
    PARENT: "Parent",
    CANTEEN_OWNER: "Canteen Owner",
  }

  return (
    <aside className="hidden md:flex fixed left-4 top-4 bottom-4 w-64 z-40">
      <div className="w-full bg-white border border-slate-200 shadow-lg shadow-slate-200/50 rounded-2xl p-4 flex flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 mb-4">
          <Image
            src="/AegixLogo.png"
            alt="Aegix SLE Logo"
            width={44}
            height={44}
            priority
            className="rounded-xl shadow-lg shadow-blue-500/20 transition-transform duration-300 hover:scale-105"
          />
          <div>
            <h1 className="font-bold text-slate-800">Aegix SLE</h1>
            <p className="text-xs text-slate-500">Smart Learning Ecosystem</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            if (item.disabled) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => toast.info(item.disabledReason || "Fitur sedang dinonaktifkan")}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 bg-slate-50/80 border border-dashed border-slate-200 cursor-not-allowed"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">
                    OFF
                  </span>
                </button>
              )
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
                  isActive
                    ? "bg-blue-50 text-blue-600 shadow-sm"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-50 hover:translate-x-1 active:scale-[0.98]",
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110")} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="mt-auto pt-4 border-t border-slate-200 relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-xl hover:bg-slate-50 transition-colors"
          >
            <img
              src={resolvedAvatar}
              alt={userName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-blue-100"
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="font-medium text-slate-800 text-sm truncate">{userName}</p>
              <p className="text-xs text-slate-500">{roleLabels[role]}</p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", showUserMenu && "rotate-180")} />
          </button>
          
          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
              <Link
                href={profilePath}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <Settings className="w-4 h-4 text-slate-600" />
                <span className="text-sm text-slate-700 font-medium">Pengaturan / Profil</span>
              </Link>
              <button
                onClick={() => {
                  setShowUserMenu(false)
                  logout()
                  toast.success("Logout berhasil!", {
                    description: "Sampai jumpa lagi 👋",
                  })
                }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors w-full text-left border-t border-slate-100"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-600 font-medium">Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
