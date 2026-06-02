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

    // Lấy user để check đã verified chưa
    const user = await auth.getUser(data.uid);
    
    // Nếu đã verified rồi thì tạo token login luôn, không cần update
    if (!user.emailVerified) {
      await auth.updateUser(data.uid, { emailVerified: true });
    }
    
    // Tạo customToken để auto login
    const customToken = await auth.createCustomToken(data.uid);
    
    // Xóa token verify
    await docRef.delete();

    // Redirect sang /verify-success kèm customToken
    const redirectUrl = new URL(`/verify-success?token=${customToken}`, req.url);
    
    // Nếu đã verified trước đó thì thêm param để hiện UI khác
    if (user.emailVerified) {
      redirectUrl.searchParams.set("status", "already");
    }
    
    return NextResponse.redirect(redirectUrl);
    
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.redirect(new URL("/verify-failed?reason=error", req.url));
  }
}