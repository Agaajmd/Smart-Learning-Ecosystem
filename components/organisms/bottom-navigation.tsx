"use client"

import { useState, useEffect, useCallback, useRef, useMemo, type ComponentType } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { 
  Home, 
  LayoutGrid, 
  User, 
  BarChart3, 
  Users, 
  BookOpen, 
  LogOut, 
  Menu, 
  FileText, 
  AlertTriangle, 
  ChevronRight, 
  Wallet, 
  Award, 
  Package, 
  ShoppingBag, 
  TrendingUp, 
  Utensils,
  Calendar,
  QrCode,
  Store,
  SlidersHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { toast } from "sonner"
import type { UserRole } from "@/lib/data-model"
import { BottomSheet, BottomSheetHandle } from "@/components/organisms/bottom-sheet"
import {
  getPageFeatureKeyForPath,
  isPageFeatureEnabled,
  type PageFeatureStateMap,
} from "@/lib/page-features"

interface BottomNavigationProps {
  role: UserRole
  userName?: string
  userAvatar?: string
  featureState?: PageFeatureStateMap
}

interface NavItem {
  href: string
  icon: ComponentType<{ className?: string }>
  label: string
  activeMatch?: string
  exact?: boolean
  disabled?: boolean
  disabledReason?: string
}

export const BottomNavigation = ({ role, userName, userAvatar, featureState }: BottomNavigationProps) => {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { logout } = useAuth()
  const logoutTimerRef = useRef<number | null>(null)
  const resolvedAvatar = (() => {
    const next = String(userAvatar || "").trim()
    if (!next || next === "null" || next === "undefined") {
      return "/placeholder-user.jpg"
    }
    return next
  })()

  // Main bottom nav items (limited to 4)
  const getNavItems = (): NavItem[] => {
    switch (role) {
      case "STUDENT":
        return [
          { href: "/student", icon: Home, label: "Home", exact: true },
          { href: "/student/class", icon: LayoutGrid, label: "Kelas" },
          { href: "/student/assignments", icon: FileText, label: "Tugas" },
          { href: "/canteen", icon: Utensils, label: "Kantin" },
        ]
      case "EMPLOYEE":
        return [
          { href: "/employee", icon: Home, label: "Home", exact: true },
          { href: "/employee/assignments", icon: FileText, label: "Tugas" },
          { href: "/employee/class/c1", icon: LayoutGrid, label: "Kelas", activeMatch: "/employee/class" },
          { href: "/employee/grades", icon: Award, label: "Poin" },
        ]
      case "ADMIN":
        return [
          { href: "/admin", icon: Home, label: "Home", exact: true },
          { href: "/admin/class", icon: LayoutGrid, label: "Kelas" },
          { href: "/admin/scan", icon: QrCode, label: "Scan" },
          { href: "/admin/users", icon: Users, label: "Users" },
        ]
      case "SUPER_ADMIN":
        return [
          { href: "/super-admin", icon: Home, label: "Home", exact: true },
          { href: "/super-admin/finance", icon: BarChart3, label: "Keuangan" },
          { href: "/super-admin/staff", icon: Users, label: "Staff", activeMatch: "/super-admin/staff" },
          { href: "/super-admin/features", icon: SlidersHorizontal, label: "Fitur" },
          { href: "/canteen", icon: Utensils, label: "Kantin" },
        ]
      case "PARENT":
        return [
          { href: "/parent", icon: Home, label: "Home", exact: true },
          { href: "/parent/class", icon: LayoutGrid, label: "Kelas" },
          { href: "/parent/finance", icon: Wallet, label: "Keuangan" },
          { href: "/canteen", icon: Utensils, label: "Kantin" },
        ]
      case "CANTEEN_OWNER":
        return [
          { href: "/canteen-owner", icon: Home, label: "Home", exact: true },
          { href: "/canteen-owner/products", icon: Package, label: "Produk" },
          { href: "/canteen-owner/orders", icon: ShoppingBag, label: "Order" },
          { href: "/canteen-owner/finance", icon: TrendingUp, label: "Keuangan" },
        ]
      default:
        return []
    }
  }

  // All menu items in drawer (same as desktop sidebar)
  const getAllMenuItems = (): NavItem[] => {
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
          { href: "/employee/class/c1", icon: LayoutGrid, label: "Kelas", activeMatch: "/employee/class" },
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
          { href: "/super-admin/staff", icon: Users, label: "Manajemen Staff", activeMatch: "/super-admin/staff" },
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

  const applyFeatureStateToItems = useCallback(
    (items: NavItem[]) =>
      items.map((item) => {
        const featureKey = getPageFeatureKeyForPath(item.href, role)
        if (!featureKey) return item
        if (isPageFeatureEnabled(featureKey, featureState)) return item

        return {
          ...item,
          disabled: true,
          disabledReason: "Fitur ini dinonaktifkan oleh Kepala Sekolah",
        }
      }),
    [featureState, role],
  )

  const navItems = useMemo(() => applyFeatureStateToItems(getNavItems()), [applyFeatureStateToItems, role])
  const allMenuItems = useMemo(() => applyFeatureStateToItems(getAllMenuItems()), [applyFeatureStateToItems, role])

  const normalizePath = useCallback((value: string) => {
    if (!value) return "/"
    const trimmed = value.endsWith("/") && value !== "/" ? value.slice(0, -1) : value
    return trimmed || "/"
  }, [])

  const isRouteActive = useCallback(
    (item: NavItem) => {
      const current = normalizePath(pathname)
      if (item.activeMatch) {
        const match = normalizePath(item.activeMatch)
        return current === match || current.startsWith(`${match}/`)
      }

      const target = normalizePath(item.href)
      if (item.exact) {
        return current === target
      }

      return current === target || current.startsWith(`${target}/`)
    },
    [normalizePath, pathname],
  )

  useEffect(() => {
    return () => {
      if (logoutTimerRef.current !== null) {
        window.clearTimeout(logoutTimerRef.current)
      }
    }
  }, [])

  const handleLogout = useCallback(() => {
    setIsOpen(false)
    if (logoutTimerRef.current !== null) {
      window.clearTimeout(logoutTimerRef.current)
    }
    logoutTimerRef.current = window.setTimeout(() => {
      logout()
      toast.success("Logout berhasil!", {
        description: "Sampai jumpa lagi 👋",
      })
      logoutTimerRef.current = null
    }, 300)
  }, [logout])

  const handleProfileClick = useCallback(() => {
    router.push(`/${role.toLowerCase().replace('_', '-')}/profile`)
    setIsOpen(false)
  }, [role, router])

  const roleLabels: Record<UserRole, string> = {
    STUDENT: "Siswa",
    EMPLOYEE: "Guru",
    ADMIN: "Admin",
    SUPER_ADMIN: "Kepala Sekolah",
    PARENT: "Orang Tua",
    CANTEEN_OWNER: "Pemilik Kantin",
  }

  const roleColors: Record<UserRole, string> = {
    STUDENT: "from-blue-500 to-cyan-500",
    EMPLOYEE: "from-emerald-500 to-teal-500",
    ADMIN: "from-orange-500 to-amber-500",
    SUPER_ADMIN: "from-purple-500 to-indigo-500",
    PARENT: "from-pink-500 to-rose-500",
    CANTEEN_OWNER: "from-orange-500 to-red-500",
  }

  return (
    <>
      {/* Bottom Sheet Menu - Always from bottom */}
      <BottomSheet open={isOpen} onOpenChange={setIsOpen}>
        <BottomSheetHandle />
        
        <div className="px-4 pb-6 overflow-y-auto max-h-[80vh]">
          {/* User Profile Card */}
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-4 w-full p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-150 transition-all duration-200 active:scale-[0.98] mb-4"
          >
            <div className="relative">
              <img
                src={resolvedAvatar}
                alt={userName || "User"}
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white shadow-lg"
              />
              <div className={cn(
                "absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center ring-2 ring-white",
                roleColors[role]
              )}>
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-slate-900 text-lg leading-tight">{userName || "User"}</p>
              <p className="text-sm text-slate-500 mt-0.5">{roleLabels[role]}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* Navigation Menu Items */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {allMenuItems.map((item) => {
              const Icon = item.icon
              const isActive = isRouteActive(item)
              if (item.disabled) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => toast.info(item.disabledReason || "Fitur sedang dinonaktifkan")}
                    className="relative flex flex-col items-center gap-2 p-3 rounded-2xl bg-slate-100 text-slate-400 border border-dashed border-slate-200"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-200 text-slate-500">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                    <span className="absolute top-1 right-1 text-[9px] font-semibold px-1 py-0.5 rounded bg-slate-300 text-slate-600">OFF</span>
                  </button>
                )
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 active:scale-[0.95]",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    isActive 
                      ? "bg-blue-100 text-blue-600" 
                      : "bg-white text-slate-500 shadow-sm"
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 my-4" />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-3 w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border border-red-100 text-red-600 font-semibold transition-all duration-200 active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </BottomSheet>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-4 left-4 right-4 md:hidden z-40">
        <div className="bg-white/95 backdrop-blur-xl shadow-lg shadow-slate-200/60 border border-slate-100 rounded-2xl px-2 py-2">
          <div className="flex items-center justify-around">
            {navItems.slice(0, 4).map((item) => {
              const isActive = isRouteActive(item)
              const Icon = item.icon

              if (item.disabled) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => toast.info(item.disabledReason || "Fitur sedang dinonaktifkan")}
                    className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-400 bg-slate-50 transition-all duration-300"
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                )
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-300",
                    isActive
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 active:scale-95",
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}

            <button
              onClick={() => setIsOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-all duration-300 active:scale-95"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[10px] font-medium">Menu</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
