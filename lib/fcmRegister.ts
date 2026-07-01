"use client";

import { getFirebaseApp } from "@/lib/firebase";
import { saveFcmTokenToServer } from "@/lib/fcmClient";
import { requestBrowserPushPermission } from "@/lib/pushPermissions";

export type FcmRegisterResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

const FCM_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

/** Đăng ký FCM token — cần Notification.permission === granted */
export async function registerFcmToken(): Promise<FcmRegisterResult> {
  if (typeof window === "undefined") {
    return { ok: false, reason: "Chỉ chạy trên trình duyệt" };
  }
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return { ok: false, reason: "Chưa có quyền thông báo" };
  }

  const { getMessaging, getToken, isSupported, onMessage } = await import("firebase/messaging");

  if (!(await isSupported())) {
    return { ok: false, reason: "Trình duyệt không hỗ trợ FCM push" };
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    return { ok: false, reason: "Thiếu cấu hình VAPID trên server" };
  }

  if (!("serviceWorker" in navigator)) {
    return { ok: false, reason: "Trình duyệt không hỗ trợ service worker" };
  }

  let swReg: ServiceWorkerRegistration | undefined;
  try {
    swReg =
      (await navigator.serviceWorker.getRegistration(FCM_SW_SCOPE)) ??
      (await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: FCM_SW_SCOPE }));
    await navigator.serviceWorker.ready;
  } catch (err) {
    console.error("[FCM] SW register:", err);
    return { ok: false, reason: "Không đăng ký được service worker" };
  }

  try {
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      return { ok: false, reason: "Firebase không trả về token — kiểm tra VAPID key" };
    }

    const saved = await saveFcmTokenToServer(token);
    if (!saved) {
      return { ok: false, reason: "Không lưu được token lên server (đăng nhập lại?)" };
    }

    onMessage(messaging, (payload) => {
      if (!payload.notification) return;
      const data = payload.data || {};
      const link = data.link || data.url || "/";
      const notif = new Notification(payload.notification.title ?? "Thông báo mới", {
        body: payload.notification.body ?? "",
        icon: "/icon-192.PNG",
        tag: data.chatId || data.groupId || data.type || "default",
        data: { link, type: data.type || "" },
      });
      notif.onclick = () => {
        window.focus();
        if (link.startsWith("/")) window.location.href = link;
        else if (link.startsWith("http")) window.location.href = link;
        notif.close();
      };
    });

    return { ok: true, token };
  } catch (err) {
    console.error("[FCM] getToken error:", err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Lỗi đăng ký FCM",
    };
  }
}

/** Xin quyền + đăng ký FCM trong một bước (gọi từ nút bấm) */
export async function enablePushNotifications(): Promise<{
  success: boolean;
  message: string;
}> {
  const perm = await requestBrowserPushPermission();
  if (perm.state !== "granted") {
    return { success: false, message: perm.message || "Chưa cấp quyền thông báo" };
  }

  const reg = await registerFcmToken();
  if (!reg.ok) {
    return { success: false, message: reg.reason };
  }

  return { success: true, message: "Đã bật thông báo đẩy" };
}
