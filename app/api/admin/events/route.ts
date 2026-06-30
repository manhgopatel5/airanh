import "@/lib/firebase-admin";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getActiveEvents } from "@/lib/eventsServer";

export const revalidate = 60;

export async function GET() {
  try {
    const events = await getActiveEvents();
    return NextResponse.json(
      { events },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    console.error("GET /api/admin/events error:", err);
    return NextResponse.json({ error: "Failed", detail: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = adminDb();
    const id = body.id || db.collection("events").doc().id;

    await db.collection("events").doc(id).set(
      {
        ...body,
        id,
        title: body.title || body.name || "",
        name: body.name || body.title || "",
        desc: body.desc || body.description || "",
        description: body.description || body.desc || "",
        image: body.image || body.imageUrl || "",
        imageUrl: body.imageUrl || body.image || "",
        category: body.category || "other",
        tag: body.tag || "NEW",
        tagColor: body.tagColor || "from-blue-500 to-cyan-500",
        icon: body.icon || "🎉",
        address: body.address || "",
        openTime: body.openTime || "",
        price: body.price || "Free",
        mapUrl: body.mapUrl || "",
        lat: body.lat != null ? Number(body.lat) : null,
        lng: body.lng != null ? Number(body.lng) : null,
        tips: Array.isArray(body.tips) ? body.tips : [],
        gallery: Array.isArray(body.gallery) ? body.gallery : [],
        isActive: body.isActive ?? true,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: body.createdAt ? new Date(body.createdAt) : FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    console.error("POST /api/admin/events error:", err);
    return NextResponse.json({ error: "Failed", detail: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const db = adminDb();
    await db.collection("events").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed";
    console.error("DELETE /api/admin/events error:", err);
    return NextResponse.json({ error: "Failed", detail: message }, { status: 500 });
  }
}
