import type { UserRole } from "@/lib/data-model"

export interface PageFeatureDefinition {
  key: string
  label: string
  description: string
  href: string
  pathPrefix: string
  roles: UserRole[]
}

export const PAGE_FEATURE_ROLE_GROUPS: UserRole[] = [
  "STUDENT",
  "PARENT",
  "EMPLOYEE",
  "ADMIN",
  "CANTEEN_OWNER",
  "SUPER_ADMIN",
]

export const PAGE_FEATURE_ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: "Siswa",
  PARENT: "Orang Tua",
  EMPLOYEE: "Guru",
  ADMIN: "Admin",
  CANTEEN_OWNER: "Kantin Owner",
  SUPER_ADMIN: "Kepala Sekolah",
}

export const PAGE_FEATURE_DEFINITIONS = [
  // Student
  {
    key: "student_dashboard",
    label: "Dashboard Siswa",
    description: "Halaman utama siswa",
    href: "/student",
    pathPrefix: "/student",
    roles: ["STUDENT"],
  },
  {
    key: "student_class",
    label: "Kelas Siswa",
    description: "Halaman kelas siswa",
    href: "/student/class",
    pathPrefix: "/student/class",
    roles: ["STUDENT"],
  },
  {
    key: "student_assignments",
    label: "Tugas Siswa",
    description: "Halaman tugas siswa",
    href: "/student/assignments",
    pathPrefix: "/student/assignments",
    roles: ["STUDENT"],
  },
  {
    key: "student_asset_reports",
    label: "Laporan Aset Siswa",
    description: "Halaman laporan aset siswa",
    href: "/student/report",
    pathPrefix: "/student/report",
    roles: ["STUDENT"],
  },
  {
    key: "student_schedule",
    label: "Jadwal Siswa",
    description: "Halaman jadwal siswa",
    href: "/student/schedule",
    pathPrefix: "/student/schedule",
    roles: ["STUDENT"],
  },

  // Parent
  {
    key: "parent_dashboard",
    label: "Dashboard Orang Tua",
    description: "Halaman utama orang tua",
    href: "/parent",
    pathPrefix: "/parent",
    roles: ["PARENT"],
  },
  {
    key: "parent_class",
    label: "Kelas Anak",
    description: "Halaman kelas anak",
    href: "/parent/class",
    pathPrefix: "/parent/class",
    roles: ["PARENT"],
  },
  {
    key: "parent_finance",
    label: "Keuangan Orang Tua",
    description: "Halaman keuangan orang tua",
    href: "/parent/finance",
    pathPrefix: "/parent/finance",
    roles: ["PARENT"],
  },
  {
    key: "parent_attendance",
    label: "Kehadiran Anak",
    description: "Halaman kehadiran anak",
    href: "/parent/attendance",
    pathPrefix: "/parent/attendance",
    roles: ["PARENT"],
  },
  {
    key: "parent_points",
    label: "Poin Aktivitas Anak",
    description: "Halaman poin aktivitas anak",
    href: "/parent/points",
    pathPrefix: "/parent/points",
    roles: ["PARENT"],
  },
  {
    key: "parent_grades",
    label: "Nilai Anak",
    description: "Halaman nilai anak",
    href: "/parent/grades",
    pathPrefix: "/parent/grades",
    roles: ["PARENT"],
  },
  {
    key: "parent_schedule",
    label: "Jadwal Anak",
    description: "Halaman jadwal anak",
    href: "/parent/schedule",
    pathPrefix: "/parent/schedule",
    roles: ["PARENT"],
  },

  // Employee
  {
    key: "employee_dashboard",
    label: "Dashboard Guru",
    description: "Halaman utama guru",
    href: "/employee",
    pathPrefix: "/employee",
    roles: ["EMPLOYEE"],
  },
  {
    key: "employee_assignments",
    label: "Kelola Tugas Guru",
    description: "Halaman kelola tugas guru",
    href: "/employee/assignments",
    pathPrefix: "/employee/assignments",
    roles: ["EMPLOYEE"],
  },
  {
    key: "employee_schedule",
    label: "Jadwal Guru",
    description: "Halaman jadwal guru",
    href: "/employee/schedule",
    pathPrefix: "/employee/schedule",
    roles: ["EMPLOYEE"],
  },
  {
    key: "employee_class",
    label: "Kelas Guru",
    description: "Halaman kelas guru",
    href: "/employee/class/c1",
    pathPrefix: "/employee/class",
    roles: ["EMPLOYEE"],
  },
  {
    key: "employee_points",
    label: "Poin Keaktifan",
    description: "Halaman poin keaktifan",
    href: "/employee/grades",
    pathPrefix: "/employee/grades",
    roles: ["EMPLOYEE"],
  },
  {
    key: "employee_report_ai",
    label: "AI Rapor Guru",
    description: "Halaman AI rapor guru",
    href: "/employee/rapor",
    pathPrefix: "/employee/rapor",
    roles: ["EMPLOYEE"],
  },

  // Admin
  {
    key: "admin_dashboard",
    label: "Dashboard Admin",
    description: "Halaman utama admin",
    href: "/admin",
    pathPrefix: "/admin",
    roles: ["ADMIN"],
  },
  {
    key: "admin_class",
    label: "Manajemen Kelas Admin",
    description: "Halaman manajemen kelas admin",
    href: "/admin/class",
    pathPrefix: "/admin/class",
    roles: ["ADMIN"],
  },
  {
    key: "admin_scan_reports",
    label: "Scan dan Laporan Admin",
    description: "Halaman scan dan laporan admin",
    href: "/admin/scan",
    pathPrefix: "/admin/scan",
    roles: ["ADMIN"],
  },
  {
    key: "admin_wallet_topups",
    label: "Konfirmasi Topup Admin",
    description: "Halaman konfirmasi topup admin",
    href: "/admin/wallet-topups",
    pathPrefix: "/admin/wallet-topups",
    roles: ["ADMIN"],
  },
  {
    key: "admin_users",
    label: "Data Pengguna Admin",
    description: "Halaman data pengguna admin",
    href: "/admin/users",
    pathPrefix: "/admin/users",
    roles: ["ADMIN"],
  },
  {
    key: "admin_canteen_management",
    label: "Kelola Kantin Admin",
    description: "Halaman kelola kantin admin",
    href: "/admin/canteen",
    pathPrefix: "/admin/canteen",
    roles: ["ADMIN"],
  },
  {
    key: "admin_schedule",
    label: "Jadwal Admin",
    description: "Halaman jadwal admin",
    href: "/admin/schedule",
    pathPrefix: "/admin/schedule",
    roles: ["ADMIN"],
  },

  // Canteen Owner
  {
    key: "canteen_owner_dashboard",
    label: "Dashboard Kantin",
    description: "Halaman utama pemilik kantin",
    href: "/canteen-owner",
    pathPrefix: "/canteen-owner",
    roles: ["CANTEEN_OWNER"],
  },
  {
    key: "canteen_owner_products",
    label: "Produk Kantin",
    description: "Halaman produk pemilik kantin",
    href: "/canteen-owner/products",
    pathPrefix: "/canteen-owner/products",
    roles: ["CANTEEN_OWNER"],
  },
  {
    key: "canteen_owner_orders",
    label: "Order Kantin",
    description: "Halaman order pemilik kantin",
    href: "/canteen-owner/orders",
    pathPrefix: "/canteen-owner/orders",
    roles: ["CANTEEN_OWNER"],
  },
  {
    key: "canteen_owner_finance",
    label: "Keuangan Kantin",
    description: "Halaman keuangan pemilik kantin",
    href: "/canteen-owner/finance",
    pathPrefix: "/canteen-owner/finance",
    roles: ["CANTEEN_OWNER"],
  },

  // Shared menu page shown in multiple roles
  {
    key: "canteen_public_page",
    label: "Halaman Kantin",
    description: "Halaman kantin untuk pengguna sekolah",
    href: "/canteen",
    pathPrefix: "/canteen",
    roles: ["STUDENT", "PARENT", "EMPLOYEE", "ADMIN", "SUPER_ADMIN"],
  },
] as const satisfies ReadonlyArray<PageFeatureDefinition>

export type PageFeatureKey = (typeof PAGE_FEATURE_DEFINITIONS)[number]["key"]
export type PageFeatureStateMap = Partial<Record<PageFeatureKey, boolean>>

const PAGE_FEATURE_DEFINITION_BY_KEY = new Map<PageFeatureKey, PageFeatureDefinition>(
  PAGE_FEATURE_DEFINITIONS.map((item) => [item.key, item]),
)

const PAGE_FEATURE_DEFINITIONS_SORTED_BY_PREFIX = [...PAGE_FEATURE_DEFINITIONS].sort(
  (left, right) => right.pathPrefix.length - left.pathPrefix.length,
)

export function normalizeFeaturePath(value: string) {
  const next = String(value || "").trim()
  if (!next) return "/"
  return next.endsWith("/") && next !== "/" ? next.slice(0, -1) : next
}

export function getPageFeatureDefinitionByKey(key: PageFeatureKey) {
  return PAGE_FEATURE_DEFINITION_BY_KEY.get(key) || null
}

export function getPageFeatureKeyForPath(pathname: string, role: UserRole): PageFeatureKey | null {
  const normalizedPath = normalizeFeaturePath(pathname)

  for (const definition of PAGE_FEATURE_DEFINITIONS_SORTED_BY_PREFIX) {
    if (!(definition.roles as readonly UserRole[]).includes(role)) continue

    const normalizedPrefix = normalizeFeaturePath(definition.pathPrefix)
    if (normalizedPath === normalizedPrefix || normalizedPath.startsWith(`${normalizedPrefix}/`)) {
      return definition.key
    }
  }

  return null
}

export function getPageFeatureDefinitionsByRole(role: UserRole) {
  return PAGE_FEATURE_DEFINITIONS.filter((definition) =>
    (definition.roles as readonly UserRole[]).includes(role),
  )
}

export function getDefaultPageFeatureStateMap(): Record<PageFeatureKey, boolean> {
  const base = {} as Record<PageFeatureKey, boolean>
  for (const definition of PAGE_FEATURE_DEFINITIONS) {
    base[definition.key] = true
  }
  return base
}

export function isPageFeatureEnabled(key: PageFeatureKey | null, state: PageFeatureStateMap | null | undefined) {
  if (!key) return true
  if (!state) return true
  return state[key] !== false
}
