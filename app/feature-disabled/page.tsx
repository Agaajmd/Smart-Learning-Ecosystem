import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export default async function FeatureDisabledPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; feature?: string }>
}) {
  const query = await searchParams
  const from = String(query.from || "")
  const feature = String(query.feature || "")

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <h1 className="text-lg font-semibold text-slate-800">Halaman Dinonaktifkan</h1>
            <p className="text-sm text-slate-600">
              Fitur ini sedang dinonaktifkan oleh Kepala Sekolah. Silakan hubungi admin sekolah jika perlu akses.
            </p>
            {from ? <p className="text-xs text-slate-500">URL: {from}</p> : null}
            {feature ? <p className="text-xs text-slate-500">Fitur: {feature}</p> : null}
            <div className="pt-1">
              <Link
                href="/"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
