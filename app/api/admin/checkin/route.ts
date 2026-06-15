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

    // Chỉ lưu check-in, KHÔNG update joined nữa
    await db.collection('checkins').add({
      eventId,
      userId,
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/admin/checkin error:', error);
    return NextResponse.json({ error: 'Failed', detail: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { eventId, userId } = await request.json();

    if (!eventId || !userId) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 });
    }

    const db = adminDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await db.collection('checkins')
      .where('eventId', '==', eventId)
      .where('userId', '==', userId)
      .where('timestamp', '>=', today)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Chưa check-in hôm nay' }, { status: 400 });
    }

    // Chỉ xóa doc check-in, KHÔNG update joined nữa
    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/admin/checkin error:', error);
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

    // Đếm trực tiếp từ checkins - đây là nguồn duy nhất
    const snapshot = await db.collection('checkins')
      .where('eventId', '==', eventId)
      .get();

    return NextResponse.json({ count: snapshot.size });
  } catch (error: any) {
    console.error('GET /api/admin/checkin error:', error);
    return NextResponse.json({ error: 'Failed', detail: error.message }, { status: 500 });
  }
}