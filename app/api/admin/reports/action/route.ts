import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { verifyAdminRequest } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const auth = await verifyAdminRequest(req.headers.get('authorization'))
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }
  const decoded = auth.decoded

  const body = await req.json()
  const { reportId, action, banDays, targetId } = body as {
    reportId?: string
    action?: 'resolved' | 'rejected'
    banDays?: number
    targetId?: string
  }

  if (!reportId || !action) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    const reportRef = adminDb().collection('reports').doc(reportId)
    const reportSnap = await reportRef.get()
    if (!reportSnap.exists) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const report = reportSnap.data()!
    const userId = targetId || report.targetId

    await reportRef.update({
      status: action,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: decoded.uid,
    })

    if (action === 'resolved' && userId) {
      const userRef = adminDb().collection('users').doc(userId)
      const userSnap = await userRef.get()
      if (!userSnap.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const banUpdate: Record<string, unknown> = {
        status: 'banned',
        banned: true,
        bannedAt: FieldValue.serverTimestamp(),
        bannedBy: decoded.uid,
      }

      if (banDays && banDays > 0) {
        const until = new Date()
        until.setDate(until.getDate() + banDays)
        banUpdate.bannedUntil = Timestamp.fromDate(until)
      } else {
        banUpdate.bannedUntil = null
      }

      await userRef.update(banUpdate)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Admin report action error:', error)
    const message = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
