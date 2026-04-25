"use client";

import { useEffect } from "react";
import { getFirebaseApp } from "@/lib/firebase";

export default function FCMProvider({ userId }: { userId: string }) {
  useEffect(() => {
    if (!userId) return;

    const initFCM = async () => {
      try {
        if (typeof window === "undefined") return;

        // 🔥 import dynamic để tránh SSR crash
        const messagingModule = await import("firebase/messaging");
        const {
          getMessaging,
          getToken,
          isSupported,
          onMessage,
        } = messagingModule;

        // ✅ check browser support
        const supported = await isSupported();
        if (!supported) {
          console.warn("⚠️ FCM not supported in this browser");
          return;
        }

        // ✅ FIX TÊN ENV (chuẩn theo Vercel của mày)
        const vapidKey =
          process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
          process.env.NEXT_PUBLIC_FCM_VAPID_KEY;

        if (!vapidKey) {
          console.error("❌ Missing VAPID KEY (ENV not found)");
          return;
        }

        console.log("✅ VAPID KEY loaded");

        const app = getFirebaseApp();
        const messaging = getMessaging(app);

        // ✅ xin quyền notification
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.warn("❌ Notification permission denied");
          return;
        }

        // ✅ lấy token
        const token = await getToken(messaging, { vapidKey });

        if (!token) {
          console.warn("❌ No FCM token returned");
          return;
        }

        console.log("🔥 FCM TOKEN:", token);

        // 👉 TODO: gửi token lên Firestore nếu cần
        // await saveTokenToUser(userId, token);

        // ✅ nhận message foreground
        onMessage(messaging, (payload) => {
          console.log("📩 FCM foreground:", payload);

          if (payload.notification) {
            new Notification(
              payload.notification.title ?? "Notification",
              {
                body: payload.notification.body ?? "",
              }
            );
          }
        });

      } catch (error) {
        console.error("❌ FCM init error:", error);
      }
    };

    initFCM();
  }, [userId]);

  return null;
}
