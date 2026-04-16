import { NextResponse } from "next/server"
import {
  getAllDbWalletTopups,
  updateDbWalletTopupStatusById,
} from "@/lib/server/google-sheets-wallet-topups"
import { getSessionUser } from "@/lib/server/session-user"
import { getDbWalletTopups, setDbWalletTopups } from "@/lib/server/persistent-store"
import { logAudit } from "@/lib/server/audit-log"
import { SCHOOL_WALLET_QRIS_IMAGE_PATH, SCHOOL_WALLET_TOPUP_METHODS } from "@/lib/wallet-topup"
import type { WalletTopup, WalletTopupStatus } from "@/lib/data-model"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"

const ALLOWED_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED"])

function sortByRequestedAtDesc<T extends { requestedAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => String(b.requestedAt || "").localeCompare(String(a.requestedAt || "")))
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (sessionUser && sessionUser.role !== "ADMIN" && sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(request.url)
  const statusQuery = String(url.searchParams.get("status") || "").trim().toUpperCase()

  const allTopups = await (async () => {
    try {
      return (await getAllDbWalletTopups()).map((item) => ({
        id: item.id,
        userId: item.userId,
        userName: item.userName,
        userRole: item.userRole,
        amount: item.amount,
        method: item.method as WalletTopup["method"],
        destinationAccount: item.destinationAccount,
        destinationName: item.destinationName,
        proofReference: item.proofReference,
        proofUrl: normalizeDriveMediaUrl(item.proofUrl),
        status: item.status,
        requestedAt: item.requestedAt,
        processedAt: item.processedAt,
        processedBy: item.processedBy,
        adminNote: item.adminNote,
      }))
    } catch {
      return getDbWalletTopups()
    }
  })()

  const filteredTopups = sortByRequestedAtDesc(
    allTopups.filter((item) => {
      if (!statusQuery) return true
      if (!ALLOWED_STATUSES.has(statusQuery)) return true
      return item.status === statusQuery
    }),
  )

  const summary = {
    pendingCount: filteredTopups.filter((item) => item.status === "PENDING").length,
    approvedCount: filteredTopups.filter((item) => item.status === "APPROVED").length,
    rejectedCount: filteredTopups.filter((item) => item.status === "REJECTED").length,
    pendingAmount: filteredTopups
      .filter((item) => item.status === "PENDING")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0),
    approvedAmount: filteredTopups
      .filter((item) => item.status === "APPROVED")
      .reduce((acc, item) => acc + Number(item.amount || 0), 0),
  }

  return NextResponse.json({
    topups: filteredTopups,
    summary,
    methods: SCHOOL_WALLET_TOPUP_METHODS,
    qrisImagePath: SCHOOL_WALLET_QRIS_IMAGE_PATH,
  })
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser()
  if (sessionUser && sessionUser.role !== "ADMIN" && sessionUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = await request.json()
  const id = String(body.id || "").trim()
  const status = String(body.status || "").trim().toUpperCase() as WalletTopupStatus
  const adminNote = body.adminNote != null ? String(body.adminNote).trim() : undefined

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  if (!ALLOWED_STATUSES.has(status)) {
    return NextResponse.json({ error: "Status topup tidak valid" }, { status: 400 })
  }

  let next: WalletTopup
  const currentStore = getDbWalletTopups()
  const currentTarget = currentStore.find((item) => item.id === id) || null

  try {
    const updated = await updateDbWalletTopupStatusById({
      id,
      status,
      processedBy: sessionUser?.id,
      adminNote,
    })

    next = {
      id: updated.id,
      userId: updated.userId,
      userName: updated.userName,
      userRole: updated.userRole,
      amount: updated.amount,
      method: updated.method as WalletTopup["method"],
      destinationAccount: updated.destinationAccount,
      destinationName: updated.destinationName,
      proofReference: updated.proofReference,
      proofUrl: normalizeDriveMediaUrl(updated.proofUrl),
      status: updated.status,
      requestedAt: updated.requestedAt,
      processedAt: updated.processedAt,
      processedBy: updated.processedBy,
      adminNote: updated.adminNote,
    }
  } catch {
    const fallbackCurrent = currentTarget
    if (!fallbackCurrent) {
      return NextResponse.json({ error: "Permintaan topup tidak ditemukan" }, { status: 404 })
    }

    next = {
      ...fallbackCurrent,
      status,
      processedAt: new Date().toISOString(),
      processedBy: sessionUser?.id || fallbackCurrent.processedBy,
      adminNote: adminNote ?? fallbackCurrent.adminNote,
    }
  }

  const existsInStore = currentStore.some((item) => item.id === id)
  const nextStore = existsInStore
    ? currentStore.map((item) => (item.id === id ? next : item))
    : [next, ...currentStore]
  setDbWalletTopups(nextStore)

  logAudit({
    actorId: sessionUser?.id || "admin",
    action: "UPDATE",
    entityName: "WALLET_TOPUP",
    entityId: id,
    oldValue: currentTarget,
    newValue: next,
  })

  return NextResponse.json({ topup: next })
}
