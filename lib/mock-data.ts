// Types
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
  homeroomClassId?: string // Wali kelas
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

// Task/Assignment types
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

// Piket (Duty Schedule) types
export interface PiketSchedule {
  id: string
  classId: string
  day: string
  studentIds: string[]
  createdBy: string // teacherId
}

// Asset Report types
export interface AssetReport {
  id: string
  title: string
  description: string
  type: ReportType
  imageUrl?: string
  location: string
  reportedBy: string // studentId
  reportedAt: string
  status: ReportStatus
  handledBy?: string // adminId
  handledAt?: string
  resolution?: string
}

// Student Grade/Rapor types
export interface StudentGrade {
  id: string
  studentId: string
  subject: string
  teacherId: string
  semester: string
  knowledge: number // Nilai pengetahuan
  skill: number // Nilai keterampilan
  attitude: "A" | "B" | "C" | "D"
  notes?: string
}

// Parent types
export interface Parent extends User {
  role: "PARENT"
  childrenIds: string[] // Student IDs
  phone: string
}

// Student Payment/Finance types
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

// Attendance History
export interface AttendanceRecord {
  id: string
  studentId: string
  date: string
  status: AttendanceStatus
  notes?: string
}

// Activity Points
export interface ActivityPoint {
  id: string
  studentId: string
  type: "POSITIVE" | "NEGATIVE"
  category: string
  points: number
  description: string
  date: string
  givenBy: string // teacherId or adminId
}

// Canteen Owner types
export interface CanteenOwner extends User {
  role: "CANTEEN_OWNER"
  canteenId: string
  canteenName: string
  phone: string
  isActive: boolean
}

// Canteen types
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

// Product types
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

// Order types
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

// Mock Users
export const mockStudents: Student[] = [
  {
    id: "s1",
    name: "Andi Pratama",
    email: "andi@school.id",
    avatar: "/asian-boy-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 85,
    attendance: "PRESENT",
    seatRow: 0,
    seatCol: 0,
    coins: 1250,
    streak: 7,
    level: 12,
    xp: 3400,
  },
  {
    id: "s2",
    name: "Budi Santoso",
    email: "budi@school.id",
    avatar: "/asian-boy-glasses-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "UNPAID",
    behaviorScore: 72,
    attendance: "PRESENT",
    seatRow: 0,
    seatCol: 1,
    coins: 890,
    streak: 3,
    level: 8,
    xp: 2100,
  },
  {
    id: "s3",
    name: "Citra Dewi",
    email: "citra@school.id",
    avatar: "/asian-girl-student-hijab.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 95,
    attendance: "PRESENT",
    seatRow: 0,
    seatCol: 2,
    coins: 2100,
    streak: 14,
    level: 15,
    xp: 4200,
  },
  {
    id: "s4",
    name: "Dina Fitriani",
    email: "dina@school.id",
    avatar: "/asian-girl-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 88,
    attendance: "SICK",
    seatRow: 0,
    seatCol: 3,
    coins: 1560,
    streak: 0,
    level: 11,
    xp: 3100,
  },
  {
    id: "s5",
    name: "Eko Wijaya",
    email: "eko@school.id",
    avatar: "/asian-boy-student-sporty.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "UNPAID",
    behaviorScore: 65,
    attendance: "ALPHA",
    seatRow: 0,
    seatCol: 4,
    coins: 450,
    streak: 0,
    level: 5,
    xp: 1200,
  },
  {
    id: "s6",
    name: "Fani Rahayu",
    email: "fani@school.id",
    avatar: "/asian-girl-student-ponytail.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 92,
    attendance: "PRESENT",
    seatRow: 1,
    seatCol: 0,
    coins: 1890,
    streak: 10,
    level: 14,
    xp: 3800,
  },
  {
    id: "s7",
    name: "Gilang Ramadhan",
    email: "gilang@school.id",
    avatar: "/asian-boy-student-curly-hair.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 78,
    attendance: "PRESENT",
    seatRow: 1,
    seatCol: 1,
    coins: 1120,
    streak: 5,
    level: 9,
    xp: 2400,
  },
  {
    id: "s8",
    name: "Hana Permata",
    email: "hana@school.id",
    avatar: "/asian-girl-student-glasses.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 98,
    attendance: "PRESENT",
    seatRow: 1,
    seatCol: 2,
    coins: 2450,
    streak: 21,
    level: 18,
    xp: 5100,
  },
  {
    id: "s9",
    name: "Irfan Hakim",
    email: "irfan@school.id",
    avatar: "/asian-boy-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "UNPAID",
    behaviorScore: 70,
    attendance: "PRESENT",
    seatRow: 1,
    seatCol: 3,
    coins: 670,
    streak: 2,
    level: 6,
    xp: 1500,
  },
  {
    id: "s10",
    name: "Jihan Aulia",
    email: "jihan@school.id",
    avatar: "/asian-girl-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 90,
    attendance: "PRESENT",
    seatRow: 1,
    seatCol: 4,
    coins: 1780,
    streak: 8,
    level: 13,
    xp: 3600,
  },
  {
    id: "s11",
    name: "Kevin Mahendra",
    email: "kevin@school.id",
    avatar: "/asian-boy-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 82,
    attendance: "PRESENT",
    seatRow: 2,
    seatCol: 0,
    coins: 1340,
    streak: 6,
    level: 10,
    xp: 2800,
  },
  {
    id: "s12",
    name: "Lina Marlina",
    email: "lina@school.id",
    avatar: "/asian-girl-student-braids.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 87,
    attendance: "SICK",
    seatRow: 2,
    seatCol: 1,
    coins: 1450,
    streak: 0,
    level: 11,
    xp: 3000,
  },
  {
    id: "s13",
    name: "Muhammad Rizki",
    email: "rizki@school.id",
    avatar: "/asian-boy-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 75,
    attendance: "PRESENT",
    seatRow: 2,
    seatCol: 2,
    coins: 980,
    streak: 4,
    level: 7,
    xp: 1900,
  },
  {
    id: "s14",
    name: "Nadia Putri",
    email: "nadia@school.id",
    avatar: "/asian-girl-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "UNPAID",
    behaviorScore: 68,
    attendance: "ALPHA",
    seatRow: 2,
    seatCol: 3,
    coins: 320,
    streak: 0,
    level: 4,
    xp: 900,
  },
  {
    id: "s15",
    name: "Oscar Pratama",
    email: "oscar@school.id",
    avatar: "/asian-boy-student-tall.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 83,
    attendance: "PRESENT",
    seatRow: 2,
    seatCol: 4,
    coins: 1290,
    streak: 5,
    level: 10,
    xp: 2700,
  },
  {
    id: "s16",
    name: "Putri Wulandari",
    email: "putri@school.id",
    avatar: "/asian-girl-student-long-hair.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 94,
    attendance: "PRESENT",
    seatRow: 3,
    seatCol: 0,
    coins: 2050,
    streak: 12,
    level: 15,
    xp: 4100,
  },
  {
    id: "s17",
    name: "Qori Ahmad",
    email: "qori@school.id",
    avatar: "/asian-boy-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 79,
    attendance: "PRESENT",
    seatRow: 3,
    seatCol: 1,
    coins: 1150,
    streak: 4,
    level: 9,
    xp: 2300,
  },
  {
    id: "s18",
    name: "Rina Safitri",
    email: "rina@school.id",
    avatar: "/asian-girl-student-short-hair.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 91,
    attendance: "PRESENT",
    seatRow: 3,
    seatCol: 2,
    coins: 1820,
    streak: 9,
    level: 14,
    xp: 3700,
  },
  {
    id: "s19",
    name: "Satria Nugraha",
    email: "satria@school.id",
    avatar: "/asian-boy-student-athletic.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 76,
    attendance: "PRESENT",
    seatRow: 3,
    seatCol: 3,
    coins: 1020,
    streak: 3,
    level: 8,
    xp: 2000,
  },
  {
    id: "s20",
    name: "Tania Maharani",
    email: "tania@school.id",
    avatar: "/asian-girl-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 89,
    attendance: "PRESENT",
    seatRow: 3,
    seatCol: 4,
    coins: 1680,
    streak: 7,
    level: 12,
    xp: 3300,
  },
  {
    id: "s21",
    name: "Umar Faruq",
    email: "umar@school.id",
    avatar: "/asian-boy-student-cap.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 80,
    attendance: "PRESENT",
    seatRow: 4,
    seatCol: 0,
    coins: 1200,
    streak: 5,
    level: 10,
    xp: 2600,
  },
  {
    id: "s22",
    name: "Vina Octavia",
    email: "vina@school.id",
    avatar: "/asian-girl-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 93,
    attendance: "PRESENT",
    seatRow: 4,
    seatCol: 1,
    coins: 1950,
    streak: 11,
    level: 14,
    xp: 3900,
  },
  {
    id: "s23",
    name: "Wahyu Hidayat",
    email: "wahyu@school.id",
    avatar: "/asian-boy-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "UNPAID",
    behaviorScore: 67,
    attendance: "PRESENT",
    seatRow: 4,
    seatCol: 2,
    coins: 540,
    streak: 1,
    level: 5,
    xp: 1100,
  },
  {
    id: "s24",
    name: "Xena Amelia",
    email: "xena@school.id",
    avatar: "/asian-girl-student.jpg",
    role: "STUDENT",
    classId: "c1",
    paymentStatus: "PAID",
    behaviorScore: 86,
    attendance: "PRESENT",
    seatRow: 4,
    seatCol: 3,
    coins: 1520,
    streak: 6,
    level: 11,
    xp: 3050,
  },
]

export const mockEmployees: Employee[] = [
  {
    id: "e1",
    name: "Dr. Ahmad Fauzi",
    email: "ahmad@school.id",
    avatar: "/asian-male-teacher-professional.jpg",
    role: "EMPLOYEE",
    subject: "Mathematics",
    rating: 4.8,
    classesCount: 12,
    homeroomClassId: "c1", // Wali kelas 10-A
  },
  {
    id: "e2",
    name: "Ibu Sri Wahyuni",
    email: "sri@school.id",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&q=80",
    role: "EMPLOYEE",
    subject: "Indonesian",
    rating: 4.9,
    classesCount: 15,
    homeroomClassId: "c2",
  },
  {
    id: "e3",
    name: "Pak Budi Hartono",
    email: "budi.h@school.id",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80",
    role: "EMPLOYEE",
    subject: "Physics",
    rating: 4.7,
    classesCount: 10,
    homeroomClassId: "c3",
  },
  {
    id: "e4",
    name: "Ibu Maria Santos",
    email: "maria@school.id",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&q=80",
    role: "EMPLOYEE",
    subject: "English",
    rating: 4.6,
    classesCount: 14,
  },
  {
    id: "e5",
    name: "Pak Hendra Wijaya",
    email: "hendra@school.id",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80",
    role: "EMPLOYEE",
    subject: "Chemistry",
    rating: 4.5,
    classesCount: 8,
  },
]

export const mockAdmins: User[] = [
  {
    id: "a1",
    name: "Admin Sekolah",
    email: "admin@school.id",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&q=80",
    role: "ADMIN",
  },
]

export const mockSuperAdmins: User[] = [
  {
    id: "sa1",
    name: "Kepala Sekolah",
    email: "kepsek@school.id",
    avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&q=80",
    role: "SUPER_ADMIN",
  },
]

export const mockClasses: ClassRoom[] = [
  { id: "c1", name: "Class 10-A", grade: "10", rows: 5, cols: 5, teacherId: "e1" },
  { id: "c2", name: "Class 10-B", grade: "10", rows: 5, cols: 6, teacherId: "e2" },
  { id: "c3", name: "Class 11-A", grade: "11", rows: 5, cols: 5, teacherId: "e3" },
]

export const mockSchedule: Schedule[] = [
  {
    id: "sch1",
    classId: "c1",
    subject: "Mathematics",
    teacherId: "e1",
    day: "Monday",
    startTime: "07:00",
    endTime: "08:30",
    room: "Room 101",
  },
  {
    id: "sch2",
    classId: "c1",
    subject: "Indonesian",
    teacherId: "e2",
    day: "Monday",
    startTime: "08:45",
    endTime: "10:15",
    room: "Room 101",
  },
  {
    id: "sch3",
    classId: "c1",
    subject: "Physics",
    teacherId: "e3",
    day: "Monday",
    startTime: "10:30",
    endTime: "12:00",
    room: "Lab Physics",
  },
  {
    id: "sch4",
    classId: "c1",
    subject: "English",
    teacherId: "e4",
    day: "Tuesday",
    startTime: "07:00",
    endTime: "08:30",
    room: "Room 101",
  },
  {
    id: "sch5",
    classId: "c1",
    subject: "Chemistry",
    teacherId: "e5",
    day: "Tuesday",
    startTime: "08:45",
    endTime: "10:15",
    room: "Lab Chemistry",
  },
  {
    id: "sch6",
    classId: "c1",
    subject: "Mathematics",
    teacherId: "e1",
    day: "Wednesday",
    startTime: "07:00",
    endTime: "08:30",
    room: "Room 101",
  },
  {
    id: "sch7",
    classId: "c1",
    subject: "Indonesian",
    teacherId: "e2",
    day: "Wednesday",
    startTime: "08:45",
    endTime: "10:15",
    room: "Room 101",
  },
  {
    id: "sch8",
    classId: "c1",
    subject: "Physics",
    teacherId: "e3",
    day: "Thursday",
    startTime: "07:00",
    endTime: "08:30",
    room: "Lab Physics",
  },
  {
    id: "sch9",
    classId: "c1",
    subject: "English",
    teacherId: "e4",
    day: "Thursday",
    startTime: "08:45",
    endTime: "10:15",
    room: "Room 101",
  },
  {
    id: "sch10",
    classId: "c1",
    subject: "Chemistry",
    teacherId: "e5",
    day: "Friday",
    startTime: "07:00",
    endTime: "08:30",
    room: "Lab Chemistry",
  },
]

export const mockFinancialData: FinancialData[] = [
  { month: "Jan", income: 125000000, expenses: 98000000 },
  { month: "Feb", income: 132000000, expenses: 102000000 },
  { month: "Mar", income: 128000000, expenses: 95000000 },
  { month: "Apr", income: 145000000, expenses: 110000000 },
  { month: "May", income: 138000000, expenses: 105000000 },
  { month: "Jun", income: 152000000, expenses: 115000000 },
]

// Helper functions
export const getStudentsByClass = (classId: string): Student[] => {
  return mockStudents.filter((s) => s.classId === classId)
}

export const getClassById = (classId: string): ClassRoom | undefined => {
  return mockClasses.find((c) => c.id === classId)
}

export const getEmployeeById = (employeeId: string): Employee | undefined => {
  return mockEmployees.find((e) => e.id === employeeId)
}

export const getScheduleByClass = (classId: string): Schedule[] => {
  return mockSchedule.filter((s) => s.classId === classId)
}

export const getStudentById = (studentId: string): Student | undefined => {
  return mockStudents.find((s) => s.id === studentId)
}

// Mock Tasks
export const mockTasks: Task[] = [
  {
    id: "t1",
    title: "Tugas Matematika: Persamaan Linear",
    description: "Kerjakan soal nomor 1-10 pada buku halaman 45. Tulis langkah-langkah penyelesaian dengan jelas.",
    subject: "Mathematics",
    classId: "c1",
    teacherId: "e1",
    dueDate: "2025-12-25",
    createdAt: "2025-12-20",
    attachmentUrl: "https://example.com/modul-matematika-linear",
    imageUrl: "/asian-male-teacher-professional.jpg",
    maxScore: 100,
  },
  {
    id: "t2",
    title: "Essay Bahasa Indonesia",
    description: "Tulis essay tentang 'Peran Pemuda dalam Pembangunan Bangsa' minimal 500 kata.",
    subject: "Indonesian",
    classId: "c1",
    teacherId: "e2",
    dueDate: "2025-12-26",
    createdAt: "2025-12-21",
    maxScore: 100,
  },
  {
    id: "t3",
    title: "Laporan Praktikum Fisika",
    description: "Buat laporan praktikum tentang gerak lurus berubah beraturan. Sertakan data, analisis, dan kesimpulan.",
    subject: "Physics",
    classId: "c1",
    teacherId: "e3",
    dueDate: "2025-12-28",
    createdAt: "2025-12-22",
    maxScore: 100,
  },
]

export const mockTaskSubmissions: TaskSubmission[] = [
  {
    id: "ts1",
    taskId: "t1",
    studentId: "s1",
    submittedAt: "2025-12-23",
    attachmentUrl: "https://docs.example.com/hasil-andi-linear",
    imageUrl: "/asian-boy-student.jpg",
    attachmentName: "tugas_matematika_andi.pdf",
    score: 85,
    feedback: "Bagus! Langkah-langkah sudah jelas.",
    status: "GRADED",
  },
  {
    id: "ts2",
    taskId: "t1",
    studentId: "s2",
    submittedAt: "2025-12-24",
    attachmentName: "matematika_budi.pdf",
    status: "SUBMITTED",
  },
]

// Mock Piket Schedule
export const mockPiketSchedule: PiketSchedule[] = [
  { id: "p1", classId: "c1", day: "Monday", studentIds: ["s1", "s2", "s3"], createdBy: "e1" },
  { id: "p2", classId: "c1", day: "Tuesday", studentIds: ["s4", "s5", "s6"], createdBy: "e1" },
  { id: "p3", classId: "c1", day: "Wednesday", studentIds: ["s7", "s8", "s9"], createdBy: "e1" },
  { id: "p4", classId: "c1", day: "Thursday", studentIds: ["s10", "s11", "s12"], createdBy: "e1" },
  { id: "p5", classId: "c1", day: "Friday", studentIds: ["s13", "s14", "s15"], createdBy: "e1" },
]

// Mock Asset Reports
export const mockAssetReports: AssetReport[] = [
  {
    id: "ar1",
    title: "AC Rusak di Ruang 101",
    description: "AC tidak dingin dan mengeluarkan suara bising",
    type: "KERUSAKAN",
    location: "Ruang 101",
    reportedBy: "s1",
    reportedAt: "2025-12-20",
    status: "PENDING",
  },
  {
    id: "ar2",
    title: "Kursi Patah",
    description: "Kursi di baris 3 patah kakinya",
    type: "KERUSAKAN",
    location: "Ruang 102",
    reportedBy: "s3",
    reportedAt: "2025-12-19",
    status: "IN_PROGRESS",
    handledBy: "a1",
    handledAt: "2025-12-20",
  },
  {
    id: "ar3",
    title: "Lampu Mati",
    description: "Lampu di sudut kelas tidak menyala",
    type: "FASILITAS",
    location: "Ruang 101",
    reportedBy: "s5",
    reportedAt: "2025-12-18",
    status: "RESOLVED",
    handledBy: "a1",
    handledAt: "2025-12-19",
    resolution: "Lampu sudah diganti dengan yang baru",
  },
]

// Mock Student Grades
export const mockStudentGrades: StudentGrade[] = [
  { id: "g1", studentId: "s1", subject: "Mathematics", teacherId: "e1", semester: "Ganjil 2025", knowledge: 85, skill: 88, attitude: "A", notes: "Sangat baik" },
  { id: "g2", studentId: "s1", subject: "Indonesian", teacherId: "e2", semester: "Ganjil 2025", knowledge: 82, skill: 80, attitude: "B", notes: "Baik" },
  { id: "g3", studentId: "s1", subject: "Physics", teacherId: "e3", semester: "Ganjil 2025", knowledge: 90, skill: 85, attitude: "A", notes: "Sangat baik" },
  { id: "g4", studentId: "s2", subject: "Mathematics", teacherId: "e1", semester: "Ganjil 2025", knowledge: 75, skill: 78, attitude: "B" },
  { id: "g5", studentId: "s2", subject: "Indonesian", teacherId: "e2", semester: "Ganjil 2025", knowledge: 80, skill: 82, attitude: "B" },
]

// Helper functions for new features
export const getTasksByClass = (classId: string): Task[] => {
  return mockTasks.filter((t) => t.classId === classId)
}

export const getTasksByTeacher = (teacherId: string): Task[] => {
  return mockTasks.filter((t) => t.teacherId === teacherId)
}

export const getSubmissionsByTask = (taskId: string): TaskSubmission[] => {
  return mockTaskSubmissions.filter((s) => s.taskId === taskId)
}

export const getSubmissionsByStudent = (studentId: string): TaskSubmission[] => {
  return mockTaskSubmissions.filter((s) => s.studentId === studentId)
}

export const getPiketByClass = (classId: string): PiketSchedule[] => {
  return mockPiketSchedule.filter((p) => p.classId === classId)
}

export const getAssetReportsByStudent = (studentId: string): AssetReport[] => {
  return mockAssetReports.filter((r) => r.reportedBy === studentId)
}

export const getGradesByStudent = (studentId: string): StudentGrade[] => {
  return mockStudentGrades.filter((g) => g.studentId === studentId)
}

export const getGradesByTeacher = (teacherId: string): StudentGrade[] => {
  return mockStudentGrades.filter((g) => g.teacherId === teacherId)
}

// Mock Parents
export const mockParents: Parent[] = [
  {
    id: "p1",
    name: "Bapak Pratama",
    email: "bapak.pratama@gmail.com",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80",
    role: "PARENT",
    childrenIds: ["s1"], // Andi Pratama
    phone: "081234567890",
  },
  {
    id: "p2",
    name: "Ibu Santoso",
    email: "ibu.santoso@gmail.com",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80",
    role: "PARENT",
    childrenIds: ["s2"], // Budi Santoso
    phone: "081234567891",
  },
  {
    id: "p3",
    name: "Bapak Dewi",
    email: "bapak.dewi@gmail.com",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&q=80",
    role: "PARENT",
    childrenIds: ["s3"], // Citra Dewi
    phone: "081234567892",
  },
]

// Mock Student Payments
export const mockStudentPayments: StudentPayment[] = [
  // Andi Pratama (s1) - PAID
  {
    id: "pay1",
    studentId: "s1",
    type: "SPP",
    description: "SPP Bulan Januari 2025",
    amount: 1500000,
    dueDate: "2025-01-10",
    paidDate: "2025-01-05",
    status: "PAID",
    semester: "Genap 2024/2025",
  },
  {
    id: "pay2",
    studentId: "s1",
    type: "SPP",
    description: "SPP Bulan Februari 2025",
    amount: 1500000,
    dueDate: "2025-02-10",
    paidDate: "2025-02-08",
    status: "PAID",
    semester: "Genap 2024/2025",
  },
  {
    id: "pay3",
    studentId: "s1",
    type: "DSP",
    description: "Dana Sumbangan Pendidikan Semester Genap",
    amount: 5000000,
    dueDate: "2025-01-15",
    paidDate: "2025-01-10",
    status: "PAID",
    semester: "Genap 2024/2025",
  },
  // Budi Santoso (s2) - UNPAID
  {
    id: "pay4",
    studentId: "s2",
    type: "SPP",
    description: "SPP Bulan Januari 2025",
    amount: 1500000,
    dueDate: "2025-01-10",
    status: "UNPAID",
    semester: "Genap 2024/2025",
  },
  {
    id: "pay5",
    studentId: "s2",
    type: "DSP",
    description: "Dana Sumbangan Pendidikan Semester Genap",
    amount: 5000000,
    dueDate: "2025-01-15",
    paidDate: "2025-01-15",
    status: "PARTIAL",
    semester: "Genap 2024/2025",
  },
  // Citra Dewi (s3) - PAID
  {
    id: "pay6",
    studentId: "s3",
    type: "SPP",
    description: "SPP Bulan Januari 2025",
    amount: 1500000,
    dueDate: "2025-01-10",
    paidDate: "2025-01-08",
    status: "PAID",
    semester: "Genap 2024/2025",
  },
]

// Mock Attendance Records
export const mockAttendanceRecords: AttendanceRecord[] = [
  // Andi Pratama (s1)
  { id: "att1", studentId: "s1", date: "2025-12-30", status: "PRESENT" },
  { id: "att2", studentId: "s1", date: "2025-12-29", status: "PRESENT" },
  { id: "att3", studentId: "s1", date: "2025-12-28", status: "SICK", notes: "Demam" },
  { id: "att4", studentId: "s1", date: "2025-12-27", status: "PRESENT" },
  { id: "att5", studentId: "s1", date: "2025-12-26", status: "PRESENT" },
  // Budi Santoso (s2)
  { id: "att6", studentId: "s2", date: "2025-12-30", status: "PRESENT" },
  { id: "att7", studentId: "s2", date: "2025-12-29", status: "ALPHA" },
  { id: "att8", studentId: "s2", date: "2025-12-28", status: "PRESENT" },
  // Citra Dewi (s3)
  { id: "att9", studentId: "s3", date: "2025-12-30", status: "PRESENT" },
  { id: "att10", studentId: "s3", date: "2025-12-29", status: "PRESENT" },
  { id: "att11", studentId: "s3", date: "2025-12-28", status: "PRESENT" },
]

// Mock Activity Points
export const mockActivityPoints: ActivityPoint[] = [
  // Andi Pratama (s1)
  { id: "ap1", studentId: "s1", type: "POSITIVE", category: "Akademik", points: 10, description: "Juara 1 Olimpiade Matematika Tingkat Kota", date: "2025-12-15", givenBy: "e1" },
  { id: "ap2", studentId: "s1", type: "POSITIVE", category: "Ekstrakurikuler", points: 5, description: "Aktif dalam kegiatan OSIS", date: "2025-12-10", givenBy: "e2" },
  { id: "ap3", studentId: "s1", type: "NEGATIVE", category: "Kedisiplinan", points: -2, description: "Terlambat masuk kelas", date: "2025-12-20", givenBy: "e1" },
  // Budi Santoso (s2)
  { id: "ap4", studentId: "s2", type: "NEGATIVE", category: "Kedisiplinan", points: -5, description: "Tidak mengerjakan PR 3x berturut-turut", date: "2025-12-18", givenBy: "e2" },
  { id: "ap5", studentId: "s2", type: "POSITIVE", category: "Sosial", points: 3, description: "Membantu teman yang kesulitan", date: "2025-12-22", givenBy: "e3" },
  // Citra Dewi (s3)
  { id: "ap6", studentId: "s3", type: "POSITIVE", category: "Akademik", points: 15, description: "Nilai ujian tertinggi di kelas", date: "2025-12-12", givenBy: "e1" },
  { id: "ap7", studentId: "s3", type: "POSITIVE", category: "Kepemimpinan", points: 10, description: "Ketua kelas yang aktif dan bertanggung jawab", date: "2025-12-01", givenBy: "e1" },
]

// Mock Canteen Owners
export const mockCanteenOwners: CanteenOwner[] = [
  {
    id: "co1",
    name: "Ibu Wartini",
    email: "wartini@canteen.id",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80",
    role: "CANTEEN_OWNER",
    canteenId: "can1",
    canteenName: "Kantin Bu Wartini",
    phone: "081345678901",
    isActive: true,
  },
  {
    id: "co2",
    name: "Pak Joko",
    email: "joko@canteen.id",
    avatar: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=100&h=100&fit=crop&q=80",
    role: "CANTEEN_OWNER",
    canteenId: "can2",
    canteenName: "Warung Pak Joko",
    phone: "081345678902",
    isActive: true,
  },
  {
    id: "co3",
    name: "Ibu Siti",
    email: "siti@canteen.id",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&q=80",
    role: "CANTEEN_OWNER",
    canteenId: "can3",
    canteenName: "Kantin Sehat Bu Siti",
    phone: "081345678903",
    isActive: false,
  },
]

// Mock Canteens
export const mockCanteens: Canteen[] = [
  {
    id: "can1",
    name: "Kantin Bu Wartini",
    ownerId: "co1",
    description: "Menyediakan berbagai makanan dan minuman tradisional dengan harga terjangkau",
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop&q=80",
    rating: 4.8,
    totalOrders: 1520,
    isOpen: true,
  },
  {
    id: "can2",
    name: "Warung Pak Joko",
    ownerId: "co2",
    description: "Spesialis nasi goreng, mie goreng, dan aneka gorengan",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop&q=80",
    rating: 4.6,
    totalOrders: 980,
    isOpen: true,
  },
  {
    id: "can3",
    name: "Kantin Sehat Bu Siti",
    ownerId: "co3",
    description: "Menu sehat dengan sayuran organik dan tanpa MSG",
    image: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop&q=80",
    rating: 4.5,
    totalOrders: 450,
    isOpen: false,
  },
]

// Mock Products
export const mockProducts: Product[] = [
  // Kantin Bu Wartini (can1)
  { id: "prod1", canteenId: "can1", name: "Nasi Uduk", description: "Nasi uduk dengan lauk ayam goreng, tempe orek, dan sambal", price: 15000, image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=300&h=300&fit=crop&q=80", category: "MAKANAN", stock: 50, isAvailable: true },
  { id: "prod2", canteenId: "can1", name: "Soto Ayam", description: "Soto ayam kuning dengan pelengkap lengkap", price: 12000, image: "https://images.unsplash.com/photo-1547928578-bca3c3a3b2b2?w=300&h=300&fit=crop&q=80", category: "MAKANAN", stock: 30, isAvailable: true },
  { id: "prod3", canteenId: "can1", name: "Es Teh Manis", description: "Es teh manis segar", price: 5000, image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&h=300&fit=crop&q=80", category: "MINUMAN", stock: 100, isAvailable: true },
  { id: "prod4", canteenId: "can1", name: "Kue Lumpur", description: "Kue lumpur lembut dan manis", price: 3000, image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=300&fit=crop&q=80", category: "SNACK", stock: 40, isAvailable: true },
  // Warung Pak Joko (can2)
  { id: "prod5", canteenId: "can2", name: "Nasi Goreng Spesial", description: "Nasi goreng dengan telur, ayam, dan kerupuk", price: 18000, image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=300&h=300&fit=crop&q=80", category: "MAKANAN", stock: 40, isAvailable: true },
  { id: "prod6", canteenId: "can2", name: "Mie Goreng", description: "Mie goreng dengan sayuran dan telur", price: 15000, image: "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=300&h=300&fit=crop&q=80", category: "MAKANAN", stock: 35, isAvailable: true },
  { id: "prod7", canteenId: "can2", name: "Gorengan Campur", description: "Paket gorengan: bakwan, tahu, tempe, pisang", price: 10000, image: "https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=300&h=300&fit=crop&q=80", category: "SNACK", stock: 60, isAvailable: true },
  { id: "prod8", canteenId: "can2", name: "Es Jeruk", description: "Es jeruk peras segar", price: 6000, image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=300&fit=crop&q=80", category: "MINUMAN", stock: 80, isAvailable: true },
  // Kantin Sehat Bu Siti (can3)
  { id: "prod9", canteenId: "can3", name: "Salad Buah", description: "Salad buah segar dengan yogurt", price: 12000, image: "https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=300&h=300&fit=crop&q=80", category: "MAKANAN", stock: 25, isAvailable: true },
  { id: "prod10", canteenId: "can3", name: "Jus Bayam", description: "Jus bayam sehat tanpa gula", price: 8000, image: "https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=300&h=300&fit=crop&q=80", category: "MINUMAN", stock: 30, isAvailable: true },
]

// Mock Orders
export const mockOrders: Order[] = [
  {
    id: "ord1",
    canteenId: "can1",
    customerId: "s1",
    customerRole: "STUDENT",
    customerName: "Andi Pratama",
    items: [
      { productId: "prod1", productName: "Nasi Uduk", quantity: 1, price: 15000 },
      { productId: "prod3", productName: "Es Teh Manis", quantity: 1, price: 5000 },
    ],
    totalAmount: 20000,
    status: "COMPLETED",
    createdAt: "2025-12-30T10:30:00",
    completedAt: "2025-12-30T10:45:00",
  },
  {
    id: "ord2",
    canteenId: "can2",
    customerId: "e1",
    customerRole: "EMPLOYEE",
    customerName: "Dr. Ahmad Fauzi",
    items: [
      { productId: "prod5", productName: "Nasi Goreng Spesial", quantity: 1, price: 18000 },
      { productId: "prod8", productName: "Es Jeruk", quantity: 2, price: 12000 },
    ],
    totalAmount: 30000,
    status: "READY",
    createdAt: "2025-12-30T11:00:00",
  },
  {
    id: "ord3",
    canteenId: "can1",
    customerId: "s3",
    customerRole: "STUDENT",
    customerName: "Citra Dewi",
    items: [
      { productId: "prod2", productName: "Soto Ayam", quantity: 2, price: 24000 },
    ],
    totalAmount: 24000,
    status: "PREPARING",
    createdAt: "2025-12-30T11:15:00",
    notes: "Kuahnya agak banyak ya bu",
  },
  {
    id: "ord4",
    canteenId: "can1",
    customerId: "a1",
    customerRole: "ADMIN",
    customerName: "Admin Sekolah",
    items: [
      { productId: "prod1", productName: "Nasi Uduk", quantity: 3, price: 45000 },
      { productId: "prod4", productName: "Kue Lumpur", quantity: 5, price: 15000 },
    ],
    totalAmount: 60000,
    status: "PENDING",
    createdAt: "2025-12-30T11:30:00",
  },
]

// Helper functions for new features
export const getParentById = (parentId: string): Parent | undefined => {
  return mockParents.find((p) => p.id === parentId)
}

export const getChildrenByParent = (parentId: string): Student[] => {
  const parent = mockParents.find((p) => p.id === parentId)
  if (!parent) return []
  return mockStudents.filter((s) => parent.childrenIds.includes(s.id))
}

export const getPaymentsByStudent = (studentId: string): StudentPayment[] => {
  return mockStudentPayments.filter((p) => p.studentId === studentId)
}

export const getAttendanceByStudent = (studentId: string): AttendanceRecord[] => {
  return mockAttendanceRecords.filter((a) => a.studentId === studentId)
}

export const getActivityPointsByStudent = (studentId: string): ActivityPoint[] => {
  return mockActivityPoints.filter((a) => a.studentId === studentId)
}

export const getCanteenOwnerById = (ownerId: string): CanteenOwner | undefined => {
  return mockCanteenOwners.find((c) => c.id === ownerId)
}

export const getCanteenById = (canteenId: string): Canteen | undefined => {
  return mockCanteens.find((c) => c.id === canteenId)
}

export const getProductsByCanteen = (canteenId: string): Product[] => {
  return mockProducts.filter((p) => p.canteenId === canteenId)
}

export const getOrdersByCanteen = (canteenId: string): Order[] => {
  return mockOrders.filter((o) => o.canteenId === canteenId)
}

export const getOrdersByCustomer = (customerId: string): Order[] => {
  return mockOrders.filter((o) => o.customerId === customerId)
}
