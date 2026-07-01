import { FieldValue } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";

const THROTTLE_MS = 60 * 60 * 1000;

export function chatThrottleKey(recipientId: string, chatKey: string): string {
  return `${recipientId}_${chatKey}`;
}

/** Chat DM/group/stranger — tối đa 1 thông báo / giờ / hội thoại */
export async function shouldSendChatNotification(
  db: Firestore,
  recipientId: string,
  chatKey: string
): Promise<boolean> {
  if (!recipientId || !chatKey) return true;

  const ref = db.doc(`chatNotificationThrottle/${chatThrottleKey(recipientId, chatKey)}`);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const last = (snap.data()?.lastNotifiedAt as number | undefined) ?? 0;

    if (snap.exists && now - last < THROTTLE_MS) {
      tx.set(
        ref,
        { pendingCount: FieldValue.increment(1), updatedAt: now },
        { merge: true }
      );
      return false;
    }

    tx.set(
      ref,
      { lastNotifiedAt: now, updatedAt: now, pendingCount: 0 },
      { merge: true }
    );
    return true;
  });
}

export const CHAT_NOTIFICATION_TYPES = new Set([
  "message",
  "group_message",
  "mention",
  "stranger_message",
]);
