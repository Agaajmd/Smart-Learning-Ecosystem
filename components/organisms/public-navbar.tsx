"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { GlassButton } from "@/components/atoms/glass-button"
import { Menu, X } from "lucide-react"

interface NavLink {
  href: string
  label: string
}

interface PublicNavbarProps {
  links?: NavLink[]
  showAuthButtons?: boolean
}

export function PublicNavbar({ 
  links = [
    { href: "#features", label: "Fitur" },
    { href: "#stats", label: "Statistik" },
    { href: "#testimonials", label: "Testimoni" },
  ],
  showAuthButtons = true 
}: PublicNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/AegixLogo.png"
              alt="Aegix SLE Logo"
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl group-hover:scale-105 transition-transform shadow-lg shadow-blue-500/30"
            />
            <span className="text-xl font-bold text-white">Aegix SLE</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <a 
                key={link.href}
                href={link.href} 
                className="text-slate-300 hover:text-white transition-colors font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Auth Buttons */}
          {showAuthButtons && (
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <GlassButton variant="secondary" size="sm">
                  Masuk
                </GlassButton>
              </Link>
              <Link href="/login">
                <GlassButton size="sm">
                  Mulai
                </GlassButton>
              </Link>
            </div>
          )}

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Drawer from Bottom */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 rounded-t-3xl shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
            <div className="p-6 space-y-4">
              {/* Drag Handle */}
              <div className="flex justify-center pb-2">
                <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
              </div>

              {/* Menu Links */}
              <div className="space-y-2">
                {links.map((link) => (
                  <a 
                    key={link.href}
                    href={link.href} 
                    className="block px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              {showAuthButtons && (
                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <Link href="/login" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                    <GlassButton variant="secondary" className="w-full justify-center">
                      Masuk
                    </GlassButton>
                  </Link>
                  <Link href="/login" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                    <GlassButton className="w-full justify-center">
                      Mulai
                    </GlassButton>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </nav>
  )
}
