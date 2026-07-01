import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getAuthUid } from "@/lib/server/verifyAuth";
import { dispatchPushOnce } from "@/lib/server/pushDispatch";
import { isInQuietHours } from "@/lib/notificationPrefs";

export async function POST(request: NextRequest) {
  try {
    const senderUid = await getAuthUid(request);
    if (!senderUid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      type = "message",
      chatId,
      messageId,
      title,
      body: messageBody,
      recipientId: explicitRecipient,
      groupId,
    } = body as {
      type?: string;
      chatId?: string;
      messageId?: string;
      title?: string;
      body?: string;
      recipientId?: string;
      groupId?: string;
    };

    if (!messageId) {
      return NextResponse.json({ error: "Missing messageId" }, { status: 400 });
    }

    let recipientId = explicitRecipient;

    if (type === "message" && chatId) {
      const chatSnap = await adminDb().doc(`chats/${chatId}`).get();
      if (!chatSnap.exists) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }
      const chat = chatSnap.data()!;
      const members: string[] = chat.members || [];
      if (!members.includes(senderUid)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      recipientId = members.find((m) => m !== senderUid);
      const mutedBy: string[] = chat.mutedBy || [];
      if (recipientId && mutedBy.includes(recipientId)) {
        return NextResponse.json({ skipped: true, reason: "muted" });
      }
    }

    if (!recipientId) {
      return NextResponse.json({ skipped: true, reason: "no_recipient" });
    }

    const recipientSnap = await adminDb().doc(`users/${recipientId}`).get();
    const settings = recipientSnap.data()?.settings || {};

    if (type === "group_message") {
      const chatAll = settings.notiChatAll !== false;
      if (!chatAll) {
        return NextResponse.json({ skipped: true, reason: "settings_disabled" });
      }
    }

    if (isInQuietHours(settings.quietHours)) {
      return NextResponse.json({ skipped: true, reason: "quiet_hours" });
    }

    const link =
      type === "message" && chatId
        ? `/chat/${chatId}`
        : type === "group_message" && groupId
          ? `/groups/${groupId}`
          : "/notifications";

    const result = await dispatchPushOnce({
      messageId,
      recipientId,
      title: title || "Thông báo mới",
      body: messageBody || "",
      type,
      link,
      actionData: {
        ...(chatId ? { chatId } : {}),
        ...(groupId ? { groupId } : {}),
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("dispatch push error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
