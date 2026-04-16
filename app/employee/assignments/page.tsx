"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassButton } from "@/components/atoms/glass-button"
import { GlassModal } from "@/components/molecules/glass-modal"
import { EmptySkeleton } from "@/components/molecules/empty-skeleton"
import { FormattedChatText } from "@/components/molecules/formatted-chat-text"
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
  attachmentUrls?: string[]
  attachmentName?: string
  imageUrl?: string
  imageUrls?: string[]
  maxScore: number
}

type TaskSubmission = {
  id: string
  taskId: string
  studentId: string
  submittedAt: string
  attachmentUrl?: string
  attachmentUrls?: string[]
  imageUrl?: string
  imageUrls?: string[]
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

const toUrlList = (primary?: string, list?: string[]) => {
  const values = [primary, ...(Array.isArray(list) ? list : [])]
  const normalized = values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
  return [...new Set(normalized)]
}

const isLikelyImageUrl = (value?: string) => {
  if (!value) return false
  const lower = value.toLowerCase()
  return (
    lower.startsWith("data:image/") ||
    /\.(png|jpe?g|webp|gif|svg)(\?|#|$)/.test(lower)
  )
}

const isStoredMediaUrl = (value?: string) => {
  if (!value) return false
  const normalized = value.trim()
  if (!normalized) return false
  if (normalized.startsWith("data:")) return true
  if (/^\/api\/media-assets\//i.test(normalized)) return true
  if (/^https?:\/\/[^/]+\/api\/media-assets\//i.test(normalized)) return true
  return /^https?:\/\/(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com|lh3\.googleusercontent\.com)\//i.test(normalized)
}

const splitMediaGroups = (attachmentUrls: string[], imageUrls: string[]) => {
  const materialImageUrls = new Set<string>()
  const materialFileUrls = new Set<string>()
  const urlReferences = new Set<string>()
  const imageReferences = new Set<string>()

  for (const url of [...new Set(attachmentUrls)]) {
    const isImage = isLikelyImageUrl(url)
    const isStored = isStoredMediaUrl(url)

    if (isStored) {
      if (isImage) {
        materialImageUrls.add(url)
      } else {
        materialFileUrls.add(url)
      }
      continue
    }

    if (isImage) {
      imageReferences.add(url)
    } else {
      urlReferences.add(url)
    }
  }

  for (const url of [...new Set(imageUrls)]) {
    if (isStoredMediaUrl(url)) {
      materialImageUrls.add(url)
    } else {
      imageReferences.add(url)
    }
  }

  return {
    materialImageUrls: [...materialImageUrls],
    materialFileUrls: [...materialFileUrls],
    imageReferenceUrls: [...imageReferences],
    urlReferenceUrls: [...urlReferences],
  }
}

const normalizeTaskMediaFields = (task: Task): Task => {
  const attachmentUrls = toUrlList(task.attachmentUrl, task.attachmentUrls)
  const imageUrls = toUrlList(task.imageUrl, task.imageUrls)
  return {
    ...task,
    attachmentUrl: attachmentUrls[0],
    attachmentUrls,
    imageUrl: imageUrls[0],
    imageUrls,
  }
}

const normalizeSubmissionMediaFields = (submission: TaskSubmission): TaskSubmission => {
  const attachmentUrls = toUrlList(submission.attachmentUrl, submission.attachmentUrls)
  const imageUrls = toUrlList(submission.imageUrl, submission.imageUrls)
  return {
    ...submission,
    attachmentUrl: attachmentUrls[0],
    attachmentUrls,
    imageUrl: imageUrls[0],
    imageUrls,
  }
}

export default function EmployeeAssignmentsPage() {
  const [employee, setEmployee] = useState({ id: "", subject: "-" })
  const [classes, setClasses] = useState<Array<{ id: string; name: string; grade?: string }>>([])
  const [studentsById, setStudentsById] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<TabType>("active")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedSubmission, setSelectedSubmission] = useState<TaskSubmission | null>(null)
  const [reviewScore, setReviewScore] = useState<number>(0)
  const [reviewFeedback, setReviewFeedback] = useState("")
  const [isReviewSaving, setIsReviewSaving] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [allSubmissions, setAllSubmissions] = useState<TaskSubmission[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const descriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subject: employee.subject,
    classId: "",
    dueDate: "",
    maxScore: 100,
    attachmentUrls: [""],
    imageUrls: [""],
  })
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([])

  const getClassLabel = (classRoom: { id: string; name: string; grade?: string }) =>
    `${classRoom.name}${classRoom.grade ? ` - Grade ${classRoom.grade}` : ""}`

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/employee/tasks", { cache: "no-store" })
        if (!res.ok) throw new Error("Gagal memuat tugas")
        const data = await res.json()

        const nextEmployee = data.employee || { id: "", subject: "-" }
        const resolvedClasses: Array<{ id: string; name: string; grade?: string }> = Array.isArray(data.classes)
          ? data.classes.map((item: any) => ({
              id: String(item.id || "").trim(),
              name: String(item.name || item.id || "-").trim(),
              grade: item.grade ? String(item.grade) : undefined,
            })).filter((item: any) => item.id)
          : []

        setEmployee(nextEmployee)
        setClasses(resolvedClasses)
        setFormData((prev) => ({
          ...prev,
          subject: nextEmployee.subject || "-",
          classId: prev.classId || resolvedClasses[0]?.id || "",
        }))

        setAllTasks(
          Array.isArray(data.tasks)
            ? data.tasks.map((task: Task) => normalizeTaskMediaFields(task))
            : [],
        )
        setAllSubmissions(
          Array.isArray(data.submissions)
            ? data.submissions.map((submission: TaskSubmission) => normalizeSubmissionMediaFields(submission))
            : [],
        )
        setStudentsById(data.studentsById && typeof data.studentsById === "object" ? data.studentsById : {})
        if (resolvedClasses.length === 0 && Array.isArray(data.tasks)) {
          const classOptions = Array.from(new Set((data.tasks as Task[]).map((task) => task.classId).filter(Boolean))).map((id) => ({
            id,
            name: id,
          }))
          if (classOptions.length > 0) {
            setClasses(classOptions)
            setFormData((prev) => ({ ...prev, classId: prev.classId || classOptions[0].id }))
          }
        }
      } catch {
        toast.error("Gagal memuat data tugas")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const teacherTasks = useMemo(() => allTasks, [allTasks])

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
    const pendingReview = Math.max(0, submitted - graded)
    return { submitted, graded, total, pendingReview }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      subject: employee.subject,
      classId: classes[0]?.id || "",
      dueDate: "",
      maxScore: 100,
      attachmentUrls: [""],
      imageUrls: [""],
    })
    setAttachmentFiles([])
    setEditingTaskId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const previewSelectedFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file)
    window.open(previewUrl, "_blank", "noopener,noreferrer")
  }

  const removeAttachmentFile = (indexToRemove: number) => {
    setAttachmentFiles((prev) => prev.filter((_, index) => index !== indexToRemove))
  }

  const insertDescriptionFormatting = (type: "bold" | "newParagraph") => {
    const textarea = descriptionTextareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const currentValue = formData.description
    const selectedText = currentValue.slice(start, end)

    let replacement = ""
    let caretPosition = start

    if (type === "bold") {
      const boldText = selectedText || "teks tebal"
      replacement = `*${boldText}*`
      caretPosition = start + replacement.length
    } else {
      replacement = "\n\n"
      caretPosition = start + replacement.length
    }

    const nextValue = `${currentValue.slice(0, start)}${replacement}${currentValue.slice(end)}`
    setFormData((prev) => ({ ...prev, description: nextValue }))

    requestAnimationFrame(() => {
      const ref = descriptionTextareaRef.current
      if (!ref) return
      ref.focus()
      ref.setSelectionRange(caretPosition, caretPosition)
    })
  }

  const handleCreateOrUpdate = async () => {
    if (!formData.title || !formData.description || !formData.dueDate) {
      toast.error("Harap isi semua field yang diperlukan")
      return
    }
    if (!formData.classId) {
      toast.error("Pilih kelas terlebih dahulu")
      return
    }

    let attachmentUrls = toUrlList(undefined, formData.attachmentUrls)
    let imageUrls = toUrlList(undefined, formData.imageUrls)
    let attachmentName: string | undefined = undefined

    if (attachmentFiles.length > 0) {
      const fileOverLimit = attachmentFiles.find((file) => file.size > 10 * 1024 * 1024)
      if (fileOverLimit) {
        toast.error(`Ukuran file ${fileOverLimit.name} maksimal 10MB`)
        return
      }

      try {
        for (const file of attachmentFiles) {
          const encoded = await fileToDataUrl(file)
          if (file.type.startsWith("image/")) {
            imageUrls = [...new Set([...imageUrls, encoded])]
          } else {
            attachmentUrls = [...new Set([...attachmentUrls, encoded])]
            if (!attachmentName) {
              attachmentName = file.name
            }
          }
        }
        if (!attachmentName && attachmentUrls.length > 1) {
          attachmentName = `${attachmentUrls.length} lampiran`
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
      attachmentUrl: attachmentUrls[0],
      attachmentUrls,
      attachmentName,
      imageUrl: imageUrls[0],
      imageUrls,
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

      const normalizedTask = normalizeTaskMediaFields(data.task as Task)
      setAllTasks((prev) =>
        editingTaskId
          ? prev.map((task) => (task.id === editingTaskId ? normalizedTask : task))
          : [normalizedTask, ...prev],
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
      attachmentUrls: toUrlList(task.attachmentUrl, task.attachmentUrls).length > 0
        ? toUrlList(task.attachmentUrl, task.attachmentUrls)
        : [""],
      imageUrls: toUrlList(task.imageUrl, task.imageUrls).length > 0
        ? toUrlList(task.imageUrl, task.imageUrls)
        : [""],
    })
    setAttachmentFiles([])
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
    void (async () => {
      try {
        const res = await fetch(`/api/employee/task-submissions?taskId=${task.id}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data.submissions)) {
          const normalizedSubmissions = data.submissions.map((submission: TaskSubmission) =>
            normalizeSubmissionMediaFields(submission),
          )
          setAllSubmissions((prev) => {
            const remaining = prev.filter((item) => item.taskId !== task.id)
            return [...normalizedSubmissions, ...remaining]
          })
        }
        if (data.studentsById && typeof data.studentsById === "object") {
          setStudentsById((prev) => ({ ...prev, ...data.studentsById }))
        }
      } catch {
        // Keep existing local list when refresh fails.
      }
    })()
  }

  const openReviewModal = (submission: TaskSubmission) => {
    setSelectedSubmission(submission)
    setReviewScore(Number(submission.score ?? 0))
    setReviewFeedback(submission.feedback || "")
    setShowReviewModal(true)
  }

  const handleSaveReview = async () => {
    if (!selectedTask || !selectedSubmission) return
    if (!Number.isFinite(reviewScore)) {
      toast.error("Nilai harus berupa angka")
      return
    }

    setIsReviewSaving(true)
    try {
      const res = await fetch("/api/employee/task-submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          score: reviewScore,
          feedback: reviewFeedback,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || "Gagal menyimpan nilai")
      }

      const nextSubmission = normalizeSubmissionMediaFields(data.submission as TaskSubmission)
      setAllSubmissions((prev) => prev.map((item) => (item.id === nextSubmission.id ? nextSubmission : item)))
      toast.success("Penilaian berhasil disimpan")
      setShowReviewModal(false)
      setSelectedSubmission(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan nilai")
    } finally {
      setIsReviewSaving(false)
    }
  }

  const tabs = [
    { id: "active" as TabType, label: "Aktif", count: activeTasks.length },
    { id: "past" as TabType, label: "Selesai", count: pastTasks.length },
  ]

  return (
    <>
      <div className="mx-auto w-full max-w-3xl space-y-5 px-1 sm:px-2">
        <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Kelola Tugas</h1>
            <p className="text-slate-500 text-sm">Buat dan kelola tugas untuk siswa</p>
          </div>
          <GlassButton type="button" onClick={openCreateModal} size="sm" className="w-full sm:w-auto justify-center">
            <Plus className="w-4 h-4 mr-1" /> Buat Tugas
          </GlassButton>
        </div>

        <div className="grid grid-cols-2 gap-2">
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
          {isLoading ? (
            <GlassCard className="py-4">
              <EmptySkeleton rows={3} />
            </GlassCard>
          ) : getTaskList().length === 0 ? (
            <GlassCard className="p-6 text-center space-y-2">
              <p className="text-sm text-slate-500">
                {activeTab === "active" ? "Data tugas belum tersedia" : "Belum ada tugas selesai"}
              </p>
              {activeTab === "active" ? (
                <GlassButton type="button" variant="outline" size="sm" onClick={openCreateModal} className="mt-3">
                  <Plus className="w-4 h-4 mr-1" /> Buat Tugas Pertama
                </GlassButton>
              ) : null}
            </GlassCard>
          ) : (
            getTaskList().map((task) => {
              const stats = getSubmissionStats(task.id)
              const classRoom = classes.find((c) => c.id === task.classId)
              const className = classRoom ? getClassLabel(classRoom) : "Kelas tidak ditemukan"
              const taskAttachmentUrls = toUrlList(task.attachmentUrl, task.attachmentUrls)
              const taskImageUrls = toUrlList(task.imageUrl, task.imageUrls)

              return (
                <GlassCard key={task.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800">{task.title}</h3>
                      <p className="text-sm text-slate-500">{task.subject} • {className}</p>

                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-400 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(task.dueDate)}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{stats.submitted}/{stats.total} dikumpulkan</span>
                        <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{stats.graded} dinilai</span>
                        <span className="flex items-center gap-1 text-amber-500"><FileText className="w-3.5 h-3.5" />{stats.pendingReview} perlu review</span>
                      </div>

                      {(taskAttachmentUrls.length > 0 || taskImageUrls.length > 0) && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {taskAttachmentUrls.map((url, index) => (
                            <a key={`${task.id}-attachment-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100">
                              <Link2 className="w-3.5 h-3.5" />
                              {task.attachmentName && index === 0 ? task.attachmentName : `Link Tugas ${index + 1}`}
                            </a>
                          ))}
                          {taskImageUrls.map((url, index) => (
                            <a key={`${task.id}-image-${index}`} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium hover:bg-slate-200">
                              <ImageIcon className="w-3.5 h-3.5" /> Gambar Tugas {index + 1}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
                        <button onClick={() => handleViewSubmissions(task)} className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors sm:w-auto sm:justify-start"><Eye className="w-3.5 h-3.5" /> Review Submission</button>
                        <button onClick={() => handleEdit(task)} className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-50 text-slate-600 text-xs font-medium hover:bg-slate-100 transition-colors sm:w-auto sm:justify-start"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
                        <button onClick={() => handleDelete(task)} disabled={isSubmitting} className="flex w-full items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-500 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-60 sm:w-auto sm:justify-start">{isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Hapus</button>
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
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => insertDescriptionFormatting("bold")}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Bold
              </button>
              <button
                type="button"
                onClick={() => insertDescriptionFormatting("newParagraph")}
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Paragraf Baru
              </button>
            </div>
            <textarea
              ref={descriptionTextareaRef}
              placeholder="Jelaskan detail tugas..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[140px] whitespace-pre-wrap"
            />
            <p className="mt-2 text-xs text-slate-500">
              Gunakan Enter untuk baris baru, kosongkan satu baris untuk jarak paragraf, dan format
              <span className="font-semibold"> *teks*</span> atau <span className="font-semibold">**teks**</span> untuk bold.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Kelas</label>
              <select value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" disabled={classes.length === 0}>
                {classes.length === 0 ? <option value="">Belum ada kelas</option> : null}
                {classes.map((c) => (<option key={c.id} value={c.id}>{getClassLabel(c)}</option>))}
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
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(e) => setAttachmentFiles(Array.from(e.target.files || []))}
              />
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Upload className="w-4 h-4 text-blue-500" />
                <span>{attachmentFiles.length > 0 ? `${attachmentFiles.length} file dipilih` : "Pilih satu atau beberapa file untuk lampiran tugas"}</span>
              </div>
            </label>
            {attachmentFiles.length > 0 ? (
              <div className="mt-2 space-y-2">
                {attachmentFiles.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                    <p className="text-xs text-slate-700 truncate pr-3">{file.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => previewSelectedFile(file)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttachmentFile(index)}
                        className="text-xs font-medium text-red-500 hover:text-red-600"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Link Materi/Tugas (Opsional)</label>
            {formData.attachmentUrls.map((url, index) => (
              <div key={`attachment-url-${index}`} className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      attachmentUrls: prev.attachmentUrls.map((item, idx) => (idx === index ? e.target.value : item)),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {index === formData.attachmentUrls.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        attachmentUrls: [...prev.attachmentUrls, ""],
                      }))
                    }
                    className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                    aria-label="Tambah link materi"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        attachmentUrls:
                          prev.attachmentUrls.length <= 1
                            ? [""]
                            : prev.attachmentUrls.filter((_, idx) => idx !== index),
                      }))
                    }
                    className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                    aria-label="Hapus link materi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">URL Gambar Tugas (Opsional)</label>
            {formData.imageUrls.map((url, index) => (
              <div key={`image-url-${index}`} className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://.../gambar.jpg"
                  value={url}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      imageUrls: prev.imageUrls.map((item, idx) => (idx === index ? e.target.value : item)),
                    }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                {index === formData.imageUrls.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        imageUrls: [...prev.imageUrls, ""],
                      }))
                    }
                    className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                    aria-label="Tambah URL gambar"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        imageUrls:
                          prev.imageUrls.length <= 1
                            ? [""]
                            : prev.imageUrls.filter((_, idx) => idx !== index),
                      }))
                    }
                    className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                    aria-label="Hapus URL gambar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
            <button type="button" onClick={() => { setShowCreateModal(false); resetForm() }} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors">Batal</button>
            <button type="button" onClick={() => { void handleCreateOrUpdate() }} disabled={isSubmitting} className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} {editingTaskId ? "Simpan Perubahan" : "Buat Tugas"}</button>
          </div>
        </div>
      </GlassModal>

      <GlassModal isOpen={showDetailModal && !!selectedTask} onClose={() => setShowDetailModal(false)} title="Detail Tugas" size="lg">
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">{selectedTask.subject}</span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 mt-2 break-words">{selectedTask.title}</h3>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Calendar className="w-4 h-4" />
                <span>Tenggat: {formatDate(selectedTask.dueDate)}</span>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Deskripsi</h4>
              <FormattedChatText text={selectedTask.description} className="text-slate-600 text-sm" />
            </div>

            {(() => {
              const teacherAttachmentUrls = toUrlList(selectedTask.attachmentUrl, selectedTask.attachmentUrls)
              const teacherImageUrls = toUrlList(selectedTask.imageUrl, selectedTask.imageUrls)
              const teacherMedia = splitMediaGroups(teacherAttachmentUrls, teacherImageUrls)
              const hasTeacherMedia =
                teacherMedia.urlReferenceUrls.length > 0 ||
                teacherMedia.imageReferenceUrls.length > 0 ||
                teacherMedia.materialImageUrls.length > 0 ||
                teacherMedia.materialFileUrls.length > 0

              if (!hasTeacherMedia) return null

              return (
                <div className="bg-blue-50 rounded-lg p-3 space-y-3">
                  <p className="text-sm font-medium text-blue-700">Lampiran dari Guru</p>

                  {teacherMedia.urlReferenceUrls.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-blue-700/80">Referensi URL:</p>
                      <div className="flex flex-wrap gap-2">
                        {teacherMedia.urlReferenceUrls.map((url, index) => (
                          <a
                            key={`${selectedTask.id}-url-reference-${index}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-blue-600 text-xs font-medium hover:bg-blue-100"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            {`Referensi ${index + 1}`}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {teacherMedia.imageReferenceUrls.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-blue-700/80">Referensi Gambar:</p>
                      <div className="flex flex-wrap gap-2">
                        {teacherMedia.imageReferenceUrls.map((url, index) => (
                          <a
                            key={`${selectedTask.id}-image-reference-${index}`}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-blue-600 text-xs font-medium hover:bg-blue-100"
                          >
                            <ImageIcon className="w-3.5 h-3.5" /> Referensi Gambar {index + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {(teacherMedia.materialImageUrls.length > 0 || teacherMedia.materialFileUrls.length > 0) ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-blue-700/80">Gambar Materi</p>
                      {teacherMedia.materialImageUrls.map((url, index) => (
                        <div key={`${selectedTask.id}-material-image-${index}`} className="rounded-xl border border-blue-200 bg-white p-2">
                          <img
                            src={url}
                            alt={`Gambar materi ${selectedTask.title} ${index + 1}`}
                            className="w-full h-auto max-h-[420px] object-contain rounded-lg"
                          />
                        </div>
                      ))}
                      {teacherMedia.materialFileUrls.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {teacherMedia.materialFileUrls.map((url, index) => (
                            <a
                              key={`${selectedTask.id}-material-file-${index}`}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-blue-600 text-xs font-medium hover:bg-blue-100"
                            >
                              <FileText className="w-3.5 h-3.5" /> File Materi {index + 1}
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )
            })()}

            <div className="pt-1">
              <p className="text-sm font-semibold text-slate-700">Submission Siswa</p>
            </div>

            <div className="space-y-3">
              {(() => {
                const submissions = allSubmissions.filter((s) => s.taskId === selectedTask.id)
                if (submissions.length === 0) {
                  return (
                    <GlassCard className="p-4 text-center space-y-1">
                      <p className="text-sm font-medium text-slate-700">Belum ada submission</p>
                      <p className="text-xs text-slate-500">Submission siswa akan muncul di sini untuk direview.</p>
                    </GlassCard>
                  )
                }
                return submissions.map((sub) => {
                  const submissionAttachmentUrls = toUrlList(sub.attachmentUrl, sub.attachmentUrls)
                  const submissionImageUrls = toUrlList(sub.imageUrl, sub.imageUrls)
                  const submissionMedia = splitMediaGroups(submissionAttachmentUrls, submissionImageUrls)

                  return (
                    <div key={sub.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex items-center gap-3">
                        <img src="/placeholder-user.jpg" alt="Student" className="w-10 h-10 rounded-full" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 text-sm">{studentsById[sub.studentId] || "Siswa"}</p>
                          <p className="text-xs text-slate-500">{formatDate(sub.submittedAt)}</p>
                        </div>
                        {sub.status === "GRADED" ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg">{sub.score}/{selectedTask.maxScore}</span>
                        ) : (
                          <button onClick={() => openReviewModal(sub)} className="px-3 py-1.5 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 transition-colors">Nilai</button>
                        )}
                      </div>
                      {submissionMedia.urlReferenceUrls.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-blue-700/80">Referensi URL:</p>
                          <div className="flex flex-wrap gap-2">
                            {submissionMedia.urlReferenceUrls.map((url, index) => (
                              <a
                                key={`${sub.id}-url-reference-${index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-blue-600 text-xs font-medium hover:bg-blue-100"
                              >
                                <Link2 className="w-3.5 h-3.5" />
                                {`Referensi ${index + 1}`}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {submissionMedia.imageReferenceUrls.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-blue-700/80">Referensi Gambar:</p>
                          <div className="flex flex-wrap gap-2">
                            {submissionMedia.imageReferenceUrls.map((url, index) => (
                              <a
                                key={`${sub.id}-image-reference-${index}`}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-blue-600 text-xs font-medium hover:bg-blue-100"
                              >
                                <ImageIcon className="w-3.5 h-3.5" /> Referensi Gambar {index + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {(submissionMedia.materialImageUrls.length > 0 || submissionMedia.materialFileUrls.length > 0) ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-blue-700/80">Gambar Materi</p>
                          {submissionMedia.materialImageUrls.map((url, index) => (
                            <a
                              key={`${sub.id}-material-image-${index}`}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-blue-600 text-xs font-medium hover:bg-blue-100 mr-2 mb-2"
                            >
                              <ImageIcon className="w-3.5 h-3.5" /> Gambar Materi {index + 1}
                            </a>
                          ))}
                          {submissionMedia.materialFileUrls.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {submissionMedia.materialFileUrls.map((url, index) => (
                                <a
                                  key={`${sub.id}-material-file-${index}`}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-blue-600 text-xs font-medium hover:bg-blue-100"
                                >
                                  <FileText className="w-3.5 h-3.5" /> File Jawaban {index + 1}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {sub.feedback ? (
                        <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-2">
                          <span className="font-medium">Catatan:</span> {sub.feedback}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        )}
      </GlassModal>

      <GlassModal isOpen={showReviewModal && !!selectedSubmission && !!selectedTask} onClose={() => setShowReviewModal(false)} title="Review Submission" size="md">
        {selectedSubmission && selectedTask ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-medium text-slate-800">{studentsById[selectedSubmission.studentId] || "Siswa"}</p>
              <p className="text-xs text-slate-500 mt-1">Dikumpulkan: {formatDate(selectedSubmission.submittedAt)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Nilai (0 - {selectedTask.maxScore})</label>
              <input
                type="number"
                min={0}
                max={selectedTask.maxScore}
                value={reviewScore}
                onChange={(e) => setReviewScore(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">Feedback (Opsional)</label>
              <textarea
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[90px] resize-none"
                placeholder="Tambahkan catatan untuk siswa"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => { void handleSaveReview() }}
                disabled={isReviewSaving}
                className="flex-1 px-4 py-3 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isReviewSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Simpan Nilai
              </button>
            </div>
          </div>
        ) : null}
      </GlassModal>
    </>
  )
}
