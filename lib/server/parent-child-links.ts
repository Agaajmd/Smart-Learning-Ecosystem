import "server-only"

type MinimalStudent = {
  id: string
  name?: string
  classId?: string
}

type MinimalClass = {
  id: string
  name?: string
  grade?: string
}

type ResolveParentChildIdsInput = {
  students: MinimalStudent[]
  classes: MinimalClass[]
  parentChildrenIds?: string[]
  parentRelationField?: string
  resolveClassId?: (value?: string) => string
}

const normalizeId = (value: unknown) => String(value || "").trim().toLowerCase()
const normalizeLooseId = (value: unknown) => normalizeId(value).replace(/[^a-z0-9]/g, "")

function splitRelationTokens(raw: unknown) {
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

export function resolveParentChildIds(input: ResolveParentChildIdsInput) {
  const resolveClassId = input.resolveClassId || ((value?: string) => String(value || "").trim())

  const normalizedStudents = input.students
    .map((student) => ({
      ...student,
      id: String(student.id || "").trim(),
      classId: resolveClassId(student.classId),
      name: String(student.name || "").trim(),
    }))
    .filter((student) => Boolean(student.id))

  const studentsById = new Map(normalizedStudents.map((student) => [student.id, student]))
  const studentsByNormalizedId = new Map(normalizedStudents.map((student) => [normalizeId(student.id), student]))
  const studentsByLooseId = new Map(normalizedStudents.map((student) => [normalizeLooseId(student.id), student]))

  const studentsByClassId = normalizedStudents.reduce((acc, student) => {
    const classId = String(student.classId || "").trim()
    if (!classId) return acc
    const bucket = acc.get(classId) || []
    bucket.push(student.id)
    acc.set(classId, bucket)
    return acc
  }, new Map<string, string[]>())

  const classAliasToId = new Map<string, string>()
  for (const classItem of input.classes) {
    const aliases = [
      classItem.id,
      classItem.name,
      classItem.grade,
      `${classItem.name || ""} ${classItem.grade || ""}`.trim(),
      `${classItem.grade || ""} ${classItem.name || ""}`.trim(),
    ]
      .map((item) => String(item || "").trim())
      .filter(Boolean)

    for (const alias of aliases) {
      classAliasToId.set(normalizeId(alias), classItem.id)
      classAliasToId.set(normalizeLooseId(alias), classItem.id)
    }
  }

  const resolved = new Set<string>()

  const appendToken = (rawToken: string) => {
    const token = String(rawToken || "").trim()
    if (!token) return

    const candidates = [
      token,
      token.includes(":") ? token.split(":").pop() || "" : "",
      token.includes("=") ? token.split("=").pop() || "" : "",
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)

    for (const candidate of [...new Set(candidates)]) {
      const normalizedToken = normalizeId(candidate)
      const looseToken = normalizeLooseId(candidate)

      if (studentsById.has(candidate)) {
        resolved.add(candidate)
        return
      }

      const byNormalizedId = studentsByNormalizedId.get(normalizedToken) || studentsByLooseId.get(looseToken)
      if (byNormalizedId?.id) {
        resolved.add(byNormalizedId.id)
        return
      }

      const normalizedClassToken =
        classAliasToId.get(normalizedToken) || classAliasToId.get(looseToken) || resolveClassId(candidate)
      const classChildIds = studentsByClassId.get(normalizedClassToken)
      if (classChildIds && classChildIds.length > 0) {
        for (const studentId of classChildIds) {
          resolved.add(studentId)
        }
        return
      }

      const byName = normalizedStudents.find(
        (student) => normalizeId(student.name) === normalizedToken || normalizeLooseId(student.name) === looseToken,
      )
      if (byName?.id) {
        resolved.add(byName.id)
        return
      }
    }
  }

  for (const childId of input.parentChildrenIds || []) {
    appendToken(childId)
  }

  for (const token of splitRelationTokens(input.parentRelationField)) {
    appendToken(token)
  }

  return [...resolved]
}
