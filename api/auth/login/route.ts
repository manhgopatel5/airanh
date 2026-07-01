import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { idToken } = await req.json();
  
  if (!idToken) {
    return NextResponse.json({ error: "No token" }, { status: 400 });
  }

  try {
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 ngày
    const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn });
    
    const response = NextResponse.json({ success: true });
    response.cookies.set("__session", sessionCookie, {
      maxAge: 60 * 60 * 24 * 14,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}