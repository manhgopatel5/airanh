// app/api/user/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { UAParser } from 'ua-parser-js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const decoded = await adminAuth().verifyIdToken(token);
    const uid = decoded.uid;
    
    const parser = new UAParser(req.headers.get('user-agent') || '');
    const result = parser.getResult();
    const device = `${result.device.vendor || ''} ${result.device.model || result.os.name}`.trim() || 'Unknown Device';
    const browser = `${result.browser.name} ${result.browser.version || ''}`.trim();
    const os = `${result.os.name} ${result.os.version || ''}`.trim();
    const userAgent = req.headers.get('user-agent') || '';
    
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'Unknown';
    
    const sessionRef = adminDb().collection('sessions').doc();
    await sessionRef.set({
      uid,
      device,
      browser,
      os,
      ip,
      location: 'Vietnam', // Tích hợp ip-api sau
      userAgent,
      lastActive: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      current: true,
    });

    // Set các session khác của user thành current: false
    const q = adminDb().collection('sessions').where('uid', '==', uid).where('current', '==', true);
    const snap = await q.get();
    const batch = adminDb().batch();
    snap.docs.forEach(doc => {
      if (doc.id!== sessionRef.id) batch.update(doc.ref, { current: false });
    });
    await batch.commit();

    return NextResponse.json({ sessionId: sessionRef.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = await adminAuth().verifyIdToken(token);
    const { sessionId } = await req.json();
    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });

    const sessionRef = adminDb().collection('sessions').doc(sessionId);
    const snap = await sessionRef.get();
    if (!snap.exists || snap.data()?.uid !== decoded.uid) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await sessionRef.update({ lastActive: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}