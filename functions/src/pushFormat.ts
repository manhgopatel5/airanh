const APP_ICON = "/icon-192.PNG";
const BASE_URL = "https://airanh.vercel.app";

export type PushContentKind =
  | "text"
  | "image"
  | "file"
  | "location"
  | "audio"
  | "friend_request"
  | "friend_accepted"
  | "mention"
  | "group_text"
  | "system"
  | "other";

function truncatePreview(text?: string, maxLen = 120): string {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trimEnd()}…`;
}

export function formatPushActionTitle(
  kind: PushContentKind,
  isSystem: boolean
): string {
  if (isSystem) return "Hệ thống";

  switch (kind) {
    case "friend_request":
      return "đã gửi lời mời kết bạn";
    case "friend_accepted":
      return "đã chấp nhận lời mời kết bạn";
    case "image":
      return "đã gửi hình ảnh";
    case "file":
      return "đã gửi tệp đính kèm";
    case "location":
      return "đã gửi vị trí";
    case "audio":
      return "đã gửi tin nhắn thoại";
    case "mention":
      return "đã nhắc đến bạn";
    case "group_text":
      return "đã gửi tin nhắn trong nhóm";
    case "text":
    default:
      return "đã gửi tin nhắn:";
  }
}

export function formatPushBody(
  senderName: string,
  kind: PushContentKind,
  preview?: string
): string {
  const name = senderName.trim() || "Ai đó";
  const p = truncatePreview(preview);

  if (kind === "system") {
    return p || "Bạn có thông báo mới";
  }

  if (
    kind === "friend_request" ||
    kind === "friend_accepted" ||
    kind === "image" ||
    kind === "file" ||
    kind === "location" ||
    kind === "audio"
  ) {
    return name;
  }

  return p ? `${name}\n${p}` : name;
}

export function inferPushContentKind(
  type: string,
  msg?: {
    type?: string;
    text?: string;
    image?: string;
    imageUrl?: string;
    file?: string;
    fileUrl?: string;
    fileName?: string;
    location?: unknown;
    lat?: unknown;
    audioUrl?: string;
  }
): PushContentKind {
  const msgType = msg?.type;
  if (msgType === "image" || msg?.image || msg?.imageUrl) return "image";
  if (msgType === "file" || msg?.file || msg?.fileUrl || msg?.fileName) return "file";
  if (msgType === "location" || msg?.location || msg?.lat != null) return "location";
  if (msg?.audioUrl) return "audio";
  if (type === "friend_request") return "friend_request";
  if (type === "friend_accepted") return "friend_accepted";
  if (type === "mention") return "mention";
  if (type === "group_message") return "group_text";
  if (type === "system") return "system";
  return "text";
}

export function resolvePushIcon(
  senderName: string,
  avatar?: string | null,
  isSystem = false
): string {
  if (isSystem) return `${BASE_URL}${APP_ICON}`;

  const trimmed = avatar?.trim();
  if (trimmed) {
    if (trimmed.startsWith("http")) return trimmed;
    return `${BASE_URL}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
  }

  const name = encodeURIComponent((senderName || "U").trim());
  return `https://ui-avatars.com/api/?name=${name}&background=0a84ff&color=fff&size=192&bold=true&rounded=true`;
}

export function buildPushDisplayPayload(params: {
  senderName: string;
  preview?: string;
  senderAvatar?: string | null;
  contentKind?: PushContentKind;
  isSystem?: boolean;
  type?: string;
  link?: string;
  messageId?: string;
  extraData?: Record<string, string>;
}) {
  const type = params.type || "message";
  const contentKind =
    params.contentKind ??
    inferPushContentKind(type, params.preview ? { text: params.preview } : undefined);
  const isSystem = params.isSystem ?? contentKind === "system";
  const senderName = isSystem ? "Hệ thống" : (params.senderName || "Ai đó").trim();
  const title = formatPushActionTitle(contentKind, isSystem);
  const body = formatPushBody(senderName, contentKind, params.preview);
  const icon = resolvePushIcon(senderName, params.senderAvatar, isSystem);
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
      senderName,
      senderAvatar: params.senderAvatar?.trim() || icon,
      preview: truncatePreview(params.preview) || "",
      contentKind,
      isSystem: isSystem ? "true" : "false",
      type,
      link,
      url: absoluteLink,
      ...(params.messageId ? { messageId: params.messageId } : {}),
      ...(params.extraData || {}),
    },
  };
}
