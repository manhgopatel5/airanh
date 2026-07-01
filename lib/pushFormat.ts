const APP_ICON = "/icon-192.PNG";

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

export function getPushBaseUrl(): string {
  return (
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_URL) ||
    "https://airanh.vercel.app"
  ).replace(/\/$/, "");
}

function truncatePreview(text?: string, maxLen = 120): string {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trimEnd()}…`;
}

/** Body push — tên + hành động, không dấu "-" đầu dòng nội dung */
export function formatPushBody(
  senderName: string,
  kind: PushContentKind,
  preview?: string
): string {
  const name = senderName.trim() || "Ai đó";

  switch (kind) {
    case "friend_request":
      return `${name} đã gửi lời mời kết bạn.`;
    case "friend_accepted":
      return `${name} đã chấp nhận lời mời kết bạn.`;
    case "image":
      return `${name} đã gửi hình ảnh.`;
    case "file":
      return `${name} đã gửi tệp đính kèm.`;
    case "location":
      return `${name} đã gửi vị trí.`;
    case "audio":
      return `${name} đã gửi tin nhắn thoại.`;
    case "mention": {
      const p = truncatePreview(preview);
      return p ? `${name} đã nhắc đến bạn:\n${p}` : `${name} đã nhắc đến bạn trong nhóm.`;
    }
    case "group_text": {
      const p = truncatePreview(preview);
      return p ? `${name} đã gửi tin nhắn trong nhóm:\n${p}` : `${name} đã gửi tin nhắn trong nhóm.`;
    }
    case "system":
      return truncatePreview(preview) || "Bạn có thông báo mới.";
    case "text":
    default: {
      const p = truncatePreview(preview);
      return p ? `${name} đã gửi tin nhắn:\n${p}` : `${name} đã gửi tin nhắn.`;
    }
  }
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

/** Avatar người gửi — fallback ui-avatars nếu chưa có ảnh */
export function resolvePushIcon(
  senderName: string,
  avatar?: string | null,
  isSystem = false
): string {
  const base = getPushBaseUrl();
  if (isSystem) return `${base}${APP_ICON}`;

  const trimmed = avatar?.trim();
  if (trimmed) {
    if (trimmed.startsWith("http")) return trimmed;
    return `${base}${trimmed.startsWith("/") ? trimmed : `/${trimmed}`}`;
  }

  const initials = encodeURIComponent((senderName || "U").trim().slice(0, 2) || "U");
  return `https://ui-avatars.com/api/?name=${initials}&background=0a84ff&color=fff&size=128&bold=true`;
}

export type PushDisplayPayload = {
  /** Title trống cho tin user — tránh "Tên" + "from App" trên iOS */
  title: string;
  body: string;
  icon: string;
  data: Record<string, string>;
};

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
}): PushDisplayPayload {
  const type = params.type || "message";
  const contentKind =
    params.contentKind ??
    inferPushContentKind(type, params.preview ? { text: params.preview } : undefined);
  const isSystem = params.isSystem ?? contentKind === "system";
  const senderName = isSystem ? "Hệ thống" : (params.senderName || "Ai đó").trim();
  const body = formatPushBody(senderName, contentKind, params.preview);
  const icon = resolvePushIcon(senderName, params.senderAvatar, isSystem);
  const base = getPushBaseUrl();
  const link = params.link || "/";
  const absoluteLink = link.startsWith("http") ? link : `${base}${link.startsWith("/") ? link : `/${link}`}`;
  const title = isSystem ? "Hệ thống" : "";

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
