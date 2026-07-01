import { getFirebaseAuth } from "@/lib/firebase";

/** Gửi push offline cho người nhận */
export async function dispatchOfflinePush(params: {
  type?: string;
  chatId: string;
  messageId: string;
  senderName: string;
  senderAvatar?: string;
  body: string;
}): Promise<{ ok: boolean; reason?: string }> {
  try {
    const idToken = await getFirebaseAuth().currentUser?.getIdToken();
    if (!idToken) return { ok: false, reason: "no_auth" };

    const res = await fetch("/api/notifications/dispatch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      credentials: "include",
      body: JSON.stringify({
        type: params.type || "message",
        chatId: params.chatId,
        messageId: params.messageId,
        title: params.senderName,
        body: params.body,
        senderAvatar: params.senderAvatar,
      }),
      keepalive: true,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("[push dispatch]", res.status, data);
      return { ok: false, reason: data.error || `http_${res.status}` };
    }
    if (data.sent) return { ok: true };
    if (data.skipped) return { ok: false, reason: data.reason || "skipped" };
    return { ok: false, reason: data.reason || "not_sent" };
  } catch (err) {
    console.warn("[push dispatch] error:", err);
    return { ok: false, reason: "network_error" };
  }
}
