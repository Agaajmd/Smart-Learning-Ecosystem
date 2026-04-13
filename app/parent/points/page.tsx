"use client"

import { useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import { 
  mockParents,
  mockClasses,
  getChildrenByParent,
  type Student,
} from "@/lib/mock-data"
import { getStoredActivityPointsByStudent } from "@/lib/academic-storage"
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Award,
  Filter,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function ParentPointsPage() {
  const parent = mockParents[0]
  const children = getChildrenByParent(parent.id)
  const [selectedChild, setSelectedChild] = useState<Student>(children[0])
  const [filterType, setFilterType] = useState<string>("all")

  const activityPoints = getStoredActivityPointsByStudent(selectedChild.id)
  const filteredPoints = filterType === "all" 
    ? activityPoints 
    : activityPoints.filter(p => p.type === filterType)

  const positivePoints = activityPoints.filter(p => p.type === "POSITIVE").reduce((acc, p) => acc + p.points, 0)
  const negativePoints = activityPoints.filter(p => p.type === "NEGATIVE").reduce((acc, p) => acc + Math.abs(p.points), 0)
  const totalPoints = positivePoints - negativePoints

  const categories = [...new Set(activityPoints.map(p => p.category))]

  return (
    <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/parent" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Poin Aktivitas</h1>
            <p className="text-slate-500 text-sm">Riwayat poin keaktifan dan perilaku</p>
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

        {/* Total Points Card */}
        <GlassCard className={cn(
          "p-5 relative overflow-hidden",
          totalPoints >= 0 
            ? "bg-gradient-to-br from-green-500 to-emerald-600" 
            : "bg-gradient-to-br from-red-500 to-rose-600"
        )}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex items-center justify-between text-white">
            <div>
              <p className="text-white/80 text-sm">Total Poin Aktivitas</p>
              <p className="text-5xl font-bold mt-2">
                {totalPoints >= 0 ? "+" : ""}{totalPoints}
              </p>
              <p className="text-white/80 text-sm mt-2">
                {totalPoints >= 0 ? "Pertahankan prestasi!" : "Perlu perbaikan"}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white/20">
              <Award className="w-12 h-12 text-white" />
            </div>
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-green-100">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Poin Positif</p>
                <p className="text-2xl font-bold text-green-600">+{positivePoints}</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Poin Negatif</p>
                <p className="text-2xl font-bold text-red-600">-{negativePoints}</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Category Summary */}
        <GlassCard className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3">Poin per Kategori</h3>
          <div className="space-y-2">
            {categories.map(category => {
              const categoryPoints = activityPoints
                .filter(p => p.category === category)
                .reduce((acc, p) => acc + p.points, 0)
              return (
                <div key={category} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-600">{category}</span>
                  <span className={cn(
                    "font-bold",
                    categoryPoints >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {categoryPoints >= 0 ? "+" : ""}{categoryPoints}
                  </span>
                </div>
              )
            })}
          </div>
        </GlassCard>

        {/* Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <div className="flex items-center gap-1 mr-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Filter:</span>
          </div>
          {[
            { value: "all", label: "Semua" },
            { value: "POSITIVE", label: "Positif" },
            { value: "NEGATIVE", label: "Negatif" },
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setFilterType(filter.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                filterType === filter.value
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Points List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-slate-800">Riwayat Poin</h3>
          {filteredPoints.map(point => (
            <GlassCard key={point.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn(
                  "p-2.5 rounded-xl shrink-0",
                  point.type === "POSITIVE" ? "bg-green-100" : "bg-red-100"
                )}>
                  {point.type === "POSITIVE" ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          point.type === "POSITIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {point.category}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 mt-1">{point.description}</p>
                      <p className="text-sm text-slate-500 mt-1">
                        {new Date(point.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={cn(
                      "text-xl font-bold shrink-0 ml-3",
                      point.type === "POSITIVE" ? "text-green-600" : "text-red-600"
                    )}>
                      {point.type === "POSITIVE" ? "+" : ""}{point.points}
                    </span>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
