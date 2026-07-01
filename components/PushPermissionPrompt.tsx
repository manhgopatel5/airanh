"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, X, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { enablePushNotifications } from "@/lib/fcmRegister";
import { requestFcmReregister } from "@/components/FCMProvider";
import {
  readPushPermission,
  type PushPermissionState,
} from "@/lib/pushPermissions";

const DISMISS_KEY = "push-permission-prompt-dismissed-until";

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
  variant?: "inline" | "fixed";
};

export default function PushPermissionPrompt({
  message = "Bật thông báo để nhận tin nhắn khi bạn không mở app",
  variant = "inline",
}: Props) {
  const [permission, setPermission] = useState<PushPermissionState>(() =>
    typeof window === "undefined" ? "default" : readPushPermission()
  );
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    setDismissed(isDismissed());
    const current = readPushPermission();
    setPermission(current);
    if (current === "granted") {
      requestFcmReregister();
    }
  }, []);

  const handleEnable = useCallback(async () => {
    setRequesting(true);
    try {
      const result = await enablePushNotifications();
      const next = readPushPermission();
      setPermission(next);
      if (result.success) {
        toast.success(result.message);
        requestFcmReregister();
      } else {
        toast.error(result.message, { duration: 5000 });
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
      ? "fixed left-0 right-0 z-[250] mx-auto max-w-2xl px-3 pointer-events-auto"
      : "shrink-0 w-full";

  const innerStyle =
    variant === "fixed"
      ? { top: "max(8px, env(safe-area-inset-top))" }
      : undefined;

  if (permission === "ios-install") {
    return (
      <div className={shellClass} style={innerStyle}>
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800/60 bg-violet-50 dark:bg-violet-950/50 px-3.5 py-3 shadow-lg shadow-black/5">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
              <Smartphone size={16} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-violet-950 dark:text-violet-100 leading-snug">
                iPhone: bấm Share → <b>Thêm vào Màn hình chính</b>, mở app từ icon đó, rồi bấm Cho phép thông báo.
              </p>
              <button type="button" onClick={handleDismiss} className="mt-2 text-[12px] font-medium text-violet-700">
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

  if (permission === "unsupported") {
    return (
      <div className={shellClass} style={innerStyle}>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 shadow-lg">
          <p className="text-[13px] text-zinc-800 leading-snug">
            Trình duyệt này không hỗ trợ push. Dùng Chrome trên Android hoặc cài app PWA trên iPhone.
          </p>
        </div>
      </div>
    );
  }

  if (permission === "granted") return null;

  if (permission === "denied") {
    return (
      <div className={shellClass} style={innerStyle}>
        <div className="relative rounded-2xl border border-amber-200/80 bg-amber-50 px-3.5 py-3 shadow-lg">
          <p className="text-[13px] text-amber-900 leading-snug pr-6">
            Thông báo bị chặn. Vào cài đặt trình duyệt → Quyền / Thông báo → cho phép trang <b>airanh.vercel.app</b>.
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
                className="px-4 py-2 rounded-full bg-white text-[#0a84ff] text-[13px] font-bold active:scale-95 disabled:opacity-60"
              >
                {requesting ? "Đang xử lý..." : "Cho phép thông báo"}
              </button>
              <button type="button" onClick={handleDismiss} className="px-3 py-2 text-[13px] font-medium text-white/85">
                Để sau
              </button>
            </div>
          </div>
          <button type="button" onClick={handleDismiss} className="text-white/80 p-1" aria-label="Đóng">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ChatPushPermissionBanner() {
  return <PushPermissionPrompt variant="fixed" />;
}
