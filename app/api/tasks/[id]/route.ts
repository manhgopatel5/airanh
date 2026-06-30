// app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import type { FeedTask } from '@/types/task'

export const revalidate = 0

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const snap = await adminDb().collection('tasks').doc(params.id).get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const d = snap.data()!

    // Ẩn task bị ban/hide
    if (d.banned || d.hidden) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let userName = d.userName || d.displayName || d.name || ''
    let userAvatar = d.userAvatar || d.photoURL || d.avatar || null

    if ((!userName || !userAvatar) && d.userId) {
      const userSnap = await adminDb().collection('users').doc(d.userId).get()
      if (userSnap.exists) {
        const u = userSnap.data()!
        if (!userName) userName = u.displayName || u.name || u.username || ''
        if (!userAvatar) userAvatar = u.photoURL || u.avatar || null
      }
    }

    const task: FeedTask = {
      id: snap.id,
     ...d,
      userName,
      userAvatar,
      createdAt: d.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: d.updatedAt?.toDate?.()?.toISOString() || null,
      deadline: d.deadline?.toDate?.()?.toISOString() || null,
      eventDate: d.eventDate?.toDate?.()?.toISOString() || null,
      endDate: d.endDate?.toDate?.()?.toISOString() || null,
      startDate: d.startDate?.toDate?.()?.toISOString() || null,
      applicationDeadline: d.applicationDeadline?.toDate?.()?.toISOString() || null,
    } as FeedTask

    // Tăng viewCount atomic, không block response
    adminDb().collection('tasks').doc(params.id).update({
      viewCount: FieldValue.increment(1)
    }).catch(() => {})

    return NextResponse.json(task, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    console.error('API /tasks/[id] GET error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.split('Bearer ')[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const decoded = await adminAuth().verifyIdToken(token)
    const uid = decoded.uid

    const docRef = adminDb().collection('tasks').doc(params.id)
    const snap = await docRef.get()

    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const data = snap.data()!

    // Chỉ owner mới được xóa
    if (data.userId!== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await docRef.delete()
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('API /tasks/[id] DELETE error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.split('Bearer ')[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const decoded = await adminAuth().verifyIdToken(token)
    const uid = decoded.uid
    const body = await req.json()

    const docRef = adminDb().collection('tasks').doc(params.id)
    const snap = await docRef.get()

    if (!snap.exists) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const data = snap.data()!

    // Chỉ owner mới được sửa
    if (data.userId!== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Whitelist field cho phép update
    const allowedFields = [
      'title', 'description', 'price', 'totalSlots', 'maxParticipants',
      'category', 'tags', 'images', 'location', 'deadline', 'eventDate'
    ]

    const updates: any = {}
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key]
    }

    updates.updatedAt = new Date()

    await docRef.update(updates)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('API /tasks/[id] PATCH error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}