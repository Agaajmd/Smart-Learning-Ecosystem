import type { ActivityPoint, StudentGrade } from "@/lib/mock-data"
import { mockActivityPoints, mockStudentGrades } from "@/lib/mock-data"

const GRADES_KEY = "aegix_student_grades_v1"
const ACTIVITY_POINTS_KEY = "aegix_activity_points_v1"

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const canUseStorage = () => typeof window !== "undefined"

const readStorage = <T,>(key: string, fallback: T): T => {
  if (!canUseStorage()) return fallback
  return safeParse<T>(window.localStorage.getItem(key), fallback)
}

const writeStorage = <T,>(key: string, value: T) => {
  if (!canUseStorage()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export const getStoredStudentGrades = (): StudentGrade[] => {
  const grades = readStorage<StudentGrade[]>(GRADES_KEY, [])
  if (grades.length > 0) return grades
  writeStorage(GRADES_KEY, mockStudentGrades)
  return [...mockStudentGrades]
}

export const setStoredStudentGrades = (grades: StudentGrade[]) => {
  writeStorage(GRADES_KEY, grades)
}

export const getStoredGradesByStudent = (studentId: string): StudentGrade[] => {
  return getStoredStudentGrades().filter((grade) => grade.studentId === studentId)
}

export const getStoredGradesByTeacher = (teacherId: string): StudentGrade[] => {
  return getStoredStudentGrades().filter((grade) => grade.teacherId === teacherId)
}

export const getStoredActivityPoints = (): ActivityPoint[] => {
  const points = readStorage<ActivityPoint[]>(ACTIVITY_POINTS_KEY, [])
  if (points.length > 0) return points
  writeStorage(ACTIVITY_POINTS_KEY, mockActivityPoints)
  return [...mockActivityPoints]
}

export const setStoredActivityPoints = (points: ActivityPoint[]) => {
  writeStorage(ACTIVITY_POINTS_KEY, points)
}

export const addStoredActivityPoint = (point: ActivityPoint) => {
  const currentPoints = getStoredActivityPoints()
  const nextPoints = [point, ...currentPoints]
  setStoredActivityPoints(nextPoints)
}

export const getStoredActivityPointsByStudent = (studentId: string): ActivityPoint[] => {
  return getStoredActivityPoints().filter((point) => point.studentId === studentId)
}
