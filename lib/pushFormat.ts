const APP_ICON = "/icon-192.PNG";

export function getPushBaseUrl(): string {
  return (
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_URL) ||
    "https://airanh.vercel.app"
  ).replace(/\/$/, "");
}

/** Preview tin nhắn: cắt gọn + … */
export function formatMessagePreview(text: string, maxLen = 100): string {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (!t) return "Tin nhắn mới";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trimEnd()}…`;
}

export function resolvePushIcon(avatar?: string | null, isSystem = false): string {
  const base = getPushBaseUrl();
  if (isSystem || !avatar?.trim()) return `${base}${APP_ICON}`;
  if (avatar.startsWith("http")) return avatar;
  return `${base}${avatar.startsWith("/") ? avatar : `/${avatar}`}`;
}

export type PushDisplayPayload = {
  title: string;
  body: string;
  icon: string;
  data: Record<string, string>;
};

export function buildPushDisplayPayload(params: {
  senderName: string;
  message: string;
  senderAvatar?: string | null;
  isSystem?: boolean;
  type?: string;
  link?: string;
  messageId?: string;
  extraData?: Record<string, string>;
}): PushDisplayPayload {
  const type = params.type || "message";
  const isSystem = params.isSystem ?? type === "system";
  const title = (params.senderName || "Thông báo").trim();
  const body = formatMessagePreview(params.message);
  const icon = resolvePushIcon(params.senderAvatar, isSystem);
  const base = getPushBaseUrl();
  const link = params.link || "/";
  const absoluteLink = link.startsWith("http") ? link : `${base}${link.startsWith("/") ? link : `/${link}`}`;

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
