import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

function slugify(str: string): string {
  return str
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/^-|-$/g, "")
 .slice(0, 60);
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Thiếu token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ error: "Token không hợp lệ" }, { status: 401 });
    }

    const decoded = await adminAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const userRef = adminDb().doc(`users/${uid}`);
    const snap = await userRef.get();
    const data = snap.data();

    const displayName = data?.displayName || decoded.name || decoded.email?.split('@')[0] || "Người dùng";
    const photoURL = data?.photoURL || decoded.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0A84FF&color=fff&bold=true`;
    const username = data?.username || slugify(displayName);

    // Update Auth
    await adminAuth().updateUser(uid, { displayName, photoURL });

    // Update Firestore
    await userRef.update({
      displayName,
      photoURL,
      username,
      nameLower: displayName.toLowerCase(),
      searchKeywords: [
        displayName.toLowerCase(),
        displayName.toLowerCase().replace(/\s+/g, ""),
      ...displayName.toLowerCase().split(" ").filter((w: string) => w.length >= 2),
        username.toLowerCase(),
      ],
    });

    return NextResponse.json({ success: true, displayName, photoURL });
  } catch (e: any) {
    console.error("fix-profile error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}