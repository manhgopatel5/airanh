import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, cert } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  
  if (!idToken) {
    return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
  }

  try {
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
    
    const response = NextResponse.json({ status: 'success' });
    
    // FIX: Dev dùng lax, Prod dùng none
    const isProd = process.env.NODE_ENV === 'production';
    
    response.cookies.set('__session', sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: isProd, // Chỉ bật secure khi production https
      path: '/',
      sameSite: isProd ? 'none' : 'lax', // localhost dùng lax
    });
    
    return response;
  } catch (err) {
    console.error('Auth error:', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ status: 'success' });
  response.cookies.delete('__session');
  return response;
}