// app/api/tasks/[id]/save/route.ts
import { NextResponse } from 'next/server'
import { adminAuth, adminDb, FieldValue } from '@/lib/firebase-admin'

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
      savedBy: FieldValue.arrayUnion(uid)
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('API /tasks/[id]/save POST error:', error)
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
      savedBy: FieldValue.arrayRemove(uid)
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('API /tasks/[id]/save DELETE error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}