"use client";

import { useEffect, useRef, useCallback } from "react";
import { getFirebaseApp } from "@/lib/firebase";

async function registerFcmToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (Notification.permission !== "granted") return false;

  const { getMessaging, getToken, isSupported, onMessage } = await import("firebase/messaging");
  const supported = await isSupported();
  if (!supported) return false;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    console.warn("[FCM] Thiếu NEXT_PUBLIC_FIREBASE_VAPID_KEY — không đăng ký được push token");
    return false;
  }

  let swReg: ServiceWorkerRegistration | undefined;
  if ("serviceWorker" in navigator) {
    try {
      swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    } catch {
      swReg = await navigator.serviceWorker.ready;
    }
  }

  const app = getFirebaseApp();
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    ...(swReg ? { serviceWorkerRegistration: swReg } : {}),
  });
  if (!token) return false;

  await fetch("/api/user/fcm-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ token }),
    keepalive: true,
  });

  onMessage(messaging, (payload) => {
    if (!payload.notification) return;
    const data = payload.data || {};
    const link = data.link || data.url || "/";
    const notif = new Notification(payload.notification.title ?? "Thông báo mới", {
      body: payload.notification.body ?? "",
      icon: "/icon-192x192.png",
      tag: data.chatId || data.groupId || data.type || "default",
      data: { link, type: data.type || "" },
    });
    notif.onclick = () => {
      window.focus();
      if (link.startsWith("/")) window.location.href = link;
      notif.close();
    };
  });

  return true;
}

export default function FCMProvider({ userId }: { userId: string }) {
  const initialized = useRef(false);

  const initFCM = useCallback(async () => {
    if (!userId) return;
    if (Notification.permission === "denied") return;
    if (Notification.permission !== "granted") return;

    try {
      const ok = await registerFcmToken();
      if (ok) initialized.current = true;
    } catch (error) {
      console.error("FCM init error:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const onIdle = (cb: () => void) => {
      if ("requestIdleCallback" in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => void }).requestIdleCallback(cb, { timeout: 2000 });
      } else {
        setTimeout(cb, 2000);
      }
    };

    onIdle(() => initFCM());

    const onReregister = () => {
      initialized.current = false;
      initFCM();
    };
    window.addEventListener("fcm-reregister", onReregister);

    return () => window.removeEventListener("fcm-reregister", onReregister);
  }, [userId, initFCM]);

  return null;
}

/** Gọi sau khi user cấp quyền thông báo trong settings */
export function requestFcmReregister() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fcm-reregister"));
  }
}
