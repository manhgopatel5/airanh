import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
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

const db = getFirestore();
const auth = getAuth();

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  
  if (!token) {
    return NextResponse.redirect(new URL("/verify-failed?reason=invalid", req.url));
  }

  try {
    const docRef = db.collection("emailVerifications").doc(token);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.redirect(new URL("/verify-failed?reason=invalid", req.url));
    }

    const data = doc.data()!;

    // Check hết hạn
    if (Date.now() > data.expiresAt) {
      await docRef.delete();
      return NextResponse.redirect(new URL("/verify-failed?reason=expired", req.url));
    }

    const user = await auth.getUser(data.uid);
    
    // Update emailVerified ở cả Auth + Firestore
    if (!user.emailVerified) {
      await auth.updateUser(data.uid, { emailVerified: true });
      await db.collection("users").doc(data.uid).update({ 
        emailVerified: true,
        updatedAt: new Date()
      });
    }
    
    // Xóa token verify
    await docRef.delete();

    // Tạo SESSION COOKIE thay vì customToken
    const idToken = await auth.createCustomToken(data.uid);
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 ngày
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    // Redirect về /verify-success + set cookie
    const redirectUrl = new URL("/verify-success", req.url);
    if (user.emailVerified) {
      redirectUrl.searchParams.set("status", "already");
    }
    
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set("__session", sessionCookie, {
      maxAge: 60 * 60 * 24 * 14,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    return response;
    
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.redirect(new URL("/verify-failed?reason=error", req.url));
  }
}