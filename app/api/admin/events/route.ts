import '@/lib/firebase-admin' // DÒNG NÀY BẮT BUỘC PHẢI CÓ ĐẦU TIÊN
import { NextResponse } from 'next/server'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('events')
      .where('isActive', '==', true)
      .orderBy('updatedAt', 'desc')
      .get();

    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
       ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        date: data.date?.toDate?.()?.toISOString() || null,
      }
    });

    return NextResponse.json({ events });
  } catch (err: any) {
    console.error('GET /api/admin/events error:', err);
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = getFirestore();
    const id = body.id || db.collection('events').doc().id;

    await db.collection('events').doc(id).set({
     ...body,
      id,
      isActive: body.isActive ?? true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: body.createdAt ? new Date(body.createdAt) : FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    console.error('POST /api/admin/events error:', err);
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const db = getFirestore();
    await db.collection('events').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/admin/events error:', err);
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}