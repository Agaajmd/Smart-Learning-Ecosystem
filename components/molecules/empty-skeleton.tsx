import { Skeleton } from "@/components/atoms/skeleton"

interface EmptySkeletonProps {
  rows?: number
  className?: string
  showMessage?: boolean
  message?: string
}

export function EmptySkeleton({
  rows = 3,
  className = "",
  showMessage = true,
  message = "Data belum tersedia",
}: EmptySkeletonProps) {
  return (
    <div className={`space-y-3 p-4 ${className}`}>
      <Skeleton className="h-4 w-40 animate-none" />
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} className="h-12 w-full rounded-xl animate-none" />
      ))}
      {showMessage ? <p className="pt-1 text-center text-sm text-slate-500">{message}</p> : null}
    </div>
  )
}
