"use client";

import { useEffect, useRef, useCallback } from "react";
import { registerFcmToken } from "@/lib/fcmRegister";
import { readPushPermission } from "@/lib/pushPermissions";

export default function FCMProvider({ userId }: { userId: string }) {
  const initialized = useRef(false);

  const initFCM = useCallback(async () => {
    if (!userId) return;
    if (readPushPermission() !== "granted") return;

    try {
      const result = await registerFcmToken();
      if (result.ok) {
        initialized.current = true;
        console.info("[FCM] Token đã đăng ký");
      } else {
        console.warn("[FCM]", result.reason);
      }
    } catch (error) {
      console.error("FCM init error:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    initFCM();

    const onReregister = () => {
      initialized.current = false;
      void initFCM();
    };
    window.addEventListener("fcm-reregister", onReregister);

    const onVisible = () => {
      if (document.visibilityState === "visible" && readPushPermission() === "granted") {
        void initFCM();
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
