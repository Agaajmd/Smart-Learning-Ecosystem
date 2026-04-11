import Link from "next/link"
import Image from "next/image"

export function PublicFooter() {
  return (
    <footer className="py-12 px-4 border-t border-white/10">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Image
                src="/AegixLogo.png"
                alt="Aegix SLE Logo"
                width={40}
                height={40}
                className="w-10 h-10 rounded-xl"
              />
              <span className="text-xl font-bold text-white">Aegix SLE</span>
            </Link>
            <p className="text-white/50 text-sm max-w-md">
              Smart Learning Ecosystem modern dengan desain elegan dan fitur lengkap untuk ekosistem belajar sekolah Anda.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-white/50 hover:text-white text-sm transition-colors">
                  Fitur
                </a>
              </li>
              <li>
                <a href="#stats" className="text-white/50 hover:text-white text-sm transition-colors">
                  Statistik
                </a>
              </li>
              <li>
                <a href="#testimonials" className="text-white/50 hover:text-white text-sm transition-colors">
                  Testimoni
                </a>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-white font-semibold mb-4">Akun</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/login" className="text-white/50 hover:text-white text-sm transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-white/50 hover:text-white text-sm transition-colors">
                  Mulai
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-8 border-t border-white/10 text-center">
          <p className="text-white/40 text-sm">
            © {new Date().getFullYear()} Aegix SLE by{" "}
            <a 
              href="https://profile-portfolio-aga.vercel.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline transition-colors"
            >
              Aga
            </a>. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
