// app/api/user-tasks/route.ts
import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import type { FeedTask } from '@/types/task'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = (searchParams.get('type') as 'task' | 'plan') || 'task'
  const tab = searchParams.get('tab') || 'mine'

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.split('Bearer ')[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const decoded = await adminAuth().verifyIdToken(token).catch(() => null)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const uid = decoded.uid
  const now = Timestamp.now()

  try {
    let q = adminDb()
    .collection('tasks')
    .where('type', '==', type)
    .where('banned', '==', false)
    .where('hidden', '==', false)

    let useJsSort = false // SỬA 1: Flag để sort JS cho query phức tạp

    switch (tab) {
      case 'mine':
        q = q.where('userId', '==', uid).orderBy('createdAt', 'desc')
        break
      case 'saved':
        q = q.where('savedBy', 'array-contains', uid).orderBy('createdAt', 'desc')
        break
      case 'doing':
        q = q.where('assignees', 'array-contains', uid).where('status', '==', 'doing').orderBy('createdAt', 'desc')
        break
      case 'applied':
        // SỬA 2: Bỏ orderBy vì 'in' + 'array-contains' không orderBy được
        q = q.where('applicants', 'array-contains', uid).where('status', 'in', ['open', 'pending'])
        useJsSort = true
        break
      case 'completed':
        q = q.where('assignees', 'array-contains', uid).where('status', '==', 'completed').orderBy('createdAt', 'desc')
        break
      case 'expired':
        if (type!== 'task') return NextResponse.json([])
        const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        q = q.where('userId', '==', uid)
        .where('deadline', '<', now)
        .where('deadline', '>', sevenDaysAgo)
        .orderBy('deadline', 'desc')
        break
      case 'cancelled':
        q = q.where('userId', '==', uid).where('status', '==', 'cancelled').orderBy('createdAt', 'desc')
        break
      default: // SỬA 3: Thêm default tránh tab lạ
        q = q.where('userId', '==', uid).orderBy('createdAt', 'desc')
        break
    }

    const snap = await q.limit(20).get()

    let tasks: FeedTask[] = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id: doc.id,
      ...d,
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
        deadline: d.deadline?.toDate?.()?.toISOString() || null,
        applicationDeadline: d.applicationDeadline?.toDate?.()?.toISOString() || null,
        startDate: d.startDate?.toDate?.()?.toISOString() || null,
      } as FeedTask
    })

    // SỬA 4: Sort JS cho case 'applied'
    if (useJsSort) {
      tasks.sort((a, b) => {
        const aTime = a.createdAt? new Date(a.createdAt).getTime() : 0
        const bTime = b.createdAt? new Date(b.createdAt).getTime() : 0
        return bTime - aTime
      })
    }

    return NextResponse.json(tasks, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    })
  } catch (error: any) {
    console.error('API /user-tasks error:', error)
    if (error.code === 9 || error.code === 'FAILED_PRECONDITION') {
      console.error('Missing Firestore index. Create it here:', error.details)
      return NextResponse.json({ error: 'Missing index' }, { status: 500 })
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}