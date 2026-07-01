import { getFirebaseAuth } from "@/lib/firebase";

/** Đăng ký FCM token lên server (cookie + Bearer fallback) */
export async function saveFcmTokenToServer(fcmToken: string): Promise<boolean> {
  const auth = getFirebaseAuth();
  const idToken = await auth.currentUser?.getIdToken().catch(() => null);

  const res = await fetch("/api/user/fcm-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    credentials: "include",
    body: JSON.stringify({ token: fcmToken }),
    keepalive: true,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[FCM] Lưu token thất bại:", res.status, err);
    return false;
  }

  return true;
}
