"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { SchoolWalletTopup } from "@/components/organisms/school-wallet-topup"
import { WalletCard } from "@/components/organisms/wallet-card"
import { GamificationStats } from "@/components/organisms/gamification-stats"
import { NextClassCard } from "@/components/organisms/next-class-card"
import { AttendanceLeaderboard } from "@/components/organisms/attendance-leaderboard"
import { ClassRoomGrid } from "@/components/organisms/class-room-grid"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GraduationCap } from "lucide-react"
import {
  isPageFeatureEnabled,
  SCHOOL_WALLET_FEATURE_KEY,
  type PageFeatureStateMap,
} from "@/lib/page-features"

export default function StudentDashboard() {
  const [student, setStudent] = useState<any>(null)
  const [nextClass, setNextClass] = useState<any>(null)
  const [teacher, setTeacher] = useState<any>(null)
  const [studentClass, setStudentClass] = useState<any>(null)
  const [classmates, setClassmates] = useState<any[]>([])
  const [featureState, setFeatureState] = useState<PageFeatureStateMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const [res, featureRes] = await Promise.all([
          fetch("/api/student/overview", { cache: "no-store" }),
          fetch("/api/page-features", { cache: "no-store" }),
        ])
        if (!res.ok) {
          throw new Error("Gagal memuat dashboard siswa")
        }
        const data = await res.json()
        setStudent(data.student || null)
        setNextClass(data.nextClass || null)
        setTeacher(data.teacher || null)
        setStudentClass(data.studentClass || null)
        setClassmates(Array.isArray(data.classmates) ? data.classmates : [])

        if (featureRes.ok) {
          const featurePayload = await featureRes.json()
          if (featurePayload?.state && typeof featurePayload.state === "object") {
            setFeatureState(featurePayload.state as PageFeatureStateMap)
          }
        }
      } catch {
        setLoadError("Dashboard belum bisa dimuat saat ini.")
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  if (isLoading) {
    return <RouteLoading />
  }

  if (!student) {
    return (
      <DashboardLayout role="STUDENT" userName="-" userAvatar="/placeholder-user.jpg">
        <div className="max-w-2xl mx-auto px-1">
          <GlassCard className="p-8 text-center">
            <GraduationCap className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-800">Data siswa tidak tersedia</h2>
            <p className="text-slate-500 mt-2">{loadError || "Silakan login ulang atau hubungi admin."}</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  const walletClassLabel = studentClass?.name
    ? `${studentClass.name}${studentClass?.grade ? ` - Grade ${studentClass.grade}` : ""}`
    : String(student.classId || "-")
  const walletFeatureEnabled = isPageFeatureEnabled(SCHOOL_WALLET_FEATURE_KEY, featureState)

  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar}>
      <div className="max-w-2xl mx-auto space-y-5 px-1">
        {/* Header */}
        <div className="pb-2">
          <h1 className="text-xl font-bold text-slate-800">Selamat datang,</h1>
          <p className="text-slate-500">{student.name}</p>
        </div>

        {/* Quick Stats */}
        {walletFeatureEnabled ? (
          <SchoolWalletTopup
            role="STUDENT"
            renderTrigger={({ openModal, walletBalance, pendingAmount, isLoading }) => (
              <WalletCard
                ownerName={student.name}
                secondaryLabel={walletClassLabel}
                walletBalance={walletBalance}
                pendingAmount={pendingAmount}
                isLoading={isLoading}
                onTopupClick={openModal}
              />
            )}
          />
        ) : (
          <WalletCard
            ownerName={student.name}
            secondaryLabel={walletClassLabel}
            walletBalance={0}
            pendingAmount={0}
            isLoading={false}
            disabled
            disabledReason="Dinonaktifkan oleh Kepala Sekolah"
          />
        )}

        <GamificationStats student={student} />

        <NextClassCard schedule={nextClass} teacher={teacher} />

        {/* Class Layout - View Only */}
        {studentClass && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-800">Layout Kelas Saya</h2>
            <ClassRoomGrid 
              classroom={studentClass} 
              students={classmates} 
              viewOnly={true}
              allowSeatClickInViewOnly={true}
              lockUnpaidSeats={false}
            />
          </div>
        )}

        {/* Attendance Leaderboard */}
        <AttendanceLeaderboard limit={15} students={classmates} />
      </div>
    </DashboardLayout>
  )
}
