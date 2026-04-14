export type UserRole = "STUDENT" | "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN" | "PARENT" | "CANTEEN_OWNER"
export type PaymentStatus = "PAID" | "UNPAID" | "PARTIAL"
export type AttendanceStatus = "PRESENT" | "SICK" | "ALPHA"
export type TaskStatus = "PENDING" | "SUBMITTED" | "GRADED" | "LATE"
export type ReportStatus = "PENDING" | "IN_PROGRESS" | "RESOLVED"
export type ReportType = "KERUSAKAN" | "FASILITAS" | "LAINNYA"
export type OrderStatus = "PENDING" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
export type ProductCategory = "MAKANAN" | "MINUMAN" | "SNACK"

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  classId?: string
}

export interface Student extends User {
  role: "STUDENT"
  paymentStatus: PaymentStatus
  behaviorScore: number
  attendance: AttendanceStatus
  seatRow: number
  seatCol: number
  coins: number
  streak: number
  level: number
  xp: number
}

export interface Employee extends User {
  role: "EMPLOYEE"
  subject: string
  rating: number
  classesCount: number
  homeroomClassId?: string
}

export interface ClassRoom {
  id: string
  name: string
  grade: string
  rows: number
  cols: number
  teacherId: string
}

export interface Schedule {
  id: string
  classId: string
  subject: string
  teacherId: string
  day: string
  startTime: string
  endTime: string
  room: string
}

export interface FinancialData {
  month: string
  income: number
  expenses: number
}

export interface Task {
  id: string
  title: string
  description: string
  subject: string
  classId: string
  teacherId: string
  dueDate: string
  createdAt: string
  attachmentUrl?: string
  attachmentName?: string
  imageUrl?: string
  maxScore: number
}

export interface TaskSubmission {
  id: string
  taskId: string
  studentId: string
  submittedAt: string
  attachmentUrl?: string
  imageUrl?: string
  attachmentName?: string
  score?: number
  feedback?: string
  status: TaskStatus
}

export interface PiketSchedule {
  id: string
  classId: string
  day: string
  studentIds: string[]
  createdBy: string
}

export interface AssetReport {
  id: string
  title: string
  description: string
  type: ReportType
  imageUrl?: string
  location: string
  reportedBy: string
  reportedAt: string
  status: ReportStatus
  handledBy?: string
  handledAt?: string
  resolution?: string
}

export interface StudentGrade {
  id: string
  studentId: string
  subject: string
  teacherId: string
  semester: string
  knowledge: number
  skill: number
  attitude: "A" | "B" | "C" | "D"
  notes?: string
}

export interface Parent extends User {
  role: "PARENT"
  childrenIds: string[]
  phone: string
}

export interface StudentPayment {
  id: string
  studentId: string
  type: "SPP" | "DSP" | "LAINNYA"
  description: string
  amount: number
  dueDate: string
  paidDate?: string
  status: PaymentStatus
  semester: string
}

export interface AttendanceRecord {
  id: string
  studentId: string
  date: string
  status: AttendanceStatus
  notes?: string
}

export interface ActivityPoint {
  id: string
  studentId: string
  type: "POSITIVE" | "NEGATIVE"
  category: string
  points: number
  description: string
  date: string
  givenBy: string
}

export interface CanteenOwner extends User {
  role: "CANTEEN_OWNER"
  canteenId: string
  canteenName: string
  phone: string
  isActive: boolean
}

export interface Canteen {
  id: string
  name: string
  ownerId: string
  description: string
  image: string
  rating: number
  totalOrders: number
  isOpen: boolean
}

export interface Product {
  id: string
  canteenId: string
  name: string
  description: string
  price: number
  image: string
  category: ProductCategory
  stock: number
  isAvailable: boolean
}

export interface Order {
  id: string
  canteenId: string
  customerId: string
  customerRole: UserRole
  customerName: string
  items: OrderItem[]
  totalAmount: number
  status: OrderStatus
  createdAt: string
  completedAt?: string
  notes?: string
}

export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
}
