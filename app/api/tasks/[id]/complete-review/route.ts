import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

type ReviewRole = 'assignee' | 'owner'

async function updateUserRating(uid: string, rating: number) {
  const statsRef = adminDb().collection('users').doc(uid)
  const statsSnap = await statsRef.get()
  const stats = statsSnap.data()?.stats || {}
  const prevReviews = stats.totalReviews || 0
  const prevRating = stats.rating || 0
  const newReviews = prevReviews + 1
  const newRating = Math.round(((prevRating * prevReviews + rating) / newReviews) * 10) / 10

  await statsRef.update({
    'stats.totalReviews': newReviews,
    'stats.rating': newRating,
    updatedAt: FieldValue.serverTimestamp(),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: taskId } = await params
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const decoded = await adminAuth().verifyIdToken(token).catch(() => null)
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { rating, feedback, role, targetUserId } = body as {
    rating?: number
    feedback?: string
    role?: ReviewRole
    targetUserId?: string
  }

  if (!role || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 })
  }
  if (!feedback?.trim()) {
    return NextResponse.json({ error: 'Feedback required' }, { status: 400 })
  }

  try {
    const taskRef = adminDb().collection('tasks').doc(taskId)
    const taskSnap = await taskRef.get()
    if (!taskSnap.exists) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const task = taskSnap.data()!
    const ownerId = task.userId as string
    const assignees = (task.assignees as string[]) || []

    let toUserId: string
    let reviewFieldKey: string

    if (role === 'assignee') {
      if (!assignees.includes(decoded.uid)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      toUserId = ownerId
      reviewFieldKey = 'assigneeReview'
    } else {
      if (decoded.uid !== ownerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (!targetUserId || !assignees.includes(targetUserId)) {
        return NextResponse.json({ error: 'Invalid target' }, { status: 400 })
      }
      toUserId = targetUserId
      reviewFieldKey = `ownerReview_${targetUserId}`
    }

    const fromUserSnap = await adminDb().collection('users').doc(decoded.uid).get()
    const fromName =
      fromUserSnap.data()?.displayName ||
      fromUserSnap.data()?.name ||
      decoded.email?.split('@')[0] ||
      'User'

    const toUserSnap = await adminDb().collection('users').doc(toUserId).get()
    const toName = toUserSnap.data()?.displayName || toUserSnap.data()?.name || 'User'

    await adminDb().collection('users').doc(toUserId).collection('reviews').add({
      taskId,
      taskTitle: task.title || '',
      taskType: task.type || 'task',
      fromUserId: decoded.uid,
      fromUserName: fromName,
      toUserId,
      toUserName: toName,
      rating,
      feedback: feedback.trim(),
      role,
      createdAt: FieldValue.serverTimestamp(),
    })

    await updateUserRating(toUserId, rating)

    const existingReviews = (task.completionReviews as Record<string, unknown>) || {}
    const updatedReviews = {
      ...existingReviews,
      [reviewFieldKey]: {
        fromUserId: decoded.uid,
        toUserId,
        rating,
        feedback: feedback.trim(),
      },
    }

    const assigneeReviewDone = !!updatedReviews.assigneeReview
    const primaryAssignee = assignees[0]
    const ownerReviewDone = primaryAssignee
      ? !!updatedReviews[`ownerReview_${primaryAssignee}`]
      : Object.keys(updatedReviews).some((k) => k.startsWith('ownerReview_'))

    const bothDone = assigneeReviewDone && ownerReviewDone

    await taskRef.update({
      completionReviews: updatedReviews,
      ...(bothDone ? { status: 'completed' } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (bothDone) {
      await adminDb()
        .collection('users')
        .doc(decoded.uid)
        .update({
          'stats.completed': FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        })
      if (toUserId !== decoded.uid) {
        await adminDb()
          .collection('users')
          .doc(toUserId)
          .update({
            'stats.completed': FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          })
      }
    }

    return NextResponse.json({
      ok: true,
      completed: bothDone,
      message: bothDone
        ? 'Đã hoàn thành task'
        : 'Đã gửi đánh giá — chờ đối phương đánh giá lại',
    })
  } catch (error) {
    console.error('complete-review error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
