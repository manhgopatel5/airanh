import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  const verifyToken = req.nextUrl.searchParams.get("token");
  
  if (!verifyToken) {
    return NextResponse.redirect("https://huha.online/verify-failed?reason=invalid");
  }

  try {
    const db = adminDb();
    const auth = adminAuth();
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
    
    await docRef.update({ used: true, usedAt: Date.now() });

    return NextResponse.redirect(`https://huha.online/verify-success`);
    
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.redirect("https://huha.online/verify-failed?reason=error");
  }
}
