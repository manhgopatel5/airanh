"use client";

import { useEffect, useRef, useCallback } from "react";
import { getFirebaseApp } from "@/lib/firebase";
import { saveFcmTokenToServer } from "@/lib/fcmClient";

async function registerFcmToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (Notification.permission !== "granted") return false;

  const { getMessaging, getToken, isSupported, onMessage } = await import("firebase/messaging");
  const supported = await isSupported();
  if (!supported) {
    console.warn("[FCM] Trình duyệt không hỗ trợ push");
    return false;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY?.trim();
  if (!vapidKey) {
    console.warn("[FCM] Thiếu NEXT_PUBLIC_FIREBASE_VAPID_KEY");
    return false;
  }

  let swReg: ServiceWorkerRegistration | undefined;
  if ("serviceWorker" in navigator) {
    try {
      swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      await navigator.serviceWorker.ready;
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
  if (!token) {
    console.warn("[FCM] Không lấy được token");
    return false;
  }

  const saved = await saveFcmTokenToServer(token);
  if (!saved) return false;

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

    initFCM();

    const onReregister = () => {
      initialized.current = false;
      initFCM();
    };
    window.addEventListener("fcm-reregister", onReregister);

    const onVisible = () => {
      if (document.visibilityState === "visible" && Notification.permission === "granted") {
        initFCM();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("fcm-reregister", onReregister);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId, initFCM]);

  return null;
}

export function requestFcmReregister() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fcm-reregister"));
  }
}
