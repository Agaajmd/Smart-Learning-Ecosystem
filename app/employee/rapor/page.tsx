"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { mockEmployees, mockStudents, mockClasses, type StudentGrade } from "@/lib/mock-data"
import { getStoredStudentGrades, setStoredStudentGrades } from "@/lib/academic-storage"
import { Save, Download, ChevronDown, Users, Calculator, Award, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface EditableStudentGrade {
  studentId: string
  participation: string
  assignment: string
  exam: string
  notes: string
}

const getPredicate = (score: number): { letter: string; color: string } => {
  if (score >= 90) return { letter: "A", color: "text-emerald-600" }
  if (score >= 80) return { letter: "B", color: "text-blue-600" }
  if (score >= 70) return { letter: "C", color: "text-yellow-600" }
  return { letter: "D", color: "text-red-600" }
}

export default function GradingPage() {
  const employee = mockEmployees[0]
  const [selectedClassId, setSelectedClassId] = useState("c1")
  const [showClassSelector, setShowClassSelector] = useState(false)
  
  const selectedClass = mockClasses.find(c => c.id === selectedClassId)
  const classStudents = mockStudents.filter(s => s.classId === selectedClassId)
  
  // Initialize grades for all students
  const [grades, setGrades] = useState<EditableStudentGrade[]>(
    classStudents.map(student => ({
      studentId: student.id,
      participation: "",
      assignment: "",
      exam: "",
      notes: "",
    }))
  )

  // Update grades when class changes
  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId)
    setShowClassSelector(false)
    const students = mockStudents.filter(s => s.classId === classId)
    setGrades(students.map(student => ({
      studentId: student.id,
      participation: "",
      assignment: "",
      exam: "",
      notes: "",
    })))
  }

  const validateInput = (value: string): boolean => {
    if (value === "") return true
    const num = parseInt(value)
    return !isNaN(num) && num >= 0 && num <= 100
  }

  const handleGradeChange = (studentId: string, field: keyof Omit<EditableStudentGrade, 'studentId'>, value: string) => {
    if (field === "notes") {
      setGrades(prev => prev.map(g => 
        g.studentId === studentId ? { ...g, notes: value } : g
      ))
      return
    }

    // Only allow numbers
    if (value !== "" && !/^\d*$/.test(value)) return
    
    // Validate range
    if (!validateInput(value)) {
      toast.error("Nilai harus antara 0-100")
      return
    }

    setGrades(prev => prev.map(g => 
      g.studentId === studentId ? { ...g, [field]: value } : g
    ))
  }

  const calculateFinalScore = (grade: EditableStudentGrade): number | null => {
    const p = grade.participation ? parseInt(grade.participation) : null
    const a = grade.assignment ? parseInt(grade.assignment) : null
    const e = grade.exam ? parseInt(grade.exam) : null
    
    if (p === null || a === null || e === null) return null
    
    // Final Score = (Participation * 0.2) + (Assignment * 0.3) + (Exam * 0.5)
    return (p * 0.2) + (a * 0.3) + (e * 0.5)
  }

  const stats = useMemo(() => {
    const completedGrades = grades.filter(g => calculateFinalScore(g) !== null)
    const scores = completedGrades.map(g => calculateFinalScore(g)!)
    
    return {
      total: classStudents.length,
      completed: completedGrades.length,
      average: scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "-",
      passed: scores.filter(s => s >= 75).length
    }
  }, [grades, classStudents.length])

  const handleSave = () => {
    const incompleteCount = grades.filter(g => calculateFinalScore(g) === null).length
    if (incompleteCount > 0) {
      toast.error(`Masih ada ${incompleteCount} siswa yang belum lengkap nilainya`)
      return
    }
    const toStoredGrade = (grade: EditableStudentGrade): StudentGrade => {
      const participation = Number(grade.participation)
      const assignment = Number(grade.assignment)
      const exam = Number(grade.exam)
      const finalScore = calculateFinalScore(grade) ?? 0
      const attitude: StudentGrade["attitude"] = finalScore >= 90 ? "A" : finalScore >= 80 ? "B" : finalScore >= 70 ? "C" : "D"

      return {
        id: `sg-ai-${grade.studentId}-${employee.id}`,
        studentId: grade.studentId,
        subject: employee.subject,
        teacherId: employee.id,
        semester: "Ganjil 2025",
        knowledge: Math.round((participation + assignment) / 2),
        skill: exam,
        attitude,
        notes: grade.notes.trim(),
      }
    }

    const allStored = getStoredStudentGrades()
    const classStudentIds = new Set(classStudents.map((student) => student.id))
    const baseStored = allStored.filter(
      (grade) => !(grade.teacherId === employee.id && grade.subject === employee.subject && classStudentIds.has(grade.studentId))
    )
    const merged = [...baseStored, ...grades.map(toStoredGrade)]
    setStoredStudentGrades(merged)

    toast.success("Nilai berhasil disimpan!", {
      description: `${grades.length} siswa telah dinilai`
    })
  }

  return (
    <DashboardLayout role="EMPLOYEE" userName={employee.name} userAvatar={employee.avatar}>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Input Nilai Siswa</h1>
            <p className="text-slate-500 text-sm">Masukkan nilai partisipasi, tugas, dan ujian</p>
          </div>
          
          {/* Class Selector */}
          <div className="relative">
            <button
              onClick={() => setShowClassSelector(!showClassSelector)}
              className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 transition-all duration-200 min-w-[160px]"
            >
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-slate-800">{selectedClass?.name}</span>
              <ChevronDown className={cn(
                "w-4 h-4 text-slate-400 transition-transform duration-200 ml-auto",
                showClassSelector && "rotate-180"
              )} />
            </button>

            {showClassSelector && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowClassSelector(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {mockClasses.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => handleClassChange(cls.id)}
                      className={cn(
                        "w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 transition-colors",
                        cls.id === selectedClassId ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"
                      )}
                    >
                      {cls.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
            <Users className="w-5 h-5 text-blue-500 mb-1" />
            <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.total}</p>
            <p className="text-xs text-slate-500">Total Siswa</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
            <Calculator className="w-5 h-5 text-emerald-500 mb-1" />
            <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.completed}</p>
            <p className="text-xs text-slate-500">Sudah Dinilai</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
            <Award className="w-5 h-5 text-purple-500 mb-1" />
            <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.average}</p>
            <p className="text-xs text-slate-500">Rata-rata</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4">
            <AlertCircle className="w-5 h-5 text-amber-500 mb-1" />
            <p className="text-xl sm:text-2xl font-bold text-slate-800">{stats.passed}</p>
            <p className="text-xs text-slate-500">Lulus (≥75)</p>
          </div>
        </div>

        {/* Weight Info */}
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full font-medium">
            Partisipasi: 20%
          </span>
          <span className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full font-medium">
            Tugas: 30%
          </span>
          <span className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full font-medium">
            Ujian: 50%
          </span>
        </div>

        {/* Grading Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">No</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Nama Siswa</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                    <span className="text-blue-600">Partisipasi</span>
                    <span className="text-slate-400 font-normal ml-1">(20%)</span>
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                    <span className="text-purple-600">Tugas</span>
                    <span className="text-slate-400 font-normal ml-1">(30%)</span>
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                    <span className="text-amber-600">Ujian</span>
                    <span className="text-slate-400 font-normal ml-1">(50%)</span>
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Nilai Akhir</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Predikat</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Catatan AI Rapor</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((student, index) => {
                  const grade = grades.find(g => g.studentId === student.id)!
                  const finalScore = calculateFinalScore(grade)
                  const predicate = finalScore !== null ? getPredicate(finalScore) : null
                  
                  return (
                    <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-sm text-slate-600">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={student.avatar} 
                            alt={student.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span className="text-sm font-medium text-slate-800">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          value={grade.participation}
                          onChange={(e) => handleGradeChange(student.id, "participation", e.target.value)}
                          placeholder="0-100"
                          className="w-full max-w-[80px] mx-auto block text-center px-2 py-2 rounded-lg border border-slate-200 bg-blue-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          value={grade.assignment}
                          onChange={(e) => handleGradeChange(student.id, "assignment", e.target.value)}
                          placeholder="0-100"
                          className="w-full max-w-[80px] mx-auto block text-center px-2 py-2 rounded-lg border border-slate-200 bg-purple-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={3}
                          value={grade.exam}
                          onChange={(e) => handleGradeChange(student.id, "exam", e.target.value)}
                          placeholder="0-100"
                          className="w-full max-w-[80px] mx-auto block text-center px-2 py-2 rounded-lg border border-slate-200 bg-amber-50/50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {finalScore !== null ? (
                          <span className={cn(
                            "font-bold text-lg",
                            finalScore >= 75 ? "text-emerald-600" : "text-red-500"
                          )}>
                            {finalScore.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {predicate ? (
                          <span className={cn(
                            "inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-lg",
                            predicate.color,
                            predicate.letter === "A" && "bg-emerald-100",
                            predicate.letter === "B" && "bg-blue-100",
                            predicate.letter === "C" && "bg-yellow-100",
                            predicate.letter === "D" && "bg-red-100"
                          )}>
                            {predicate.letter}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <input
                          type="text"
                          value={grade.notes}
                          onChange={(e) => handleGradeChange(student.id, "notes", e.target.value)}
                          placeholder="Catatan singkat untuk orang tua"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleSave}
            className="flex-1 sm:flex-none px-6 py-3 bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Simpan Nilai
          </button>
          <button
            className="flex-1 sm:flex-none px-6 py-3 border border-slate-200 text-slate-700 font-medium rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>
    </DashboardLayout>
  )
}
