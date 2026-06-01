import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";

if (!getApps().length) initializeApp();
const db = getFirestore();

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/login?error=invalid_token", req.url));

  const doc = await db.collection("emailVerifications").doc(token).get();
  if (!doc.exists) return NextResponse.redirect(new URL("/login?error=token_not_found", req.url));

  const data = doc.data()!;
  if (data.used || Date.now() > data.expiresAt) {
    return NextResponse.redirect(new URL("/login?error=token_expired", req.url));
  }

  await getAuth().updateUser(data.uid, { emailVerified: true });
  await doc.ref.update({ used: true });

  return NextResponse.redirect(new URL("/?verified=1", req.url));
}