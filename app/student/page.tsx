"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { WalletCard } from "@/components/organisms/wallet-card"
import { GamificationStats } from "@/components/organisms/gamification-stats"
import { NextClassCard } from "@/components/organisms/next-class-card"
import { AttendanceLeaderboard } from "@/components/organisms/attendance-leaderboard"
import { ClassRoomGrid } from "@/components/organisms/class-room-grid"
import { RouteLoading } from "@/components/templates/route-loading"

export default function StudentDashboard() {
  const [student, setStudent] = useState<any>(null)
  const [nextClass, setNextClass] = useState<any>(null)
  const [teacher, setTeacher] = useState<any>(null)
  const [studentClass, setStudentClass] = useState<any>(null)
  const [classmates, setClassmates] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/student/overview", { cache: "no-store" })
        if (!res.ok) {
          return
        }
        const data = await res.json()
        setStudent(data.student || null)
        setNextClass(data.nextClass || null)
        setTeacher(data.teacher || null)
        setStudentClass(data.studentClass || null)
        setClassmates(Array.isArray(data.classmates) ? data.classmates : [])
      } catch {
        setStudent(null)
      }
    }

    load()
  }, [])

  if (!student) {
    return <RouteLoading />
  }

  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar}>
      <div className="max-w-2xl mx-auto space-y-5 px-1">
        {/* Header */}
        <div className="pb-2">
          <h1 className="text-xl font-bold text-slate-800">Selamat datang,</h1>
          <p className="text-slate-500">{student.name}</p>
        </div>

        {/* Quick Stats */}
        <WalletCard student={student} />

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
            />
          </div>
        )}

        {/* Attendance Leaderboard */}
        <AttendanceLeaderboard limit={15} students={classmates} />
      </div>
    </DashboardLayout>
  )
}
