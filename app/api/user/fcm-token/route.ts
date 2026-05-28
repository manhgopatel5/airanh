import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    // 1. Lấy user từ session cookie. Bảo mật, không tin client
    const token = request.cookies.get('__session')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = await adminAuth().verifySessionCookie(token, true)
    const uid = decoded.uid

    // 2. Lấy FCM token từ body
    const { token: fcmToken } = await request.json()
    if (!fcmToken) {
      return NextResponse.json({ error: 'Missing FCM token' }, { status: 400 })
    }

    // 3. Update vào Firestore. Dùng arrayUnion để hỗ trợ multi-device
    const db = adminDb()
    const userRef = db.doc(`users/${uid}`)
    
    await userRef.update({
      fcmTokens: FieldValue.arrayUnion(fcmToken),
      fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('FCM token error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}