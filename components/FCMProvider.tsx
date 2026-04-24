"use client";

import { useEffect } from "react";

export default function FCMProvider({ userId }: { userId: string }) {
  useEffect(() => {
    const init = async () => {
      if (typeof window === "undefined") return;

      const messagingModule = await import("firebase/messaging");
      const { getMessaging, getToken, isSupported } = messagingModule;

      const supported = await isSupported();
      if (!supported) return;

      const messaging = getMessaging();

      await Notification.requestPermission();

      await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
      });
    };

    init();
  }, [userId]);

  return null;
}