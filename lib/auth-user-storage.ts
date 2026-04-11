import { mockAdmins, mockCanteenOwners, mockEmployees, mockParents, mockStudents, mockSuperAdmins, type UserRole } from "./mock-data"

export interface StoredAuthUser {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  password: string
}

const AUTH_USERS_STORAGE_KEY = "aegix_auth_users"

const baseAuthUsers: StoredAuthUser[] = [
  ...mockStudents.map((s) => ({ ...s, password: "student123" })),
  ...mockEmployees.map((e) => ({ ...e, password: "guru123" })),
  ...mockAdmins.map((a) => ({ ...a, password: "admin123" })),
  ...mockSuperAdmins.map((sa) => ({ ...sa, password: "kepsek123" })),
  ...mockParents.map((p) => ({ ...p, password: "parent123" })),
  ...mockCanteenOwners.map((co) => ({ ...co, password: "canteen123" })),
]

function canUseStorage() {
  return typeof window !== "undefined"
}

export function getBaseAuthUsers() {
  return baseAuthUsers
}

export function getStoredAuthUsers(): StoredAuthUser[] {
  if (!canUseStorage()) {
    return []
  }

  try {
    const raw = localStorage.getItem(AUTH_USERS_STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
  } catch {
    return []
  }
}

export function getAllAuthUsers() {
  return [...getBaseAuthUsers(), ...getStoredAuthUsers()]
}

export function upsertAuthUserCredential(user: StoredAuthUser) {
  if (!canUseStorage()) {
    return
  }

  const existing = getStoredAuthUsers()
  const byId = existing.findIndex((item) => item.id === user.id)
  const byEmail = existing.findIndex((item) => item.email.toLowerCase() === user.email.toLowerCase())
  const index = byId >= 0 ? byId : byEmail

  if (index >= 0) {
    existing[index] = user
  } else {
    existing.push(user)
  }

  localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(existing))
}

export function removeAuthUserCredential(userId: string) {
  if (!canUseStorage()) {
    return
  }

  const existing = getStoredAuthUsers()
  const filtered = existing.filter((item) => item.id !== userId)
  localStorage.setItem(AUTH_USERS_STORAGE_KEY, JSON.stringify(filtered))
}
