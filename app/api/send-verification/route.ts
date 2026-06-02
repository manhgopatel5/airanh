import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import crypto from 'crypto';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const idToken = authHeader?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'No token' }, { status: 401 });

    const decoded = await adminAuth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email!;

    // Check đã verify chưa
    if (decoded.email_verified) {
      return NextResponse.json({ error: 'Email already verified' }, { status: 400 });
    }

    // 1. Tạo token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // 2. Lưu vào Firestore
    await adminDb.collection('emailVerifications').doc(token).set({
      uid,
      email,
      createdAt: Date.now(),
      expiresAt,
    });

    // 3. Gửi mail Resend
    const verifyUrl = `https://huha.online/api/verify-email?token=${token}`;
    
    await resend.emails.send({
      from: 'Huha <noreply@huha.online>',
      to: email,
      subject: 'Xác thực email Huha',
      html: `
        <h2>Xác thực email</h2>
        <p>Bấm nút bên dưới để xác thực. Link hết hạn sau 10 phút.</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#0A84FF;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
          Xác thực ngay
        </a>
        <p>Hoặc copy link: ${verifyUrl}</p>
      `
    });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}