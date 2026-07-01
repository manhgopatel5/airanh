import { NextRequest, NextResponse } from "next/server";
import "@/lib/firebase-admin";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { syncEventStats } from "@/lib/eventsServer";
import { getAuthUid } from "@/lib/server/verifyAuth";

export const dynamic = "force-dynamic";

type ReviewDoc = {
  eventId: string;
  userId: string;
  userName?: string;
  rating: number;
  comment: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const db = adminDb();
    const snap = await db.collection("reviews").where("eventId", "==", eventId).get();

    const raw = snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<ReviewDoc, "id" | "createdAt" | "updatedAt">),
      createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: docSnap.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    const userIds = [...new Set(raw.map((r) => r.userId).filter(Boolean))];
    const nameMap: Record<string, string> = {};

    for (let i = 0; i < userIds.length; i += 10) {
      const chunk = userIds.slice(i, i + 10);
      const usersSnap = await db.collection("users").where("__name__", "in", chunk).get();
      usersSnap.docs.forEach((userDoc) => {
        const data = userDoc.data();
        nameMap[userDoc.id] =
          data.displayName || data.name || data.username || "Người dùng";
      });
    }

    const reviews = raw
      .map((r) => ({
        ...r,
        userName: r.userName || nameMap[r.userId] || "Người dùng",
      }))
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

    return NextResponse.json({ reviews });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    console.error("GET /api/admin/reviews error:", err);
    return NextResponse.json({ error: "Failed", detail: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await getAuthUid(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { eventId, rating, comment } = await request.json();
    if (!eventId || !rating) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const db = adminDb();
    const userDoc = await db.doc(`users/${uid}`).get();
    const userData = userDoc.data();
    const userName =
      userData?.displayName || userData?.name || userData?.username || "Người dùng";

    const reviewId = `${eventId}_${uid}`;

    await db.collection("reviews").doc(reviewId).set(
      {
        eventId,
        userId: uid,
        userName,
        rating: Number(rating),
        comment: (comment || "").trim(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await syncEventStats(eventId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    console.error("POST /api/admin/reviews error:", err);
    return NextResponse.json({ error: "Failed", detail: message }, { status: 500 });
  }
}
