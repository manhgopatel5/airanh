import '@/lib/firebase-admin'
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

// GET: Lấy review của 1 event
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

    const db = adminDb();
    const snap = await db.collection('reviews')
    .where('eventId', '==', eventId)
    .orderBy('createdAt', 'desc')
    .get();

    const reviews = snap.docs.map(doc => ({
      id: doc.id,
    ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }));

    return NextResponse.json({ reviews });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}

// POST: Thêm/sửa review
export async function POST(request: Request) {
  try {
    const { eventId, userId, rating, comment } = await request.json();
    if (!eventId ||!userId ||!rating) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const db = adminDb();
    const reviewId = `${eventId}_${userId}`;

    await db.collection('reviews').doc(reviewId).set({
      eventId,
      userId,
      rating: Number(rating),
      comment: comment || '',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}