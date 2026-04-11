"use client"

import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { UserRole } from "./mock-data"
import { getAllAuthUsers } from "./auth-user-storage"

// Auth user type combining all user types
export interface AuthUser {
  id: string
  name: string
  email: string
  avatar: string
  role: UserRole
  password?: string
}

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  getRedirectPath: (role: UserRole) => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const lastRedirectRef = useRef<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem("auth_user")
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          setUser(parsedUser)
        }
      } catch (error) {
        console.error("Failed to parse auth user:", error)
        localStorage.removeItem("auth_user")
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [])

  const getRedirectPath = useCallback((role: UserRole): string => {
    switch (role) {
      case "STUDENT":
        return "/student"
      case "EMPLOYEE":
        return "/employee"
      case "ADMIN":
        return "/admin"
      case "SUPER_ADMIN":
        return "/super-admin"
      case "PARENT":
        return "/parent"
      case "CANTEEN_OWNER":
        return "/canteen-owner"
      default:
        return "/login"
    }
  }, [])

  // Redirect based on auth state
  useEffect(() => {
    if (isLoading) return

    const publicPaths = ["/", "/login", "/register"]
    const isPublicPath = publicPaths.includes(pathname)

    if (!user && !isPublicPath) {
      if (lastRedirectRef.current !== "/") {
        lastRedirectRef.current = "/"
        router.replace("/")
      }
    } else if (user && isPublicPath) {
      const targetPath = getRedirectPath(user.role)
      if (pathname !== targetPath && lastRedirectRef.current !== targetPath) {
        lastRedirectRef.current = targetPath
        router.replace(targetPath)
      }
    } else {
      lastRedirectRef.current = null
    }
  }, [user, isLoading, pathname, router, getRedirectPath])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Keep a short delay for UX feedback without adding noticeable lag.
    await new Promise(resolve => setTimeout(resolve, 200))

    const foundUser = getAllAuthUsers().find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )

    if (!foundUser) {
      return { success: false, error: "Email atau password salah" }
    }

    // Remove password before storing
    const { password: _, ...userWithoutPassword } = foundUser
    setUser(userWithoutPassword)
    localStorage.setItem("auth_user", JSON.stringify(userWithoutPassword))

    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem("auth_user")
    router.replace("/")
  }, [router])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      logout,
      getRedirectPath,
    }),
    [user, isLoading, login, logout, getRedirectPath],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles?: UserRole[]
) {
  return function ProtectedComponent(props: P) {
    const { user, isLoading, isAuthenticated } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.replace("/login")
      } else if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
        router.replace("/unauthorized")
      }
    }, [isLoading, isAuthenticated, user, router, allowedRoles])

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center liquid-glass-bg">
          <div className="w-12 h-12 border-4 border-white/30 border-t-purple-400 rounded-full animate-spin" />
        </div>
      )
    }

    if (!isAuthenticated || (allowedRoles && user && !allowedRoles.includes(user.role))) {
      return null
    }

    return <Component {...props} />
  }
}
