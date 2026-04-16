import { NextResponse } from "next/server"
import {
  createDbWalletTopup,
  getAllDbWalletTopups,
  type WalletTopupRecord,
} from "@/lib/server/google-sheets-wallet-topups"
import { getSessionUser } from "@/lib/server/session-user"
import { logAudit } from "@/lib/server/audit-log"
import { getDbOrders, getDbWalletTopups, setDbWalletTopups } from "@/lib/server/persistent-store"
import {
  getSchoolWalletMethodMeta,
  SCHOOL_WALLET_QRIS_IMAGE_PATH,
  SCHOOL_WALLET_TOPUP_METHOD_SET,
  SCHOOL_WALLET_TOPUP_METHODS,
} from "@/lib/wallet-topup"
import type { WalletTopup, WalletTopupMethod } from "@/lib/data-model"
import { createDbMediaAssetFromDataUrl } from "@/lib/server/google-sheets-media-assets"
import { normalizeDriveMediaUrl } from "@/lib/google-drive"

const ENABLED_ROLES = new Set(["STUDENT", "EMPLOYEE", "PARENT", "SUPER_ADMIN"])

function toModel(item: WalletTopupRecord): WalletTopup {
  return {
    id: item.id,
    userId: item.userId,
    userName: item.userName,
    userRole: item.userRole,
    amount: item.amount,
    method: item.method as WalletTopupMethod,
    destinationAccount: item.destinationAccount,
    destinationName: item.destinationName,
    proofReference: item.proofReference,
    proofUrl: normalizeDriveMediaUrl(item.proofUrl),
    status: item.status,
    requestedAt: item.requestedAt,
    processedAt: item.processedAt,
    processedBy: item.processedBy,
    adminNote: item.adminNote,
  }
}

function sortByRequestedAtDesc<T extends { requestedAt?: string }>(items: T[]) {
  return [...items].sort((a, b) => String(b.requestedAt || "").localeCompare(String(a.requestedAt || "")))
}

function loadWalletTopupsFromStore(): WalletTopup[] {
  return getDbWalletTopups()
}

async function normalizeTopupProofUrl(input: unknown, userId: string) {
  const source = String(input || "").trim()
  if (!source) return undefined

  if (!source.startsWith("data:")) {
    throw new Error("Bukti topup harus diupload dari aplikasi.")
  }

  const media = await createDbMediaAssetFromDataUrl({
    dataUrl: source,
    ownerType: "wallet_topup_proof",
    ownerId: userId,
    originalFileName: `topup-proof-${userId}-${Date.now()}.png`,
  })

  return media.url
}

export async function GET() {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const allTopups = await (async () => {
    try {
      return (await getAllDbWalletTopups()).map(toModel)
    } catch {
      return loadWalletTopupsFromStore()
    }
  })()

  const userTopups = sortByRequestedAtDesc(
    allTopups.filter((item) => item.userId === sessionUser.id),
  )

  const approvedAmount = userTopups
    .filter((item) => item.status === "APPROVED")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0)

  const spentAmount = getDbOrders()
    .filter((order) => order.customerId === sessionUser.id && order.status !== "CANCELLED")
    .reduce((acc, order) => acc + Number(order.totalAmount || 0), 0)

  const walletBalance = Math.max(0, approvedAmount - spentAmount)

  const pendingAmount = userTopups
    .filter((item) => item.status === "PENDING")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0)

  return NextResponse.json({
    methods: SCHOOL_WALLET_TOPUP_METHODS,
    qrisImagePath: SCHOOL_WALLET_QRIS_IMAGE_PATH,
    topups: userTopups,
    walletBalance,
    approvedAmount,
    spentAmount,
    pendingAmount,
  })
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  if (!ENABLED_ROLES.has(sessionUser.role)) {
    return NextResponse.json({ error: "Role tidak diizinkan melakukan topup" }, { status: 403 })
  }

  const body = await request.json()
  const amount = Number(body.amount || 0)
  const method = String(body.method || "") as WalletTopupMethod
  const proofReference = String(body.proofReference || "").trim() || undefined
  let proofUrl: string | undefined

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Nominal topup tidak valid" }, { status: 400 })
  }

  if (amount < 1000) {
    return NextResponse.json({ error: "Minimal nominal topup adalah Rp 1.000" }, { status: 400 })
  }

  if (!SCHOOL_WALLET_TOPUP_METHOD_SET.has(method)) {
    return NextResponse.json({ error: "Metode topup tidak valid" }, { status: 400 })
  }

  const methodMeta = getSchoolWalletMethodMeta(method)
  if (!methodMeta) {
    return NextResponse.json({ error: "Metode topup tidak ditemukan" }, { status: 400 })
  }

  try {
    proofUrl = await normalizeTopupProofUrl(body.proofUrl, sessionUser.id)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memproses bukti topup" },
      { status: 400 },
    )
  }

  if (!proofUrl) {
    return NextResponse.json({ error: "Bukti transfer wajib diupload" }, { status: 400 })
  }

  let next: WalletTopup
  const nowIso = new Date().toISOString()
  try {
    const created = await createDbWalletTopup({
      userId: sessionUser.id,
      userName: sessionUser.name,
      userRole: sessionUser.role,
      amount,
      method,
      destinationAccount: methodMeta.accountNumber,
      destinationName: methodMeta.accountName,
      proofReference,
      proofUrl,
    })

    next = toModel(created)
  } catch {
    next = {
      id: `TOPUP-${Date.now()}`,
      userId: sessionUser.id,
      userName: sessionUser.name,
      userRole: sessionUser.role,
      amount,
      method,
      destinationAccount: methodMeta.accountNumber,
      destinationName: methodMeta.accountName,
      proofReference,
      proofUrl: normalizeDriveMediaUrl(proofUrl),
      status: "PENDING",
      requestedAt: nowIso,
    }
  }

  const current = loadWalletTopupsFromStore()
  setDbWalletTopups([
    next,
    ...current.filter((item) => item.id !== next.id),
  ])

  logAudit({
    actorId: sessionUser.id,
    action: "CREATE",
    entityName: "WALLET_TOPUP",
    entityId: next.id,
    oldValue: null,
    newValue: next,
  })

  return NextResponse.json({ topup: next }, { status: 201 })
}
