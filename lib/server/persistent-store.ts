import "server-only"

import { accessSync, constants, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"
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
  WalletTopup,
} from "@/lib/data-model"
import type { PageFeatureKey } from "@/lib/page-features"
import { normalizeDriveMediaUrl, normalizeDriveMediaUrlList } from "@/lib/google-drive"

export interface StudentReport {
  id: string
  studentId: string
  assetId: string
  assetName: string
  damageType: string
  description: string
  imageUrl?: string
  status: "pending" | "in_progress" | "resolved"
  createdAt: string
  location: string
  assignedTo?: string
  resolvedAt?: string
  resolution?: string
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

export interface PageFeatureSetting {
  key: PageFeatureKey
  enabled: boolean
  updatedAt: string
  updatedBy?: string
}

type PersistedDb = {
  orders: Order[]
  products: Product[]
  activityPoints: ActivityPoint[]
  attendance: AttendanceRecord[]
  grades: StudentGrade[]
  payments: StudentPayment[]
  auditLogs: AuditLog[]
  teachers: Employee[]
  admins: User[]
  superAdmins: User[]
  schedules: Schedule[]
  piketSchedules: PiketSchedule[]
  tasks: Task[]
  taskSubmissions: TaskSubmission[]
  classes: ClassRoom[]
  studentReports: StudentReport[]
  students: Student[]
  parents: Parent[]
  canteens: Canteen[]
  canteenOwners: CanteenOwner[]
  walletTopups: WalletTopup[]
  pageFeatures: PageFeatureSetting[]
}

const STORE_FILE_NAME = "persistent-store.json"
const DEFAULT_STORE_DIR = path.join(process.cwd(), ".data")
const SERVERLESS_STORE_DIR = path.join("/tmp", "siakad-data")

let dbCache: PersistedDb | null = null
let resolvedStoreDir: string | null | undefined

function isServerlessRuntime() {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.LAMBDA_TASK_ROOT,
  )
}

function resolveStoreDir() {
  if (resolvedStoreDir !== undefined) {
    return resolvedStoreDir
  }

  const envStoreDir = String(process.env.PERSISTENT_STORE_DIR || "").trim()
  const candidates = [
    envStoreDir,
    isServerlessRuntime() ? SERVERLESS_STORE_DIR : "",
    DEFAULT_STORE_DIR,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)

  for (const candidate of [...new Set(candidates)]) {
    try {
      mkdirSync(candidate, { recursive: true })
      accessSync(candidate, constants.W_OK)
      resolvedStoreDir = candidate
      return resolvedStoreDir
    } catch {
      // Try the next candidate directory.
    }
  }

  resolvedStoreDir = null
  return resolvedStoreDir
}

function resolveStoreFile() {
  const storeDir = resolveStoreDir()
  if (!storeDir) return null
  return path.join(storeDir, STORE_FILE_NAME)
}

const createEmptyDb = (): PersistedDb => ({
  orders: [],
  products: [],
  activityPoints: [],
  attendance: [],
  grades: [],
  payments: [],
  auditLogs: [],
  teachers: [],
  admins: [],
  superAdmins: [],
  schedules: [],
  piketSchedules: [],
  tasks: [],
  taskSubmissions: [],
  classes: [],
  studentReports: [],
  students: [],
  parents: [],
  canteens: [],
  canteenOwners: [],
  walletTopups: [],
  pageFeatures: [],
})

function mergeWithDefaults(raw: Partial<PersistedDb> | null | undefined): PersistedDb {
  const empty = createEmptyDb()
  if (!raw || typeof raw !== "object") {
    return empty
  }

  return {
    ...empty,
    ...raw,
    orders: Array.isArray(raw.orders) ? raw.orders : empty.orders,
    products: Array.isArray(raw.products) ? raw.products : empty.products,
    activityPoints: Array.isArray(raw.activityPoints) ? raw.activityPoints : empty.activityPoints,
    attendance: Array.isArray(raw.attendance) ? raw.attendance : empty.attendance,
    grades: Array.isArray(raw.grades) ? raw.grades : empty.grades,
    payments: Array.isArray(raw.payments) ? raw.payments : empty.payments,
    auditLogs: Array.isArray(raw.auditLogs) ? raw.auditLogs : empty.auditLogs,
    teachers: Array.isArray(raw.teachers) ? raw.teachers : empty.teachers,
    admins: Array.isArray(raw.admins) ? raw.admins : empty.admins,
    superAdmins: Array.isArray(raw.superAdmins) ? raw.superAdmins : empty.superAdmins,
    schedules: Array.isArray(raw.schedules) ? raw.schedules : empty.schedules,
    piketSchedules: Array.isArray(raw.piketSchedules) ? raw.piketSchedules : empty.piketSchedules,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : empty.tasks,
    taskSubmissions: Array.isArray(raw.taskSubmissions) ? raw.taskSubmissions : empty.taskSubmissions,
    classes: Array.isArray(raw.classes) ? raw.classes : empty.classes,
    studentReports: Array.isArray(raw.studentReports) ? raw.studentReports : empty.studentReports,
    students: Array.isArray(raw.students) ? raw.students : empty.students,
    parents: Array.isArray(raw.parents) ? raw.parents : empty.parents,
    canteens: Array.isArray(raw.canteens) ? raw.canteens : empty.canteens,
    canteenOwners: Array.isArray(raw.canteenOwners) ? raw.canteenOwners : empty.canteenOwners,
    walletTopups: Array.isArray(raw.walletTopups) ? raw.walletTopups : empty.walletTopups,
    pageFeatures: Array.isArray(raw.pageFeatures) ? raw.pageFeatures : empty.pageFeatures,
  }
}

function loadDb(): PersistedDb {
  if (dbCache) {
    return dbCache
  }

  try {
    const storeFile = resolveStoreFile()
    if (!storeFile || !existsSync(storeFile)) {
      dbCache = createEmptyDb()
      return dbCache
    }

    const raw = readFileSync(storeFile, "utf8")
    const parsed = JSON.parse(raw) as Partial<PersistedDb>
    dbCache = mergeWithDefaults(parsed)
    return dbCache
  } catch {
    dbCache = createEmptyDb()
    return dbCache
  }
}

function persistDb(next: PersistedDb) {
  dbCache = next

  const storeFile = resolveStoreFile()
  if (!storeFile) {
    return
  }

  try {
    writeFileSync(storeFile, JSON.stringify(next), "utf8")
  } catch {
    // Keep in-memory cache even when runtime storage is not writable.
  }
}

function readCollection<K extends keyof PersistedDb>(key: K): PersistedDb[K] {
  const db = loadDb()
  return db[key]
}

function writeCollection<K extends keyof PersistedDb>(key: K, value: PersistedDb[K]) {
  const current = loadDb()
  const next: PersistedDb = {
    ...current,
    [key]: value,
  }
  persistDb(next)
}

function sanitizeUserAvatar<T extends { avatar: string }>(item: T): T {
  return {
    ...item,
    avatar: normalizeDriveMediaUrl(item.avatar) || "",
  }
}

function sanitizeTaskMedia<T extends { attachmentUrl?: string; attachmentUrls?: string[]; imageUrl?: string; imageUrls?: string[] }>(
  item: T,
): T {
  const attachmentUrls = normalizeDriveMediaUrlList(item.attachmentUrls || (item.attachmentUrl ? [item.attachmentUrl] : []))
  const imageUrls = normalizeDriveMediaUrlList(item.imageUrls || (item.imageUrl ? [item.imageUrl] : []))

  return {
    ...item,
    attachmentUrl: attachmentUrls[0],
    attachmentUrls,
    imageUrl: imageUrls[0],
    imageUrls,
  }
}

export const getDbOrders = () => readCollection("orders")
export const setDbOrders = (orders: Order[]) => {
  writeCollection("orders", orders)
}

export const getDbProducts = () =>
  readCollection("products").map((item) => ({
    ...item,
    image: normalizeDriveMediaUrl(item.image) || "",
  }))
export const setDbProducts = (products: Product[]) => {
  writeCollection("products", products)
}

export const getDbActivityPoints = () => readCollection("activityPoints")
export const setDbActivityPoints = (activityPoints: ActivityPoint[]) => {
  writeCollection("activityPoints", activityPoints)
}

export const getDbAttendance = () => readCollection("attendance")
export const setDbAttendance = (attendance: AttendanceRecord[]) => {
  writeCollection("attendance", attendance)
}

export const getDbGrades = () => readCollection("grades")
export const setDbGrades = (grades: StudentGrade[]) => {
  writeCollection("grades", grades)
}

export const getDbPayments = () => readCollection("payments")

export const getDbAuditLogs = () => readCollection("auditLogs")
export const setDbAuditLogs = (auditLogs: AuditLog[]) => {
  writeCollection("auditLogs", auditLogs)
}

export const getDbTeachers = () => readCollection("teachers").map((item) => sanitizeUserAvatar(item))
export const setDbTeachers = (teachers: Employee[]) => {
  writeCollection("teachers", teachers)
}

export const getDbAdmins = () => readCollection("admins").map((item) => sanitizeUserAvatar(item))
export const setDbAdmins = (admins: User[]) => {
  writeCollection("admins", admins)
}

export const getDbSuperAdmins = () => readCollection("superAdmins").map((item) => sanitizeUserAvatar(item))
export const setDbSuperAdmins = (superAdmins: User[]) => {
  writeCollection("superAdmins", superAdmins)
}

export const getDbSchedules = () => readCollection("schedules")
export const setDbSchedules = (schedules: Schedule[]) => {
  writeCollection("schedules", schedules)
}

export const getDbPiketSchedules = () => readCollection("piketSchedules")
export const setDbPiketSchedules = (piketSchedules: PiketSchedule[]) => {
  writeCollection("piketSchedules", piketSchedules)
}

export const getDbTasks = () => readCollection("tasks").map((item) => sanitizeTaskMedia(item))
export const setDbTasks = (tasks: Task[]) => {
  writeCollection("tasks", tasks)
}

export const getDbTaskSubmissions = () =>
  readCollection("taskSubmissions").map((item) => sanitizeTaskMedia(item))
export const setDbTaskSubmissions = (taskSubmissions: TaskSubmission[]) => {
  writeCollection("taskSubmissions", taskSubmissions)
}

export const getDbClasses = () => readCollection("classes")
export const setDbClasses = (classes: ClassRoom[]) => {
  writeCollection("classes", classes)
}

export const getDbStudents = () => readCollection("students").map((item) => sanitizeUserAvatar(item))
export const setDbStudents = (students: Student[]) => {
  writeCollection("students", students)
}

export const getDbParents = () => readCollection("parents").map((item) => sanitizeUserAvatar(item))
export const setDbParents = (parents: Parent[]) => {
  writeCollection("parents", parents)
}

export const getDbCanteens = () =>
  readCollection("canteens").map((item) => ({
    ...item,
    image: normalizeDriveMediaUrl(item.image) || "",
  }))
export const setDbCanteens = (canteens: Canteen[]) => {
  writeCollection("canteens", canteens)
}

export const getDbCanteenOwners = () => readCollection("canteenOwners").map((item) => sanitizeUserAvatar(item))
export const setDbCanteenOwners = (canteenOwners: CanteenOwner[]) => {
  writeCollection("canteenOwners", canteenOwners)
}

export const getDbStudentReports = () =>
  readCollection("studentReports").map((item) => ({
    ...item,
    imageUrl: normalizeDriveMediaUrl(item.imageUrl),
  }))
export const setDbStudentReports = (studentReports: StudentReport[]) => {
  writeCollection("studentReports", studentReports)
}

export const getDbWalletTopups = () =>
  readCollection("walletTopups").map((item) => ({
    ...item,
    proofUrl: normalizeDriveMediaUrl(item.proofUrl),
  }))
export const setDbWalletTopups = (walletTopups: WalletTopup[]) => {
  writeCollection("walletTopups", walletTopups)
}

export const getDbPageFeatures = () => readCollection("pageFeatures")
export const setDbPageFeatures = (pageFeatures: PageFeatureSetting[]) => {
  writeCollection("pageFeatures", pageFeatures)
}
