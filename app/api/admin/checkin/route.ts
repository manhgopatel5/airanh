import { NextRequest, NextResponse } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const { eventId, userId } = await request.json();

    if (!eventId ||!userId) {
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

    // Tăng count
    await db.collection('events').doc(eventId).update({
      joined: FieldValue.increment(1)
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
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
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const snapshot = await db.collection('checkins')
     .where('eventId', '==', eventId)
     .where('timestamp', '>=', oneWeekAgo)
     .get();

    return NextResponse.json({ count: snapshot.size });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}