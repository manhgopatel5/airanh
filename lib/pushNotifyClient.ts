import { getFirebaseAuth } from "@/lib/firebase";

/** Gửi push offline cho người nhận (fire-and-forget) */
export async function dispatchOfflinePush(params: {
  type?: string;
  chatId: string;
  messageId: string;
  title: string;
  body: string;
}) {
  try {
    const idToken = await getFirebaseAuth().currentUser?.getIdToken();
    if (!idToken) return;

    await fetch("/api/notifications/dispatch", {
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
        title: params.title,
        body: params.body,
      }),
      keepalive: true,
    });
  } catch {
    // không chặn gửi tin
  }
}
