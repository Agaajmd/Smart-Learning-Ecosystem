import type React from "react"
import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "sonner"
import { Providers } from "@/components/providers"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
})
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://aegix-sle.app"),
  title: {
    default: "Aegix SLE",
    template: "%s | Aegix SLE",
  },
  description: "Aegix SLE private application shell.",
  authors: [{ name: "Aegix SLE Team" }],
  creator: "Aegix SLE",
  publisher: "Aegix SLE",
  category: "Education",
  classification: "Smart Learning Ecosystem",
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://aegix-sle.app",
    siteName: "Aegix SLE",
    title: "Aegix SLE",
    description: "Aegix SLE private application shell.",
    images: [
      {
        url: "/AegixLogo.png",
        width: 1200,
        height: 1200,
        alt: "Aegix SLE Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aegix SLE",
    description: "Smart Learning Ecosystem.",
    images: ["/AegixLogo.png"],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    noarchive: true,
    nosnippet: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": 0,
      "max-image-preview": "none",
      "max-snippet": 0,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
}

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body
        className={`${plusJakartaSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen liquid-glass-bg`}
        vaul-drawer-wrapper=""
      >
        <Providers>
          {children}
        </Providers>
        <Toaster 
          position="top-center" 
          richColors 
          closeButton
          expand={false}
          gap={12}
          visibleToasts={3}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: "w-full max-w-md flex items-center gap-3 p-4 rounded-2xl shadow-xl border bg-white toast-enter",
              title: "text-sm font-semibold text-slate-800",
              description: "text-xs text-slate-500",
              actionButton: "bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200",
              cancelButton: "bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200",
              closeButton: "bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full p-1 transition-all duration-200 border-0 hover:scale-110",
              success: "!bg-gradient-to-r !from-emerald-50 !to-green-50 !border-emerald-200 !text-emerald-800 [&>div>svg]:!text-emerald-500",
              error: "!bg-gradient-to-r !from-red-50 !to-rose-50 !border-red-200 !text-red-800 [&>div>svg]:!text-red-500",
              warning: "!bg-gradient-to-r !from-amber-50 !to-yellow-50 !border-amber-200 !text-amber-800 [&>div>svg]:!text-amber-500",
              info: "!bg-gradient-to-r !from-blue-50 !to-cyan-50 !border-blue-200 !text-blue-800 [&>div>svg]:!text-blue-500",
            },
            duration: 2000,
          }}
        />
        <Analytics />
      </body>
    </html>
  )
}
