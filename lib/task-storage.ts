import type { Task, TaskSubmission } from "@/lib/mock-data"
import { mockTasks, mockTaskSubmissions } from "@/lib/mock-data"

const TASKS_KEY = "aegix_tasks_v1"
const SUBMISSIONS_KEY = "aegix_task_submissions_v1"

const safeParse = <T,>(value: string | null, fallback: T): T => {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const readStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback
  return safeParse<T>(window.localStorage.getItem(key), fallback)
}

const writeStorage = <T,>(key: string, value: T) => {
  if (typeof window === "undefined") return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export const getStoredTasks = (): Task[] => {
  const tasks = readStorage<Task[]>(TASKS_KEY, [])
  if (tasks.length > 0) return tasks
  writeStorage(TASKS_KEY, mockTasks)
  return [...mockTasks]
}

export const setStoredTasks = (tasks: Task[]) => {
  writeStorage(TASKS_KEY, tasks)
}

export const getStoredTaskSubmissions = (): TaskSubmission[] => {
  const submissions = readStorage<TaskSubmission[]>(SUBMISSIONS_KEY, [])
  if (submissions.length > 0) return submissions
  writeStorage(SUBMISSIONS_KEY, mockTaskSubmissions)
  return [...mockTaskSubmissions]
}

export const setStoredTaskSubmissions = (submissions: TaskSubmission[]) => {
  writeStorage(SUBMISSIONS_KEY, submissions)
}
