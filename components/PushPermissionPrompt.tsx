"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, X, Smartphone } from "lucide-react";
import { requestFcmReregister } from "@/components/FCMProvider";

const DISMISS_KEY = "push-permission-prompt-dismissed-until";

function readPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "default";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function isDismissed(): boolean {
  try {
    const until = sessionStorage.getItem(DISMISS_KEY) || localStorage.getItem(DISMISS_KEY);
    return !!(until && Date.now() < Number(until));
  } catch {
    return false;
  }
}

type Props = {
  message?: string;
  /** fixed = luôn nổi trên cùng, không bị che bởi layout chat */
  variant?: "inline" | "fixed";
};

export default function PushPermissionPrompt({
  message = "Bật thông báo để nhận tin nhắn khi bạn không mở app",
  variant = "inline",
}: Props) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(readPermission);
  const [dismissed, setDismissed] = useState(isDismissed);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const current = readPermission();
    setPermission(current);
    if (current === "granted") {
      requestFcmReregister();
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
      const until = String(Date.now() + 6 * 60 * 60 * 1000);
      sessionStorage.setItem(DISMISS_KEY, until);
      localStorage.setItem(DISMISS_KEY, until);
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  if (dismissed) return null;

  const shellClass =
    variant === "fixed"
      ? "fixed left-0 right-0 z-[200] mx-auto max-w-2xl px-3"
      : "shrink-0 w-full";

  const innerStyle =
    variant === "fixed"
      ? { top: "max(8px, env(safe-area-inset-top))" }
      : undefined;

  if (permission === "unsupported") {
    return (
      <div className={shellClass} style={innerStyle}>
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/50 px-3.5 py-3 shadow-lg shadow-black/5">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
              <Smartphone size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-violet-950 dark:text-violet-100 leading-snug">
                Để nhận push trên iPhone: Thêm trang vào Màn hình chính (Share → Add to Home Screen), mở app từ icon đó rồi bật thông báo.
              </p>
              <button
                type="button"
                onClick={handleDismiss}
                className="mt-2 text-[12px] font-medium text-violet-700 dark:text-violet-300"
              >
                Đã hiểu
              </button>
            </div>
            <button type="button" onClick={handleDismiss} className="text-violet-500 p-1" aria-label="Đóng">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (permission === "granted") return null;

  if (permission === "denied") {
    return (
      <div className={shellClass} style={innerStyle}>
        <div className="relative rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/40 px-3.5 py-3 shadow-lg shadow-black/5">
          <p className="text-[13px] text-amber-900 dark:text-amber-100 leading-snug pr-6">
            Thông báo đã bị chặn. Vào cài đặt trình duyệt → Quyền → Thông báo → cho phép trang này.
          </p>
          <button type="button" onClick={handleDismiss} className="absolute top-2 right-2 text-amber-600 p-1" aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass} style={innerStyle}>
      <div className="rounded-2xl border border-[#0a84ff]/30 bg-[#0a84ff] px-3.5 py-3 shadow-lg shadow-[#0a84ff]/25">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
            <Bell size={16} className="text-white" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white leading-snug">{message}</p>
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={handleEnable}
                disabled={requesting}
                className="px-4 py-2 rounded-full bg-white text-[#0a84ff] text-[13px] font-bold active:scale-95 disabled:opacity-60 transition-transform"
              >
                {requesting ? "Đang xử lý..." : "Cho phép thông báo"}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="px-3 py-2 rounded-full text-[13px] font-medium text-white/85 active:opacity-70"
              >
                Để sau
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center text-white/80 active:bg-white/10 shrink-0"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hiện banner cố định trên mọi màn chat khi user đã đăng nhập */
export function ChatPushPermissionBanner() {
  return (
    <PushPermissionPrompt variant="fixed" />
  );
}
