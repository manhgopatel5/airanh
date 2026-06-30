import '@/lib/firebase-admin'
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { eventId, userId } = await request.json();
    if (!eventId || !userId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const db = adminDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existed = await db.collection('checkins')
     .where('eventId', '==', eventId)
     .where('userId', '==', userId)
     .where('timestamp', '>=', today)
     .get();

    if (!existed.empty) return NextResponse.json({ error: 'Đã check-in hôm nay rồi' }, { status: 400 });

    await db.collection('checkins').add({
      eventId,
      userId,
      timestamp: FieldValue.serverTimestamp(),
    });

    await db.collection('events').doc(eventId).set(
      {
        joined: FieldValue.increment(1),
        checkinCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { eventId, userId } = await request.json();
    if (!eventId || !userId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const db = adminDb();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await db.collection('checkins')
     .where('eventId', '==', eventId)
     .where('userId', '==', userId)
     .where('timestamp', '>=', today)
     .get();

    if (snapshot.empty) return NextResponse.json({ error: 'Chưa check-in hôm nay' }, { status: 400 });

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}

// XÓA HOÀN TOÀN export async function GET