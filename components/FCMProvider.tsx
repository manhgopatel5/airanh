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

        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
        if (!vapidKey) {
          console.error("Missing VAPID KEY");
          return;
        }

        const messaging = getMessaging(app);

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getToken(messaging, { vapidKey });
        if (!token) return;

        console.log("🔥 FCM TOKEN:", token);

        onMessage(messaging, (payload) => {
          console.log("📩 FCM foreground:", payload);

          if (payload.notification) {
            new Notification(
              payload.notification.title ?? "Notification",
              {
                // 🔥 FIX QUAN TRỌNG
                body: payload.notification.body ?? "",
              }
            );
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