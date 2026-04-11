import type { Metadata } from "next"
import HomePageClient from "./home-page-client"

export const metadata: Metadata = {
  title: "Aegix SLE (Smart Learning Ecosystem)",
  description:
    "Aegix SLE adalah platform Smart Learning Ecosystem untuk manajemen sekolah digital: akademik, pembelajaran, absensi, dan analitik dalam satu sistem.",
  keywords: [
    "Aegix SLE",
    "Smart Learning Ecosystem",
    "sistem manajemen sekolah",
    "platform sekolah digital",
    "edtech Indonesia",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Aegix SLE (Smart Learning Ecosystem)",
    description:
      "Platform manajemen sekolah modern untuk siswa, guru, dan admin dalam satu ekosistem pembelajaran.",
    url: "/",
    siteName: "Aegix SLE",
    locale: "id_ID",
    type: "website",
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
    title: "Aegix SLE (Smart Learning Ecosystem)",
    description:
      "Smart Learning Ecosystem untuk sekolah modern yang aman, cepat, dan terintegrasi.",
    images: ["/AegixLogo.png"],
  },
  robots: {
    index: true,
    follow: true,
    noarchive: false,
    nosnippet: false,
  },
}

export default function HomePage() {
  return <HomePageClient />
}
