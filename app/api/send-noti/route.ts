import { NextResponse } from "next/server";
import { adminMessaging } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const token = body?.token;
    const message = body?.message || "";
    const chatId = body?.chatId || "";
    const senderName = body?.senderName || "User";

    if (!token) {
      console.log("❌ Missing token");
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    console.log("📩 SEND PUSH:", {
      to: token,
      chatId,
      sender: senderName,
    });

    await adminMessaging.send({
      token,

      // 🔥 chỉ dùng data (KHÔNG dùng notification)
      data: {
        type: "chat",
        title: `${senderName} đã gửi tin nhắn`,
        body: String(message),
        chatId: String(chatId),
      },

      // 🔥 đảm bảo không bị duplicate hệ thống
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
