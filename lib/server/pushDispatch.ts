import { FieldValue } from "firebase-admin/firestore";
import { adminDb, sendNotification } from "@/lib/firebase-admin";
import { buildPushDisplayPayload, type PushContentKind } from "@/lib/pushFormat";
import { CHAT_NOTIFICATION_TYPES, shouldSendChatNotification } from "@/lib/server/chatNotificationThrottle";

type PushPayload = {
  messageId: string;
  recipientId: string;
  senderName: string;
  preview?: string;
  contentKind?: PushContentKind;
  senderAvatar?: string | null;
  isSystem?: boolean;
  type: string;
  link: string;
  actionData?: Record<string, string>;
};

/** Gửi FCM push tới recipient, tránh trùng theo messageId */
export async function dispatchPushOnce(payload: PushPayload): Promise<{
  sent: boolean;
  reason?: string;
}> {
  const db = adminDb();
  const logRef = db.doc(`notificationPushLog/${payload.messageId}`);

  const existing = await logRef.get();
  if (existing.exists) {
    return { sent: false, reason: "already_sent" };
  }

  if (CHAT_NOTIFICATION_TYPES.has(payload.type)) {
    const chatKey =
      payload.actionData?.chatId ||
      payload.actionData?.groupId ||
      payload.messageId.split("_")[0] ||
      "";
    if (chatKey) {
      const allowed = await shouldSendChatNotification(adminDb(), payload.recipientId, chatKey);
      if (!allowed) {
        return { sent: false, reason: "chat_throttled" };
      }
    }
  }

  const userDoc = await db.doc(`users/${payload.recipientId}`).get();
  if (!userDoc.exists) {
    return { sent: false, reason: "recipient_not_found" };
  }

  const rawTokens: string[] = userDoc.data()?.fcmTokens || [];
  const tokens = [...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0))];
  if (tokens.length === 0) {
    return { sent: false, reason: "no_fcm_tokens" };
  }

  const display = buildPushDisplayPayload({
    senderName: payload.senderName,
    ...(payload.preview ? { preview: payload.preview } : {}),
    ...(payload.contentKind ? { contentKind: payload.contentKind } : {}),
    ...(payload.senderAvatar != null ? { senderAvatar: payload.senderAvatar } : {}),
    ...(payload.isSystem != null ? { isSystem: payload.isSystem } : {}),
    type: payload.type,
    link: payload.link,
    messageId: payload.messageId,
    ...(payload.actionData ? { extraData: payload.actionData } : {}),
  });

  const result = await sendNotification({
    token: tokens,
    title: display.title,
    body: display.body,
    iconUrl: display.icon,
    dataOnly: true,
    link: display.data.url || display.data.link || "/",
    data: display.data,
    priority: "high",
  });

  if (result.successCount > 0) {
    await logRef.set({
      recipientId: payload.recipientId,
      type: payload.type,
      sentAt: FieldValue.serverTimestamp(),
      source: "vercel",
    });
    return { sent: true };
  }

  return { sent: false, reason: "fcm_failed" };
}
