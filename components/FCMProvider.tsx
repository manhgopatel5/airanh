"use client";

import { useEffect, useRef } from "react";
import { getFirebaseApp } from "@/lib/firebase";

export default function FCMProvider({ userId }: { userId: string }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId || initialized.current) return;
    if (typeof window === "undefined") return;

    // 1. CHỈ CHẠY KHI BROWSER IDLE - Không chặn TTI
    const onIdle = (cb: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(cb, { timeout: 2000 });
      } else {
        setTimeout(cb, 2000); // Fallback Safari
      }
    };

    const initFCM = async () => {
      try {
        // 2. Check permission trước. Nếu user chặn rồi thì khỏi load lib
        if (Notification.permission === 'denied') return;

        // 3. Dynamic import chỉ khi cần. Giảm 120kb bundle đầu
        const { getMessaging, getToken, isSupported, onMessage } = await import("firebase/messaging");

        const supported = await isSupported();
        if (!supported) return;

        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) return;

        const app = getFirebaseApp();
        const messaging = getMessaging(app);

        // 4. Không tự xin permission. Để user bấm nút "Bật thông báo" rồi mới gọi
        if (Notification.permission!== "granted") return;

        const token = await getToken(messaging, { vapidKey });
        if (!token) return;

        // 5. Gửi token lên server. Dùng fetch, không import db
        await fetch('/api/user/fcm-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token }),
          keepalive: true,
        });

        initialized.current = true;

        // 6. Lắng nghe foreground message
        onMessage(messaging, (payload) => {
          if (!payload.notification) return;
          const data = payload.data || {};
          const type = data.type || "";
          const link = data.link || data.url || "/";
          const notif = new Notification(payload.notification.title ?? "Thông báo mới", {
            body: payload.notification.body ?? "",
            icon: '/icon-192x192.png',
            tag: data.chatId || type || "default",
            data: { link, type },
          });
          notif.onclick = () => {
            window.focus();
            if (link.startsWith("/")) window.location.href = link;
            notif.close();
          };
        });

      } catch (error) {
        // Im lặng. FCM lỗi không được crash app
        console.error("FCM init error:", error);
      }
    };

    // Chạy sau khi app rảnh 2s
    onIdle(initFCM);
  }, [userId]);

  return null;
}