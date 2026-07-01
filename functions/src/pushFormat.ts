const APP_ICON = "/icon-192.PNG";
const BASE_URL = "https://airanh.vercel.app";

export function formatMessagePreview(text: string, maxLen = 100): string {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (!t) return "Tin nhắn mới";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trimEnd()}…`;
}

export function resolvePushIcon(avatar?: string | null, isSystem = false): string {
  if (isSystem || !avatar?.trim()) return `${BASE_URL}${APP_ICON}`;
  if (avatar.startsWith("http")) return avatar;
  return `${BASE_URL}${avatar.startsWith("/") ? avatar : `/${avatar}`}`;
}

export function buildPushDisplayPayload(params: {
  senderName: string;
  message: string;
  senderAvatar?: string | null;
  isSystem?: boolean;
  type?: string;
  link?: string;
  messageId?: string;
  extraData?: Record<string, string>;
}) {
  const type = params.type || "message";
  const isSystem = params.isSystem ?? type === "system";
  const title = (params.senderName || "Thông báo").trim();
  const body = formatMessagePreview(params.message);
  const icon = resolvePushIcon(params.senderAvatar, isSystem);
  const link = params.link || "/";
  const absoluteLink = link.startsWith("http") ? link : `${BASE_URL}${link.startsWith("/") ? link : `/${link}`}`;

  return {
    title,
    body,
    icon,
    data: {
      title,
      body,
      icon,
      isSystem: isSystem ? "true" : "false",
      type,
      link,
      url: absoluteLink,
      ...(params.messageId ? { messageId: params.messageId } : {}),
      ...(params.extraData || {}),
    },
  };
}
