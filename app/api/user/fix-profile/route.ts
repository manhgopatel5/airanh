import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.split("Bearer ")[1];
  const decoded = await adminAuth().verifyIdToken(token);
  const uid = decoded.uid;

  const userRef = adminDb().doc(`users/${uid}`);
  const snap = await userRef.get();
  const data = snap.data();

  const displayName = data?.displayName || decoded.email?.split('@')[0] || "Người dùng";
  const photoURL = data?.photoURL || decoded.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0A84FF&color=fff`;

  // Update Auth
  await adminAuth().updateUser(uid, { displayName, photoURL });

  // Update Firestore
  await userRef.update({ displayName, photoURL, username: slugify(displayName) });

  return NextResponse.json({ success: true });
}