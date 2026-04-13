"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { mockStudents } from "@/lib/mock-data"
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  Award,
  TrendingUp,
  Clock,
  Edit,
  Camera,
  Upload,
  BookOpen,
} from "lucide-react"

export default function StudentProfile() {
  const [student, setStudent] = useState(mockStudents[0])
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: student.name,
    email: student.email,
    phone: "081234567890",
  })

  const handleSaveProfile = () => {
    setStudent({
      ...student,
      name: editForm.name,
      email: editForm.email,
    })
    setShowEditModal(false)
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setStudent({ ...student, avatar: url })
      setShowAvatarModal(false)
    }
  }

  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar}>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Profile Header */}
        <GlassCard>
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <img
                src={student.avatar || "/placeholder.svg"}
                alt={student.name}
                className="w-24 h-24 rounded-full border-4 border-blue-100 object-cover"
              />
              <button
                onClick={() => setShowAvatarModal(true)}
                className="absolute -bottom-1 -right-1 p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full hover:from-blue-600 hover:to-indigo-600 transition-all duration-300"
              >
                <Camera className="w-4 h-4 text-white" />
              </button>
            </div>

            <h1 className="text-2xl font-bold text-slate-800 mt-4">{student.name}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {student.email}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border border-blue-200 mt-3">
              <GraduationCap className="w-4 h-4" />
              <span className="text-sm font-medium">{(student.classId ?? "-").toUpperCase()}</span>
            </div>
          </div>
        </GlassCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlassCard className="text-center py-3">
            <Award className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-lg font-bold text-slate-800">{student.coins}</p>
            <p className="text-xs text-slate-500">Poin</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-lg font-bold text-slate-800">8.5</p>
            <p className="text-xs text-slate-500">Rata-rata</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <Clock className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold text-slate-800">95%</p>
            <p className="text-xs text-slate-500">Kehadiran</p>
          </GlassCard>
          <GlassCard className="text-center py-3">
            <BookOpen className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-lg font-bold text-slate-800">12</p>
            <p className="text-xs text-slate-500">Tugas</p>
          </GlassCard>
        </div>

        {/* Student Information */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-500" />
            Informasi Siswa
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <GraduationCap className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Kelas</p>
                <p className="font-medium text-slate-800">{(student.classId ?? "-").toUpperCase()}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="font-medium text-slate-800">{student.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Phone className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Telepon</p>
                <p className="font-medium text-slate-800">081234567890</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400">Bergabung Sejak</p>
                <p className="font-medium text-slate-800">Januari 2025</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Aktivitas Terbaru
          </h2>

          <div className="space-y-3">
            {[
              { action: "Mengumpulkan tugas Matematika", time: "2 jam lalu" },
              { action: "Hadir di kelas Fisika", time: "5 jam lalu" },
              { action: "Mendapat poin +50", time: "1 hari lalu" },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-800">{activity.action}</p>
                <p className="text-xs text-slate-400">{activity.time}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Edit Button */}
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
          <GlassButton className="flex-1" onClick={handleSaveProfile}>
            Simpan
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
            src={student.avatar || "/placeholder.svg"}
            alt="Current avatar"
            className="w-24 h-24 rounded-full border-4 border-blue-100 object-cover mb-4"
          />

          <label className="w-full">
            <div className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-300">
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
          onClick={() => setShowAvatarModal(false)}
        >
          Batal
        </GlassButton>
      </GlassModal>
    </DashboardLayout>
  )
}
