import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { verifyAdminRequest } from '@/lib/adminAuth'
import {
  type ReportStatus,
  serializeReport,
  sortReportsNewestFirst,
} from '@/lib/adminReports'

const VALID_STATUSES: ReportStatus[] = ['pending', 'resolved', 'rejected']

export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest(req.headers.get('authorization'))
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const statusParam = req.nextUrl.searchParams.get('status') || 'pending'
  const withCounts = req.nextUrl.searchParams.get('counts') === '1'

  if (!VALID_STATUSES.includes(statusParam as ReportStatus)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  try {
    const db = adminDb()

    const listSnap = await db
      .collection('reports')
      .where('status', '==', statusParam)
      .get()

    const reports = sortReportsNewestFirst(
      listSnap.docs.map((doc) => serializeReport(doc.id, doc.data()))
    )

    if (!withCounts) {
      return NextResponse.json({ reports })
    }

    const countSnaps = await Promise.all(
      VALID_STATUSES.map((status) =>
        db.collection('reports').where('status', '==', status).get()
      )
    )

    const counts = Object.fromEntries(
      VALID_STATUSES.map((status, index) => [status, countSnaps[index]?.size ?? 0])
    ) as Record<ReportStatus, number>

    return NextResponse.json({ reports, counts })
  } catch (error) {
    console.error('Admin reports list error:', error)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}
