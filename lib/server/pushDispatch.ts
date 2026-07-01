import { FieldValue } from "firebase-admin/firestore";
import { adminDb, sendNotification } from "@/lib/firebase-admin";

type PushPayload = {
  messageId: string;
  recipientId: string;
  title: string;
  body: string;
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

  const userDoc = await db.doc(`users/${payload.recipientId}`).get();
  if (!userDoc.exists) {
    return { sent: false, reason: "recipient_not_found" };
  }

  const rawTokens: string[] = userDoc.data()?.fcmTokens || [];
  const tokens = [...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0))];
  if (tokens.length === 0) {
    return { sent: false, reason: "no_fcm_tokens" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || "https://airanh.vercel.app";
  const absoluteLink = payload.link.startsWith("http") ? payload.link : `${baseUrl}${payload.link}`;

  const data: Record<string, string> = {
    type: payload.type,
    link: payload.link,
    url: absoluteLink,
    messageId: payload.messageId,
    ...payload.actionData,
  };

  const result = await sendNotification({
    token: tokens,
    title: payload.title,
    body: payload.body,
    link: absoluteLink,
    data,
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
