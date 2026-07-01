"use client";

import { getFirebaseApp } from "@/lib/firebase";
import { saveFcmTokenToServer } from "@/lib/fcmClient";
import { requestBrowserPushPermission, readPushPermission } from "@/lib/pushPermissions";

export type FcmRegisterResult =
  | { ok: true; token: string }
  | { ok: false; reason: string };

let onMessageBound = false;

async function getFcmServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registrations = await navigator.serviceWorker.getRegistrations();

  for (const reg of registrations) {
    const script = reg.active?.scriptURL || reg.installing?.scriptURL || "";
    if (script.includes("firebase-messaging-sw")) {
      return reg;
    }
  }

  // Gỡ workbox sw.js cũ nếu chiếm scope / — gây xung đột FCM
  for (const reg of registrations) {
    const script = reg.active?.scriptURL || "";
    if (script.includes("/sw.js") && !script.includes("firebase-messaging")) {
      await reg.unregister();
    }
  }

  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;
  return reg;
}

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
    return { ok: false, reason: "Thiếu cấu hình VAPID (NEXT_PUBLIC_FIREBASE_VAPID_KEY)" };
  }

  if (!("serviceWorker" in navigator)) {
    return { ok: false, reason: "Trình duyệt không hỗ trợ service worker" };
  }

  let swReg: ServiceWorkerRegistration;
  try {
    swReg = await getFcmServiceWorker();
  } catch (err) {
    console.error("[FCM] SW register:", err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Không đăng ký được service worker",
    };
  }

  try {
    const app = getFirebaseApp();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      return { ok: false, reason: "Firebase không trả về token — kiểm tra VAPID key trên Vercel" };
    }

    const saved = await saveFcmTokenToServer(token);
    if (!saved) {
      return { ok: false, reason: "Không lưu được token lên server — thử đăng xuất và đăng nhập lại" };
    }

    if (!onMessageBound) {
      onMessageBound = true;
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
    }

    return { ok: true, token };
  } catch (err) {
    console.error("[FCM] getToken error:", err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Lỗi đăng ký FCM",
    };
  }
}

export type EnablePushStep = "permission" | "fcm" | "done";

/** Xin quyền (ngay lập tức) + đăng ký FCM */
export async function enablePushNotifications(): Promise<{
  success: boolean;
  message: string;
  step?: EnablePushStep;
  tokenPreview?: string;
}> {
  const perm = await requestBrowserPushPermission();
  if (perm.state !== "granted") {
    return { success: false, message: perm.message || "Chưa cấp quyền thông báo", step: "permission" };
  }

  const reg = await registerFcmToken();
  if (!reg.ok) {
    return { success: false, message: reg.reason, step: "fcm" };
  }

  return {
    success: true,
    message: "Đã bật thông báo đẩy thành công",
    step: "done",
    tokenPreview: `${reg.token.slice(0, 12)}…`,
  };
}

/** Kiểm tra trạng thái push hiện tại */
export async function getPushStatus(): Promise<{
  permission: string;
  fcmSupported: boolean;
  hasToken: boolean;
  tokenPreview?: string;
}> {
  const permission = readPushPermission();
  let fcmSupported = false;
  if (typeof window !== "undefined") {
    try {
      const { isSupported } = await import("firebase/messaging");
      fcmSupported = await isSupported();
    } catch {
      fcmSupported = false;
    }
  }

  let hasToken = false;
  let tokenPreview: string | undefined;
  if (permission === "granted" && fcmSupported) {
    const reg = await registerFcmToken();
    if (reg.ok) {
      hasToken = true;
      tokenPreview = `${reg.token.slice(0, 12)}…`;
    }
  }

  return {
    permission,
    fcmSupported,
    hasToken,
    ...(tokenPreview ? { tokenPreview } : {}),
  };
}
