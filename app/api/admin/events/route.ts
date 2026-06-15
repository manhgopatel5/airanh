import '@/lib/firebase-admin' // BẮT BUỘC ĐẦU TIÊN
import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const db = adminDb();

    // 1. Lấy events active
    const eventsSnap = await db.collection('events')
     .where('isActive', '==', true)
     .get();

    // 2. Lấy toàn bộ checkins 1 lần
    const checkinsSnap = await db.collection('checkins').get();

    // 3. Map đếm check-in theo eventId
    const countMap: Record<string, number> = {};
    checkinsSnap.docs.forEach(doc => {
      const eventId = doc.data().eventId;
      countMap[eventId] = (countMap[eventId] || 0) + 1;
    });

    // 4. Merge vào events
    const events = eventsSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
       ...data,
        title: data.title || data.name || '',
        name: data.name || data.title || '',
        desc: data.desc || data.description || '',
        description: data.description || data.desc || '',
        image: data.image || data.imageUrl || '',
        imageUrl: data.imageUrl || data.image || '',
        tag: data.tag || 'NEW',
        tagColor: data.tagColor || 'from-blue-500 to-cyan-500',
        icon: data.icon || '🎉',
        category: data.category || 'other',
        joined: countMap[doc.id] || 0, // DÙNG COUNT TỪ CHECKINS, BỎ data.joined
        address: data.address || '',
        openTime: data.openTime || '',
        price: data.price || 'Free',
        tips: data.tips || [],
        gallery: data.gallery || [],
        mapUrl: data.mapUrl || '',
        lat: data.lat? Number(data.lat) : null,
        lng: data.lng? Number(data.lng) : null,
        rating: Number(data.rating) || 4.5,
        reviews: Number(data.reviews) || 0,
        isActive: data.isActive?? true,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        date: data.date?.toDate?.()?.toISOString() || null,
      }
    })
   .sort((a, b) => {
      const dateA = a.updatedAt? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
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
    const db = adminDb();
    const id = body.id || db.collection('events').doc().id;

    await db.collection('events').doc(id).set({
     ...body,
      id,
      title: body.title || body.name || '',
      name: body.name || body.title || '',
      desc: body.desc || body.description || '',
      description: body.description || body.desc || '',
      image: body.image || body.imageUrl || '',
      imageUrl: body.imageUrl || body.image || '',
      category: body.category || 'other',
      tag: body.tag || 'NEW',
      tagColor: body.tagColor || 'from-blue-500 to-cyan-500',
      icon: body.icon || '🎉',
      address: body.address || '',
      openTime: body.openTime || '',
      price: body.price || 'Free',
      mapUrl: body.mapUrl || '',
      lat: body.lat? Number(body.lat) : null,
      lng: body.lng? Number(body.lng) : null,
      rating: Number(body.rating) || 4.5,
      reviews: Number(body.reviews) || 0,
      // joined: Number(body.joined) || 0, // BỎ DÒNG NÀY, KHÔNG LƯU NỮA
      tips: Array.isArray(body.tips)? body.tips : [],
      gallery: Array.isArray(body.gallery)? body.gallery : [],
      isActive: body.isActive?? true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: body.createdAt? new Date(body.createdAt) : FieldValue.serverTimestamp(),
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

    const db = adminDb();
    await db.collection('events').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/admin/events error:', err);
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}