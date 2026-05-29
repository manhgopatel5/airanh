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

    // Thêm orderBy để Firestore sort luôn, không cần sort JS
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
        q = q.where('applicants', 'array-contains', uid).where('status', 'in', ['open', 'pending']).orderBy('createdAt', 'desc')
        break
      case 'completed':
        q = q.where('assignees', 'array-contains', uid).where('status', '==', 'completed').orderBy('createdAt', 'desc')
        break
      case 'expired':
        if (type!== 'task') return NextResponse.json([])
        const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 1000))
        q = q.where('userId', '==', uid)
         .where('deadline', '<', now)
         .where('deadline', '>', sevenDaysAgo)
         .orderBy('deadline', 'desc')
        break
      case 'cancelled':
        q = q.where('userId', '==', uid).where('status', '==', 'cancelled').orderBy('createdAt', 'desc')
        break
    }

    // Bỏ.select để lấy full field, tránh thiếu field cho các tab
    const snap = await q.limit(20).get()

    const tasks: FeedTask[] = snap.docs.map(doc => {
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

    return NextResponse.json(tasks, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    })
  } catch (error: any) {
    console.error('API /user-tasks error:', error)
    // Log chi tiết để debug index
    if (error.code === 9) {
      console.error('Missing Firestore index. Create it here:', error.details)
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}