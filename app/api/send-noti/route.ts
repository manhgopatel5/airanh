import { NextResponse } from "next/server";
import { adminMessaging } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = body?.token;
    const message = body?.message || "";
    const chatId = body?.chatId;
    const senderName = body?.senderName || "User"; // 🔥 thêm

    // ❌ thiếu token → bỏ
    if (!token) {
      console.log("❌ Missing token");
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    // ❌ thiếu chatId → vẫn gửi nhưng warn
    if (!chatId) {
      console.log("⚠️ Missing chatId");
    }

    console.log("📩 SEND PUSH:", {
      to: token,
      chatId,
      sender: senderName,
    });

    await adminMessaging.send({
      token,

      // 🔥 QUAN TRỌNG: chỉ dùng data
      data: {
        // ✅ FIX CHÍNH Ở ĐÂY
        title: `${senderName} đã gửi tin nhắn`,
        body: String(message),
        chatId: String(chatId || ""),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ send-noti error:", error);

    return NextResponse.json(
      {
        error: "Send failed",
        detail: error?.message || "",
      },
      { status: 500 }
    );
  }
}
