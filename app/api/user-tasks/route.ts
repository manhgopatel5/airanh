// app/api/user-tasks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import type { DocumentData, Query } from 'firebase-admin/firestore'
import type { FeedTask } from '@/types/task'
import { enrichTasksWithUserDataAdmin } from '@/lib/task/enrichTasks'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type UserTaskTab = 'mine' | 'saved' | 'doing' | 'applied' | 'expired' | 'completed' | 'cancelled'

const USER_TASK_TABS = new Set<UserTaskTab>([
  'mine',
  'saved',
  'doing',
  'applied',
  'expired',
  'completed',
  'cancelled',
])

const isUserTaskTab = (tab: string | null): tab is UserTaskTab => {
  return !!tab && USER_TASK_TABS.has(tab as UserTaskTab)
}

const timestampToIsoString = (value: unknown): string | null => {
  if (!value) return null
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().toISOString()
  }
  return null
}

const timestampToMillis = (value: unknown): number | null => {
  if (!value) return null
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') {
    const millis = new Date(value).getTime()
    return Number.isNaN(millis) ? null : millis
  }
  if (typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis()
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate().getTime()
  }
  return null
}

const getUserTaskQuery = (tab: UserTaskTab, uid: string): Query<DocumentData> => {
  const tasksRef = adminDb().collection('tasks')

  switch (tab) {
    case 'saved':
      return tasksRef.where('savedBy', 'array-contains', uid)
    case 'doing':
    case 'completed':
      return tasksRef.where('assignees', 'array-contains', uid)
    case 'applied':
      return tasksRef.where('applicants', 'array-contains', uid)
    case 'mine':
    case 'expired':
    case 'cancelled':
    default:
      return tasksRef.where('userId', '==', uid)
  }
}

const matchesTab = (data: DocumentData, tab: UserTaskTab, nowMillis: number): boolean => {
  switch (tab) {
    case 'doing':
      return data.status === 'doing'
    case 'applied':
      return data.status === 'open' || data.status === 'pending'
    case 'completed':
      return data.status === 'completed'
    case 'expired': {
      const deadlineMillis = timestampToMillis(data.deadline)
      const sevenDaysAgoMillis = nowMillis - 7 * 24 * 60 * 60 * 1000
      return !!deadlineMillis && deadlineMillis < nowMillis && deadlineMillis > sevenDaysAgoMillis
    }
    case 'cancelled':
      return data.status === 'cancelled'
    case 'mine':
    case 'saved':
    default:
      return true
  }
}

const taskSortValue = (task: FeedTask, tab: UserTaskTab): number => {
  const value = tab === 'expired' ? task.deadline : task.createdAt
  return timestampToMillis(value) || 0
}

const getRequestToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1]
  return bearerToken || request.cookies.get('__session')?.value || null
}

const enrichTasksWithUserData = (tasks: FeedTask[]) =>
  enrichTasksWithUserDataAdmin(adminDb(), tasks)

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const requestedType = searchParams.get('type')
  const type: 'task' | 'plan' = requestedType === 'plan' ? 'plan' : 'task'
  const requestedTab = searchParams.get('tab')
  const tab: UserTaskTab = isUserTaskTab(requestedTab) ? requestedTab : 'mine'

  const token = getRequestToken(request)
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const decoded = await adminAuth().verifyIdToken(token).catch((error) => {
    console.error('API /user-tasks auth error:', error)
    return null
  })
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = decoded.uid

  try {
    if (tab === 'expired' && type !== 'task') return NextResponse.json([])

    const nowMillis = Timestamp.now().toMillis()
    const q = getUserTaskQuery(tab, uid)
    const snap = await q.get()

    let tasks: FeedTask[] = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id: doc.id,
        ...d,
        userName: d.userName || d.displayName || d.name || '',
        userAvatar: d.userAvatar || d.photoURL || d.avatar || null,
        createdAt: timestampToIsoString(d.createdAt),
        updatedAt: timestampToIsoString(d.updatedAt),
        deadline: timestampToIsoString(d.deadline),
        applicationDeadline: timestampToIsoString(d.applicationDeadline),
        startDate: timestampToIsoString(d.startDate),
        eventDate: timestampToIsoString(d.eventDate),
        endDate: timestampToIsoString(d.endDate),
      } as FeedTask
    }).filter(task => {
      const data = task as FeedTask & DocumentData
      return data.type === type && data.banned !== true && data.hidden !== true && matchesTab(data, tab, nowMillis)
    }).sort((a, b) => taskSortValue(b, tab) - taskSortValue(a, tab)).slice(0, 20)

    tasks = await enrichTasksWithUserData(tasks)

    return NextResponse.json(tasks, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    })
  } catch (error: any) {
    console.error('API /user-tasks error:', error)
    return NextResponse.json({ error: 'Failed to load user tasks' }, { status: 500 })
  }
}
