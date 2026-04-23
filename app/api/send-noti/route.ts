import { NextResponse } from "next/server";
import { adminAuth, adminDb, adminMessaging } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// 🔥 Cache chống trùng
const sentCache = new Map<string, number>();
const CACHE_TTL = 10 * 1000;

// 🔥 Rate limit
const rateLimit = new Map<string, number[]>();
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW = 10 * 1000;

function checkRateLimit(uid: string): boolean {
  const now = Date.now();
  const timestamps = rateLimit.get(uid) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  if (recent.length >= RATE_LIMIT_COUNT) return false;

  recent.push(now);
  rateLimit.set(uid, recent);
  return true;
}

function isDuplicate(messageId: string): boolean {
  const now = Date.now();

  for (const [id, time] of sentCache.entries()) {
    if (now - time > CACHE_TTL) sentCache.delete(id);
  }

  if (sentCache.has(messageId)) return true;

  sentCache.set(messageId, now);
  return false;
}

export async function POST(req: Request) {
  try {
    // ✅ AUTH FIX (quan trọng nhất)
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // ✅ FIX TYPE: đảm bảo idToken là string
    if (!idToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const decoded = await adminAuth()
      .verifyIdToken(idToken)
      .catch(() => null);

    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const senderUid = decoded.uid;

    // ✅ Rate limit
    if (!checkRateLimit(senderUid)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await req.json();

    const {
      token,
      message = "",
      chatId = "",
      senderName = "User",
      messageId = "",
      dryRun = false,
    }: {
      token?: string;
      message?: string;
      chatId?: string;
      senderName?: string;
      messageId?: string;
      dryRun?: boolean;
    } = body;

    // ✅ Validate input
    if (!token || !chatId || !messageId) {
      return NextResponse.json(
        { error: "Missing token/chatId/messageId" },
        { status: 400 }
      );
    }

    // ✅ Chống spam duplicate
    if (isDuplicate(messageId)) {
      return NextResponse.json({ skipped: true });
    }

    // ✅ Check chat tồn tại
    const chatSnap = await adminDb().doc(`chats/${chatId}`).get();

    if (!chatSnap.exists) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    const chatData = chatSnap.data();

    if (!chatData?.members?.includes(senderUid)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Không gửi cho chính mình
    const recipientId = chatData.members.find(
      (m: string) => m !== senderUid
    );

    if (!recipientId) {
      return NextResponse.json({ skipped: true });
    }

    // ✅ Payload size check
    const payloadSize = JSON.stringify({
      token,
      message,
      chatId,
      messageId,
    }).length;

    if (payloadSize > 3500) {
      return NextResponse.json(
        { error: "Payload too large" },
        { status: 413 }
      );
    }

    console.log("📩 SEND PUSH:", {
      from: senderUid,
      to: token.slice(0, 10) + "...",
      chatId,
      messageId,
    });

    if (dryRun) {
      return NextResponse.json({ success: true, dryRun: true });
    }

    try {
      await adminMessaging().send({
        token,
        notification: {
          title: senderName,
          body: message || "Đã gửi tin nhắn",
        },
        data: {
          type: "chat",
          chatId: String(chatId),
          messageId: String(messageId),
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          link: `/chat/${chatId}`,
        },
        android: {
          priority: "high",
          ttl: 3600 * 1000,
          collapseKey: chatId,
          notification: {
            sound: "default",
            channelId: "chat_messages",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              "thread-id": chatId,
            },
          },
        },
        webpush: {
          fcmOptions: { link: `/chat/${chatId}` },
          notification: { icon: "/icon-192.png" },
        },
      });

      return NextResponse.json({ success: true });
    } catch (err: any) {
      console.error("❌ FCM error:", err?.code);

      // ✅ Xóa token chết
      if (
        err?.code === "messaging/registration-token-not-registered" ||
        err?.code === "messaging/invalid-registration-token"
      ) {
        await adminDb().doc(`users/${recipientId}`).update({
          fcmToken: FieldValue.delete(),
        });

        return NextResponse.json(
          { error: "Token removed", code: err.code },
          { status: 410 }
        );
      }

      return NextResponse.json(
        { error: "Send failed", detail: err?.message || "" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("❌ send-noti error:", error);

    return NextResponse.json(
      { error: "Internal error", detail: error?.message || "" },
      { status: 500 }
    );
  }
}