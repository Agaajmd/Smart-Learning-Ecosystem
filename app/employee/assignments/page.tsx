"use client"

import { useEffect, useMemo, useState } from "react"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import {
  FileText,
  Plus,
  CheckCircle2,
  Users,
  Calendar,
  BookOpen,
  Trash2,
  Edit3,
  Eye,
  Send,
  Link2,
  Image as ImageIcon,
  Upload,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type Task = {
  id: string
  title: string
  description: string
  subject: string
  classId: string
  teacherId: string
  dueDate: string
  createdAt: string
  attachmentUrl?: string
  attachmentName?: string
  imageUrl?: string
  maxScore: number
}

type TaskSubmission = {
  id: string
  taskId: string
  studentId: string
  submittedAt: string
  attachmentUrl?: string
  imageUrl?: string
  attachmentName?: string
  score?: number
  feedback?: string
  status: "PENDING" | "SUBMITTED" | "GRADED" | "LATE"
}

type TabType = "active" | "past"

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Gagal membaca file"))
    reader.readAsDataURL(file)
  })

export default function EmployeeAssignmentsPage() {
  const [employee, setEmployee] = useState({ id: "", subject: "-" })
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([])
  const [activeTab, setActiveTab] = useState<TabType>("active")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [allSubmissions, setAllSubmissions] = useState<TaskSubmission[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: employee.subject,
    classId: "",
    dueDate: "",
    maxScore: 100,
    attachmentUrl: "",
    imageUrl: "",
  })
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const contextRes = await fetch("/api/employee/context", { cache: "no-store" })
        if (contextRes.ok) {
          const contextData = await contextRes.json()
          const nextEmployee = contextData.employee || { id: "", subject: "-" }
          const nextClasses = Array.isArray(contextData.classes) ? contextData.classes : []
          setEmployee(nextEmployee)
          setClasses(nextClasses)
          setFormData((prev) => ({
            ...prev,
            subject: nextEmployee.subject || "-",
            classId: prev.classId || nextClasses[0]?.id || "",
          }))
        }

        const res = await fetch(`/api/employee/tasks?teacherId=${employee.id}`, { cache: "no-store" })
        if (!res.ok) throw new Error("Gagal memuat tugas")
        const data = await res.json()
        setAllTasks(Array.isArray(data.tasks) ? data.tasks : [])
        setAllSubmissions(Array.isArray(data.submissions) ? data.submissions : [])
      } catch {
        toast.error("Gagal memuat data tugas")
      }
    }

    load()
  }, [employee.id])

  const teacherTasks = useMemo(
    () => allTasks.filter((task) => task.teacherId === employee.id),
    [allTasks, employee.id],
  )

  const now = new Date()
  const activeTasks = teacherTasks.filter((t) => new Date(t.dueDate) >= now)
  const pastTasks = teacherTasks.filter((t) => new Date(t.dueDate) < now)

  const getTaskList = () => (activeTab === "active" ? activeTasks : pastTasks)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getSubmissionStats = (taskId: string) => {
    const submissions = allSubmissions.filter((s) => s.taskId === taskId)
    const total = 30
    const submitted = submissions.filter((s) => s.status !== "PENDING").length
    const graded = submissions.filter((s) => s.status === "GRADED").length
    return { submitted, graded, total }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      subject: employee.subject,
      classId: classes[0]?.id || "",
      dueDate: "",
      maxScore: 100,
      attachmentUrl: "",
      imageUrl: "",
    })
    setAttachmentFile(null)
    setEditingTaskId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const previewSelectedFile = () => {
    if (!attachmentFile) return
    const previewUrl = URL.createObjectURL(attachmentFile)
    window.open(previewUrl, "_blank", "noopener,noreferrer")
  }

  const handleCreateOrUpdate = async () => {
    if (!formData.title || !formData.description || !formData.dueDate) {
      toast.error("Harap isi semua field yang diperlukan")
      return
    }

    let attachmentUrl = formData.attachmentUrl.trim() || undefined
    let imageUrl = formData.imageUrl.trim() || undefined
    let attachmentName: string | undefined = undefined

    if (attachmentFile) {
      if (attachmentFile.size > 10 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 10MB")
        return
      }
      try {
        const encoded = await fileToDataUrl(attachmentFile)
        attachmentUrl = encoded
        attachmentName = attachmentFile.name
        if (attachmentFile.type.startsWith("image/")) {
          imageUrl = encoded
        }
      } catch {
        toast.error("Gagal memproses file")
        return
      }
    }

    const nextTask: Task = {
      id: editingTaskId || `task-${Date.now()}`,
      title: formData.title,
      description: formData.description,
      subject: formData.subject,
      classId: formData.classId,
      teacherId: employee.id,
      dueDate: formData.dueDate,
      createdAt: editingTaskId
        ? allTasks.find((t) => t.id === editingTaskId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
      maxScore: Number(formData.maxScore) || 100,
      attachmentUrl,
      attachmentName,
      imageUrl,
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/employee/tasks", {
        method: editingTaskId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextTask),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menyimpan tugas")

      setAllTasks((prev) =>
        editingTaskId
          ? prev.map((task) => (task.id === editingTaskId ? data.task : task))
          : [data.task, ...prev],
      )

      toast.success(editingTaskId ? "Tugas berhasil diperbarui" : "Tugas berhasil dibuat", {
        description: nextTask.title,
      })

      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan tugas")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTaskId(task.id)
    setFormData({
      title: task.title,
      description: task.description,
      subject: task.subject,
      classId: task.classId,
      dueDate: task.dueDate,
      maxScore: task.maxScore,
      attachmentUrl: task.attachmentUrl || "",
      imageUrl: task.imageUrl || "",
    })
    setAttachmentFile(null)
    setShowCreateModal(true)
  }

  const handleDelete = async (task: Task) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/employee/tasks?id=${task.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Gagal menghapus tugas")

      setAllTasks((prev) => prev.filter((t) => t.id !== task.id))
      setAllSubmissions((prev) => prev.filter((s) => s.taskId !== task.id))
      toast.success("Tugas berhasil dihapus", { description: task.title })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus tugas")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewSubmissions = (task: Task) => {
    setSelectedTask(task)
    setShowDetailModal(true)
  }

  const tabs = [
    { id: "active" as TabType, label: "Aktif", count: activeTasks.length },
    { id: "past" as TabType, label: "Selesai", count: pastTasks.length },
  ]

  return (
    <>
      <div className="max-w-2xl mx-auto space-y-5 px-1">
        <div className="flex items-center justify-between pb-2">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Kelola Tugas</h1>
            <p className="text-slate-500 text-sm">Buat dan kelola tugas untuk siswa</p>
          </div>
          <GlassButton onClick={openCreateModal} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Buat Tugas
          </GlassButton>
        </div>

        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
              )}
            >
              {tab.label}
              <span className={cn("px-2 py-0.5 rounded-full text-xs", activeTab === tab.id ? "bg-white/20" : "bg-slate-100")}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {getTaskList().length === 0 ? (
            <GlassCard className="py-4">
              <EmptySkeleton rows={3} />
              <div className="text-center pt-2">
              <GlassButton variant="outline" size="sm" onClick={openCreateModal} className="mt-3">
                <Plus className="w-4 h-4 mr-1" /> Buat Tugas Pertama
              </GlassButton>
              </div>
            </GlassCard>
          ) : (
            getTaskList().map((task) => {
              const stats = getSubmissionStats(task.id)
              const className = classes.find((c) => c.id === task.classId)?.name || "Unknown"

              return (
                <GlassCard key={task.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800">{task.title}</h3>
                      <p className="text-sm text-slate-500">{task.subject} • {className}</p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(task.dueDate)}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{stats.submitted}/{stats.total} dikumpulkan</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{stats.graded} dinilai</span>
                      </div>

                      {(task.attachmentUrl || task.imageUrl) && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {task.attachmentUrl && (
                            <a href={task.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100">
                              <Link2 className="w-3.5 h-3.5" /> {task.attachmentName || "File/Link Tugas"}
                            </a>
                          )}
                          {task.imageUrl && (
                            <a href={task.imageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200">
                              <ImageIcon className="w-3.5 h-3.5" /> Gambar Tugas
                            </a>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <button onClick={() => handleViewSubmissions(task)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"><Eye className="w-3.5 h-3.5" /> Lihat Submission</button>
                        <button onClick={() => handleEdit(task)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-colors"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
                        <button onClick={() => handleDelete(task)} disabled={isSubmitting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-60">{isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Hapus</button>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )
            })
          )}
        </div>
      </div>

      <GlassModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title={editingTaskId ? "Edit Tugas" : "Buat Tugas Baru"} size="lg">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Judul Tugas</label>
            <input type="text" placeholder="Contoh: Tugas Matematika Bab 5" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Deskripsi</label>
            <textarea placeholder="Jelaskan detail tugas..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[100px] resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Kelas</label>
              <select value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                {classes.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nilai Maksimal</label>
              <input type="number" value={formData.maxScore} onChange={(e) => setFormData({ ...formData, maxScore: Number(e.target.value) || 100 })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Tenggat Waktu</label>
            <input type="datetime-local" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Upload File Lampiran (PDF/DOC/Gambar)</label>
            <label className="block border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
              <input type="file" className="hidden" onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)} />
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Upload className="w-4 h-4 text-blue-500" />
                <span>{attachmentFile ? attachmentFile.name : "Pilih file untuk lampiran tugas"}</span>
              </div>
            </label>
            {attachmentFile && (
              <button onClick={previewSelectedFile} className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700">Preview file</button>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Link Materi/Tugas (Opsional)</label>
            <input type="url" placeholder="https://..." value={formData.attachmentUrl} onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">URL Gambar Tugas (Opsional)</label>
            <input type="url" placeholder="https://.../gambar.jpg" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => { setShowCreateModal(false); resetForm() }} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">Batal</button>
            <button onClick={handleCreateOrUpdate} disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {editingTaskId ? "Simpan Perubahan" : "Buat Tugas"}</button>
          </div>
        </div>
      </GlassModal>

      <GlassModal isOpen={showDetailModal && !!selectedTask} onClose={() => setShowDetailModal(false)} title="Submission" size="lg">
        {selectedTask && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="font-medium text-slate-800">{selectedTask.title}</p>
              <p className="text-sm text-slate-500 mt-1">{selectedTask.subject}</p>
            </div>
            <div className="space-y-3">
              {(() => {
                const submissions = allSubmissions.filter((s) => s.taskId === selectedTask.id)
                if (submissions.length === 0) {
                  return <EmptySkeleton rows={2} className="py-4" />
                }
                return submissions.map((sub) => (
                  <div key={sub.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                    <div className="flex items-center gap-3">
                      <img src="/placeholder-user.jpg" alt="Student" className="w-10 h-10 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm">Siswa {sub.studentId}</p>
                        <p className="text-xs text-slate-500">{formatDate(sub.submittedAt)}</p>
                      </div>
                      {sub.status === "GRADED" ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">{sub.score}/{selectedTask.maxScore}</span>
                      ) : (
                        <button className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors">Nilai</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sub.attachmentUrl && <a href={sub.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100"><Link2 className="w-3.5 h-3.5" />{sub.attachmentName || "File/Link Jawaban"}</a>}
                      {sub.imageUrl && <a href={sub.imageUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200"><ImageIcon className="w-3.5 h-3.5" />Gambar Jawaban</a>}
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}
      </GlassModal>
    </>
  )
}
