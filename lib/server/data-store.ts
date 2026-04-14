import type {
  ClassRoom,
  Employee,
  Order,
  Product,
  Student,
  Parent,
  Canteen,
  CanteenOwner,
  Schedule,
  Task,
  TaskSubmission,
  PiketSchedule,
  User,
  ActivityPoint,
  AttendanceRecord,
  StudentGrade,
  StudentPayment,
} from "@/lib/data-model"

export interface StudentReport {
  id: string
  studentId: string
  assetId: string
  assetName: string
  damageType: string
  description: string
  status: "pending" | "in_progress" | "resolved"
  createdAt: string
  location: string
}

export interface AuditLog {
  id: string
  actorId: string
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT"
  entityName: string
  entityId: string
  oldValueJson: string
  newValueJson: string
  createdAt: string
}

const db = {
  orders: [] as Order[],
  products: [] as Product[],
  activityPoints: [] as ActivityPoint[],
  attendance: [] as AttendanceRecord[],
  grades: [] as StudentGrade[],
  payments: [] as StudentPayment[],
  auditLogs: [] as AuditLog[],
  teachers: [] as Employee[],
  admins: [] as User[],
  superAdmins: [] as User[],
  schedules: [] as Schedule[],
  piketSchedules: [] as PiketSchedule[],
  tasks: [] as Task[],
  taskSubmissions: [] as TaskSubmission[],
  classes: [] as ClassRoom[],
  studentReports: [] as StudentReport[],
  students: [] as Student[],
  parents: [] as Parent[],
  canteens: [] as Canteen[],
  canteenOwners: [] as CanteenOwner[],
}

export const getDbOrders = () => db.orders
export const setDbOrders = (orders: Order[]) => {
  db.orders = orders
}

export const getDbProducts = () => db.products
export const setDbProducts = (products: Product[]) => {
  db.products = products
}

export const getDbActivityPoints = () => db.activityPoints
export const setDbActivityPoints = (activityPoints: ActivityPoint[]) => {
  db.activityPoints = activityPoints
}

export const getDbAttendance = () => db.attendance
export const getDbGrades = () => db.grades
export const setDbGrades = (grades: StudentGrade[]) => {
  db.grades = grades
}

export const getDbPayments = () => db.payments

export const getDbAuditLogs = () => db.auditLogs
export const setDbAuditLogs = (auditLogs: AuditLog[]) => {
  db.auditLogs = auditLogs
}

export const getDbTeachers = () => db.teachers
export const setDbTeachers = (teachers: Employee[]) => {
  db.teachers = teachers
}

export const getDbAdmins = () => db.admins
export const setDbAdmins = (admins: User[]) => {
  db.admins = admins
}

export const getDbSuperAdmins = () => db.superAdmins
export const setDbSuperAdmins = (superAdmins: User[]) => {
  db.superAdmins = superAdmins
}

export const getDbSchedules = () => db.schedules
export const setDbSchedules = (schedules: Schedule[]) => {
  db.schedules = schedules
}

export const getDbPiketSchedules = () => db.piketSchedules
export const setDbPiketSchedules = (piketSchedules: PiketSchedule[]) => {
  db.piketSchedules = piketSchedules
}

export const getDbTasks = () => db.tasks
export const setDbTasks = (tasks: Task[]) => {
  db.tasks = tasks
}

export const getDbTaskSubmissions = () => db.taskSubmissions
export const setDbTaskSubmissions = (taskSubmissions: TaskSubmission[]) => {
  db.taskSubmissions = taskSubmissions
}

export const getDbClasses = () => db.classes
export const setDbClasses = (classes: ClassRoom[]) => {
  db.classes = classes
}

export const getDbStudents = () => db.students
export const setDbStudents = (students: Student[]) => {
  db.students = students
}

export const getDbParents = () => db.parents
export const setDbParents = (parents: Parent[]) => {
  db.parents = parents
}

export const getDbCanteens = () => db.canteens
export const setDbCanteens = (canteens: Canteen[]) => {
  db.canteens = canteens
}

export const getDbCanteenOwners = () => db.canteenOwners
export const setDbCanteenOwners = (canteenOwners: CanteenOwner[]) => {
  db.canteenOwners = canteenOwners
}

export const getDbStudentReports = () => db.studentReports
export const setDbStudentReports = (studentReports: StudentReport[]) => {
  db.studentReports = studentReports
}
