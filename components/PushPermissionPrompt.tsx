"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { requestFcmReregister } from "@/components/FCMProvider";

const DISMISS_KEY = "push-permission-prompt-dismissed-until";

type Props = {
  message?: string;
};

export default function PushPermissionPrompt({
  message = "Bật thông báo để nhận tin nhắn khi bạn không mở app",
}: Props) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported" | "loading">("loading");
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);

    if (Notification.permission === "granted") {
      requestFcmReregister();
    }

    try {
      const until = localStorage.getItem(DISMISS_KEY);
      if (until && Date.now() < Number(until)) {
        setDismissed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleEnable = useCallback(async () => {
    if (!("Notification" in window)) return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        requestFcmReregister();
      }
    } finally {
      setRequesting(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  if (permission === "loading" || permission === "unsupported" || permission === "granted" || dismissed) {
    return null;
  }

  if (permission === "denied") {
    return (
      <div className="shrink-0 px-3 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200/80 dark:border-amber-800/50">
        <p className="text-[13px] text-amber-900 dark:text-amber-100 leading-snug">
          Thông báo đã bị tắt. Vào cài đặt trình duyệt để bật lại push cho trang này.
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 px-3 py-2.5 bg-[#0a84ff]/10 dark:bg-[#0a84ff]/15 border-b border-[#0a84ff]/20">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#0a84ff] flex items-center justify-center shrink-0 mt-0.5">
          <Bell size={16} className="text-white" strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-zinc-900 dark:text-white leading-snug">{message}</p>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={handleEnable}
              disabled={requesting}
              className="px-3.5 py-1.5 rounded-full bg-[#0a84ff] text-white text-[13px] font-semibold active:scale-95 disabled:opacity-60 transition-transform"
            >
              {requesting ? "Đang xử lý..." : "Cho phép"}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-full text-[13px] font-medium text-zinc-600 dark:text-zinc-300 active:opacity-70"
            >
              Để sau
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 active:bg-black/5 dark:active:bg-white/10 shrink-0"
          aria-label="Đóng"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
