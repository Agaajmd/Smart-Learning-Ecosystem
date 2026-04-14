"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { GlassCard } from "@/components/molecules/glass-card"
import type { Parent, StudentPayment, Student } from "@/lib/data-model"
import { 
  Wallet, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  Filter,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { RouteLoading } from "@/components/templates/route-loading"

export default function ParentFinancePage() {
  const [parent, setParent] = useState<Parent | null>(null)
  const [children, setChildren] = useState<Student[]>([])
  const [selectedChild, setSelectedChild] = useState<Student | null>(null)
  const [payments, setPayments] = useState<StudentPayment[]>([])
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [childClassName, setChildClassName] = useState("")

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const query = selectedChild?.id ? `?childId=${selectedChild.id}` : ""
        const res = await fetch(`/api/parent/child-overview${query}`, {
          cache: "no-store",
        })
        if (!res.ok) return
        const data = await res.json()
        setParent(data.parent || null)
        setChildren(data.children || [])
        if (data.selectedChild) setSelectedChild(data.selectedChild)
        setPayments(data.payments || [])
        setChildClassName(data.childClass?.name || data.selectedChild?.classId || "-")
      } catch {
        setParent(null)
      }
    }

    fetchOverview()
  }, [selectedChild?.id])

  if (!parent || !selectedChild) {
    return <RouteLoading />
  }

  const filteredPayments = filterStatus === "all" 
    ? payments 
    : payments.filter(p => p.status === filterStatus)

  const totalPayments = payments.reduce((acc, p) => acc + p.amount, 0)
  const paidPayments = payments.filter(p => p.status === "PAID").reduce((acc, p) => acc + p.amount, 0)
  const unpaidPayments = payments.filter(p => p.status !== "PAID").reduce((acc, p) => acc + p.amount, 0)

  return (
    <DashboardLayout role="PARENT" userName={parent.name} userAvatar={parent.avatar}>
      <div className="max-w-4xl mx-auto space-y-6 px-1">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/parent" className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Keuangan Anak</h1>
            <p className="text-slate-500 text-sm">Detail pembayaran SPP, DSP, dan lainnya</p>
          </div>
        </div>

        {/* Child Selector */}
        {children.length > 1 && (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all min-w-fit",
                  selectedChild?.id === child.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <img src={child.avatar} alt={child.name} className="w-10 h-10 rounded-full object-cover" />
                <div className="text-left">
                  <p className="font-medium text-slate-800">{child.name}</p>
                  <p className="text-xs text-slate-500">{child.id === selectedChild.id ? childClassName : child.classId}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-4 bg-gradient-to-br from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-100">
                <Wallet className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Tagihan</p>
                <p className="text-xl font-bold text-slate-800">Rp {totalPayments.toLocaleString()}</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4 bg-gradient-to-br from-green-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-green-100">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Sudah Dibayar</p>
                <p className="text-xl font-bold text-green-600">Rp {paidPayments.toLocaleString()}</p>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-4 bg-gradient-to-br from-red-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-100">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Belum Dibayar</p>
                <p className="text-xl font-bold text-red-600">Rp {unpaidPayments.toLocaleString()}</p>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <div className="flex items-center gap-1 mr-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-600">Filter:</span>
          </div>
          {[
            { value: "all", label: "Semua" },
            { value: "PAID", label: "Lunas" },
            { value: "PARTIAL", label: "Sebagian" },
            { value: "UNPAID", label: "Belum Bayar" },
          ].map(filter => (
            <button
              key={filter.value}
              onClick={() => setFilterStatus(filter.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                filterStatus === filter.value
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Payments List */}
        <div className="space-y-3">
          {filteredPayments.map(payment => (
            <GlassCard key={payment.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    payment.status === "PAID" ? "bg-green-100" : 
                    payment.status === "PARTIAL" ? "bg-amber-100" : "bg-red-100"
                  )}>
                    {payment.status === "PAID" ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : payment.status === "PARTIAL" ? (
                      <Clock className="w-5 h-5 text-amber-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        payment.type === "SPP" ? "bg-blue-100 text-blue-700" :
                        payment.type === "DSP" ? "bg-purple-100 text-purple-700" :
                        "bg-slate-100 text-slate-700"
                      )}>
                        {payment.type}
                      </span>
                      <span className="text-xs text-slate-400">{payment.semester}</span>
                    </div>
                    <p className="font-medium text-slate-800 mt-1">{payment.description}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      Jatuh tempo: {new Date(payment.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {payment.paidDate && (
                      <p className="text-sm text-green-600 mt-0.5">
                        Dibayar: {new Date(payment.paidDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-800">Rp {payment.amount.toLocaleString()}</p>
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    payment.status === "PAID" ? "bg-green-100 text-green-700" :
                    payment.status === "PARTIAL" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {payment.status === "PAID" ? "Lunas" : payment.status === "PARTIAL" ? "Sebagian" : "Belum Bayar"}
                  </span>
                </div>
              </div>
              {payment.status === "PAID" && (
                <button className="mt-3 flex items-center gap-2 text-sm text-blue-500 hover:text-blue-600">
                  <Download className="w-4 h-4" />
                  Download Bukti Pembayaran
                </button>
              )}
            </GlassCard>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
