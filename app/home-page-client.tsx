'use client'

import { useState, memo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Users, 
  BookOpen, 
  Award,
  ArrowRight,
  Star,
  TrendingUp,
  Shield,
  Zap,
  Menu
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { GlassButton } from '@/components/atoms/glass-button'
import { BottomSheet, BottomSheetHandle } from '@/components/organisms/bottom-sheet'

// ==================== DATA ====================
const FEATURES = [
  {
    icon: Users,
    title: 'Manajemen Siswa',
    description: 'Kelola data siswa, absensi, nilai, dan perkembangan akademik dengan mudah',
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    icon: BookOpen,
    title: 'Sistem Pembelajaran',
    description: 'Platform e-learning terintegrasi dengan tugas, materi, dan quiz online',
    gradient: 'from-blue-500 to-indigo-600'
  },
  {
    icon: Award,
    title: 'Gamifikasi',
    description: 'Tingkatkan motivasi belajar dengan sistem poin, badge, dan leaderboard',
    gradient: 'from-indigo-500 to-blue-500'
  },
  {
    icon: Shield,
    title: 'Keamanan Data',
    description: 'Sistem keamanan berlapis untuk melindungi data sekolah dan privasi pengguna',
    gradient: 'from-blue-500 to-indigo-500'
  },
  {
    icon: TrendingUp,
    title: 'Analytics & Reports',
    description: 'Dashboard analytics lengkap dengan laporan real-time dan insights',
    gradient: 'from-blue-500 to-indigo-500'
  },
  {
    icon: Zap,
    title: 'Performa Tinggi',
    description: 'Interface cepat dan responsif dengan teknologi web modern',
    gradient: 'from-blue-400 to-blue-600'
  }
] as const

const TESTIMONIALS = [
  {
    name: 'Dr. Siti Rahayu',
    role: 'Kepala Sekolah SMAN 1',
    content: 'Aegix SLE sangat membantu kami dalam mengelola administrasi sekolah. Interface yang mudah dan fitur yang lengkap!',
    rating: 5
  },
  {
    name: 'Budi Santoso, S.Pd',
    role: 'Guru Matematika',
    content: 'Sistem pembelajaran online-nya sangat memudahkan saya memberikan tugas dan menilai siswa. Sangat recommended!',
    rating: 5
  },
  {
    name: 'Andi Wijaya',
    role: 'Siswa Kelas XII',
    content: 'Dengan sistem gamifikasi, belajar jadi lebih menyenangkan. Saya bisa pantau nilai dan tugas dengan mudah!',
    rating: 5
  }
] as const

const CURRENT_YEAR = new Date().getFullYear()

// ==================== REUSABLE COMPONENTS ====================

const Logo = memo(function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
      <Image
        src="/AegixLogo.png"
        alt="Aegix SLE Logo"
        width={40}
        height={40}
        priority
        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-blue-500/30"
      />
      <span className={cn(
        "text-lg sm:text-xl font-bold",
        dark ? "text-foreground" : "text-foreground"
      )}>
        Aegix SLE
      </span>
    </Link>
  )
})

const SectionBadge = memo(function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-2",
      "px-4 py-2 mb-4 sm:mb-6",
      "bg-blue-100 border border-blue-200 rounded-full"
    )}>
      <Star className="w-4 h-4 text-blue-600" />
      <span className="text-sm text-blue-700 font-medium">{children}</span>
    </div>
  )
})

const FeatureCard = memo(function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  gradient,
  index = 0
}: {
  icon: typeof Users
  title: string
  description: string
  gradient: string
  index?: number
}) {
  return (
    <div 
      className={cn(
        "group bg-white/80 backdrop-blur-sm border border-slate-200/80",
        "rounded-2xl p-6 sm:p-8",
        "hover:border-blue-300 hover:bg-white",
        "transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-blue-100/70",
        "hover:-translate-y-1"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className={cn(
        "w-12 h-12 sm:w-14 sm:h-14",
        "bg-gradient-to-br rounded-xl",
        "flex items-center justify-center",
        "mb-4 sm:mb-6",
        "group-hover:scale-110 transition-transform duration-300",
        gradient
      )}>
        <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">
        {title}
      </h3>
      <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  )
})

const TestimonialCard = memo(function TestimonialCard({
  name,
  role,
  content,
  rating,
  index = 0
}: {
  name: string
  role: string
  content: string
  rating: number
  index?: number
}) {
  return (
    <div 
      className={cn(
        "bg-white/80 backdrop-blur-sm border border-slate-200/80",
        "rounded-2xl p-6 sm:p-8",
        "hover:border-blue-300 hover:bg-white",
        "transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-blue-100/70",
        "hover:-translate-y-1"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 sm:w-5 sm:h-5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>

      <p className="text-sm sm:text-base text-muted-foreground mb-6 leading-relaxed">
        &quot;{content}&quot;
      </p>

      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 sm:w-12 sm:h-12 rounded-full",
          "bg-gradient-to-br from-blue-500 to-blue-700",
          "flex items-center justify-center",
          "text-white font-bold text-sm sm:text-base"
        )}>
          {name.charAt(0)}
        </div>
        <div>
          <p className="text-sm sm:text-base text-foreground font-semibold">
            {name}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {role}
          </p>
        </div>
      </div>
    </div>
  )
})

// ==================== SECTION COMPONENTS ====================

const Navigation = memo(function Navigation({ 
  onMobileMenuOpen 
}: { 
  onMobileMenuOpen: () => void 
}) {
  return (
    <nav className={cn(
      "fixed top-3 sm:top-4 left-0 right-0 z-50",
      "px-3 sm:px-6"
    )}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 bg-white/90 backdrop-blur-xl border border-blue-100/90 rounded-full shadow-xl shadow-blue-100/60">
        <div className="flex items-center justify-between h-16 lg:h-18">
          <Logo />

          <div className="hidden lg:flex items-center gap-8">
            <a 
              href="#features" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Fitur
            </a>
            <a 
              href="#testimonials" 
              className="text-muted-foreground hover:text-foreground transition-colors font-medium"
            >
              Testimoni
            </a>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <GlassButton variant="outline" size="sm">
                  Masuk
                </GlassButton>
              </Link>
              <Link href="/login">
                <GlassButton size="sm">
                  Masuk Sekarang
                </GlassButton>
              </Link>
            </div>
          </div>

          <button 
            onClick={onMobileMenuOpen}
            className={cn(
              "lg:hidden p-2 rounded-xl",
              "text-foreground hover:bg-slate-100",
              "transition-colors"
            )}
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  )
})

const MobileMenu = memo(function MobileMenu({ 
  open, 
  onOpenChange 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void 
}) {
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange])

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetHandle />
      <div className="px-4 py-4 pb-8 space-y-3">
        <a 
          href="#features" 
          onClick={handleClose}
          className={cn(
            "block py-3 px-4 rounded-xl",
            "text-foreground hover:bg-slate-100",
            "transition-all text-center font-medium"
          )}
        >
          Fitur
        </a>
        <a 
          href="#testimonials" 
          onClick={handleClose}
          className={cn(
            "block py-3 px-4 rounded-xl",
            "text-foreground hover:bg-slate-100",
            "transition-all text-center font-medium"
          )}
        >
          Testimoni
        </a>
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
          <Link href="/login" onClick={handleClose}>
            <GlassButton variant="outline" className="w-full justify-center">
              Masuk
            </GlassButton>
          </Link>
          <Link href="/login" onClick={handleClose}>
            <GlassButton className="w-full justify-center">
              Masuk Sekarang
            </GlassButton>
          </Link>
        </div>
      </div>
    </BottomSheet>
  )
})

const HeroSection = memo(function HeroSection() {
  return (
    <section className="relative pt-28 sm:pt-36 lg:pt-44 pb-16 sm:pb-20 lg:pb-32 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-20 left-10 w-32 h-32 sm:w-64 sm:h-64 bg-blue-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-32 h-32 sm:w-72 sm:h-72 bg-blue-300/35 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '700ms' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className={cn(
            "text-4xl sm:text-5xl lg:text-7xl font-bold",
            "text-foreground mb-6 sm:mb-8 leading-tight",
            "animate-in fade-in slide-in-from-bottom-8 duration-700"
          )}>
            Aegix SLE
            <span className={cn(
              "block mt-2",
              "bg-gradient-to-r from-blue-700 via-blue-500 to-blue-700",
              "bg-clip-text text-transparent"
            )}>
              Smart Learning Ecosystem
            </span>
          </h1>

          <p className={cn(
            "text-lg sm:text-xl lg:text-2xl",
            "text-muted-foreground mb-8 sm:mb-12",
            "leading-relaxed max-w-2xl mx-auto",
            "animate-in fade-in slide-in-from-bottom-12 duration-700"
          )} style={{ animationDelay: '100ms' }}>
            Platform all-in-one untuk mengelola akademik, siswa, guru, dan administrasi sekolah dengan mudah dan efisien
          </p>

          <div className={cn(
            "flex flex-col sm:flex-row items-center justify-center gap-4",
            "animate-in fade-in slide-in-from-bottom-16 duration-700"
          )} style={{ animationDelay: '200ms' }}>
            <Link href="/login" className="w-full sm:w-auto">
              <GlassButton size="lg" className="w-full sm:w-auto group">
                Masuk Sekarang
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </GlassButton>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <GlassButton variant="outline" size="lg" className="w-full sm:w-auto">
                Login Demo
              </GlassButton>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
})

const FeaturesSection = memo(function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-20 lg:py-32 relative bg-white/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <SectionBadge>Fitur Unggulan</SectionBadge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Semua yang Anda Butuhkan
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            Platform lengkap dengan fitur modern untuk mendukung proses pembelajaran dan administrasi sekolah
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {FEATURES.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              gradient={feature.gradient}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
})

const TestimonialsSection = memo(function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-16 sm:py-20 lg:py-32 relative bg-blue-50/40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <SectionBadge>Testimoni</SectionBadge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Apa Kata Mereka
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
            Dipercaya oleh ribuan pengguna dari berbagai sekolah di Indonesia
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-7xl mx-auto">
          {TESTIMONIALS.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.name}
              {...testimonial}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
})

const CTASection = memo(function CTASection() {
  return (
    <section className="py-16 sm:py-20 lg:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-white" aria-hidden="true" />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6">
            Siap Mengembangkan Sekolah Anda?
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-8 sm:mb-12">
            Bergabunglah dengan ribuan sekolah yang sudah menggunakan Aegix SLE
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <GlassButton size="lg" className="w-full sm:w-auto group">
                Masuk ke Sistem
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </GlassButton>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <GlassButton variant="outline" size="lg" className="w-full sm:w-auto">
                Coba Demo
              </GlassButton>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
})

const Footer = memo(function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8 sm:py-12 bg-white/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-sm text-muted-foreground text-center sm:text-right">
            © {CURRENT_YEAR} Aegix SLE. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
})

// ==================== MAIN PAGE ====================
export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const handleMobileMenuOpen = useCallback(() => {
    setMobileMenuOpen(true)
  }, [])

  return (
    <div className="min-h-screen liquid-glass-bg">
      <Navigation onMobileMenuOpen={handleMobileMenuOpen} />
      <MobileMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
      
      <main>
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      
      <Footer />
    </div>
  )
}
