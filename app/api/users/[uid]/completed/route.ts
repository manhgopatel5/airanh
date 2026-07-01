import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "20"), 40);
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = await adminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [asAssignee, asOwner] = await Promise.all([
      adminDb()
        .collection("tasks")
        .where("assignees", "array-contains", uid)
        .where("status", "==", "completed")
        .orderBy("updatedAt", "desc")
        .limit(limit)
        .get()
        .catch(() => adminDb().collection("tasks").where("assignees", "array-contains", uid).limit(limit).get()),
      adminDb()
        .collection("tasks")
        .where("userId", "==", uid)
        .where("status", "==", "completed")
        .orderBy("updatedAt", "desc")
        .limit(limit)
        .get()
        .catch(() => adminDb().collection("tasks").where("userId", "==", uid).limit(limit).get()),
    ]);

    const map = new Map<string, Record<string, unknown>>();
    for (const snap of [asAssignee, asOwner]) {
      for (const doc of snap.docs) {
        const d = doc.data();
        if (d.status !== "completed") continue;
        map.set(doc.id, {
          id: doc.id,
          slug: d.slug || doc.id,
          title: d.title || "Không có tiêu đề",
          type: d.type || "task",
          status: d.status,
          updatedAt: d.updatedAt?.toDate?.()?.toISOString?.() || null,
          role: d.userId === uid ? "owner" : "assignee",
        });
      }
    }

    const items = Array.from(map.values()).sort((a, b) =>
      String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
    );

    return NextResponse.json({ items: items.slice(0, limit) });
  } catch (error) {
    console.error("GET completed error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
