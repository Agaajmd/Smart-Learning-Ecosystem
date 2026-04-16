import { NextResponse } from "next/server"
import { createDbUser, deleteDbUserById, getAllDbUsers, updateDbUserById } from "@/lib/server/google-sheets-auth"
import { getAllDbClasses } from "@/lib/server/google-sheets-classes"
import { getAllDbActivityPointsFromSheet } from "@/lib/server/google-sheets-activity-points"
import { getDbParents, getDbStudents, setDbParents } from "@/lib/server/persistent-store"
import { createClassIdResolver } from "@/lib/server/class-id-resolver"
import { logAudit } from "@/lib/server/audit-log"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WHATSAPP_REGEX = /^(\+62|62|0)8[1-9][0-9]{7,10}$/

const normalizeId = (value: unknown) => String(value || "").trim().toLowerCase()
const normalizeLooseId = (value: unknown) => normalizeId(value).replace(/[^a-z0-9]/g, "")

const splitRelationTokens = (raw: unknown) => {
  const value = String(raw || "").trim()
  if (!value) return [] as string[]

  if (value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean)
      }
    } catch {
      // Fallback to token split format below.
    }
  }

  return value
    .replace(/\r/g, "\n")
    .split(/[;,\n|/]+|\s+dan\s+|\s*&\s*/gi)
    .map((item) => item.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const classId = String(url.searchParams.get("classId") || "").trim()

  const [users, classes] = await Promise.all([getAllDbUsers(), getAllDbClasses()])
  const { resolveClassId } = createClassIdResolver(classes)
  const normalizedClassId = resolveClassId(classId)
  const hasClassFilter = Boolean(normalizedClassId && classes.some((item) => item.id === normalizedClassId))

  const studentsFromUsers = users
    .filter((user) => user.role === "STUDENT" && user.isActive)
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      classId: resolveClassId(user.classId),
      avatar: user.avatar,
      role: "STUDENT" as const,
      paymentStatus: "UNPAID" as "PAID" | "UNPAID" | "PARTIAL",
      behaviorScore: 0,
      attendance: "PRESENT" as "PRESENT" | "SICK" | "ALPHA",
      seatRow: 0,
      seatCol: 0,
      coins: 0,
      streak: 0,
      level: 0,
      xp: 0,
    }))
  const studentsFromStore = getDbStudents().map((student) => ({
    ...student,
    classId: resolveClassId(student.classId),
  }))

  const mergedStudentsById = new Map<string, (typeof studentsFromUsers)[number]>()
  for (const student of studentsFromStore) {
    mergedStudentsById.set(student.id, {
      id: student.id,
      name: student.name,
      email: student.email,
      classId: student.classId,
      avatar: student.avatar,
      role: "STUDENT" as const,
      paymentStatus: student.paymentStatus || "UNPAID",
      behaviorScore: student.behaviorScore || 0,
      attendance: student.attendance || "PRESENT",
      seatRow: Number(student.seatRow || 0),
      seatCol: Number(student.seatCol || 0),
      coins: Number(student.coins || 0),
      streak: Number(student.streak || 0),
      level: Number(student.level || 0),
      xp: Number(student.xp || 0),
    })
  }
  for (const student of studentsFromUsers) {
    const existing = mergedStudentsById.get(student.id)
    mergedStudentsById.set(student.id, {
      ...(existing || student),
      ...student,
      classId: student.classId || existing?.classId || "",
    })
  }

  const students = [...mergedStudentsById.values()]
    .filter((student) => (hasClassFilter ? student.classId === normalizedClassId : true))

  let activityPoints = [] as Awaited<ReturnType<typeof getAllDbActivityPointsFromSheet>>
  try {
    activityPoints = await getAllDbActivityPointsFromSheet()
  } catch {
    activityPoints = []
  }

  const studentIds = new Set(students.map((student) => student.id))
  const pointSummaryByStudentId = activityPoints.reduce((acc, point) => {
    if (!studentIds.has(point.studentId)) {
      return acc
    }
    const bucket = acc[point.studentId] || { positivePoints: 0, negativePoints: 0, totalPoints: 0 }
    if (point.type === "NEGATIVE") {
      bucket.negativePoints += Math.abs(Number(point.points) || 0)
    } else {
      bucket.positivePoints += Math.abs(Number(point.points) || 0)
    }
    bucket.totalPoints = bucket.positivePoints - bucket.negativePoints
    acc[point.studentId] = bucket
    return acc
  }, {} as Record<string, { positivePoints: number; negativePoints: number; totalPoints: number }>)

  const studentsWithPoints = students.map((student) => {
    const summary = pointSummaryByStudentId[student.id] || { positivePoints: 0, negativePoints: 0, totalPoints: 0 }
    return {
      ...student,
      positivePoints: summary.positivePoints,
      negativePoints: summary.negativePoints,
      totalPoints: summary.totalPoints,
      points: summary.totalPoints,
    }
  })

  const studentsById = new Map(studentsWithPoints.map((student) => [student.id, student]))
  const studentsByNormalizedId = new Map(studentsWithPoints.map((student) => [normalizeId(student.id), student]))
  const studentsByLooseId = new Map(studentsWithPoints.map((student) => [normalizeLooseId(student.id), student]))
  const studentsByClassId = studentsWithPoints.reduce((acc, student) => {
    const key = student.classId
    if (!key) return acc
    const bucket = acc.get(key) || []
    bucket.push(student.id)
    acc.set(key, bucket)
    return acc
  }, new Map<string, string[]>())
  const classAliasToId = new Map<string, string>()
  for (const classItem of classes) {
    const aliases = [
      classItem.id,
      classItem.name,
      classItem.grade,
      `${classItem.name} ${classItem.grade}`,
      `${classItem.grade} ${classItem.name}`,
    ]
      .map((item) => String(item || "").trim())
      .filter(Boolean)

    for (const alias of aliases) {
      classAliasToId.set(normalizeId(alias), classItem.id)
      classAliasToId.set(normalizeLooseId(alias), classItem.id)
    }
  }

  const parentStore = getDbParents()
  const parentStoreByIdentity = new Map<string, (typeof parentStore)[number]>()
  for (const parent of parentStore) {
    parentStoreByIdentity.set(normalizeId(parent.id), parent)
    parentStoreByIdentity.set(normalizeId(parent.email), parent)
  }

  const resolveChildIds = (input: {
    storeChildIds?: string[]
    relationField?: string
  }) => {
    const resolved = new Set<string>()

    const appendToken = (token: string) => {
      if (!token) return

      const candidates = [...new Set([
        token,
        token.includes(":") ? token.split(":").pop() || "" : "",
        token.includes("=") ? token.split("=").pop() || "" : "",
      ].map((item) => String(item || "").trim()).filter(Boolean))]

      for (const candidate of candidates) {
        const normalizedToken = normalizeId(candidate)
        const looseToken = normalizeLooseId(candidate)

        if (studentsById.has(candidate)) {
          resolved.add(candidate)
          return
        }

        const studentByNormalizedId = studentsByNormalizedId.get(normalizedToken) || studentsByLooseId.get(looseToken)
        if (studentByNormalizedId?.id) {
          resolved.add(studentByNormalizedId.id)
          return
        }

        const normalizedClassToken =
          classAliasToId.get(normalizedToken) ||
          classAliasToId.get(looseToken) ||
          resolveClassId(candidate)
        const classChildIds = studentsByClassId.get(normalizedClassToken)
        if (classChildIds && classChildIds.length > 0) {
          for (const childId of classChildIds) {
            resolved.add(childId)
          }
          return
        }

        const studentByName = studentsWithPoints.find(
          (student) =>
            normalizeId(student.name) === normalizedToken || normalizeLooseId(student.name) === looseToken,
        )
        if (studentByName?.id) {
          resolved.add(studentByName.id)
          return
        }
      }
    }

    for (const childId of input.storeChildIds || []) {
      appendToken(String(childId || ""))
    }

    for (const token of splitRelationTokens(input.relationField)) {
      appendToken(token)
    }

    return [...resolved]
  }

  const parentsFromUsers = users
    .filter((user) => user.role === "PARENT" && user.isActive)
    .map((user) => {
      const parentMap =
        parentStoreByIdentity.get(normalizeId(user.id)) || parentStoreByIdentity.get(normalizeId(user.email)) || null

      const mappedChildIds = resolveChildIds({
        storeChildIds: parentMap?.childrenIds,
        relationField: user.classId,
      }).filter((childId) => studentIds.has(childId))

      if (mappedChildIds.length === 0) {
        return null
      }

      const firstChildId = mappedChildIds[0]
      const firstChild = studentsById.get(firstChildId)

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: "PARENT" as const,
        phone: user.phone || parentMap?.phone || "",
        childrenIds: mappedChildIds,
        childId: firstChildId,
        childName: firstChild?.name || "-",
      }
    })
    .filter(Boolean) as Array<{
    id: string
    name: string
    email: string
    avatar: string
    role: "PARENT"
    phone: string
    childrenIds: string[]
    childId: string
    childName: string
  }>

  const parentsFromStoreOnly = parentStore
    .filter(
      (parent) =>
        !parentsFromUsers.some(
          (item) =>
            normalizeId(item.id) === normalizeId(parent.id) ||
            normalizeId(item.email) === normalizeId(parent.email),
        ),
    )
    .map((parent) => {
      const mappedChildIds = resolveChildIds({
        storeChildIds: parent.childrenIds,
      }).filter((childId) => studentIds.has(childId))

      if (mappedChildIds.length === 0) {
        return null
      }

      const firstChildId = mappedChildIds[0]
      const firstChild = studentsById.get(firstChildId)

      return {
        ...parent,
        childrenIds: mappedChildIds,
        childId: firstChildId,
        childName: firstChild?.name || "-",
      }
    })
    .filter(Boolean) as Array<{
    id: string
    name: string
    email: string
    avatar: string
    role: "PARENT"
    phone: string
    childrenIds: string[]
    childId: string
    childName: string
  }>

  const parents = [...parentsFromUsers, ...parentsFromStoreOnly]

  return NextResponse.json({ parents, students: studentsWithPoints })
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = String(body.name || "").trim()
  const email = String(body.email || "").trim().toLowerCase()
  const phone = String(body.phone || "").trim()
  const password = String(body.password || "")
  const childId = String(body.childId || "").trim()
  const classId = String(body.classId || "").trim()

  if (!name || !email || !phone || !password || !childId) {
    return NextResponse.json({ error: "Data orang tua belum lengkap" }, { status: 400 })
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
  }

  if (!WHATSAPP_REGEX.test(phone)) {
    return NextResponse.json({ error: "Format nomor WhatsApp Indonesia tidak valid" }, { status: 400 })
  }

  const [users, classes] = await Promise.all([getAllDbUsers(), getAllDbClasses()])
  const { resolveClassId } = createClassIdResolver(classes)
  const normalizedClassId = resolveClassId(classId)
  const hasClassFilter = Boolean(normalizedClassId && classes.some((item) => item.id === normalizedClassId))
  const child = users.find((user) => user.id === childId && user.role === "STUDENT")
  const childExists = Boolean(child)
  if (!childExists) {
    return NextResponse.json({ error: "Data anak tidak ditemukan" }, { status: 404 })
  }
  if (hasClassFilter && resolveClassId(child?.classId) !== normalizedClassId) {
    return NextResponse.json({ error: "Anak tidak terdaftar di kelas ini" }, { status: 400 })
  }

  const user = await createDbUser({
    name,
    email,
    phone,
    password,
    role: "PARENT",
    avatar: "",
    classId: childId,
  })

  const next = {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: "PARENT" as const,
    childrenIds: [childId],
    phone,
  }

  setDbParents([
    ...getDbParents().filter(
      (item) => normalizeId(item.id) !== normalizeId(next.id) && normalizeId(item.email) !== normalizeId(next.email),
    ),
    next,
  ])
  logAudit({
    actorId: user.id,
    action: "CREATE",
    entityName: "parents",
    entityId: next.id,
    oldValue: null,
    newValue: next,
  })

  return NextResponse.json({ parent: next }, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const id = String(body.id || "").trim()
  const classId = String(body.classId || "").trim()
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  if (body.email != null && !EMAIL_REGEX.test(String(body.email).trim().toLowerCase())) {
    return NextResponse.json({ error: "Format email tidak valid" }, { status: 400 })
  }

  if (body.phone != null && !WHATSAPP_REGEX.test(String(body.phone).trim())) {
    return NextResponse.json({ error: "Format nomor WhatsApp Indonesia tidak valid" }, { status: 400 })
  }

  const parents = getDbParents()
  const target = parents.find((item) => item.id === id)
  if (!target) {
    return NextResponse.json({ error: "Orang tua tidak ditemukan" }, { status: 404 })
  }

  if (body.childId || classId) {
    const [users, classes] = await Promise.all([getAllDbUsers(), getAllDbClasses()])
    const { resolveClassId } = createClassIdResolver(classes)
    const normalizedClassId = resolveClassId(classId)
    const hasClassFilter = Boolean(normalizedClassId && classes.some((item) => item.id === normalizedClassId))
    const targetChildId = String(body.childId || target.childrenIds[0] || "").trim()
    const child = users.find((user) => user.id === targetChildId && user.role === "STUDENT")
    if (!child) {
      return NextResponse.json({ error: "Data anak tidak ditemukan" }, { status: 404 })
    }
    if (hasClassFilter && resolveClassId(child.classId) !== normalizedClassId) {
      return NextResponse.json({ error: "Anak tidak terdaftar di kelas ini" }, { status: 400 })
    }
  }

  await updateDbUserById({
    id,
    name: body.name ? String(body.name) : undefined,
    email: body.email ? String(body.email) : undefined,
    phone: body.phone ? String(body.phone) : undefined,
    password: body.password ? String(body.password) : undefined,
    classId: body.childId ? String(body.childId) : String(target.childrenIds[0] || "") || undefined,
  })

  const next = {
    ...target,
    name: body.name ? String(body.name) : target.name,
    email: body.email ? String(body.email) : target.email,
    phone: body.phone ? String(body.phone) : target.phone,
    childrenIds: body.childId ? [String(body.childId)] : target.childrenIds,
  }

  setDbParents(parents.map((item) => (item.id === id ? next : item)))
  logAudit({
    actorId: id,
    action: "UPDATE",
    entityName: "parents",
    entityId: id,
    oldValue: target,
    newValue: next,
  })

  return NextResponse.json({ parent: next })
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  let id = String(url.searchParams.get("id") || "").trim()
  if (!id) {
    const body = (await request.json().catch(() => ({}))) as { id?: string }
    id = String(body.id || "").trim()
  }
  if (!id) {
    return NextResponse.json({ error: "id wajib diisi" }, { status: 400 })
  }

  const parents = getDbParents()
  const target = parents.find((item) => item.id === id)
  if (!target) {
    return NextResponse.json({ error: "Orang tua tidak ditemukan" }, { status: 404 })
  }

  setDbParents(parents.filter((item) => item.id !== id))
  await deleteDbUserById(id)
  logAudit({
    actorId: id,
    action: "DELETE",
    entityName: "parents",
    entityId: id,
    oldValue: target,
    newValue: null,
  })

  return NextResponse.json({ success: true })
}
