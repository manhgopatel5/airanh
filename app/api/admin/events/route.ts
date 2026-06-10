import { NextResponse } from 'next/server'
import { getFirestore } from 'firebase-admin/firestore'

export async function GET() {
  try {
    const db = getFirestore();
    const snapshot = await db.collection('events').orderBy('updatedAt', 'desc').get();
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
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
      updatedAt: new Date(),
      createdAt: body.createdAt || new Date(),
    });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
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
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}