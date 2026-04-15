import { NextResponse } from "next/server";
import { adminMessaging } from "@/lib/firebase-admin";

// 🔥 cache chống gửi trùng (runtime)
const sentCache = new Set<string>();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = body?.token;
    const message = body?.message || "";
    const chatId = body?.chatId || "";
    const senderName = body?.senderName || "User";
    const messageId = body?.messageId || ""; // 🔥 QUAN TRỌNG

    if (!token) {
      console.log("❌ Missing token");
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    // 🔥 CHẶN TRÙNG (CORE FIX)
    if (messageId && sentCache.has(messageId)) {
      console.log("⚠️ Duplicate push blocked:", messageId);
      return NextResponse.json({ skipped: true });
    }

    if (messageId) {
      sentCache.add(messageId);

      // 🔥 auto clear sau 5s (tránh memory leak)
      setTimeout(() => {
        sentCache.delete(messageId);
      }, 5000);
    }

    console.log("📩 SEND PUSH:", {
      to: token,
      chatId,
      sender: senderName,
      messageId,
    });

    await adminMessaging.send({
      token,

      // 🔥 chỉ dùng data (KHÔNG dùng notification)
      data: {
        type: "chat",
        title: `${senderName} đã gửi tin nhắn`,
        body: String(message),
        chatId: String(chatId),
        messageId: String(messageId),
      },

      android: {
        priority: "high",
      },

      apns: {
        payload: {
          aps: {
            contentAvailable: true,
          },
        },
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
