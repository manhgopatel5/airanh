import "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getAuthUid } from "@/lib/server/verifyAuth";
import { syncEventStats } from "@/lib/eventsServer";

export const dynamic = "force-dynamic";

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export async function GET(request: NextRequest) {
  try {
    const uid = await getAuthUid(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const eventId = request.nextUrl.searchParams.get("eventId");
    if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const db = adminDb();
    const today = startOfToday();

    const snap = await db
      .collection("checkins")
      .where("eventId", "==", eventId)
      .where("userId", "==", uid)
      .where("timestamp", ">=", today)
      .limit(1)
      .get();

    const eventDoc = await db.collection("events").doc(eventId).get();
    const joined = eventDoc.data()?.checkinCount ?? eventDoc.data()?.joined ?? 0;

    return NextResponse.json({ hasCheckedIn: !snap.empty, joined });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: "Failed", detail: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await getAuthUid(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { eventId } = await request.json();
    if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const db = adminDb();
    const today = startOfToday();

    const existed = await db
      .collection("checkins")
      .where("eventId", "==", eventId)
      .where("userId", "==", uid)
      .where("timestamp", ">=", today)
      .get();

    if (!existed.empty) {
      return NextResponse.json({ error: "Đã check-in hôm nay rồi" }, { status: 400 });
    }

    await db.collection("checkins").add({
      eventId,
      userId: uid,
      timestamp: FieldValue.serverTimestamp(),
    });

    await syncEventStats(eventId);

    const eventDoc = await db.collection("events").doc(eventId).get();
    const joined = eventDoc.data()?.checkinCount ?? eventDoc.data()?.joined ?? 0;

    return NextResponse.json({ success: true, joined });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: "Failed", detail: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const uid = await getAuthUid(request);
    if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { eventId } = await request.json();
    if (!eventId) return NextResponse.json({ error: "Missing eventId" }, { status: 400 });

    const db = adminDb();
    const today = startOfToday();

    const snapshot = await db
      .collection("checkins")
      .where("eventId", "==", eventId)
      .where("userId", "==", uid)
      .where("timestamp", ">=", today)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Chưa check-in hôm nay" }, { status: 400 });
    }

    const batch = db.batch();
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    await syncEventStats(eventId);

    const eventDoc = await db.collection("events").doc(eventId).get();
    const joined = eventDoc.data()?.checkinCount ?? eventDoc.data()?.joined ?? 0;

    return NextResponse.json({ success: true, joined });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: "Failed", detail: message }, { status: 500 });
  }
}
