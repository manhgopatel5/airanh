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
  const verifyToken = req.nextUrl.searchParams.get("token");
  
  if (!verifyToken) {
    return NextResponse.redirect(new URL("/verify-failed?reason=invalid", req.url));
  }

  try {
    const docRef = db.collection("emailVerifications").doc(verifyToken);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.redirect(new URL("/verify-failed?reason=invalid", req.url));
    }

    const data = doc.data()!;

    // Check đã dùng
    if (data.used) {
      return NextResponse.redirect(new URL("/verify-failed?reason=used", req.url));
    }

    // Check hết hạn
    if (Date.now() > data.expiresAt) {
      await docRef.delete();
      return NextResponse.redirect(new URL("/verify-failed?reason=expired", req.url));
    }

    // Update emailVerified ở cả Auth + Firestore
    await auth.updateUser(data.uid, { emailVerified: true });
    
    const userRef = db.collection("users").doc(data.uid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.update({ 
        emailVerified: true,
        updatedAt: new Date()
      });
    }
    
    // Tạo customToken để client auto login
    const customToken = await auth.createCustomToken(data.uid);
    
    // Đánh dấu đã dùng thay vì xóa để debug
    await docRef.update({ used: true, usedAt: Date.now() });

    // FIX: Đổi tên param thành customToken để /verify-success phân biệt được
    return NextResponse.redirect(new URL(`/verify-success?customToken=${customToken}`, req.url));
    
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.redirect(new URL("/verify-failed?reason=error", req.url));
  }
}