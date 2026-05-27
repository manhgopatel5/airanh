import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const { uid } = await getAuth().verifyIdToken(token);
    await getFirestore().collection('users').doc(uid).update({
      isOnline: false,
      lastSeen: new Date(),
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}