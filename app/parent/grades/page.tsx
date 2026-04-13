"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { 
  mockParents,
  mockClasses,
  mockEmployees,
  getChildrenByParent,
  type Student,
} from "@/lib/mock-data"
import { getStoredGradesByStudent } from "@/lib/academic-storage"
import { 
  ArrowLeft,
  BookOpen,
  Award,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ParentGradesPage() {
  const parent = mockParents[0]
  const children = getChildrenByParent(parent.id)
  const [selectedChild, setSelectedChild] = useState<Student>(children[0])

  const grades = getStoredGradesByStudent(selectedChild.id)
  
  const averageKnowledge = grades.length > 0 
    ? Math.round(grades.reduce((acc, g) => acc + g.knowledge, 0) / grades.length)
    : 0
  const averageSkill = grades.length > 0 
    ? Math.round(grades.reduce((acc, g) => acc + g.skill, 0) / grades.length)
    : 0

  const getGradeColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-100"
    if (score >= 80) return "text-blue-600 bg-blue-100"
    if (score >= 70) return "text-amber-600 bg-amber-100"
    return "text-red-600 bg-red-100"
  }

  const getAttitudeColor = (attitude: string) => {
    switch (attitude) {
      case "A": return "text-green-600 bg-green-100"
      case "B": return "text-blue-600 bg-blue-100"
      case "C": return "text-amber-600 bg-amber-100"
      default: return "text-red-600 bg-red-100"
    }
  }

  return (
    <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/parent" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Nilai & Rapor</h1>
            <p className="text-slate-500 text-sm">Rekap nilai akademik anak</p>
          </div>
        </div>

        {/* Child Selector */}
        {children.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all min-w-fit",
                  selectedChild.id === child.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <img src={child.avatar} alt={child.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="text-left">
                  <p className="font-medium text-slate-800">{child.name}</p>
                  <p className="text-xs text-slate-500">{mockClasses.find(c => c.id === child.classId)?.name}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-5 bg-gradient-to-br from-blue-500 to-indigo-600">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-white/80 text-sm">Rata-rata Pengetahuan</p>
                <p className="text-4xl font-bold mt-1">{averageKnowledge}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/20">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600">
            <div className="flex items-center justify-between text-white">
              <div>
                <p className="text-white/80 text-sm">Rata-rata Keterampilan</p>
                <p className="text-4xl font-bold mt-1">{averageSkill}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/20">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Grades Table */}
        <GlassCard className="p-4">
          <h3 className="font-semibold text-slate-800 mb-4">Detail Nilai per Mata Pelajaran</h3>
          
          {grades.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-slate-600">Mata Pelajaran</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-slate-600">Pengetahuan</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-slate-600">Keterampilan</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-slate-600">Sikap</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map(grade => {
                    const teacher = mockEmployees.find(e => e.id === grade.teacherId)
                    return (
                      <tr key={grade.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-4 px-2">
                          <div>
                            <p className="font-medium text-slate-800">{grade.subject}</p>
                            <p className="text-xs text-slate-500">{teacher?.name}</p>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className={cn("px-3 py-1 rounded-full text-sm font-bold", getGradeColor(grade.knowledge))}>
                            {grade.knowledge}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className={cn("px-3 py-1 rounded-full text-sm font-bold", getGradeColor(grade.skill))}>
                            {grade.skill}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className={cn("px-3 py-1 rounded-full text-sm font-bold", getAttitudeColor(grade.attitude))}>
                            {grade.attitude}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Belum ada data nilai</p>
            </div>
          )}
        </GlassCard>

        {/* Notes */}
        {grades.some(g => g.notes) && (
          <GlassCard className="p-4">
            <h3 className="font-semibold text-slate-800 mb-3">Catatan Guru</h3>
            <div className="space-y-3">
              {grades.filter(g => g.notes).map(grade => (
                <div key={grade.id} className="p-3 rounded-xl bg-slate-50">
                  <p className="font-medium text-slate-700 text-sm">{grade.subject}</p>
                  <p className="text-slate-600 mt-1">{grade.notes}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </DashboardLayout>
  )
}
