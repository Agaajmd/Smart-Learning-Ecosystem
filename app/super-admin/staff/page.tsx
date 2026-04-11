"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { getAllAuthUsers, removeAuthUserCredential, upsertAuthUserCredential } from "@/lib/auth-user-storage"
import { mockSuperAdmins, mockEmployees, mockAdmins, mockSchedule, Employee, User } from "@/lib/mock-data"
import {
  Search,
  UserPlus,
  Star,
  BookOpen,
  Users,
  Calendar,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Award,
  TrendingUp,
  Clock,
  Shield,
  Save,
  X,
  AlertTriangle,
  Filter,
} from "lucide-react"

type StaffFilterType = "all" | "teacher" | "admin"

export default function SuperAdminStaff() {
  const superAdmin = mockSuperAdmins[0]
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedFilter, setSelectedFilter] = useState<StaffFilterType>("all")
  const [selectedEmployee, setSelectedEmployee] = useState<(typeof mockEmployees)[0] | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<(typeof mockEmployees)[0] | (typeof mockAdmins)[0] | null>(null)
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)
  
  // Staff list state (for CRUD operations)
  const [teachers, setTeachers] = useState([...mockEmployees])
  const [admins, setAdmins] = useState([...mockAdmins])
  
  // New staff form
  const [newStaff, setNewStaff] = useState({
    type: "teacher" as "teacher" | "admin",
    name: "",
    email: "",
    password: "",
    subject: "",
  })
  
  // Edit staff form
  const [editStaff, setEditStaff] = useState({
    id: "",
    type: "teacher" as "teacher" | "admin",
    name: "",
    email: "",
    password: "",
    subject: "",
  })

  const allStaff = useMemo(() => [...teachers, ...admins], [teachers, admins])

  const filteredByTypeStaff = useMemo(() => {
    if (selectedFilter === "all") return allStaff
    if (selectedFilter === "teacher") return teachers
    return admins
  }, [selectedFilter, allStaff, teachers, admins])

  const filteredStaff = useMemo(() => {
    if (!debouncedSearchQuery) return filteredByTypeStaff

    const query = debouncedSearchQuery.toLowerCase()
    return filteredByTypeStaff.filter((staff) =>
      staff.name.toLowerCase().includes(query) || staff.email.toLowerCase().includes(query),
    )
  }, [filteredByTypeStaff, debouncedSearchQuery])

  const teacherScheduleStats = useMemo(() => {
    const classIdsByTeacher = new Map<string, Set<string>>()
    const totalByTeacher = new Map<string, number>()

    for (const schedule of mockSchedule) {
      totalByTeacher.set(schedule.teacherId, (totalByTeacher.get(schedule.teacherId) ?? 0) + 1)

      const classIds = classIdsByTeacher.get(schedule.teacherId)
      if (classIds) {
        classIds.add(schedule.classId)
      } else {
        classIdsByTeacher.set(schedule.teacherId, new Set([schedule.classId]))
      }
    }

    const statsMap = new Map<string, { totalClasses: number; uniqueClasses: number }>()
    for (const [teacherId, totalClasses] of totalByTeacher.entries()) {
      statsMap.set(teacherId, {
        totalClasses,
        uniqueClasses: classIdsByTeacher.get(teacherId)?.size ?? 0,
      })
    }

    return statsMap
  }, [])

  const avgRating = useMemo(
    () => (teachers.length > 0 ? (teachers.reduce((acc, employee) => acc + employee.rating, 0) / teachers.length).toFixed(1) : "0"),
    [teachers],
  )
  const totalClasses = useMemo(() => teachers.reduce((acc, employee) => acc + employee.classesCount, 0), [teachers])

  // CRUD Handlers
  const handleAddStaff = useCallback(() => {
    if (!newStaff.name || !newStaff.email || !newStaff.password) {
      toast.error("Nama, email, dan password wajib diisi")
      return
    }

    if (newStaff.password.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }

    if (newStaff.type === "teacher") {
      const newTeacher: Employee = {
        id: `e${Date.now()}`,
        name: newStaff.name,
        email: newStaff.email,
        avatar: "/placeholder.svg?height=100&width=100",
        role: "EMPLOYEE",
        subject: newStaff.subject || "General",
        rating: 4.5,
        classesCount: 0,
      }
      setTeachers((prev) => [...prev, newTeacher])
      upsertAuthUserCredential({
        id: newTeacher.id,
        name: newTeacher.name,
        email: newTeacher.email,
        avatar: newTeacher.avatar,
        role: "EMPLOYEE",
        password: newStaff.password,
      })
    } else {
      const newAdmin: User = {
        id: `a${Date.now()}`,
        name: newStaff.name,
        email: newStaff.email,
        avatar: "/placeholder.svg?height=100&width=100",
        role: "ADMIN",
      }
      setAdmins((prev) => [...prev, newAdmin])
      upsertAuthUserCredential({
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        avatar: newAdmin.avatar,
        role: "ADMIN",
        password: newStaff.password,
      })
    }

    setShowAddModal(false)
    setNewStaff({ type: "teacher", name: "", email: "", password: "", subject: "" })
    toast.success("Staff berhasil ditambahkan", {
      description: `${newStaff.name} telah ditambahkan sebagai ${newStaff.type === "teacher" ? "Guru" : "Admin"}`,
    })
  }, [newStaff, teachers.length, admins.length])

  const handleEditStaff = useCallback(() => {
    if (!editStaff.name || !editStaff.email) {
      toast.error("Nama dan email wajib diisi")
      return
    }

    if (editStaff.password && editStaff.password.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }

    const existingCredential = getAllAuthUsers().find((user) => user.id === editStaff.id)
    const password = editStaff.password || existingCredential?.password || (editStaff.type === "teacher" ? "guru123" : "admin123")

    if (editStaff.type === "teacher") {
      setTeachers((prev) => prev.map(t => 
        t.id === editStaff.id 
          ? { ...t, name: editStaff.name, email: editStaff.email, subject: editStaff.subject }
          : t
      ))
      upsertAuthUserCredential({
        id: editStaff.id,
        name: editStaff.name,
        email: editStaff.email,
        avatar: teachers.find((teacher) => teacher.id === editStaff.id)?.avatar || "/placeholder.svg?height=100&width=100",
        role: "EMPLOYEE",
        password,
      })
    } else {
      setAdmins((prev) => prev.map(a => 
        a.id === editStaff.id 
          ? { ...a, name: editStaff.name, email: editStaff.email }
          : a
      ))
      upsertAuthUserCredential({
        id: editStaff.id,
        name: editStaff.name,
        email: editStaff.email,
        avatar: admins.find((admin) => admin.id === editStaff.id)?.avatar || "/placeholder.svg?height=100&width=100",
        role: "ADMIN",
        password,
      })
    }

    setShowEditModal(false)
    setEditStaff((prev) => ({ ...prev, password: "" }))
    toast.success("Data staff berhasil diperbarui")
  }, [editStaff, teachers, admins])

  const handleDeleteStaff = useCallback(() => {
    if (!staffToDelete) return

    const isTeacher = "subject" in staffToDelete
    if (isTeacher) {
      setTeachers((prev) => prev.filter(t => t.id !== staffToDelete.id))
    } else {
      setAdmins((prev) => prev.filter(a => a.id !== staffToDelete.id))
    }

    removeAuthUserCredential(staffToDelete.id)

    setShowDeleteModal(false)
    setStaffToDelete(null)
    toast.success("Staff berhasil dihapus", {
      description: `${staffToDelete.name} telah dihapus dari sistem`,
    })
  }, [staffToDelete])

  const openEditModal = useCallback((staff: typeof mockEmployees[0] | typeof mockAdmins[0]) => {
    const isTeacher = "subject" in staff
    setEditStaff({
      id: staff.id,
      type: isTeacher ? "teacher" : "admin",
      name: staff.name,
      email: staff.email,
      password: "",
      subject: isTeacher ? (staff as typeof mockEmployees[0]).subject : "",
    })
    setShowEditModal(true)
  }, [])

  const openDeleteModal = useCallback((staff: typeof mockEmployees[0] | typeof mockAdmins[0]) => {
    setStaffToDelete(staff)
    setShowDeleteModal(true)
  }, [])

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={superAdmin.name} userAvatar={superAdmin.avatar}>
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
            <p className="text-lg sm:text-2xl font-bold text-slate-800">95%</p>
            <p className="text-[10px] sm:text-xs text-slate-500">Kehadiran</p>
          </GlassCard>
        </div>

        {/* Search */}
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

        {/* Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
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

        {/* Staff List */}
        <GlassCard>
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4">
            Semua Staff ({filteredStaff.length})
          </h2>

          <div className="space-y-2 sm:space-y-3">
            {filteredStaff.map((staff) => {
              const isTeacher = "subject" in staff
              const stats = isTeacher ? teacherScheduleStats.get(staff.id) : null

              return (
                <div
                  key={staff.id}
                  onClick={() => isTeacher && router.push(`/super-admin/staff/${staff.id}`)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors gap-3 ${isTeacher ? 'cursor-pointer' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={staff.avatar || "/placeholder.svg?height=48&width=48&query=professional portrait"}
                      alt={staff.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-slate-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-800 text-sm sm:text-base truncate">{staff.name}</p>
                      <p className="text-xs sm:text-sm text-slate-500 truncate">{staff.email}</p>
                      {isTeacher && (
                        <div className="flex items-center gap-2 sm:gap-3 mt-1">
                          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-slate-500">
                            <BookOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {(staff as (typeof mockEmployees)[0]).subject}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] sm:text-xs text-yellow-600">
                            <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            {(staff as (typeof mockEmployees)[0]).rating}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                    {isTeacher && stats && (
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

                    <span
                      className={`px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs border shrink-0 ${
                        isTeacher
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-orange-100 text-orange-700 border-orange-200"
                      }`}
                    >
                      {isTeacher ? "Teacher" : "Admin"}
                    </span>

                    <div className="relative group">
                      <button className="p-1.5 sm:p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors">
                        <MoreVertical className="w-4 h-4 text-slate-600" />
                      </button>

                      <div className="absolute right-0 top-full mt-2 w-36 sm:w-40 py-2 bg-white border border-slate-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        {isTeacher && (
                          <button
                            onClick={() => {
                              router.push(`/super-admin/staff/${staff.id}`)
                            }}
                            className="flex items-center gap-2 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Lihat Detail
                          </button>
                        )}
                        <button 
                          onClick={() => openEditModal(staff)}
                          className="flex items-center gap-2 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Edit
                        </button>
                        <button 
                          onClick={() => openDeleteModal(staff)}
                          className="flex items-center gap-2 w-full px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-500 hover:bg-slate-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Performance Leaderboard */}
        <GlassCard>
          <h2 className="text-base sm:text-lg font-semibold text-slate-800 mb-3 sm:mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
            Top Performers
          </h2>

          <div className="space-y-2 sm:space-y-3">
            {[...teachers]
              .sort((a, b) => b.rating - a.rating)
              .slice(0, 5)
              .map((employee, index) => (
                <div key={employee.id} className="flex items-center justify-between p-2.5 sm:p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold shrink-0 ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-600"
                          : index === 1
                            ? "bg-gray-100 text-gray-600"
                            : index === 2
                              ? "bg-orange-100 text-orange-600"
                              : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <img
                      src={employee.avatar || "/placeholder.svg?height=40&width=40&query=teacher"}
                      alt={employee.name}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800 text-sm sm:text-base truncate">{employee.name}</p>
                      <p className="text-[10px] sm:text-xs text-slate-500 truncate">{employee.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-600 shrink-0">
                    <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                    <span className="font-semibold text-sm sm:text-base">{employee.rating}</span>
                  </div>
                </div>
              ))}
          </div>
        </GlassCard>

        {/* Employee Detail Modal */}
        <GlassModal isOpen={showModal} onClose={() => setShowModal(false)} title="Detail Staff">
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <img
                  src={selectedEmployee.avatar || "/placeholder.svg?height=80&width=80&query=teacher portrait"}
                  alt={selectedEmployee.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-white/20 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-white truncate">{selectedEmployee.name}</h3>
                  <p className="text-sm text-white/60 truncate">{selectedEmployee.email}</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-300 border border-green-500/30 mt-2">
                    <BookOpen className="w-3 h-3" />
                    {selectedEmployee.subject}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3 bg-white/5 rounded-xl text-center">
                  <Star className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-yellow-400" />
                  <p className="font-semibold text-white text-sm sm:text-base">{selectedEmployee.rating}</p>
                  <p className="text-[10px] sm:text-xs text-white/50">Rating</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-white/5 rounded-xl text-center">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-blue-400" />
                  <p className="font-semibold text-white text-sm sm:text-base">{selectedEmployee.classesCount}</p>
                  <p className="text-[10px] sm:text-xs text-white/50">Kelas</p>
                </div>
                <div className="p-2.5 sm:p-3 bg-white/5 rounded-xl text-center">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-purple-400" />
                  <p className="font-semibold text-white text-sm sm:text-base">
                    {mockSchedule.filter((s) => s.teacherId === selectedEmployee.id).length}
                  </p>
                  <p className="text-[10px] sm:text-xs text-white/50">Sesi</p>
                </div>
              </div>
            </div>
          )}
        </GlassModal>

        {/* Add Staff Modal */}
        <GlassModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Tambah Staff Baru">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipe Staff</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setNewStaff({ ...newStaff, type: "teacher" })}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                    newStaff.type === "teacher"
                      ? "bg-emerald-100 border-emerald-500 text-emerald-700"
                      : "bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Users className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Guru</span>
                </button>
                <button
                  onClick={() => setNewStaff({ ...newStaff, type: "admin" })}
                  className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all ${
                    newStaff.type === "admin"
                      ? "bg-orange-100 border-orange-500 text-orange-700"
                      : "bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Shield className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Admin</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
              <GlassInput
                placeholder="Masukkan nama lengkap"
                value={newStaff.name}
                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <GlassInput
                type="email"
                placeholder="Masukkan email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <GlassInput
                type="password"
                placeholder="Minimal 6 karakter"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
              />
            </div>

            {newStaff.type === "teacher" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mata Pelajaran</label>
                <GlassInput
                  placeholder="Contoh: Matematika, Fisika, dll"
                  value={newStaff.subject}
                  onChange={(e) => setNewStaff({ ...newStaff, subject: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowAddModal(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton className="flex-1 justify-center" onClick={handleAddStaff}>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        {/* Edit Staff Modal */}
        <GlassModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Staff">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
              <GlassInput
                placeholder="Masukkan nama lengkap"
                value={editStaff.name}
                onChange={(e) => setEditStaff({ ...editStaff, name: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <GlassInput
                type="email"
                placeholder="Masukkan email"
                value={editStaff.email}
                onChange={(e) => setEditStaff({ ...editStaff, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password Baru (opsional)</label>
              <GlassInput
                type="password"
                placeholder="Kosongkan jika tidak diubah"
                value={editStaff.password}
                onChange={(e) => setEditStaff({ ...editStaff, password: e.target.value })}
              />
            </div>

            {editStaff.type === "teacher" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mata Pelajaran</label>
                <GlassInput
                  placeholder="Contoh: Matematika, Fisika, dll"
                  value={editStaff.subject}
                  onChange={(e) => setEditStaff({ ...editStaff, subject: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowEditModal(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton className="flex-1 justify-center" onClick={handleEditStaff}>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>

        {/* Delete Confirmation Modal */}
        <GlassModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Konfirmasi Hapus">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
              <AlertTriangle className="w-8 h-8 text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-white">Hapus Staff?</p>
                <p className="text-sm text-white/70">
                  Anda akan menghapus <span className="font-medium text-red-400">{staffToDelete?.name}</span> dari sistem. 
                  Aksi ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            {staffToDelete && (
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
                <img
                  src={staffToDelete.avatar || "/placeholder.svg?height=48&width=48"}
                  alt={staffToDelete.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white/20 shadow"
                />
                <div>
                  <p className="font-semibold text-white">{staffToDelete.name}</p>
                  <p className="text-sm text-white/60">{staffToDelete.email}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      "subject" in staffToDelete
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-orange-500/20 text-orange-300"
                    }`}
                  >
                    {"subject" in staffToDelete ? "Guru" : "Admin"}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-white/10">
              <GlassButton
                variant="secondary"
                className="flex-1 justify-center"
                onClick={() => setShowDeleteModal(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton
                variant="danger"
                className="flex-1 justify-center"
                onClick={handleDeleteStaff}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
