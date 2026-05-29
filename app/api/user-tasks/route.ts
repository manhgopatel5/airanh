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
    let q = adminDb().collection('tasks') // ← Thêm () ở đây
  .where('type', '==', type)
  .select('slug','shortId','title','description','type','status','userId','userName','userAvatar','price','currency','totalSlots','joined','budgetType','category','tags','images','viewCount','likeCount','commentCount','location','banned','hidden','appliedCount','createdAt','updatedAt','deadline')
  .limit(10)

    switch (tab) {
      case 'mine':
        q = q.where('userId', '==', uid)
        break
      case 'saved':
        q = q.where('savedBy', 'array-contains', uid)
        break
      case 'doing':
        q = q.where('assignees', 'array-contains', uid).where('status', '==', 'doing')
        break
      case 'applied':
        q = q.where('applicants', 'array-contains', uid).where('status', 'in', ['open', 'pending'])
        break
      case 'completed':
        q = q.where('assignees', 'array-contains', uid).where('status', '==', 'completed')
        break
      case 'expired':
        if (type!== 'task') return NextResponse.json([])
        const sevenDaysAgo = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        q = q.where('userId', '==', uid).where('deadline', '<', now).where('deadline', '>', sevenDaysAgo)
        break
      case 'cancelled':
        q = q.where('userId', '==', uid).where('status', '==', 'cancelled')
        break
    }

    const snap = await q.get()
    const tasks: FeedTask[] = snap.docs.map(doc => {
      const d = doc.data()
      return {
        id: doc.id,
   ...d,
        createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
        deadline: d.deadline?.toDate?.()?.toISOString() || null,
      } as FeedTask
    })
.filter(t =>!t.banned &&!t.hidden)
.sort((a, b) => {
      const aTime = a.createdAt? new Date(a.createdAt).getTime() : 0
      const bTime = b.createdAt? new Date(b.createdAt).getTime() : 0
      return bTime - aTime
    })

    return NextResponse.json(tasks, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('API /user-tasks error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}