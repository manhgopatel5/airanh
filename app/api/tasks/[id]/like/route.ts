import { NextResponse } from 'next/server'
import { adminAuth, adminDb, FieldValue } from '@/lib/firebase-admin'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.split('Bearer ')[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const decoded = await adminAuth().verifyIdToken(token)
  await adminDb().collection('tasks').doc(params.id).update({
    likes: FieldValue.arrayUnion(decoded.uid),
    likeCount: FieldValue.increment(1)
  })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const token = req.headers.get('authorization')?.split('Bearer ')[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const decoded = await adminAuth().verifyIdToken(token)
  await adminDb().collection('tasks').doc(params.id).update({
    likes: FieldValue.arrayRemove(decoded.uid),
    likeCount: FieldValue.increment(-1)
  })
  return NextResponse.json({ ok: true })
}