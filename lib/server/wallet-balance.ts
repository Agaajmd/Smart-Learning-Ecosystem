import "server-only"

import type { Order, StudentPayment } from "@/lib/data-model"
import { getAllDbOrdersFromSheet, migrateDbOrdersToSheet } from "@/lib/server/google-sheets-orders"
import { loadDbStudentPaymentsWithMigration } from "@/lib/server/google-sheets-student-payments"
import { getAllDbWalletTopups } from "@/lib/server/google-sheets-wallet-topups"
import { getDbOrders, getDbPayments, getDbWalletTopups } from "@/lib/server/persistent-store"

const CANCELED_ORDER_STATUS = "CANCELLED"

export interface WalletSnapshot {
  approvedTopupAmount: number
  pendingTopupAmount: number
  spentCanteenAmount: number
  spentSppAmount: number
  spentAmount: number
  walletBalance: number
}

function toPositiveNumber(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

async function loadOrdersForWalletSpend(): Promise<Order[]> {
  try {
    const fromSheet = await getAllDbOrdersFromSheet()
    if (fromSheet.length > 0) {
      return fromSheet
    }

    const localOrders = getDbOrders()
    if (localOrders.length === 0) {
      return fromSheet
    }

    return await migrateDbOrdersToSheet(localOrders)
  } catch {
    return getDbOrders()
  }
}

async function loadPaymentsForWalletSpend(): Promise<StudentPayment[]> {
  return loadDbStudentPaymentsWithMigration(getDbPayments())
}

async function loadWalletTopupsForBalance() {
  try {
    return await getAllDbWalletTopups()
  } catch {
    return getDbWalletTopups().map((item) => ({
      userId: item.userId,
      amount: item.amount,
      status: item.status,
    }))
  }
}

export async function calculateWalletSnapshot(userId: string): Promise<WalletSnapshot> {
  const normalizedUserId = String(userId || "").trim()
  if (!normalizedUserId) {
    return {
      approvedTopupAmount: 0,
      pendingTopupAmount: 0,
      spentCanteenAmount: 0,
      spentSppAmount: 0,
      spentAmount: 0,
      walletBalance: 0,
    }
  }

  const [allTopups, allOrders, allPayments] = await Promise.all([
    loadWalletTopupsForBalance(),
    loadOrdersForWalletSpend(),
    loadPaymentsForWalletSpend(),
  ])

  const approvedTopupAmount = allTopups
    .filter((item) => item.userId === normalizedUserId && item.status === "APPROVED")
    .reduce((acc, item) => acc + toPositiveNumber(item.amount), 0)

  const pendingTopupAmount = allTopups
    .filter((item) => item.userId === normalizedUserId && item.status === "PENDING")
    .reduce((acc, item) => acc + toPositiveNumber(item.amount), 0)

  const spentCanteenAmount = allOrders
    .filter((order) => order.customerId === normalizedUserId && order.status !== CANCELED_ORDER_STATUS)
    .reduce((acc, order) => acc + toPositiveNumber(order.totalAmount), 0)

  const spentSppAmount = allPayments
    .filter(
      (payment) =>
        payment.status === "PAID" &&
        payment.paidVia === "WALLET" &&
        String(payment.paidByUserId || "").trim() === normalizedUserId,
    )
    .reduce((acc, payment) => acc + toPositiveNumber(payment.amount), 0)

  const spentAmount = spentCanteenAmount + spentSppAmount
  const walletBalance = Math.max(0, approvedTopupAmount - spentAmount)

  return {
    approvedTopupAmount,
    pendingTopupAmount,
    spentCanteenAmount,
    spentSppAmount,
    spentAmount,
    walletBalance,
  }
}
