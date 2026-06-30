import { NextResponse } from 'next/server'
import '@/lib/firebase-admin'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { syncEventStats } from '@/lib/eventsServer'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    if (!eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 });

    const db = adminDb();
    const snap = await db.collection('reviews')
   .where('eventId', '==', eventId)
   .get();

    const reviews = snap.docs.map(doc => ({
      id: doc.id,
   ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    }))
   .sort((a, b) => {
      const timeA = a.createdAt? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ reviews });
  } catch (err: any) {
    console.error('GET /api/admin/reviews error:', err);
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}

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

    await syncEventStats(eventId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('POST /api/admin/reviews error:', err);
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}