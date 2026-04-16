"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassModal } from "@/components/molecules/glass-modal"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import type { User, Student, Employee } from "@/lib/data-model"
import {
  Search,
  Filter,
  GraduationCap,
  Briefcase,
  Shield,
  Crown,
  Eye,
  Users,
  Store,
  Trash2,
  AlertTriangle,
} from "lucide-react"

type UserType = "all" | "students" | "employees" | "parents" | "admins" | "canteens"
type AppUser = (User | Student | Employee) & { isActive?: boolean }


export default function AdminUsersPage() {
  const [admin, setAdmin] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<AppUser[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<UserType>("all")
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState<AppUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)

  const resolveAvatar = (value: unknown) => {
    const next = String(value || "").trim()
    return next || "/placeholder-user.jpg"
  }

  useEffect(() => {
    const load = async () => {
      try {
        const [adminRes, usersRes] = await Promise.all([
          fetch("/api/dashboard/admin", { cache: "no-store" }),
          fetch("/api/admin/users", { cache: "no-store" }),
        ])

        if (adminRes.ok) {
          const data = await adminRes.json()
          setAdmin(data.admin || null)
        }

        if (usersRes.ok) {
          const data = await usersRes.json()
          setAllUsers(Array.isArray(data.users) ? data.users : [])
        }
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const totalUsersCount = useMemo(
    () => allUsers.length,
    [allUsers],
  )

  const filters: { id: UserType; label: string; icon: typeof GraduationCap; count: number }[] = useMemo(
    () => [
      {
        id: "all",
        label: "All",
        icon: Filter,
        count: totalUsersCount,
      },
      {
        id: "students",
        label: "Students",
        icon: GraduationCap,
        count: allUsers.filter((u) => u.role === "STUDENT").length,
      },
      {
        id: "employees",
        label: "Teachers",
        icon: Briefcase,
        count: allUsers.filter((u) => u.role === "EMPLOYEE").length,
      },
      {
        id: "parents",
        label: "Parents",
        icon: Users,
        count: allUsers.filter((u) => u.role === "PARENT").length,
      },
      {
        id: "admins",
        label: "Staff",
        icon: Shield,
        count: allUsers.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN").length,
      },
      {
        id: "canteens",
        label: "Canteen",
        icon: Store,
        count: allUsers.filter((u) => u.role === "CANTEEN_OWNER").length,
      },
    ],
    [allUsers, totalUsersCount],
  )

  const users = useMemo(() => {
    let users: AppUser[] = []

    switch (selectedFilter) {
      case "students":
        users = allUsers.filter((u) => u.role === "STUDENT")
        break
      case "employees":
        users = allUsers.filter((u) => u.role === "EMPLOYEE")
        break
      case "parents":
        users = allUsers.filter((u) => u.role === "PARENT")
        break
      case "admins":
        users = allUsers.filter((u) => u.role === "ADMIN" || u.role === "SUPER_ADMIN")
        break
      case "canteens":
        users = allUsers.filter((u) => u.role === "CANTEEN_OWNER")
        break
      default:
        users = allUsers
    }

    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      users = users.filter(
        (u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
      )
    }

    return users
  }, [selectedFilter, debouncedSearchQuery, allUsers])

  const handleDeleteUser = async () => {
    if (!userToDelete || userToDelete.role === "SUPER_ADMIN") return
    setIsDeleting(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userToDelete.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus akun")

      setAllUsers((prev) => prev.filter((item) => item.id !== userToDelete.id))
      setShowDeleteModal(false)
      setShowUserModal(false)
      setUserToDelete(null)
    } finally {
      setIsDeleting(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "STUDENT":
        return <GraduationCap className="w-3 h-3 sm:w-4 sm:h-4" />
      case "EMPLOYEE":
        return <Briefcase className="w-3 h-3 sm:w-4 sm:h-4" />
      case "ADMIN":
        return <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
      case "SUPER_ADMIN":
        return <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
      case "PARENT":
        return <Users className="w-3 h-3 sm:w-4 sm:h-4" />
      case "CANTEEN_OWNER":
        return <Store className="w-3 h-3 sm:w-4 sm:h-4" />
      default:
        return null
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "STUDENT":
        return "bg-blue-100 text-blue-700 border-blue-200"
      case "EMPLOYEE":
        return "bg-green-100 text-green-700 border-green-200"
      case "ADMIN":
        return "bg-orange-100 text-orange-700 border-orange-200"
      case "SUPER_ADMIN":
        return "bg-purple-100 text-purple-700 border-purple-200"
      case "PARENT":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "CANTEEN_OWNER":
        return "bg-emerald-100 text-emerald-700 border-emerald-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  if (isLoading) {
    return <RouteLoading />
  }

  const adminDisplay = admin || {
    name: "Admin",
    avatar: "/placeholder-user.jpg",
  }

  return (
    <DashboardLayout role="ADMIN" userName={adminDisplay.name} userAvatar={adminDisplay.avatar || "/placeholder-user.jpg"}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Daftar Pengguna</h1>
            <p className="text-sm sm:text-base text-slate-500">Lihat semua pengguna sistem</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-slate-700 font-medium">Total: {totalUsersCount}</span>
          </div>
        </div>

        {/* Search */}
        <GlassCard>
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            <GlassInput
              placeholder="Cari pengguna..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-12 text-sm sm:text-base"
            />
          </div>
        </GlassCard>

        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          {filters.map((filter) => {
            const Icon = filter.icon
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                  selectedFilter === filter.id
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden xs:inline">{filter.label}</span>
                <span className={`ml-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs ${selectedFilter === filter.id ? "bg-white/20" : "bg-slate-100"}`}>
                  {filter.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Users List */}
        <GlassCard>
          <div className="space-y-2 sm:space-y-3">
            {users.length === 0 ? (
              <EmptySkeleton rows={4} className="py-4" />
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={resolveAvatar(user.avatar)}
                      alt={user.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{user.name}</p>
                      <p className="text-xs sm:text-sm text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                    <span
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs border ${getRoleColor(user.role)}`}
                    >
                      {getRoleIcon(user.role)}
                      <span className="hidden xs:inline">{user.role.replace("_", " ")}</span>
                    </span>

                    <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs border ${user.isActive === false ? "bg-slate-100 text-slate-600 border-slate-300" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>
                      {user.isActive === false ? "Nonaktif" : "Aktif"}
                    </span>

                    <button
                      onClick={() => {
                        setSelectedUser(user)
                        setShowUserModal(true)
                      }}
                      className="p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                    </button>

                    {user.role !== "SUPER_ADMIN" && (
                      <button
                        onClick={() => {
                          setUserToDelete(user)
                          setShowDeleteModal(true)
                        }}
                        className="p-1.5 sm:p-2 rounded-xl bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* User Detail Modal */}
        <GlassModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="Detail Pengguna">
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src={resolveAvatar(selectedUser.avatar)}
                  alt={selectedUser.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-slate-200"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{selectedUser.name}</h3>
                  <p className="text-sm text-slate-500 truncate">{selectedUser.email}</p>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs border mt-2 ${getRoleColor(selectedUser.role)}`}
                  >
                    {getRoleIcon(selectedUser.role)}
                    {selectedUser.role.replace("_", " ")}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs border mt-2 ml-2 ${selectedUser.isActive === false ? "bg-slate-100 text-slate-600 border-slate-300" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}>
                    {selectedUser.isActive === false ? "Nonaktif" : "Aktif"}
                  </span>
                </div>
              </div>

              {selectedUser.role === "STUDENT" && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-500">Total Poin</p>
                    <p
                      className={`font-semibold text-sm sm:text-base ${
                        Number((selectedUser as any).totalPoints ?? (selectedUser as any).points ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {Number((selectedUser as any).totalPoints ?? (selectedUser as any).points ?? 0) >= 0 ? "+" : ""}
                      {Number((selectedUser as any).totalPoints ?? (selectedUser as any).points ?? 0)}
                    </p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-500">Poin Positif</p>
                    <p className="font-semibold text-emerald-600 text-sm sm:text-base">+{Number((selectedUser as any).positivePoints ?? 0)}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-500">Pembayaran</p>
                    <p
                      className={`font-semibold text-sm sm:text-base ${(selectedUser as any).paymentStatus === "PAID" ? "text-green-600" : "text-red-500"}`}
                    >
                      {(selectedUser as any).paymentStatus || "UNPAID"}
                    </p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-500">Poin Negatif</p>
                    <p className="font-semibold text-rose-600 text-sm sm:text-base">-{Number((selectedUser as any).negativePoints ?? 0)}</p>
                  </div>
                </div>
              )}

              {"subject" in selectedUser && (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-500">Mata Pelajaran</p>
                    <p className="font-semibold text-slate-800 text-sm sm:text-base">{selectedUser.subject}</p>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] sm:text-xs text-slate-500">Rating</p>
                    <p className="font-semibold text-slate-800 text-sm sm:text-base">{selectedUser.rating}</p>
                  </div>
                </div>
              )}

              {selectedUser.role !== "SUPER_ADMIN" && (
                <button
                  onClick={() => {
                    setUserToDelete(selectedUser)
                    setShowDeleteModal(true)
                  }}
                  className="w-full mt-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
                >
                  Hapus Akun
                </button>
              )}
            </div>
          )}
        </GlassModal>

        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Hapus Akun">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Yakin ingin menghapus akun ini dari backend?
            </p>
            <button
              onClick={handleDeleteUser}
              disabled={isDeleting || !userToDelete || userToDelete.role === "SUPER_ADMIN"}
              className="w-full px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60"
            >
              {isDeleting ? "Menghapus..." : "Ya, Hapus Akun"}
            </button>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
