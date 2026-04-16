import { NextResponse } from "next/server"
import { getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { getSessionUser } from "@/lib/server/session-user"

export async function GET(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isStudentViewer = sessionUser.role === "STUDENT"
  const isAdminViewer = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  if (!isStudentViewer && !isAdminViewer) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const url = new URL(request.url)
  const requestedStudentId = String(url.searchParams.get("studentId") || "").trim()
  const targetStudentId = isStudentViewer ? sessionUser.id : requestedStudentId
  if (!targetStudentId) {
    return NextResponse.json({ error: "studentId wajib diisi" }, { status: 400 })
  }

  const [users, classes] = await Promise.all([getAllDbUsers(), getAllDbClasses().catch(() => [])])
  const { resolveClassId } = createClassIdResolver(classes)
  const students = users.filter((user) => user.role === "STUDENT" && user.isActive)

  const student = students.find((item) => item.id === targetStudentId)
  if (!student) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  const normalizedClassId = resolveClassId(student.classId)
  const classInfo = classes.find((item) => item.id === normalizedClassId)

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      avatar: student.avatar,
      role: student.role,
      classId: normalizedClassId || student.classId,
      className: classInfo?.name || student.classId || "-",
      classGrade: classInfo?.grade || "",
      phone: student.phone || "",
    },
  })
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser()
  if (!sessionUser) {
    return NextResponse.json({ error: "Session tidak ditemukan" }, { status: 401 })
  }

  const isStudentEditor = sessionUser.role === "STUDENT"
  const isAdminEditor = sessionUser.role === "ADMIN" || sessionUser.role === "SUPER_ADMIN"
  if (!isStudentEditor && !isAdminEditor) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 403 })
  }

  const body = await request.json()
  const requestedStudentId = String(body.id || "").trim()
  const targetStudentId = isStudentEditor ? sessionUser.id : requestedStudentId

  if (!targetStudentId) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  if (isStudentEditor && requestedStudentId && requestedStudentId !== sessionUser.id) {
    return NextResponse.json({ error: "Tidak diizinkan mengubah profil siswa lain" }, { status: 403 })
  }

  const users = await getAllDbUsers()
  const targetStudent =
    users.find((item) => item.id === targetStudentId && item.role === "STUDENT" && item.isActive) || null
  if (!targetStudent) {
    return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
  }

  const password = body.password != null ? String(body.password).trim() : ""
  if (password && password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 })
  }

  try {
    const updated = await updateDbUserById({
      id: targetStudentId,
      name: body.name ? String(body.name) : undefined,
      email: body.email ? String(body.email) : undefined,
      avatar: body.avatar ? String(body.avatar) : undefined,
      phone: body.phone ? String(body.phone) : undefined,
      password: password || undefined,
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memperbarui profil siswa" },
      { status: 400 },
    )
  }
}
