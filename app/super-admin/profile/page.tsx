"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import {
  User,
  Mail,
  Crown,
  Edit,
  GraduationCap,
  Briefcase,
  School,
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle,
  Camera,
  Phone,
  Upload,
} from "lucide-react"

export default function SuperAdminProfile() {
  const [superAdmin, setSuperAdmin] = useState<{ id: string; name: string; email: string; avatar: string } | null>(null)
  const [studentsCount, setStudentsCount] = useState(0)
  const [employeesCount, setEmployeesCount] = useState(0)
  const [classesCount, setClassesCount] = useState(0)
  const [profit, setProfit] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "081234567890" })

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" })
        const session = sessionRes.ok ? await sessionRes.json() : null
        const superAdminId = session?.user?.id ? `?superAdminId=${session.user.id}` : ""
        const res = await fetch(`/api/super-admin/profile${superAdminId}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!active) return

        if (data.superAdmin) {
          setSuperAdmin(data.superAdmin)
          setEditForm((prev) => ({ ...prev, name: data.superAdmin.name || "", email: data.superAdmin.email || "" }))
        }
        if (data.stats) {
          setStudentsCount(Number(data.stats.studentsCount || 0))
          setEmployeesCount(Number(data.stats.employeesCount || 0))
          setClassesCount(Number(data.stats.classesCount || 0))
          setProfit(Number(data.stats.profit || 0))
        }
      } catch {
        // Keep fallback values.
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  const achievements = [
    { title: "10 Tahun Mengabdi", icon: Award, earned: classesCount > 0 },
    { title: "Pengelolaan Anggaran", icon: DollarSign, earned: profit > 0 },
    { title: "Pemimpin Pertumbuhan", icon: TrendingUp, earned: studentsCount > 0 && employeesCount > 0 },
    { title: "Pembangun Komunitas", icon: GraduationCap, earned: studentsCount >= 100 },
  ]

  if (!superAdmin) {
    return <RouteLoading />
  }

  const handleSaveProfile = async () => {
    if (!superAdmin.id || isSavingProfile) return
    setIsSavingProfile(true)
    try {
      const res = await fetch("/api/super-admin/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: superAdmin.id,
          name: editForm.name,
          email: editForm.email,
          avatar: superAdmin.avatar,
        }),
      })
      if (!res.ok) throw new Error()

      setSuperAdmin((prev) => ({ ...prev, name: editForm.name, email: editForm.email }))
      setShowEditModal(false)
      toast.success("Profil berhasil diperbarui")
    } catch {
      toast.error("Gagal memperbarui profil")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && superAdmin.id) {
      setIsSavingAvatar(true)
      const reader = new FileReader()
      reader.onload = async (event) => {
        const avatar = String(event.target?.result || "")
        if (!avatar) {
          setIsSavingAvatar(false)
          return
        }
        try {
          const res = await fetch("/api/super-admin/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: superAdmin.id,
              name: superAdmin.name,
              email: superAdmin.email,
              avatar,
            }),
          })
          if (!res.ok) throw new Error()

          setSuperAdmin((prev) => ({ ...prev, avatar }))
          setShowAvatarModal(false)
          toast.success("Foto profil berhasil diperbarui")
        } catch {
          toast.error("Gagal memperbarui foto profil")
        } finally {
          setIsSavingAvatar(false)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <DashboardLayout role="SUPER_ADMIN" userName={superAdmin.name} userAvatar={superAdmin.avatar}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={
                  superAdmin.avatar ||
                  "/placeholder.svg?height=120&width=120&query=school principal professional portrait"
                }
                alt={superAdmin.name}
                className="w-24 h-24 rounded-full border-4 border-indigo-100 object-cover"
              />
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full hover:from-indigo-600 hover:to-purple-600 transition-colors"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mt-4">{superAdmin.name}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {superAdmin.email}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-indigo-600 border border-indigo-200 mt-3">
              <Crown className="w-4 h-4" />
              <span className="text-sm font-medium">Kepala Sekolah</span>
            </div>
          </div>
        </GlassCard>

        {/* School Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlassCard className="text-center py-3">
            <GraduationCap className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-slate-800">{studentsCount}</p>
            <p className="text-xs text-slate-500">Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <Briefcase className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-lg font-bold text-slate-800">{employeesCount}</p>
            <p className="text-xs text-slate-500">Guru</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <School className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
            <p className="text-lg font-bold text-slate-800">{classesCount}</p>
            <p className="text-xs text-slate-500">Kelas</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold text-slate-800">Rp {(profit / 1000000).toFixed(0)}M</p>
            <p className="text-xs text-slate-500">Profit</p>
          </GlassCard>
        </div>

        {/* Principal Information */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-500" />
            Informasi Kepala Sekolah
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Crown className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Jabatan</p>
                <p className="font-medium text-slate-800">Kepala Sekolah / Super Admin</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Masa Jabatan</p>
                <p className="font-medium text-slate-800">Sejak 2015 (10 tahun)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <CheckCircle className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Level Akses</p>
                <p className="font-medium text-slate-800">Akses Penuh Sistem</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Achievements */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Pencapaian
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {achievements.map((achievement, index) => {
              const Icon = achievement.icon
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    achievement.earned
                      ? "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"
                      : "bg-slate-50 border border-slate-200 opacity-50"
                  }`}
                >
                  <div className={`p-2 rounded-xl ${achievement.earned ? "bg-amber-100" : "bg-slate-100"}`}>
                    <Icon className={`w-5 h-5 ${achievement.earned ? "text-amber-500" : "text-slate-400"}`} />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-medium ${achievement.earned ? "text-slate-800" : "text-slate-500"}`}
                    >
                      {achievement.title}
                    </p>
                    <p className="text-xs text-slate-400">{achievement.earned ? "Tercapai" : "Terkunci"}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Quick Stats */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            Performa Sekolah
          </h2>

          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Kepuasan Siswa</span>
                <span className="text-slate-800 font-medium">92%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-[92%] bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Performa Guru</span>
                <span className="text-slate-800 font-medium">88%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-[88%] bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Efisiensi Anggaran</span>
                <span className="text-slate-800 font-medium">95%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-[95%] bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full" />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Edit Profile Button */}
        <GlassButton className="w-full py-4" onClick={() => setShowEditModal(true)}>
          <Edit className="w-5 h-5 mr-2" />
          Edit Profil
        </GlassButton>
      </div>

      {/* Edit Profile Modal */}
      <GlassModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Profil"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <GlassInput
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Masukkan nama lengkap"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <GlassInput
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="Masukkan email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Telepon</label>
            <GlassInput
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              placeholder="Masukkan nomor telepon"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <GlassButton
            variant="ghost"
            className="flex-1"
            onClick={() => setShowEditModal(false)}
          >
            Batal
          </GlassButton>
          <GlassButton className="flex-1" onClick={handleSaveProfile} disabled={isSavingProfile}>
            {isSavingProfile ? "Menyimpan..." : "Simpan"}
          </GlassButton>
        </div>
      </GlassModal>

      {/* Avatar Upload Modal */}
      <GlassModal
        isOpen={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        title="Ganti Foto Profil"
        size="sm"
      >
        <div className="flex flex-col items-center">
          <img
            src={superAdmin.avatar || "/placeholder.svg"}
            alt="Current avatar"
            className="w-24 h-24 rounded-full border-4 border-indigo-100 object-cover mb-4"
          />

          <label className="w-full">
            <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-slate-600">Pilih foto baru</span>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </label>
        </div>

        <GlassButton
          variant="ghost"
          className="w-full mt-4"
          disabled={isSavingAvatar}
          onClick={() => setShowAvatarModal(false)}
        >
          Batal
        </GlassButton>
      </GlassModal>
    </DashboardLayout>
  )
}
