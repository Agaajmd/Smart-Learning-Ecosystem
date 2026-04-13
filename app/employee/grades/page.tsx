"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassInput } from "@/components/atoms/glass-input"
import { GlassTextarea } from "@/components/atoms/glass-textarea"
import { 
  mockEmployees, 
  mockClasses,
  mockStudents,
  type ActivityPoint,
  type StudentGrade
} from "@/lib/mock-data"
import { addStoredActivityPoint, getStoredGradesByTeacher, setStoredStudentGrades, getStoredStudentGrades } from "@/lib/academic-storage"
import { cn } from "@/lib/utils"
import { 
  FileText, 
  Users,
  Search,
  Edit,
  Save,
  X,
  TrendingUp,
  Award,
  BookOpen,
  GraduationCap,
  Plus,
  TrendingDown,
  Sparkles,
} from "lucide-react"

const ATTITUDES = ["A", "B", "C", "D"] as const

export default function TeacherRaporPage() {
  const teacher = mockEmployees[0]
  const homeroomClass = mockClasses.find(c => c.id === teacher.homeroomClassId)
  const classStudents = mockStudents.filter(s => s.classId === teacher.homeroomClassId)
  
  const [grades, setGrades] = useState<StudentGrade[]>(() => getStoredGradesByTeacher(teacher.id))
  const [searchQuery, setSearchQuery] = useState("")
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<typeof mockStudents[0] | null>(null)
  const [activityForm, setActivityForm] = useState({
    studentId: classStudents[0]?.id ?? "",
    type: "POSITIVE" as ActivityPoint["type"],
    category: "Akademik",
    points: 5,
    description: "",
  })

  const [editForm, setEditForm] = useState({
    subject: teacher.subject,
    knowledge: 0,
    skill: 0,
    attitude: "B" as "A" | "B" | "C" | "D",
    notes: "",
  })

  const filteredStudents = classStudents.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStudentGrades = (studentId: string) => {
    return grades.filter(g => g.studentId === studentId && g.teacherId === teacher.id)
  }

  const getStudentGradeForSubject = (studentId: string, subject: string) => {
    return grades.find(g => g.studentId === studentId && g.subject === subject && g.teacherId === teacher.id)
  }

  const calculateAverage = (studentGrades: StudentGrade[]) => {
    if (studentGrades.length === 0) return 0
    const total = studentGrades.reduce((acc, g) => acc + ((g.knowledge + g.skill) / 2), 0)
    return Math.round(total / studentGrades.length)
  }

  const getGradeColor = (avg: number) => {
    if (avg >= 85) return "text-emerald-600"
    if (avg >= 70) return "text-blue-600"
    if (avg >= 60) return "text-amber-600"
    return "text-rose-600"
  }

  const getGradeBadge = (avg: number) => {
    if (avg >= 85) return { label: "Sangat Baik", color: "green" }
    if (avg >= 70) return { label: "Baik", color: "blue" }
    if (avg >= 60) return { label: "Cukup", color: "yellow" }
    return { label: "Kurang", color: "red" }
  }

  const getBadgeClasses = (color: string) => {
    switch (color) {
      case "green":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200"
      case "blue":
        return "bg-blue-50 text-blue-700 border border-blue-200"
      case "yellow":
        return "bg-amber-50 text-amber-700 border border-amber-200"
      default:
        return "bg-rose-50 text-rose-700 border border-rose-200"
    }
  }

  const handleOpenEdit = (student: typeof mockStudents[0]) => {
    setSelectedStudent(student)
    const existingGrade = getStudentGradeForSubject(student.id, teacher.subject)
    if (existingGrade) {
      setEditForm({
        subject: existingGrade.subject,
        knowledge: existingGrade.knowledge,
        skill: existingGrade.skill,
        attitude: existingGrade.attitude,
        notes: existingGrade.notes || "",
      })
    } else {
      setEditForm({
        subject: teacher.subject,
        knowledge: 0,
        skill: 0,
        attitude: "B",
        notes: "",
      })
    }
    setShowEditModal(true)
  }

  const handleSaveGrades = () => {
    if (!selectedStudent) return

    if (editForm.knowledge < 0 || editForm.knowledge > 100 || editForm.skill < 0 || editForm.skill > 100) {
      toast.error("Nilai harus antara 0-100")
      return
    }

    const existingIndex = grades.findIndex(
      g => g.studentId === selectedStudent.id && g.subject === teacher.subject && g.teacherId === teacher.id
    )
    
    let nextGrades: StudentGrade[]
    if (existingIndex >= 0) {
      nextGrades = grades.map((g, i) => 
        i === existingIndex 
          ? { 
              ...g, 
              knowledge: editForm.knowledge,
              skill: editForm.skill,
              attitude: editForm.attitude,
              notes: editForm.notes,
            }
          : g
      )
    } else {
      const newGrade: StudentGrade = {
        id: `sg${Date.now()}`,
        studentId: selectedStudent.id,
        subject: teacher.subject,
        teacherId: teacher.id,
        semester: "Ganjil 2025",
        knowledge: editForm.knowledge,
        skill: editForm.skill,
        attitude: editForm.attitude,
        notes: editForm.notes,
      }
      nextGrades = [...grades, newGrade]
    }

    setGrades(nextGrades)

    const allGrades = getStoredStudentGrades().filter((g) => g.teacherId !== teacher.id)
    setStoredStudentGrades([...allGrades, ...nextGrades])

    toast.success("Nilai berhasil disimpan")
    setShowEditModal(false)
  }

  const handleAddActivityPoint = () => {
    if (!activityForm.studentId || !activityForm.category || !activityForm.description.trim()) {
      toast.error("Lengkapi data poin aktivitas terlebih dahulu")
      return
    }

    if (activityForm.points <= 0) {
      toast.error("Poin harus lebih dari 0")
      return
    }

    const signedPoints = activityForm.type === "NEGATIVE" ? -Math.abs(activityForm.points) : Math.abs(activityForm.points)
    const newPoint: ActivityPoint = {
      id: `ap-${Date.now()}`,
      studentId: activityForm.studentId,
      type: activityForm.type,
      category: activityForm.category,
      points: signedPoints,
      description: activityForm.description.trim(),
      date: new Date().toISOString().slice(0, 10),
      givenBy: teacher.id,
    }

    addStoredActivityPoint(newPoint)
    toast.success("Poin aktivitas berhasil ditambahkan")
    setActivityForm((prev) => ({ ...prev, description: "", points: 5 }))
  }

  // Stats
  const studentsWithGrades = classStudents.filter(s => getStudentGradeForSubject(s.id, teacher.subject))
  const avgClassScore = studentsWithGrades.length > 0
    ? Math.round(studentsWithGrades.reduce((acc, s) => {
        const g = getStudentGradeForSubject(s.id, teacher.subject)
        return acc + (g ? ((g.knowledge + g.skill) / 2) : 0)
      }, 0) / studentsWithGrades.length)
    : 0

  const topStudents = classStudents
    .map(s => {
      const g = getStudentGradeForSubject(s.id, teacher.subject)
      return { student: s, avg: g ? ((g.knowledge + g.skill) / 2) : 0 }
    })
    .filter(s => s.avg > 0)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 3)

  return (
    <DashboardLayout role="EMPLOYEE" userName={teacher.name} userAvatar={teacher.avatar}>
      <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Penilaian & Poin Keaktifan</h1>
          <p className="text-sm text-slate-500">
            {homeroomClass ? `Wali Kelas ${homeroomClass.name} - ${teacher.subject}` : "Kelola nilai dan poin aktivitas siswa"}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="text-center py-4">
            <Users className="w-5 h-5 mx-auto mb-2 text-blue-600" />
            <p className="text-xl font-bold text-slate-800">{classStudents.length}</p>
            <p className="text-xs text-slate-500">Total Siswa</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <FileText className="w-5 h-5 mx-auto mb-2 text-violet-600" />
            <p className="text-xl font-bold text-slate-800">{studentsWithGrades.length}</p>
            <p className="text-xs text-slate-500">Sudah Dinilai</p>
          </GlassCard>
          <GlassCard className="text-center py-4">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-emerald-600" />
            <p className={`text-xl font-bold ${getGradeColor(avgClassScore)}`}>{avgClassScore || "-"}</p>
            <p className="text-xs text-slate-500">Rata-rata Kelas</p>
          </GlassCard>
        </div>

        {/* Top Students */}
        {topStudents.length > 0 && (
          <GlassCard className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-slate-800">Peringkat Teratas</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {topStudents.map((item, index) => (
                <div key={item.student.id} className="flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200 min-w-fit">
                  <span className={`text-lg font-bold ${index === 0 ? 'text-amber-600' : index === 1 ? 'text-slate-500' : 'text-orange-600'}`}>
                    #{index + 1}
                  </span>
                  <img src={item.student.avatar} alt={item.student.name} className="w-8 h-8 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{item.student.name}</p>
                    <p className="text-xs text-slate-500">Nilai: {Math.round(item.avg)}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Activity Points Input */}
        <GlassCard className="space-y-4 border-blue-200 bg-blue-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-slate-800">Input Poin Aktivitas Siswa</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600 mb-1.5 block">Siswa</label>
              <select
                value={activityForm.studentId}
                onChange={(e) => setActivityForm({ ...activityForm, studentId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {classStudents.map((student) => (
                  <option key={student.id} value={student.id} className="text-slate-800">
                    {student.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1.5 block">Kategori</label>
              <input
                type="text"
                value={activityForm.category}
                onChange={(e) => setActivityForm({ ...activityForm, category: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Akademik / Kedisiplinan / Sosial"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-slate-600 mb-1.5 block">Jenis Poin</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActivityForm({ ...activityForm, type: "POSITIVE" })}
                  className={cn(
                    "py-2 rounded-xl text-sm font-medium transition-colors",
                    activityForm.type === "POSITIVE" ? "bg-emerald-500 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Positif
                </button>
                <button
                  onClick={() => setActivityForm({ ...activityForm, type: "NEGATIVE" })}
                  className={cn(
                    "py-2 rounded-xl text-sm font-medium transition-colors",
                    activityForm.type === "NEGATIVE" ? "bg-rose-500 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  Negatif
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-600 mb-1.5 block">Nilai Poin</label>
              <input
                type="number"
                min={1}
                value={activityForm.points}
                onChange={(e) => setActivityForm({ ...activityForm, points: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-600 mb-1.5 block">Deskripsi Aktivitas</label>
            <textarea
              value={activityForm.description}
              onChange={(e) => setActivityForm({ ...activityForm, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contoh: Membantu teman memahami materi saat diskusi kelas"
            />
          </div>

          <div className="flex justify-end">
            <GlassButton onClick={handleAddActivityPoint} className="justify-center">
              {activityForm.type === "POSITIVE" ? <TrendingUp className="w-4 h-4 mr-2" /> : <TrendingDown className="w-4 h-4 mr-2" />}
              Simpan Poin Aktivitas
            </GlassButton>
          </div>
        </GlassCard>

        {/* Student List */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Daftar Nilai - {teacher.subject}</h2>
          </div>

          <div className="space-y-2">
            {filteredStudents.map(student => {
              const studentGrade = getStudentGradeForSubject(student.id, teacher.subject)
              const avg = studentGrade ? ((studentGrade.knowledge + studentGrade.skill) / 2) : 0
              const badge = getGradeBadge(avg)

              return (
                <div 
                  key={student.id} 
                  className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white transition-all"
                >
                  <img 
                    src={student.avatar} 
                    alt={student.name} 
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 truncate">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.email}</p>
                  </div>

                  {studentGrade ? (
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-slate-500">Pengetahuan / Keterampilan</p>
                        <p className="text-sm font-medium text-slate-700">{studentGrade.knowledge} / {studentGrade.skill}</p>
                      </div>
                      <div className={cn("px-2 py-1 rounded-full text-xs font-semibold", getBadgeClasses(badge.color))}>
                        {Math.round(avg)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Belum dinilai</span>
                  )}

                  <GlassButton size="sm" onClick={() => handleOpenEdit(student)}>
                    {studentGrade ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </GlassButton>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Edit Modal */}
        <GlassModal 
          isOpen={showEditModal} 
          onClose={() => setShowEditModal(false)} 
          title={`Input Nilai - ${selectedStudent?.name || ""}`}
          size="lg"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <img 
                src={selectedStudent?.avatar} 
                alt={selectedStudent?.name}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow"
              />
              <div>
                <p className="font-semibold text-slate-800">{selectedStudent?.name}</p>
                <p className="text-sm text-slate-500">{teacher.subject}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <GlassInput
                label="Nilai Pengetahuan"
                type="number"
                min={0}
                max={100}
                value={editForm.knowledge}
                onChange={(e) => setEditForm({ ...editForm, knowledge: Number(e.target.value) })}
              />
              <GlassInput
                label="Nilai Keterampilan"
                type="number"
                min={0}
                max={100}
                value={editForm.skill}
                onChange={(e) => setEditForm({ ...editForm, skill: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Sikap</label>
              <div className="grid grid-cols-4 gap-2">
                {ATTITUDES.map(att => (
                  <button
                    key={att}
                    onClick={() => setEditForm({ ...editForm, attitude: att })}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      editForm.attitude === att 
                        ? "bg-blue-500 text-white shadow-md shadow-blue-500/25" 
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {att}
                  </button>
                ))}
              </div>
            </div>

            <GlassTextarea
              label="Catatan (Opsional)"
              placeholder="Catatan untuk siswa..."
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={2}
            />

            <div className="flex gap-3 pt-3 border-t border-slate-100">
              <GlassButton variant="secondary" className="flex-1 justify-center" onClick={() => setShowEditModal(false)}>
                <X className="w-4 h-4 mr-2" />
                Batal
              </GlassButton>
              <GlassButton className="flex-1 justify-center" onClick={handleSaveGrades}>
                <Save className="w-4 h-4 mr-2" />
                Simpan
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      </div>
    </DashboardLayout>
  )
}
