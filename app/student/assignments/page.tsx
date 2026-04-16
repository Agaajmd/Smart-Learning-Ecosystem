"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/templates/dashboard-layout"
import { RouteLoading } from "@/components/templates/route-loading"
import { GlassCard } from "@/components/molecules/glass-card"
import { GlassModal } from "@/components/molecules/glass-modal"
import { GlassButton } from "@/components/atoms/glass-button"
import { FormattedChatText } from "@/components/molecules/formatted-chat-text"
import type { Task, TaskSubmission } from "@/lib/data-model"
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Upload,
  Calendar,
  BookOpen,
  Paperclip,
  Link2,
  Image as ImageIcon,
  Plus,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type TabType = "pending" | "submitted" | "graded"

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ""))
    reader.onerror = () => reject(new Error("Gagal membaca file"))
    reader.readAsDataURL(file)
  })

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

const toUrlList = (primary?: string, list?: string[]) => {
  const values = [primary, ...(Array.isArray(list) ? list : [])]
  const normalized = values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
  return [...new Set(normalized)]
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

export default function StudentAssignmentsPage() {
  const [student, setStudent] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabType>("pending")
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [submissionLinks, setSubmissionLinks] = useState<string[]>([""])
  const [submissionImageUrls, setSubmissionImageUrls] = useState<string[]>([""])
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([])
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [allSubmissions, setAllSubmissions] = useState<TaskSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/student/tasks", { cache: "no-store" })
        if (!res.ok) {
          throw new Error("Gagal memuat tugas siswa")
        }
        const data = await res.json()
        setStudent(data.student || null)
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
      } catch {
        setLoadError("Data tugas belum bisa dimuat.")
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [])

  const classTasks = useMemo(() => allTasks, [allTasks])

  const studentSubmissions = useMemo(
    () => allSubmissions.filter((submission) => submission.studentId === student?.id),
    [allSubmissions, student?.id],
  )

  const getTaskWithSubmission = (task: Task) => {
    const submission = studentSubmissions.find((s) => s.taskId === task.id)
    return { task, submission }
  }

  const pendingTasks = classTasks.filter((task) => {
    const submission = studentSubmissions.find((s) => s.taskId === task.id)
    return !submission || submission.status === "PENDING"
  })

  const submittedTasks = classTasks.filter((task) => {
    const submission = studentSubmissions.find((s) => s.taskId === task.id)
    return submission && submission.status === "SUBMITTED"
  })

  const gradedTasks = classTasks.filter((task) => {
    const submission = studentSubmissions.find((s) => s.taskId === task.id)
    return submission && submission.status === "GRADED"
  })

  const getTaskList = () => {
    switch (activeTab) {
      case "pending":
        return pendingTasks
      case "submitted":
        return submittedTasks
      case "graded":
        return gradedTasks
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const resetSubmissionForm = () => {
    setSubmissionLinks([""])
    setSubmissionImageUrls([""])
    setSubmissionFiles([])
  }

  const previewSelectedFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file)
    window.open(previewUrl, "_blank", "noopener,noreferrer")
  }

  const removeSubmissionFile = (indexToRemove: number) => {
    setSubmissionFiles((prev) => prev.filter((_, index) => index !== indexToRemove))
  }

  const handleSubmit = async () => {
    if (!selectedTask || !student?.id) return
    const attachmentUrlsFromInput = toUrlList(undefined, submissionLinks)
    const imageUrlsFromInput = toUrlList(undefined, submissionImageUrls)

    if (attachmentUrlsFromInput.length === 0 && imageUrlsFromInput.length === 0 && submissionFiles.length === 0) {
      toast.error("Isi minimal satu: file, link, atau URL gambar")
      return
    }

    const existing = allSubmissions.find(
      (submission) => submission.taskId === selectedTask.id && submission.studentId === student.id,
    )

    let attachmentUrls = [...attachmentUrlsFromInput]
    let imageUrls = [...imageUrlsFromInput]
    let attachmentName: string | undefined = undefined

    if (submissionFiles.length > 0) {
      const fileOverLimit = submissionFiles.find((file) => file.size > 10 * 1024 * 1024)
      if (fileOverLimit) {
        toast.error(`Ukuran file ${fileOverLimit.name} maksimal 10MB`)
        return
      }

      try {
        for (const file of submissionFiles) {
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

    const res = await fetch("/api/student/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: student.id,
        taskId: selectedTask.id,
        attachmentUrl: attachmentUrls[0],
        attachmentUrls,
        imageUrl: imageUrls[0],
        imageUrls,
        attachmentName,
      }),
    })

    if (!res.ok) {
      toast.error("Gagal mengumpulkan tugas")
      return
    }

    const data = await res.json()
    const nextSubmission = normalizeSubmissionMediaFields(data.submission as TaskSubmission)
    const nextSubmissions = existing
      ? allSubmissions.map((submission) => (submission.id === existing.id ? nextSubmission : submission))
      : [nextSubmission, ...allSubmissions]

    setAllSubmissions(nextSubmissions)

    toast.success("Tugas berhasil dikumpulkan!", {
      description: selectedTask.title,
    })

    setShowUploadModal(false)
    setSelectedTask(null)
    resetSubmissionForm()
  }

  const tabs = [
    { id: "pending" as TabType, label: "Belum Dikerjakan", count: pendingTasks.length, icon: Clock },
    { id: "submitted" as TabType, label: "Dikumpulkan", count: submittedTasks.length, icon: Upload },
    { id: "graded" as TabType, label: "Dinilai", count: gradedTasks.length, icon: CheckCircle2 },
  ]

  if (isLoading) {
    return <RouteLoading />
  }

  if (!student) {
    return (
      <DashboardLayout role="STUDENT" userName="-" userAvatar="/placeholder-user.jpg">
        <div className="max-w-2xl mx-auto px-1">
          <GlassCard className="p-8 text-center">
            <h2 className="text-lg font-semibold text-slate-800">Data siswa tidak tersedia</h2>
            <p className="text-slate-500 mt-2">{loadError || "Silakan login ulang atau hubungi admin."}</p>
          </GlassCard>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout role="STUDENT" userName={student.name} userAvatar={student.avatar || "/placeholder-user.jpg"}>
      <div className="max-w-2xl mx-auto space-y-5 px-1">
        <div className="pb-2">
          <h1 className="text-xl font-bold text-slate-800">Tugas Saya</h1>
          <p className="text-slate-500 text-sm">Kelola dan kumpulkan tugas sekolah</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50",
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full text-xs",
                  activeTab === tab.id ? "bg-white/20" : "bg-slate-100",
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {getTaskList().length === 0 ? (
            <GlassCard className="p-6 text-center space-y-2">
              <p className="text-sm text-slate-500">Data belum tersedia</p>
              <p className="text-xs text-slate-400">Belum ada tugas untuk kategori ini.</p>
            </GlassCard>
          ) : (
            getTaskList().map((task) => {
              const { submission } = getTaskWithSubmission(task)
              const overdue = isOverdue(task.dueDate) && !submission

              return (
                <GlassCard
                  key={task.id}
                  className={cn("cursor-pointer hover:shadow-md", overdue && "border-red-200 bg-red-50/50")}
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        activeTab === "graded"
                          ? "bg-emerald-100 text-emerald-600"
                          : activeTab === "submitted"
                          ? "bg-blue-100 text-blue-600"
                          : overdue
                          ? "bg-red-100 text-red-500"
                          : "bg-slate-100 text-slate-600",
                      )}
                    >
                      <BookOpen className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-medium text-slate-800 leading-snug break-words">{task.title}</h3>
                          <p className="text-xs sm:text-sm text-slate-500 break-words">{task.subject}</p>
                        </div>
                        {submission?.status === "GRADED" && (
                          <span className="inline-flex w-fit px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-lg shrink-0">
                            {submission.score}/{task.maxScore}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-2 text-xs">
                        <span className={cn("flex items-center gap-1", overdue ? "text-red-500" : "text-slate-400")}>
                          {overdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                          {formatDate(task.dueDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )
            })
          )}
        </div>
      </div>

      <GlassModal
        isOpen={!!selectedTask && !showUploadModal}
        onClose={() => setSelectedTask(null)}
        title="Detail Tugas"
        size="lg"
      >
        {selectedTask && (
          <>
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

              {(() => {
                const submission = studentSubmissions.find((s) => s.taskId === selectedTask.id)
                if (submission?.status === "GRADED") {
                  return (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-emerald-700">Nilai</span>
                        <span className="text-2xl font-bold text-emerald-600">{submission.score}/{selectedTask.maxScore}</span>
                      </div>
                      {submission.feedback && <p className="text-sm text-emerald-600">{submission.feedback}</p>}
                    </div>
                  )
                }
                if (submission?.status === "SUBMITTED") {
                  const submissionAttachmentUrls = toUrlList(submission.attachmentUrl, submission.attachmentUrls)
                  const submissionImageUrls = toUrlList(submission.imageUrl, submission.imageUrls)
                  const submissionMedia = splitMediaGroups(submissionAttachmentUrls, submissionImageUrls)
                  return (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2 text-blue-700">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">Tugas Sudah Dikumpulkan</span>
                      </div>
                      <p className="text-sm text-blue-600">Dikumpulkan pada {formatDate(submission.submittedAt)}</p>
                      {submissionMedia.urlReferenceUrls.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-blue-700/80">Referensi URL:</p>
                          <div className="flex flex-wrap gap-2">
                            {submissionMedia.urlReferenceUrls.map((url, index) => (
                              <a
                                key={`${submission.id}-url-reference-${index}`}
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
                                key={`${submission.id}-image-reference-${index}`}
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
                              key={`${submission.id}-material-image-${index}`}
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
                                  key={`${submission.id}-material-file-${index}`}
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
                    </div>
                  )
                }
                return null
              })()}
            </div>

            {!studentSubmissions.find((s) => s.taskId === selectedTask.id) && (
              <div className="pt-4 mt-4 border-t border-slate-100">
                <GlassButton onClick={() => { setShowUploadModal(true); resetSubmissionForm() }} className="w-full justify-center">
                  <Upload className="w-5 h-5 mr-2" /> Kumpulkan Tugas
                </GlassButton>
              </div>
            )}
          </>
        )}
      </GlassModal>

      <GlassModal isOpen={showUploadModal && !!selectedTask} onClose={() => setShowUploadModal(false)} title="Kumpulkan Tugas" size="md">
        {selectedTask && (
          <>
            <p className="text-sm text-slate-500 mb-4">{selectedTask.title}</p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Upload File Jawaban</label>
                <label className="block border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    onChange={(e) => setSubmissionFiles(Array.from(e.target.files || []))}
                  />
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Upload className="w-4 h-4 text-blue-500" />
                    <span>
                      {submissionFiles.length > 0
                        ? `${submissionFiles.length} file dipilih`
                        : "Pilih satu atau beberapa file PDF/DOC/Gambar"}
                    </span>
                  </div>
                </label>
                {submissionFiles.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {submissionFiles.map((file, index) => (
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
                            onClick={() => removeSubmissionFile(index)}
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
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Link Jawaban (Opsional)</label>
                {submissionLinks.map((url, index) => (
                  <div key={`submission-link-${index}`} className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={url}
                      onChange={(e) =>
                        setSubmissionLinks((prev) => prev.map((item, idx) => (idx === index ? e.target.value : item)))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    {index === submissionLinks.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setSubmissionLinks((prev) => [...prev, ""])}
                        className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                        aria-label="Tambah link jawaban"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setSubmissionLinks((prev) =>
                            prev.length <= 1 ? [""] : prev.filter((_, idx) => idx !== index),
                          )
                        }
                        className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                        aria-label="Hapus link jawaban"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">URL Gambar Jawaban (Opsional)</label>
                {submissionImageUrls.map((url, index) => (
                  <div key={`submission-image-${index}`} className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://.../jawaban.jpg"
                      value={url}
                      onChange={(e) =>
                        setSubmissionImageUrls((prev) => prev.map((item, idx) => (idx === index ? e.target.value : item)))
                      }
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                    {index === submissionImageUrls.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setSubmissionImageUrls((prev) => [...prev, ""])}
                        className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                        aria-label="Tambah URL gambar jawaban"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          setSubmissionImageUrls((prev) =>
                            prev.length <= 1 ? [""] : prev.filter((_, idx) => idx !== index),
                          )
                        }
                        className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"
                        aria-label="Hapus URL gambar jawaban"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <GlassButton variant="secondary" onClick={() => setShowUploadModal(false)} className="flex-1 justify-center">Batal</GlassButton>
              <GlassButton onClick={handleSubmit} className="flex-1 justify-center" disabled={toUrlList(undefined, submissionLinks).length === 0 && toUrlList(undefined, submissionImageUrls).length === 0 && submissionFiles.length === 0}>
                <Paperclip className="w-4 h-4 mr-1.5" /> Kirim
              </GlassButton>
            </div>
          </>
        )}
      </GlassModal>
    </DashboardLayout>
  )
}
