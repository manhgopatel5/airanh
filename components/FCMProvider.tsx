"use client";

import { useEffect } from "react";
import { app } from "@/lib/firebase";

export default function FCMProvider({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      try {
        if (typeof window === "undefined") return;

        const messagingModule = await import("firebase/messaging");
        const { getMessaging, getToken, isSupported, onMessage } = messagingModule;

        const supported = await isSupported();
        if (!supported) return;

        // 🔐 check VAPID KEY (fix lỗi TypeScript + tránh crash runtime)
        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
        if (!vapidKey) {
          console.error("❌ Missing NEXT_PUBLIC_FCM_VAPID_KEY");
          return;
        }

        const messaging = getMessaging(app);

        // 🔔 xin quyền notification
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // 🔑 lấy token
        const token = await getToken(messaging, {
          vapidKey,
        });

        if (!token) return;

        console.log("🔥 FCM TOKEN:", token);

        // 🔔 nhận notification khi đang mở app
        onMessage(messaging, (payload) => {
          console.log("📩 FCM foreground:", payload);

          if (payload.notification) {
            new Notification(payload.notification.title ?? "Notification", {
              body: payload.notification.body ?? "",
            });
          }
        });

      } catch (err) {
        console.error("FCM error:", err);
      }
    };

    init();
  }, [userId]);

  return null;
}