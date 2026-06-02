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

    // Check đã dùng rồi
    if (data.used) {
      return NextResponse.redirect(new URL("/verify-success?status=already", req.url));
    }

    // Check hết hạn thì xóa luôn
    if (Date.now() > data.expiresAt) {
      await docRef.delete();
      return NextResponse.redirect(new URL("/verify-failed?reason=expired", req.url));
    }

    // Update user thành verified
    await auth.updateUser(data.uid, { emailVerified: true });
    
    // Đánh dấu token đã dùng
    await docRef.update({ 
      used: true, 
      usedAt: Date.now() 
    });

    // Redirect về trang success thay vì /login
    return NextResponse.redirect(new URL("/verify-success", req.url));
    
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.redirect(new URL("/verify-failed?reason=error", req.url));
  }
}