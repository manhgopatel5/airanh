// app/api/tasks/[id]/like/route.ts
import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore' // FIX: Import từ đây

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.split('Bearer ')[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const decoded = await adminAuth().verifyIdToken(token)
    const uid = decoded.uid

    await adminDb().collection('tasks').doc(params.id).update({
      likes: FieldValue.arrayUnion(uid),
      likeCount: FieldValue.increment(1)
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('API /tasks/[id]/like POST error:', error)
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

    await adminDb().collection('tasks').doc(params.id).update({
      likes: FieldValue.arrayRemove(uid),
      likeCount: FieldValue.increment(-1)
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('API /tasks/[id]/like DELETE error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}