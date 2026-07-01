import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '10'), 30)

  try {
    const snap = await adminDb()
      .collection('users')
      .doc(uid)
      .collection('reviews')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()

    const reviews = snap.docs.map((doc) => {
      const d = doc.data()
      const createdAt = d.createdAt?.toDate?.()?.toISOString?.() || null
      return {
        id: doc.id,
        taskId: d.taskId,
        taskTitle: d.taskTitle,
        fromUserId: d.fromUserId,
        fromUserName: d.fromUserName,
        rating: d.rating,
        feedback: d.feedback,
        role: d.role,
        createdAt,
      }
    })

    const userSnap = await adminDb().collection('users').doc(uid).get()
    const stats = userSnap.data()?.stats || {}

    return NextResponse.json({
      reviews,
      rating: stats.rating ?? 0,
      totalReviews: stats.totalReviews ?? 0,
      completed: stats.completed ?? 0,
    })
  } catch (error) {
    console.error('GET reviews error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
