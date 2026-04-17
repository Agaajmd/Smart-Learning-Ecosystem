"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { openShareChannel } from "@/lib/account-share"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/molecules/dropdown-menu"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { RouteLoading } from "@/components/templates/route-loading"
import type { Employee, Schedule, User } from "@/lib/data-model"
import {
  Search,
  UserPlus,
  Loader2,
  Star,
  BookOpen,
  Users,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  TrendingUp,
  Shield,
  Save,
  X,
  AlertTriangle,
  Filter,
  Mail,
  MessageCircle,
} from "lucide-react"

type StaffFilterType = "all" | "teacher" | "admin"
type StaffItem = (Employee | User) & { isActive?: boolean }

const isTeacher = (staff: StaffItem): staff is Employee => staff.role === "EMPLOYEE"
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/
const TEACHER_SUBJECT_OPTIONS = [
  "Matematika",
  "Teknologi Informasi",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Fisika",
  "Kimia",
  "Biologi",
  "Sejarah",
  "Ekonomi",
  "PKN",
  "Agama",
  "Olahraga",
  "Seni Budaya",
]

function normalizeWhatsappNumber(value: string) {
  return value.trim().replace(/[\s-]/g, "")
}

function encodeStaffId(id: string) {
  return encodeURIComponent(String(id || ""))
}

export default function SuperAdminStaff() {
  const router = useRouter()
  const [superAdmin, setSuperAdmin] = useState<User | null>(null)
  const [teachers, setTeachers] = useState<Employee[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<StaffFilterType>("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<StaffItem | null>(null)
  const [knownPasswords, setKnownPasswords] = useState<Record<string, string>>({})

  const [newStaff, setNewStaff] = useState({
    type: "teacher" as "teacher" | "admin",
    name: "",
    email: "",
    password: "",
    phone: "",
    subject: "",
  })

  const [editStaff, setEditStaff] = useState({
    id: "",
    type: "teacher" as "teacher" | "admin",
    name: "",
    email: "",
    password: "",
    phone: "",
    subject: "",
  })

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)

  const loadStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/staff", { cache: "no-store" })
      if (!res.ok) throw new Error("Gagal mengambil data staff")
      const data = await res.json()
      setSuperAdmin(data.superAdmin || null)
      setTeachers(Array.isArray(data.teachers) ? data.teachers : [])
      setAdmins(Array.isArray(data.admins) ? data.admins : [])
      setSchedules(Array.isArray(data.schedules) ? data.schedules : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengambil data staff"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const allStaff = useMemo<StaffItem[]>(() => [...teachers, ...admins], [teachers, admins])

  const filteredByTypeStaff = useMemo(() => {
    if (selectedFilter === "all") return allStaff
    if (selectedFilter === "teacher") return teachers
    return admins
  }, [selectedFilter, allStaff, teachers, admins])

  const filteredStaff = useMemo(() => {
    if (!debouncedSearchQuery) return filteredByTypeStaff
    const query = debouncedSearchQuery.toLowerCase()
    return filteredByTypeStaff.filter((staff) =>
      staff.name.toLowerCase().includes(query) ||
      (staff.phone || "").toLowerCase().includes(query) ||
      staff.email.toLowerCase().includes(query),
    )
  }, [filteredByTypeStaff, debouncedSearchQuery])

  const teacherScheduleStats = useMemo(() => {
    const aggregateByTeacher = new Map<string, { totalClasses: number; classIds: Set<string> }>()

    for (const schedule of schedules) {
      const existing = aggregateByTeacher.get(schedule.teacherId)
      if (existing) {
        existing.totalClasses += 1
        existing.classIds.add(schedule.classId)
      } else {
        aggregateByTeacher.set(schedule.teacherId, {
          totalClasses: 1,
          classIds: new Set([schedule.classId]),
        })
      }
    }

    const statsMap = new Map<string, { totalClasses: number; uniqueClasses: number }>()
    for (const teacher of teachers) {
      const aggregated = aggregateByTeacher.get(teacher.id)
      statsMap.set(teacher.id, {
        totalClasses: aggregated?.totalClasses ?? 0,
        uniqueClasses: aggregated?.classIds.size ?? 0,
      })
    }
    return statsMap
  }, [teachers, schedules])

  const avgRating = useMemo(
    () =>
      teachers.length > 0
        ? (teachers.reduce((acc, employee) => acc + employee.rating, 0) / teachers.length).toFixed(1)
        : "0",
    [teachers],
  )

  const totalClasses = useMemo(() => {
    return teachers.reduce((acc, teacher) => acc + teacher.classesCount, 0)
  }, [teachers])

  const handleAddStaff = useCallback(async () => {
    const normalizedPhone = normalizeWhatsappNumber(newStaff.phone)

    if (!newStaff.name || !newStaff.email || !newStaff.password || !normalizedPhone) {
      toast.error("Nama, email, password, dan nomor WhatsApp wajib diisi")
      return
    }

    if (!EMAIL_REGEX.test(newStaff.email.trim().toLowerCase())) {
      toast.error("Format email tidak valid")
      return
    }

    if (!WHATSAPP_REGEX.test(normalizedPhone)) {
      toast.error("Format nomor WhatsApp Indonesia tidak valid")
      return
    }

    if (newStaff.password.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }

    if (newStaff.type === "teacher" && !newStaff.subject.trim()) {
      toast.error("Mata pelajaran guru wajib diisi")
      return
    }

    setIsMutating(true)
    try {
      const payload = {
        ...newStaff,
        name: newStaff.name.trim(),
        email: newStaff.email.trim().toLowerCase(),
        phone: normalizedPhone,
        subject: newStaff.subject.trim(),
      }

      const res = await fetch("/api/super-admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data?.error || "Gagal menambahkan staff")

      if (isTeacher(data.staff)) {
        setTeachers((prev) => [...prev, data.staff])
      } else {
        setAdmins((prev) => [...prev, data.staff])
      }
      setKnownPasswords((prev) => ({ ...prev, [data.staff.id]: newStaff.password }))

      setShowAddModal(false)
      setNewStaff({ type: "teacher", name: "", email: "", password: "", phone: "", subject: "" })
      toast.success("Staff berhasil ditambahkan")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menambahkan staff"
      toast.error(message)
    } finally {
      setIsMutating(false)
    }
  }, [newStaff])

  const handleEditStaff = useCallback(async () => {
    const normalizedPhone = normalizeWhatsappNumber(editStaff.phone)

    if (!editStaff.id || !editStaff.name || !editStaff.email || !normalizedPhone) {
      toast.error("Nama, email, dan nomor WhatsApp wajib diisi")
      return
    }

    if (!EMAIL_REGEX.test(editStaff.email.trim().toLowerCase())) {
      toast.error("Format email tidak valid")
      return
    }

    if (!WHATSAPP_REGEX.test(normalizedPhone)) {
      toast.error("Format nomor WhatsApp Indonesia tidak valid")
      return
    }

    if (editStaff.type === "teacher" && !editStaff.subject.trim()) {
      toast.error("Mata pelajaran guru wajib diisi")
      return
    }

    if (editStaff.password && editStaff.password.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }

    setIsMutating(true)
    try {
      const payload = {
        ...editStaff,
        name: editStaff.name.trim(),
        email: editStaff.email.trim().toLowerCase(),
        phone: normalizedPhone,
        subject: editStaff.subject.trim(),
      }

      const res = await fetch(`/api/super-admin/staff/${encodeStaffId(editStaff.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal memperbarui staff")

      if (isTeacher(data.staff)) {
        setTeachers((prev) => {
          const without = prev.filter((item) => item.id !== data.staff.id)
          return [...without, data.staff].sort((a, b) => a.name.localeCompare(b.name))
        })
        setAdmins((prev) => prev.filter((item) => item.id !== data.staff.id))
      } else {
        setAdmins((prev) => {
          const without = prev.filter((item) => item.id !== data.staff.id)
          return [...without, data.staff].sort((a, b) => a.name.localeCompare(b.name))
        })
        setTeachers((prev) => prev.filter((item) => item.id !== data.staff.id))
      }

      if (editStaff.password) {
        setKnownPasswords((prev) => ({ ...prev, [data.staff.id]: editStaff.password }))
      }

      setShowEditModal(false)
      setEditStaff({ id: "", type: "teacher", name: "", email: "", password: "", phone: "", subject: "" })
      toast.success("Data staff berhasil diperbarui")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal memperbarui staff"
      toast.error(message)
    } finally {
      setIsMutating(false)
    }
  }, [editStaff])

  const handleDeleteStaff = useCallback(async () => {
    if (!staffToDelete) return
    setIsMutating(true)
    try {
      const res = await fetch(`/api/super-admin/staff/${encodeStaffId(staffToDelete.id)}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus staff")

      setTeachers((prev) => prev.filter((item) => item.id !== staffToDelete.id))
      setAdmins((prev) => prev.filter((item) => item.id !== staffToDelete.id))
      setShowDeleteModal(false)
      setStaffToDelete(null)
      toast.success("Staff berhasil dihapus")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghapus staff"
      toast.error(message)
    } finally {
      setIsMutating(false)
    }
  }, [staffToDelete])

  const openEditModal = useCallback((staff: StaffItem) => {
    setEditStaff({
      id: staff.id,
      type: isTeacher(staff) ? "teacher" : "admin",
      name: staff.name,
      email: staff.email,
      password: "",
      phone: staff.phone || "",
      subject: isTeacher(staff) ? staff.subject : "",
    })
    setShowEditModal(true)
  }, [])

  const sendAccount = useCallback((staff: StaffItem, channel: "whatsapp" | "email", password: string) => {
    try {
      openShareChannel(channel, {
        roleLabel: isTeacher(staff) ? "Guru" : "Admin",
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        password,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuka kanal pengiriman")
    }
  }, [])

  const handleShareAccount = useCallback((staff: StaffItem, channel: "whatsapp" | "email") => {
    const password = knownPasswords[staff.id] || ""
    sendAccount(staff, channel, password)
  }, [knownPasswords, sendAccount])

  if (isLoading) {
    return <RouteLoading />
  }

  if (!superAdmin) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout
      role="SUPER_ADMIN"
      userName={superAdmin.name}
      userAvatar={superAdmin.avatar || "/placeholder-user.jpg"}
    >
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Manajemen Staff</h1>
            <p className="text-sm sm:text-base text-slate-500">Kelola guru dan administrator</p>
          </div>
          <GlassButton className="w-full sm:w-auto justify-center" onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Tambah Staff
          </GlassButton>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <GlassCard className="text-center py-3 sm:py-4">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 text-blue-500" />
            <p className="text-lg sm:text-2xl font-bold text-slate-800">{teachers.length}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Guru</p>
          </GlassCard>
          <GlassCard className="text-center py-3 sm:py-4">
            <Star className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 text-yellow-500" />
            <p className="text-lg sm:text-2xl font-bold text-slate-800">{avgRating}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Rata-rata Rating</p>
          </GlassCard>
          <GlassCard className="text-center py-3 sm:py-4">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 text-green-500" />
            <p className="text-lg sm:text-2xl font-bold text-slate-800">{totalClasses}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Total Kelas</p>
          </GlassCard>
          <GlassCard className="text-center py-3 sm:py-4">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 mx-auto mb-1.5 sm:mb-2 text-purple-500" />
            <p className="text-lg sm:text-2xl font-bold text-slate-800">{teachers.length + admins.length}</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Total Staff</p>
          </GlassCard>
        </div>

        <GlassCard>
          <div className="relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            <GlassInput
              placeholder="Cari staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 sm:pl-12 text-sm sm:text-base"
            />
          </div>
        </GlassCard>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 perf-scroll-container">
          <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs sm:text-sm whitespace-nowrap">
            <Filter className="w-4 h-4" />
            Filter Staff
          </div>
          {[
            { key: "all" as const, label: "Semua" },
            { key: "teacher" as const, label: "Guru" },
            { key: "admin" as const, label: "Admin" },
          ].map((filterItem) => (
            <button
              key={filterItem.key}
              onClick={() => setSelectedFilter(filterItem.key)}
              className={`px-3 py-2 rounded-xl text-xs sm:text-sm whitespace-nowrap transition-colors ${
                selectedFilter === filterItem.key
                  ? "bg-slate-800 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {filterItem.label}
            </button>
          ))}
        </div>

        <GlassCard>
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4">Semua Staff ({filteredStaff.length})</h2>

          <div className="space-y-2 sm:space-y-3">
            {filteredStaff.map((staff) => {
              const teacher = isTeacher(staff)
              const stats = teacher ? teacherScheduleStats.get(staff.id) : null
              const isStaffActive = "isActive" in staff ? staff.isActive !== false : true

              return (
                <div
                  key={staff.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors gap-3 perf-list-item ${teacher ? "cursor-pointer" : ""}`}
                  onClick={() => {
                    if (teacher) router.push(`/super-admin/staff/${encodeStaffId(staff.id)}`)
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={staff.avatar} alt={staff.name} loading="lazy" decoding="async" className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-slate-200 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{staff.name}</p>
                      <p className="text-xs sm:text-sm text-slate-500 truncate">WA: {staff.phone || "-"}</p>
                      {teacher && (
                        <div className="flex items-center gap-2 sm:gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
                            <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {staff.subject}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-yellow-600">
                            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {staff.rating}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                    {teacher && stats && (
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="text-center">
                          <p className="text-sm sm:text-lg font-bold text-slate-800">{stats.totalClasses}</p>
                          <p className="text-[9px] sm:text-xs text-slate-500">Sesi</p>
                        </div>
                        <div className="text-center hidden xs:block">
                          <p className="text-sm sm:text-lg font-bold text-slate-800">{stats.uniqueClasses}</p>
                          <p className="text-[9px] sm:text-xs text-slate-500">Kelas</p>
                        </div>
                      </div>
                    )}

                    <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs border shrink-0 ${teacher ? "bg-green-100 text-green-700 border-green-200" : "bg-orange-100 text-orange-700 border-orange-200"}`}>
                      {teacher ? "Guru" : "Admin"}
                    </span>

                    <span className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs border shrink-0 ${isStaffActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-300"}`}>
                      {isStaffActive ? "Aktif" : "Nonaktif"}
                    </span>

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => {
                          e.stopPropagation()
                        }}
                      >
                        <button className="p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                          <MoreVertical className="w-4 h-4 text-slate-600" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 rounded-xl border border-slate-200 bg-white p-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {teacher && (
                          <DropdownMenuItem
                            onClick={() => router.push(`/super-admin/staff/${encodeStaffId(staff.id)}`)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Lihat Detail
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => openEditModal(staff)}
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700"
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleShareAccount(staff, "whatsapp")}
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700"
                        >
                          <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Kirim Akun via WhatsApp
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleShareAccount(staff, "email")}
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700"
                        >
                          <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Kirim Akun via Email
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setStaffToDelete(staff)
                            setShowDeleteModal(true)
                          }}
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        <GlassModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Staff Baru">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipe Staff</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setNewStaff({ ...newStaff, type: "teacher" })}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                    newStaff.type === "teacher" ? "bg-emerald-100 border-emerald-500 text-emerald-700" : "bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Users className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Guru</span>
                </button>
                <button
                  onClick={() => setNewStaff({ ...newStaff, type: "admin" })}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                    newStaff.type === "admin" ? "bg-orange-100 border-orange-500 text-orange-700" : "bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Shield className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Admin</span>
                </button>
              </div>
            </div>

            <GlassInput
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              autoComplete="name"
              value={newStaff.name}
              onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
            />
            <GlassInput
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="Masukkan email"
              value={newStaff.email}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
            />
            <GlassInput
              label="Nomor WhatsApp"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="Contoh: 081234567890 atau +6281234567890"
              value={newStaff.phone}
              onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
            />
            <GlassInput
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="Minimal 6 karakter"
              value={newStaff.password}
              onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
            />

            {newStaff.type === "teacher" && (
              <>
                <GlassInput list="teacher-subject-options" placeholder="Pilih/ketik jenis guru (contoh: Matematika, Teknologi Informasi)" value={newStaff.subject} onChange={(e) => setNewStaff({ ...newStaff, subject: e.target.value })} />
                <datalist id="teacher-subject-options">
                  {TEACHER_SUBJECT_OPTIONS.map((subjectItem) => (
                    <option key={subjectItem} value={subjectItem} />
                  ))}
                </datalist>
              </>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowAddModal(false)} disabled={isMutating}>
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton className="flex-1 justify-center" onClick={handleAddStaff} disabled={isMutating}>
                {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        <GlassModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Staff">
          <div className="space-y-5">
            <GlassInput
              label="Nama Lengkap"
              placeholder="Masukkan nama lengkap"
              autoComplete="name"
              value={editStaff.name}
              onChange={(e) => setEditStaff({ ...editStaff, name: e.target.value })}
            />
            <GlassInput
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="Masukkan email"
              value={editStaff.email}
              onChange={(e) => setEditStaff({ ...editStaff, email: e.target.value })}
            />
            <GlassInput
              label="Nomor WhatsApp"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="Contoh: 081234567890 atau +6281234567890"
              value={editStaff.phone}
              onChange={(e) => setEditStaff({ ...editStaff, phone: e.target.value })}
            />
            <GlassInput
              label="Password"
              type="password"
              autoComplete="new-password"
              placeholder="Kosongkan jika tidak diubah"
              value={editStaff.password}
              onChange={(e) => setEditStaff({ ...editStaff, password: e.target.value })}
            />

            {editStaff.type === "teacher" && (
              <>
                <GlassInput list="teacher-subject-options" placeholder="Pilih/ketik jenis guru (contoh: Matematika, Teknologi Informasi)" value={editStaff.subject} onChange={(e) => setEditStaff({ ...editStaff, subject: e.target.value })} />
                <datalist id="teacher-subject-options">
                  {TEACHER_SUBJECT_OPTIONS.map((subjectItem) => (
                    <option key={subjectItem} value={subjectItem} />
                  ))}
                </datalist>
              </>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowEditModal(false)} disabled={isMutating}>
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton className="flex-1 justify-center" onClick={handleEditStaff} disabled={isMutating}>
                {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Konfirmasi Hapus">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
              <AlertTriangle className="w-8 h-8 text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-white">Hapus Staff?</p>
                <p className="text-sm text-white/70">Aksi ini akan menonaktifkan akun staff dari sistem login.</p>
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-white/10">
              <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowDeleteModal(false)} disabled={isMutating}>
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton variant="danger" className="flex-1 justify-center" onClick={handleDeleteStaff} disabled={isMutating}>
                {isMutating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Hapus
              </GlassButton>
            </div>
          </div>
        </GlassModal>

      </div>
    </DashboardLayout>
  )
}
