import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

async function recalcUserRating(targetUid: string) {
  const reviewsSnap = await adminDb().collection("users").doc(targetUid).collection("reviews").get();
  const count = reviewsSnap.size;
  if (count === 0) {
    await adminDb().collection("users").doc(targetUid).update({
      "stats.totalReviews": 0,
      "stats.rating": 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }
  const sum = reviewsSnap.docs.reduce((acc, d) => acc + (d.data().rating || 0), 0);
  const rating = Math.round((sum / count) * 10) / 10;
  await adminDb().collection("users").doc(targetUid).update({
    "stats.totalReviews": count,
    "stats.rating": rating,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ uid: string; reviewId: string }> }
) {
  const { reviewId } = await params;
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = await adminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { rating, feedback } = body as { rating?: number; feedback?: string };

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid rating" }, { status: 400 });
  }
  if (!feedback?.trim()) {
    return NextResponse.json({ error: "Feedback required" }, { status: 400 });
  }

  try {
    const groupSnap = await adminDb()
      .collectionGroup("reviews")
      .where("fromUserId", "==", decoded.uid)
      .get();

    const match = groupSnap.docs.find((d) => d.id === reviewId);
    if (!match) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await match.ref.update({
      rating,
      feedback: feedback.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const toUserId = match.data().toUserId as string | undefined;
    if (toUserId) {
      await recalcUserRating(toUserId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH review error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
