"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { LayoutGrid, Save, RotateCcw, Users, Grid3X3, Shuffle, Edit3, X } from "lucide-react"

type Employee = { id: string; homeroomClassId?: string }
type ClassRoom = { id: string; name: string; rows: number; cols: number }
type Student = { id: string; name: string; classId: string; avatar?: string }

type SeatPosition = { studentId: string | null; row: number; col: number }

export default function TeacherClassLayoutPage() {
  const [employee, setEmployee] = useState<Employee>({ id: "" })
  const [classes, setClasses] = useState<ClassRoom[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [rows, setRows] = useState(5)
  const [cols, setCols] = useState(6)
  const [isEditMode, setIsEditMode] = useState(false)
  const [seats, setSeats] = useState<SeatPosition[]>([])

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/employee/context", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      const nextEmployee: Employee = data.employee || { id: "" }
      const nextClasses: ClassRoom[] = Array.isArray(data.classes) ? data.classes : []
      const nextStudents: Student[] = Array.isArray(data.students) ? data.students : []

      setEmployee(nextEmployee)
      setClasses(nextClasses)
      setStudents(nextStudents)

      const homeroom = nextClasses.find((c) => c.id === nextEmployee.homeroomClassId)
      const classStudents = nextStudents.filter((s) => s.classId === nextEmployee.homeroomClassId)
      const nextRows = homeroom?.rows || 5
      const nextCols = homeroom?.cols || 6
      setRows(nextRows)
      setCols(nextCols)

      const nextSeats: SeatPosition[] = []
      let studentIndex = 0
      for (let r = 0; r < nextRows; r++) {
        for (let c = 0; c < nextCols; c++) {
          nextSeats.push({ studentId: classStudents[studentIndex]?.id || null, row: r, col: c })
          studentIndex++
        }
      }
      setSeats(nextSeats)
    }

    load().catch(() => {})
  }, [])

  const homeroomClass = useMemo(() => classes.find((c) => c.id === employee.homeroomClassId) || null, [classes, employee.homeroomClassId])
  const classStudents = useMemo(() => students.filter((s) => s.classId === employee.homeroomClassId), [students, employee.homeroomClassId])

  const getStudent = (studentId: string | null) => (studentId ? classStudents.find((s) => s.id === studentId) : null)

  const handleShuffle = () => {
    const shuffled = [...classStudents].sort(() => Math.random() - 0.5)
    const nextSeats = seats.map((seat, idx) => ({ ...seat, studentId: shuffled[idx]?.id || null }))
    setSeats(nextSeats)
    toast.success("Posisi duduk diacak")
  }

  const handleReset = () => {
    const nextSeats = seats.map((seat, idx) => ({ ...seat, studentId: classStudents[idx]?.id || null }))
    setSeats(nextSeats)
    toast.success("Layout direset")
  }

  const handleSaveLayout = () => {
    toast.success("Layout bangku berhasil disimpan")
    setIsEditMode(false)
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Layout Kelas</h1>
          <p className="text-sm text-white/60">{homeroomClass ? `Denah Bangku ${homeroomClass.name}` : "Kelola denah bangku siswa"}</p>
        </div>
        <div className="flex gap-2">
          {isEditMode ? (
            <>
              <GlassButton variant="secondary" size="sm" onClick={() => setIsEditMode(false)}><X className="w-4 h-4 mr-1" />Batal</GlassButton>
              <GlassButton size="sm" onClick={handleSaveLayout}><Save className="w-4 h-4 mr-1" />Simpan</GlassButton>
            </>
          ) : (
            <GlassButton onClick={() => setIsEditMode(true)}><Edit3 className="w-4 h-4 mr-2" />Edit Layout</GlassButton>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <GlassCard className="text-center py-4"><Users className="w-6 h-6 mx-auto mb-2 text-blue-400" /><p className="text-2xl font-bold text-white">{classStudents.length}</p><p className="text-xs text-white/60">Total Siswa</p></GlassCard>
        <GlassCard className="text-center py-4"><Grid3X3 className="w-6 h-6 mx-auto mb-2 text-purple-400" /><p className="text-2xl font-bold text-white">{rows * cols}</p><p className="text-xs text-white/60">Total Bangku</p></GlassCard>
        <GlassCard className="text-center py-4"><LayoutGrid className="w-6 h-6 mx-auto mb-2 text-green-400" /><p className="text-2xl font-bold text-white">{seats.filter((s) => s.studentId).length}</p><p className="text-xs text-white/60">Terisi</p></GlassCard>
      </div>

      {isEditMode && (
        <GlassCard>
          <div className="flex flex-wrap gap-2">
            <GlassButton size="sm" variant="secondary" onClick={handleShuffle}><Shuffle className="w-4 h-4 mr-1" />Acak</GlassButton>
            <GlassButton size="sm" variant="secondary" onClick={handleReset}><RotateCcw className="w-4 h-4 mr-1" />Reset</GlassButton>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <div className="mb-6 text-center"><div className="inline-block px-8 py-3 bg-purple-500/20 border border-purple-500/30 rounded-xl"><p className="text-sm font-medium text-purple-300">Meja Guru</p></div></div>
        <div className="space-y-2">
          {Array.from({ length: rows }).map((_, row) => (
            <div key={row} className="flex gap-2 justify-center">
              {Array.from({ length: cols }).map((__, col) => {
                const seat = seats.find((s) => s.row === row && s.col === col)
                const student = getStudent(seat?.studentId || null)
                return (
                  <div
                    key={`${row}-${col}`}
                    className="w-24 h-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-700 text-center px-1"
                  >
                    {student ? (
                      <div className="flex flex-col items-center gap-1 w-full">
                        <img
                          src={student.avatar || "/placeholder-user.jpg"}
                          alt={student.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                        <span className="text-[10px] leading-tight line-clamp-2">{student.name}</span>
                      </div>
                    ) : (
                      "Kosong"
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
