export function RouteLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/20 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4 animate-pulse">
        <div className="h-8 w-56 rounded-xl bg-slate-200" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
          <div className="h-24 rounded-2xl bg-slate-200" />
        </div>
        <div className="h-72 rounded-2xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-52 rounded-2xl bg-slate-200" />
          <div className="h-52 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  )
}
