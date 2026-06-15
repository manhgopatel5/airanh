import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { eventId, userId } = await request.json();

    if (!eventId || !userId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const db = adminDb();

    // Check đã check-in hôm nay chưa
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existed = await db.collection('checkins')
    .where('eventId', '==', eventId)
    .where('userId', '==', userId)
    .where('timestamp', '>=', today)
    .get();

    if (!existed.empty) {
      return NextResponse.json({ error: 'Đã check-in hôm nay rồi' }, { status: 400 });
    }

    // Lưu check-in
    await db.collection('checkins').add({
      eventId,
      userId,
      timestamp: FieldValue.serverTimestamp(),
    });

    // Tăng count - dùng set merge để tránh lỗi doc chưa tồn tại
    await db.collection('events').doc(eventId).set({
      joined: FieldValue.increment(1)
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/admin/checkin error:', error);
    return NextResponse.json({ error: 'Failed', detail: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });
    }

    const db = adminDb();

    // Đếm toàn bộ thời gian, không filter 7 ngày nữa
    const snapshot = await db.collection('checkins')
    .where('eventId', '==', eventId)
    .get();

    return NextResponse.json({ count: snapshot.size });
  } catch (error: any) {
    console.error('GET /api/admin/checkin error:', error);
    return NextResponse.json({ error: 'Failed', detail: error.message }, { status: 500 });
  }
}