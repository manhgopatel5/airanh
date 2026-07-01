"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
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
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusOk, setStatusOk] = useState<boolean | null>(null);

  useEffect(() => {
    setDismissed(isDismissed());
    const current = readPushPermission();
    setPermission(current);
    if (current === "granted") {
      requestFcmReregister();
    }
  }, []);

  const handleEnable = useCallback(() => {
    setRequesting(true);
    setStatusMsg("Đang xin quyền thông báo…");
    setStatusOk(null);

    // Gọi enablePushNotifications — requestPermission chạy ngay bên trong, không await trước
    void enablePushNotifications().then((result) => {
      const next = readPushPermission();
      setPermission(next);
      setRequesting(false);
      setStatusOk(result.success);
      setStatusMsg(result.message);

      if (result.success) {
        toast.success(result.message);
        requestFcmReregister();
        setTimeout(() => setDismissed(true), 2500);
      } else {
        toast.error(result.message, { duration: 8000 });
      }
    });
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

  if (dismissed && permission === "granted") return null;
  if (dismissed && permission !== "granted" && !statusMsg) return null;

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
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-3.5 py-3 shadow-lg">
          <p className="text-[13px] font-medium text-violet-950 leading-snug">
            iPhone: Share → <b>Thêm vào Màn hình chính</b> → mở app từ icon → bấm Cho phép.
          </p>
          <button type="button" onClick={handleDismiss} className="mt-2 text-[12px] font-medium text-violet-700">
            Đã hiểu
          </button>
        </div>
      </div>
    );
  }

  if (permission === "unsupported") {
    return (
      <div className={shellClass} style={innerStyle}>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 shadow-lg">
          <p className="text-[13px] text-zinc-800">Trình duyệt không hỗ trợ push. Dùng Chrome Android hoặc PWA trên iPhone.</p>
        </div>
      </div>
    );
  }

  if (permission === "denied") {
    return (
      <div className={shellClass} style={innerStyle}>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 shadow-lg">
          <p className="text-[13px] text-amber-900 pr-6">
            Thông báo bị chặn. Vào cài đặt trình duyệt → Thông báo → cho phép <b>airanh.vercel.app</b>.
          </p>
          <button type="button" onClick={handleDismiss} className="mt-2 text-[12px] text-amber-700">
            Đóng
          </button>
        </div>
      </div>
    );
  }

  if (permission === "granted" && statusOk) {
    return (
      <div className={shellClass} style={innerStyle}>
        <div className="rounded-2xl border border-green-200 bg-green-50 px-3.5 py-3 shadow-lg flex items-center gap-2">
          <CheckCircle2 size={18} className="text-green-600 shrink-0" />
          <p className="text-[13px] text-green-900 font-medium">{statusMsg || "Đã bật thông báo đẩy"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass} style={innerStyle}>
      <div className="rounded-2xl border border-[#0a84ff]/30 bg-[#0a84ff] px-3.5 py-3 shadow-lg">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            {requesting ? (
              <Loader2 size={16} className="text-white animate-spin" />
            ) : (
              <Bell size={16} className="text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white leading-snug">{message}</p>

            {statusMsg && (
              <div
                className={`mt-2 flex items-start gap-1.5 text-[12px] leading-snug rounded-lg px-2.5 py-2 ${
                  statusOk === true
                    ? "bg-white/20 text-white"
                    : statusOk === false
                      ? "bg-red-500/30 text-white"
                      : "bg-white/15 text-white/90"
                }`}
              >
                {statusOk === false && <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                {statusOk === true && <CheckCircle2 size={14} className="shrink-0 mt-0.5" />}
                <span>{statusMsg}</span>
              </div>
            )}

            {!requesting && statusOk !== true && (
              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={handleEnable}
                  className="px-4 py-2 rounded-full bg-white text-[#0a84ff] text-[13px] font-bold active:scale-95"
                >
                  Cho phép thông báo
                </button>
                <button type="button" onClick={handleDismiss} className="px-3 py-2 text-[13px] text-white/85">
                  Để sau
                </button>
              </div>
            )}
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
