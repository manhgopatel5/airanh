import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { serializeVipExpiresAt } from "@/lib/vip";

export const dynamic = "force-dynamic";

async function resolveUserDoc(uidOrPublicId: string) {
  const db = adminDb();
  const direct = await db.collection("users").doc(uidOrPublicId).get();
  if (direct.exists) return direct;

  const byUserId = await db.collection("users").where("userId", "==", uidOrPublicId).limit(1).get();
  if (!byUserId.empty) return byUserId.docs[0]!;

  const byUsername = await db.collection("usernames").doc(uidOrPublicId).get();
  if (byUsername.exists) {
    const realUid = byUsername.data()?.uid as string | undefined;
    if (realUid) {
      const userSnap = await db.collection("users").doc(realUid).get();
      if (userSnap.exists) return userSnap;
    }
  }

  return null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = await adminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const snap = await resolveUserDoc(uid);
    if (!snap) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const d = snap.data()!;
    const vip = d.vip as { tier?: string; expiresAt?: unknown } | null | undefined;

    let friendCount = 0;
    try {
      const friendsSnap = await adminDb().collection("users").doc(snap.id).collection("friends").get();
      friendCount = friendsSnap.size;
    } catch {
      friendCount = 0;
    }

    return NextResponse.json({
      user: {
        uid: snap.id,
        name: d.displayName || d.name || d.username || "User",
        userId: d.userId || "",
        avatar: d.photoURL || d.avatar || "",
        bio: d.bio || "",
        birthday: d.birthday || "",
        phone: d.phone || "",
        title: d.title || "",
        location: d.location || "",
        online: !!d.isOnline,
        emailVerified: !!d.emailVerified,
        isVerifiedId: !!(d.isVerifiedId || d.verified),
        skills: d.skills || [],
        portfolio: d.portfolio || [],
        stats: d.stats || {},
        huhaScore: d.huhaScore || 0,
        createdAt: d.createdAt?.toDate?.()?.toISOString?.() || null,
        vip: vip
          ? { tier: vip.tier || null, expiresAt: serializeVipExpiresAt(vip.expiresAt) }
          : null,
      },
      friendCount,
      isFriend: (
        await adminDb().collection("users").doc(decoded.uid).collection("friends").doc(snap.id).get()
      ).exists,
      hasSentRequest: await (async () => {
        const reqId = [decoded.uid, snap.id].sort().join("_");
        const req = await adminDb().collection("friendRequests").doc(reqId).get();
        return req.exists && req.data()?.from === decoded.uid;
      })(),
    });
  } catch (error) {
    console.error("GET profile error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
