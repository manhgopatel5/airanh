import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthUid } from "@/lib/server/verifyAuth";

export async function POST(request: NextRequest) {
  try {
    const uid = await getAuthUid(request);
    if (!uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { token: fcmToken } = await request.json();
    if (!fcmToken || typeof fcmToken !== "string") {
      return NextResponse.json({ error: "Missing FCM token" }, { status: 400 });
    }

    const userRef = adminDb().doc(`users/${uid}`);
    await userRef.set(
      {
        fcmTokens: FieldValue.arrayUnion(fcmToken),
        fcmTokenUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("FCM token error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}