import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

function db() {
  return getFirestore();
}

export type UserSettings = {
  notiTaskAssigned?: boolean;
  notiTaskDue?: boolean;
  notiPlanInvite?: boolean;
  notiPlanDeadline?: boolean;
  notiChatMention?: boolean;
  notiChatAll?: boolean;
  notiFriendRequest?: boolean;
  notiFriendAccepted?: boolean;
  quietHours?: { enabled?: boolean; from?: string; to?: string };
};

export type NotifyPayload = {
  type: string;
  fromUid: string;
  fromName: string;
  fromAvatar: string;
  title: string;
  message: string;
  link?: string;
  actionData?: Record<string, unknown>;
};

export type NotifyOptions = {
  /** Mặc định true nếu không có trong settings */
  settingKey?: keyof UserSettings;
  /** Chỉ gửi push nếu là mention và user bật notiChatMention */
  isMention?: boolean;
  /** Bỏ qua quiet hours (tin khẩn) */
  force?: boolean;
  /** Idempotency — tránh gửi push trùng */
  messageId?: string;
};

function isInQuietHours(quietHours?: UserSettings["quietHours"]): boolean {
  if (!quietHours?.enabled || !quietHours.from || !quietHours.to) return false;
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const [fromH, fromM] = quietHours.from.split(":").map(Number);
  const [toH, toM] = quietHours.to.split(":").map(Number);
  const from = (fromH ?? 0) * 60 + (fromM ?? 0);
  const to = (toH ?? 0) * 60 + (toM ?? 0);
  if (from <= to) return current >= from && current < to;
  return current >= from || current < to;
}

function shouldSendPush(settings: UserSettings, type: string, options: NotifyOptions): boolean {
  const { settingKey, isMention } = options;

  if (settingKey) {
    const val = settings[settingKey];
    if (val === false) return false;
  }

  if (type === "group_message") {
    const chatAll = settings.notiChatAll !== false;
    const chatMention = settings.notiChatMention !== false;
    if (!chatAll && !isMention) return false;
    if (!chatAll && isMention && !chatMention) return false;
  }

  if (type === "mention" && settings.notiChatMention === false) return false;

  return true;
}

async function sendPushToUser(
  uid: string,
  payload: { title: string; body: string; data: Record<string, string> },
  messageId?: string
) {
  const userDoc = await db().doc(`users/${uid}`).get();
  const rawTokens: string[] = userDoc.data()?.fcmTokens || [];
  const tokens = [...new Set(rawTokens.filter((t) => typeof t === "string" && t.length > 0))];
  if (tokens.length === 0) {
    console.warn(`[push] No fcmTokens for user ${uid}`);
    return;
  }

  if (messageId) {
    const logRef = db().doc(`notificationPushLog/${messageId}`);
    const log = await logRef.get();
    if (log.exists) return;
  }

  const link = payload.data.link || payload.data.url || "/";
  const messaging = getMessaging();
  const result = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
    webpush: {
      fcmOptions: { link: link.startsWith("http") ? link : `https://airanh.vercel.app${link}` },
      notification: { icon: "/icon-192.PNG", badge: "/icon-192.PNG" },
    },
  });

  const deadTokens: string[] = [];
  result.responses.forEach((resp, i) => {
    if (!resp.success && tokens[i]) deadTokens.push(tokens[i]!);
  });
  if (deadTokens.length > 0) {
    await db().doc(`users/${uid}`).update({
      fcmTokens: FieldValue.arrayRemove(...deadTokens),
    });
  }

  if (messageId && result.successCount > 0) {
    await db().doc(`notificationPushLog/${messageId}`).set({
      recipientId: uid,
      sentAt: FieldValue.serverTimestamp(),
      source: "cloud_function",
    });
  }
}

/** Tạo thông báo in-app + push FCM (kể cả offline) */
export async function createNotificationAndPush(
  toUid: string,
  payload: NotifyPayload,
  options: NotifyOptions = {}
) {
  if (!toUid || toUid === payload.fromUid) return;

  try {
    const userDoc = await db().doc(`users/${toUid}`).get();
    const settings: UserSettings = userDoc.data()?.settings || {};

    if (!options.force && isInQuietHours(settings.quietHours)) {
      await db().collection(`notifications/${toUid}/items`).add({
        type: payload.type,
        fromUid: payload.fromUid,
        fromName: payload.fromName,
        fromAvatar: payload.fromAvatar,
        title: payload.title,
        message: payload.message,
        link: payload.link || null,
        actionData: payload.actionData || null,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }

    await db().collection(`notifications/${toUid}/items`).add({
      type: payload.type,
      fromUid: payload.fromUid,
      fromName: payload.fromName,
      fromAvatar: payload.fromAvatar,
      title: payload.title,
      message: payload.message,
      link: payload.link || null,
      actionData: payload.actionData || null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    const pushOk = shouldSendPush(settings, payload.type, options);
    if (!pushOk) return;

    const link = payload.link || "/";
    await sendPushToUser(
      toUid,
      {
        title: payload.title,
        body: payload.message,
        data: {
          type: payload.type,
          link,
          url: link,
          ...(payload.actionData?.chatId ? { chatId: String(payload.actionData.chatId) } : {}),
          ...(payload.actionData?.groupId ? { groupId: String(payload.actionData.groupId) } : {}),
          ...(payload.actionData?.requestId ? { requestId: String(payload.actionData.requestId) } : {}),
        },
      },
      options.messageId
    );
  } catch (error) {
    console.error("createNotificationAndPush error:", error);
  }
}

export function extractMentionedUids(
  text: string,
  members: string[],
  membersInfo: Record<string, { name?: string; username?: string }> = {}
): string[] {
  if (!text.includes("@")) return [];
  const mentioned = new Set<string>();
  for (const uid of members) {
    const info = membersInfo[uid];
    if (!info) continue;
    const tags = [info.name, info.username].filter(Boolean) as string[];
    for (const tag of tags) {
      if (text.includes(`@${tag}`)) mentioned.add(uid);
    }
  }
  return [...mentioned];
}
