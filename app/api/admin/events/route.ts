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
        // Map đầy đủ field để client không bị undefined
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
        joined: Number(data.joined) || 0,
        distance: data.distance || 'Cách bạn 1km',
        address: data.address || '',
        openTime: data.openTime || '',
        price: data.price || 'Free',
        tips: data.tips || [],
        gallery: data.gallery || [],
        mapUrl: data.mapUrl || '',
        lat: data.lat,
        lng: data.lng,
        rating: Number(data.rating) || 4.5,
        reviews: Number(data.reviews) || 0,
        isActive: data.isActive?? true,
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

    // ÉP KIỂU + DEFAULT ĐỂ KHÔNG BỊ RỖNG
    await db.collection('events').doc(id).set({
     ...body,
      id,
      // Core fields
      title: body.title || body.name || '',
      name: body.name || body.title || '',
      desc: body.desc || body.description || '',
      description: body.description || body.desc || '',
      image: body.image || body.imageUrl || '',
      imageUrl: body.imageUrl || body.image || '',
      
      // Category & Tag
      category: body.category || 'other',
      tag: body.tag || 'NEW',
      tagColor: body.tagColor || 'from-blue-500 to-cyan-500',
      icon: body.icon || '🎉',
      
      // Location & Price
      address: body.address || '',
      openTime: body.openTime || '',
      price: body.price || 'Free',
      distance: body.distance || 'Cách bạn 1km', // QUAN TRỌNG
      mapUrl: body.mapUrl || '',
      lat: body.lat? Number(body.lat) : null,
      lng: body.lng? Number(body.lng) : null,
      
      // Stats - ÉP KIỂU SỐ
      rating: Number(body.rating) || 4.5, // QUAN TRỌNG
      reviews: Number(body.reviews) || 0, // QUAN TRỌNG
      joined: Number(body.joined) || 0,
      
      // Arrays
      tips: Array.isArray(body.tips)? body.tips : [],
      gallery: Array.isArray(body.gallery)? body.gallery : [],
      
      // Status
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

    const db = getFirestore();
    await db.collection('events').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('DELETE /api/admin/events error:', err);
    return NextResponse.json({ error: 'Failed', detail: err.message }, { status: 500 });
  }
}