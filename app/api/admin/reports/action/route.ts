import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { isAdminUser } from '@/lib/adminAuth'

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const decoded = await adminAuth().verifyIdToken(token).catch(() => null)
  if (!decoded || !isAdminUser(decoded.uid, decoded.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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

      await adminDb().collection('users').doc(userId).update(banUpdate)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Admin report action error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
