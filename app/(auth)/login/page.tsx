"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassInput } from "@/components/atoms/glass-input"
import { useAuth } from "@/lib/auth"
import { Eye, EyeOff, LogIn, Lock, Mail, ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error("Harap isi semua field")
      return
    }

    setIsLoading(true)
    const result = await login(email, password)
    setIsLoading(false)

    if (result.success) {
      toast.success("Login berhasil!", {
        description: "Selamat datang kembali",
      })
    } else {
      toast.error("Login gagal", {
        description: result.error,
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left Section - Form (Mobile: Full width, Desktop: Half) */}
      <div className="flex-1 flex flex-col justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Back to Home */}
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Beranda
          </Link>

          {/* Logo & Title - Mobile */}
          <div className="md:hidden text-center space-y-3">
            <Image
              src="/AegixLogo.png"
              alt="Aegix SLE Logo"
              width={64}
              height={64}
              priority
              className="w-16 h-16 mx-auto rounded-2xl shadow-lg shadow-blue-500/25"
            />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Masuk</h1>
              <p className="text-slate-500 text-sm">Aegix SLE</p>
            </div>
          </div>

          {/* Desktop Title */}
          <div className="hidden md:block">
            <h1 className="text-3xl font-bold text-slate-800">Masuk ke Akun Anda</h1>
            <p className="text-slate-500 mt-2">Selamat datang kembali! Silakan masuk untuk melanjutkan.</p>
          </div>

          {/* Login Form */}
          <GlassCard className="p-5 md:p-6 border-slate-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Email
                </label>
                <GlassInput
                  type="email"
                  placeholder="nama@school.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400" />
                  Password
                </label>
                <div className="relative">
                  <GlassInput
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pr-12"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              <GlassButton
                type="submit"
                className="w-full justify-center py-3"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Masuk
                  </>
                )}
              </GlassButton>
            </form>

            <div className="text-center mt-5 pt-5 border-t border-slate-100">
              <p className="text-slate-500 text-sm">Akun dibuat oleh admin atau super admin.</p>
            </div>
          </GlassCard>

          {/* Footer */}
          <p className="text-center text-slate-400 text-xs">
            © 2025 Aegix SLE by{" "}
            <a 
              href="https://nurjagadmuhammaddani.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 underline transition-colors"
            >
              Agaaa
            </a>. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Section - Illustration (Desktop only) */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-500 to-blue-600 items-center justify-center p-12">
        <div className="max-w-md text-center text-white">
          <Image
            src="/AegixLogo.png"
            alt="Aegix SLE Logo"
            width={96}
            height={96}
            priority
            className="w-24 h-24 mx-auto rounded-3xl shadow-2xl shadow-blue-900/20 mb-8"
          />
          <h2 className="text-3xl font-bold mb-4">Aegix SLE</h2>
          <p className="text-white/80 text-lg">
            Smart Learning Ecosystem untuk Siswa, Guru, Orang Tua, dan Admin
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-2xl font-bold">500+</p>
              <p className="text-xs text-white/70">Siswa</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-2xl font-bold">50+</p>
              <p className="text-xs text-white/70">Guru</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-2xl font-bold">20+</p>
              <p className="text-xs text-white/70">Kelas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
