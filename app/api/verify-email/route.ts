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
    return NextResponse.redirect("https://huha.online/verify-failed?reason=invalid");
  }

  try {
    const docRef = db.collection("emailVerifications").doc(verifyToken);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.redirect("https://huha.online/verify-failed?reason=invalid");
    }

    const data = doc.data()!;

    if (data.used) {
      return NextResponse.redirect("https://huha.online/verify-failed?reason=used");
    }

    if (Date.now() > data.expiresAt) {
      await docRef.delete();
      return NextResponse.redirect("https://huha.online/verify-failed?reason=expired");
    }

    await auth.updateUser(data.uid, { emailVerified: true });
    
    const userRef = db.collection("users").doc(data.uid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.update({ 
        emailVerified: true,
        updatedAt: new Date()
      });
    }
    
    // ĐÁNH DẤU TOKEN ĐÃ DÙNG
    await docRef.update({ used: true, usedAt: Date.now() });

    // ↓↓↓ SỬA: KHÔNG TẠO customToken, KHÔNG AUTO LOGIN ↓↓↓
    return NextResponse.redirect(`https://huha.online/verify-success`);
    
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.redirect("https://huha.online/verify-failed?reason=error");
  }
}