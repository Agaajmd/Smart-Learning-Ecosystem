"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { ImageUploadModal } from "@/components/molecules/image-upload"
import { RouteLoading } from "@/components/templates/route-loading"
import { Mail, BookOpen, Star, Users, Calendar, Award, Edit, Clock, Camera, Save, X } from "lucide-react"

type Employee = {
  id: string
  name: string
  email: string
  avatar: string
  subject: string
  rating: number
  classesCount: number
}

type Schedule = {
  id: string
  classId: string
  teacherId: string
  startTime: string
  endTime: string
}

type ClassRoom = {
  id: string
  name: string
  grade: string
}

export default function EmployeeProfile() {
  const [employee, setEmployee] = useState<Employee>({
    id: "",
    name: "",
    email: "",
    avatar: "/placeholder-user.jpg",
    subject: "-",
    rating: 0,
    classesCount: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [allSchedules, setAllSchedules] = useState<Schedule[]>([])
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [editForm, setEditForm] = useState({ name: "", email: "", subject: "", password: "" })

  useEffect(() => {
    const load = async () => {
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" })
      const session = sessionRes.ok ? await sessionRes.json() : null
      const employeeId = session?.user?.id ? `?employeeId=${session.user.id}` : ""

      const [profileRes, contextRes] = await Promise.all([
        fetch(`/api/employee/profile${employeeId}`, { cache: "no-store" }),
        fetch("/api/employee/context", { cache: "no-store" }),
      ])

      if (!profileRes.ok || !contextRes.ok) return
      const profileData = await profileRes.json()
      const contextData = await contextRes.json()

      const nextEmployee = profileData.employee || {
        id: "",
        name: "",
        email: "",
        avatar: "/placeholder-user.jpg",
        subject: "-",
        rating: 0,
        classesCount: 0,
      }
      setEmployee(nextEmployee)
      setEditForm({
        name: nextEmployee.name || "",
        email: nextEmployee.email || "",
        subject: nextEmployee.subject || "",
        password: "",
      })
      setAllSchedules(Array.isArray(contextData.schedules) ? contextData.schedules : [])
      setClasses(Array.isArray(contextData.classes) ? contextData.classes : [])
      setIsLoading(false)
    }
    load().catch(() => setIsLoading(false))
  }, [])

  const employeeSchedule = useMemo(() => allSchedules.filter((s) => s.teacherId === employee.id), [allSchedules, employee.id])
  const uniqueClasses = useMemo(() => [...new Set(employeeSchedule.map((s) => s.classId))], [employeeSchedule])
  const totalHoursPerWeek = useMemo(() => {
    return employeeSchedule.reduce((acc, s) => {
      const start = Number.parseInt(s.startTime.split(":")[0])
      const end = Number.parseInt(s.endTime.split(":")[0])
      return acc + Math.max(end - start, 0) + 0.5
    }, 0)
  }, [employeeSchedule])

  if (isLoading) {
    return <RouteLoading />
  }

  const handleEditProfile = () => {
    setEditForm({ name: employee.name, email: employee.email, subject: employee.subject, password: "" })
    setShowEditModal(true)
  }

  const handleSaveProfile = async () => {
    if (!employee.id || isSavingProfile) return
    setIsSavingProfile(true)
    const password = editForm.password.trim()
    try {
      const res = await fetch("/api/employee/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: employee.id,
          name: editForm.name,
          email: editForm.email,
          subject: editForm.subject,
          avatar: employee.avatar,
          ...(password ? { password } : {}),
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui profil"))
      }

      setEmployee((prev) => ({ ...prev, name: editForm.name, email: editForm.email, subject: editForm.subject }))
      setShowEditModal(false)
      toast.success("Profil berhasil diperbarui", { description: "Perubahan telah disimpan" })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui profil")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleAvatarSave = async (imageData: string | null) => {
    if (!imageData || !employee.id || isSavingAvatar) {
      setShowAvatarModal(false)
      return
    }

    setIsSavingAvatar(true)
    try {
      const res = await fetch("/api/employee/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: employee.id,
          name: employee.name,
          email: employee.email,
          subject: employee.subject,
          avatar: imageData,
        }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(String(payload?.error || "Gagal memperbarui foto profil"))
      }

      const data = await res.json().catch(() => ({}))
      const nextAvatar = String(data?.employee?.avatar || imageData)

      setEmployee((prev) => ({ ...prev, avatar: nextAvatar }))
      toast.success("Foto profil berhasil diperbarui", { description: "Perubahan telah disimpan" })
      setShowAvatarModal(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui foto profil")
    } finally {
      setIsSavingAvatar(false)
    }
  }

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-6">
        <GlassCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="relative">
              <img src={employee.avatar || "/placeholder-user.jpg"} alt={employee.name} className="w-24 h-24 rounded-full border-4 border-white/30 object-cover" />
              <button onClick={() => setShowAvatarModal(true)} className="absolute bottom-0 right-0 p-2 bg-slate-100 backdrop-blur-xl rounded-full border border-slate-200 hover:bg-slate-200 transition-colors"><Camera className="w-4 h-4 text-slate-700" /></button>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-4">{employee.name}</h1>
            <p className="text-slate-500 flex items-center gap-2 mt-1"><Mail className="w-4 h-4" />{employee.email}</p>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 mt-3"><BookOpen className="w-4 h-4" /><span className="text-sm font-medium">{employee.subject} Teacher</span></div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-4"><Star className="w-6 h-6 mx-auto mb-1 text-yellow-500" /><p className="text-xl font-bold text-slate-800">{employee.rating}</p><p className="text-xs text-slate-500">Rating</p></GlassCard>
          <GlassCard className="text-center py-4"><Users className="w-6 h-6 mx-auto mb-1 text-blue-500" /><p className="text-xl font-bold text-slate-800">{uniqueClasses.length}</p><p className="text-xs text-slate-500">Classes</p></GlassCard>
          <GlassCard className="text-center py-4"><Clock className="w-6 h-6 mx-auto mb-1 text-purple-500" /><p className="text-xl font-bold text-slate-800">{totalHoursPerWeek}h</p><p className="text-xs text-slate-500">Weekly</p></GlassCard>
        </div>

        <GlassCard>
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5" />Classes Taught</h2>
          <div className="space-y-2">
            {uniqueClasses.map((classId) => {
              const classInfo = classes.find((c) => c.id === classId)
              const classSessions = employeeSchedule.filter((s) => s.classId === classId)
              return (
                <div key={classId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div><p className="font-medium text-slate-800">{classInfo?.name || "Unknown"}</p><p className="text-xs text-slate-400">Grade {classInfo?.grade || "-"}</p></div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-600 text-xs rounded-full border border-purple-200">{classSessions.length} sessions/week</span>
                </div>
              )
            })}
          </div>
        </GlassCard>

        <GlassButton className="w-full py-4" onClick={handleEditProfile}><Edit className="w-5 h-5 mr-2" />Edit Profile</GlassButton>
      </div>

      <GlassModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Profil">
        <div className="space-y-5">
          <div><label className="text-sm font-medium text-slate-700 mb-1.5 block">Nama Lengkap</label><GlassInput value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
          <div><label className="text-sm font-medium text-slate-700 mb-1.5 block">Email</label><GlassInput type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
          <div><label className="text-sm font-medium text-slate-700 mb-1.5 block">Mata Pelajaran</label><GlassInput value={editForm.subject} onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })} /></div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Password Baru (Opsional)</label>
            <GlassInput type="password" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
            <p className="text-xs text-slate-500 mt-1">Minimal 6 karakter</p>
          </div>
          <div className="flex gap-3 pt-3 border-t border-slate-100">
            <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowEditModal(false)}><X className="w-4 h-4 mr-2" />Batal</GlassButton>
            <GlassButton className="flex-1 justify-center" onClick={handleSaveProfile} disabled={isSavingProfile}><Save className="w-4 h-4 mr-2" />{isSavingProfile ? "Menyimpan..." : "Simpan"}</GlassButton>
          </div>
        </div>
      </GlassModal>

      <ImageUploadModal isOpen={showAvatarModal} onClose={() => setShowAvatarModal(false)} onSave={handleAvatarSave} currentImage={employee.avatar} title="Update Foto Profil" />
    </>
  )
}
