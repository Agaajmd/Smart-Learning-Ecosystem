# 🎓 Aegix SLE - Smart Learning Ecosystem

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.0.10-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**Modern Smart Learning Ecosystem dengan desain Liquid Glass yang elegan dan responsif.**

[Demo](#-demo-accounts) • [Fitur](#-fitur-utama) • [Instalasi](#-instalasi) • [Tech Stack](#%EF%B8%8F-tech-stack)

</div>

---

## ✨ Fitur Utama

### 🔐 Sistem Autentikasi
- Login/Register dengan validasi
- Role-based access control (6 roles)
- Protected routes dengan client-side auth guard
- Session persistence (server session)
- Demo accounts untuk testing

### 👥 Role & Dashboard

| Role | Deskripsi | Fitur Utama |
|------|-----------|-------------|
| **STUDENT** | Siswa | Dashboard, Jadwal, Tugas, Laporan Aset, Kantin |
| **EMPLOYEE** | Guru | Jadwal Mengajar, Kelola Kelas, Input Nilai, AI Rapor |
| **ADMIN** | Administrator | Scan QR, User Management, Kelola Kantin, Laporan |
| **SUPER_ADMIN** | Kepala Sekolah | Keuangan, Manajemen Staff, Analytics |
| **PARENT** | Orang Tua | Keuangan Anak, Kehadiran, Nilai, Jadwal Anak |
| **CANTEEN_OWNER** | Pemilik Kantin | Produk, Order, Laporan Keuangan |

### 🎨 UI/UX Features
- **Liquid Glass Design** - Modern glassmorphism dengan blur effect
- **Responsive Layout** - Optimized untuk mobile, tablet, desktop
- **Bottom Sheet Navigation** - Smooth drawer menu di mobile
- **Light Theme** - Clean dan professional
- **Toast Notifications** - Feedback dengan animasi smooth
- **Loading States** - Skeleton loading
- **Animated Components** - Staggered animations, hover effects

### 📊 Komponen Visualisasi
- Schedule Timeline
- Class Room Grid
- Employee & Attendance Leaderboard
- Financial Charts (Recharts)
- Gamification Stats & Wallet Card
- Next Class Card

### 🛒 Sistem Kantin
- Katalog Produk dengan gambar
- Keranjang belanja
- Validasi stok & harga di server saat checkout
- Manajemen status order (PENDING -> PREPARING -> READY -> COMPLETED/CANCELLED)
- Restock otomatis saat order dibatalkan
- Laporan keuangan pemilik kantin
- CRUD produk pemilik kantin (tambah, edit, hapus, toggle ketersediaan)

---

## 🚀 Instalasi

### Prerequisites
- Node.js 18+ atau 20+
- npm, pnpm, atau yarn

### Setup

```bash
# 1. Clone atau extract project
cd aegix-sle

# 2. Install dependencies
npm install

# 3. Setup environment
cp .env.example .env.local
# lalu isi GOOGLE_SHEETS_ID dan GOOGLE_SERVICE_ACCOUNT_JSON

# 4. Run development server
npm run dev

# 5. Buka browser
open https://your-domain.example
```

### Environment Variables

- `GOOGLE_SHEETS_ID`: ID spreadsheet Google Sheets.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: service account JSON dalam format string satu baris (private key tetap pakai `\\n`).
- `GOOGLE_DRIVE_FOLDER_ID`: ID folder Google Drive untuk semua upload media (avatar, foto kantin, foto produk, bukti transfer, lampiran, dll).
- `GOOGLE_WORKSPACE_IMPERSONATE_USER` (opsional): email user Google Workspace untuk impersonation jika memakai domain-wide delegation.
- `GOOGLE_DRIVE_OAUTH_CLIENT_ID` (opsional): OAuth client id untuk upload Drive via akun Google user.
- `GOOGLE_DRIVE_OAUTH_CLIENT_SECRET` (opsional): OAuth client secret untuk upload Drive via akun Google user.
- `GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN` (opsional): refresh token akun Google user untuk upload Drive jika tidak memakai Shared Drive.
- Jika memakai OAuth Drive, isi ketiga variabel OAuth di atas sekaligus (all-or-nothing).

### Upload Media (Google Drive)

- Semua upload gambar/file sekarang **langsung ke Google Drive**.
- Aplikasi tidak lagi memakai fallback penyimpanan file ke local/path atau chunk data di sheet untuk upload baru.
- OAuth untuk upload Drive memakai scope paling minim: `https://www.googleapis.com/auth/drive.file`.
- API media hanya melayani file yang berada di folder `GOOGLE_DRIVE_FOLDER_ID`.
- Pastikan service account punya akses `Editor` ke folder pada `GOOGLE_DRIVE_FOLDER_ID`.
- Untuk menghindari error kuota service account, sangat disarankan menggunakan folder di **Shared Drive**.
- Metadata upload lama di sheet `media_assets` tetap didukung untuk backward compatibility saat baca file lama.

Jika muncul error:
`Upload gagal: Service Account tidak punya kuota My Drive...`
gunakan salah satu cara berikut:
1. Pindahkan folder upload ke Shared Drive lalu update `GOOGLE_DRIVE_FOLDER_ID`.
2. Atau isi `GOOGLE_DRIVE_OAUTH_CLIENT_ID`, `GOOGLE_DRIVE_OAUTH_CLIENT_SECRET`, `GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN` agar upload memakai akun Google user (OAuth refresh token).

### Generate OAuth Refresh Token (opsional)

Jika ingin tetap pakai folder My Drive, buat refresh token lalu isi env OAuth:

```bash
npm run drive:oauth:token
```

Script akan:
- Menampilkan URL consent OAuth.
- Meminta kamu paste authorization code.
- Menampilkan nilai `GOOGLE_DRIVE_OAUTH_CLIENT_ID`, `GOOGLE_DRIVE_OAUTH_CLIENT_SECRET`, `GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN` untuk diisi ke `.env.local`.

### Build untuk Production

```bash
# Build production
npm run build
```

---

## 🔑 Demo Accounts

### 🧑‍🎓 Siswa (STUDENT)
| Nama | Email | Password |
|------|-------|----------|
| Andi Wijaya | andi@school.id | student123 |
| Siti Nurhaliza | siti@school.id | student123 |
| Budi Santoso | budi@school.id | student123 |

### 👨‍🏫 Guru (EMPLOYEE)
| Nama | Email | Password |
|------|-------|----------|
| Ahmad Hidayat | ahmad@school.id | guru123 |
| Siti Rahmawati | siti.guru@school.id | guru123 |
| Budi Prasetyo | budi.guru@school.id | guru123 |

### 🛡️ Admin
| Nama | Email | Password |
|------|-------|----------|
| Admin System | admin@school.id | admin123 |

### 👑 Kepala Sekolah (SUPER_ADMIN)
| Nama | Email | Password |
|------|-------|----------|
| Dr. Bambang Sudrajat | kepsek@school.id | kepsek123 |

### 👨‍👩‍👧 Orang Tua (PARENT)
| Nama | Email | Password |
|------|-------|----------|
| Bapak Wijaya | parent.andi@school.id | parent123 |
| Ibu Nurhaliza | parent.siti@school.id | parent123 |

### 🍽️ Pemilik Kantin (CANTEEN_OWNER)
| Nama | Email | Password |
|------|-------|----------|
| Bu Warni | warni@school.id | canteen123 |
| Pak Joko | joko@school.id | canteen123 |

---

## 📁 Struktur Project

```
aegix-sle/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth routes (login, register)
│   ├── admin/                  # Admin dashboard
│   ├── canteen/                # Halaman kantin publik
│   ├── canteen-owner/          # Dashboard pemilik kantin
│   ├── employee/               # Dashboard guru
│   ├── parent/                 # Dashboard orang tua
│   ├── student/                # Dashboard siswa
│   ├── super-admin/            # Dashboard kepala sekolah
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout + SEO
│   ├── globals.css             # Global styles + animations
│   ├── robots.ts               # SEO robots
│   └── sitemap.ts              # SEO sitemap
│
├── components/
│   ├── atoms/                  # Smallest components (button, input, etc)
│   ├── molecules/              # Composite components (card, form, etc)
│   ├── organisms/              # Complex sections (sidebar, navbar, etc)
│   │   ├── bottom-navigation.tsx
│   │   ├── bottom-sheet.tsx    # Custom bottom sheet drawer
│   │   ├── sidebar.tsx
│   │   └── ...
│   ├── templates/              # Page templates
│   ├── providers.tsx           # Context providers wrapper
│   └── theme-provider.tsx
│
├── lib/
│   ├── auth.tsx                # Auth context, login/logout, guards
│   ├── data-model.ts           # Shared domain types
│   └── utils.ts                # Utility functions (cn, etc)
│
├── hooks/
│   ├── use-mobile.ts           # Mobile detection hook
│   └── use-toast.ts            # Toast notification hook
│
├── public/
│   └── manifest.json           # PWA manifest
│
├── next.config.mjs             # Next.js config (static export)
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16.0.10 (App Router, Turbopack) |
| **Language** | TypeScript 5.7.2 |
| **Styling** | Tailwind CSS 4.0 |
| **UI Components** | Radix UI, Lucide Icons |
| **Charts** | Recharts |
| **Notifications** | Sonner |
| **Drawer** | Custom Bottom Sheet (React Portal) |
| **State** | React Context API |
| **Build** | Static Export (SSG) |
| **Analytics** | Vercel Analytics |

---

## 📱 Responsive Design

| Breakpoint | Layout |
|------------|--------|
| Mobile (< 768px) | Bottom navigation + Bottom sheet menu |
| Tablet (768px - 1024px) | Sidebar collapsed + touch-friendly |
| Desktop (> 1024px) | Full sidebar + hover effects |

---

## 🔒 Security

- **Client-side Auth Guard**: Protected routes redirect ke landing jika belum login
- **Role-based Access**: Setiap role hanya bisa akses halaman yang sesuai
- **Session Storage**: Data sesi dikelola oleh server
- **No Sensitive Data**: Password tidak disimpan di client

> ⚠️ **Note**: Ini adalah demo app. Untuk production, gunakan:
> - HTTP-only cookies untuk session
> - Server-side authentication
> - Encrypted password storage
> - HTTPS enforcement

---

## 🌐 SEO

Project ini sudah dioptimasi untuk SEO:

- ✅ Metadata lengkap (title, description, keywords)
- ✅ Open Graph tags untuk social media
- ✅ Twitter Card support
- ✅ JSON-LD structured data
- ✅ robots.txt & sitemap.xml
- ✅ Semantic HTML
- ✅ Accessible (aria-labels)

---

## 🎯 Scripts

```bash
# Development
npm run dev          # Start dev server dengan Turbopack

# Production
npm run build        # Build static export ke /out
npm run start        # Preview production build

# Quality
npm run lint         # ESLint check
npm run type-check   # TypeScript check (jika ada)
```

---

## ✅ Fitur yang Sudah Diimplementasi

- [x] Authentication (Login, Register, Logout)
- [x] 6 Role dengan dashboard masing-masing
- [x] Protected routes & role-based access
- [x] Landing page yang responsive
- [x] Sidebar navigation (desktop)
- [x] Bottom sheet navigation (mobile)
- [x] Sistem Kantin dengan produk
- [x] CRUD produk pemilik kantin
- [x] Integrasi order kantin owner end-to-end
- [x] Jadwal untuk siswa, guru, dan orang tua
- [x] User management (Admin)
- [x] Financial reports (Super Admin, Canteen Owner)
- [x] Toast notifications
- [x] Loading states & animations
- [x] SEO optimization
- [x] Static export ready

---

## 🚀 Future Improvements

- [ ] Real-time notifications (WebSocket)
- [x] File upload (foto profil, dokumen) via Google Drive
- [ ] Export data (PDF, Excel)
- [ ] Email integration
- [ ] Multi-language support (i18n)
- [ ] Dark mode toggle
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Backend API integration
- [ ] Database integration (PostgreSQL/MongoDB)

---

## 👨‍💻 Developer

**Created with ❤️ by Agaaa**

Project ini dibuat sebagai Smart Learning Ecosystem modern dengan fokus pada:
- 🏗️ Clean architecture (Atomic Design)
- 🔒 Type safety (TypeScript)
- ♻️ Component reusability
- 🎨 User experience
- ⚡ Performance optimization

---

## 📄 License

MIT License - Feel free to use for educational purposes.

---

<div align="center">

**Happy Coding! 🎉**

</div>