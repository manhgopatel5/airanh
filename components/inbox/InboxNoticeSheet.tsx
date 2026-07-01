"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, MapPin, X } from "lucide-react";
import { readPushPermission } from "@/lib/pushPermissions";
import { enablePushNotifications } from "@/lib/fcmRegister";
import { toast } from "sonner";

const DISMISS_KEY = "inbox-notice-dismissed";

type Props = {
  onDismissed: () => void;
};

export default function InboxNoticeSheet({ onDismissed }: Props) {
  const [open, setOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      setOpen(!dismissed);
    } catch {
      setOpen(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    onDismissed();
  }, [onDismissed]);

  const handleEnablePush = useCallback(async () => {
    const perm = readPushPermission();
    if (perm === "granted") {
      dismiss();
      return;
    }
    setRequesting(true);
    const result = await enablePushNotifications();
    setRequesting(false);
    if (result.success) toast.success(result.message);
    else toast.error(result.message);
    dismiss();
  }, [dismiss]);

  if (!open) return null;

  const pushState = readPushPermission();

  return (
    <div className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">Chào mừng đến Hộp thư</h2>
            <p className="text-sm text-zinc-500 mt-1">Bật thông báo và vị trí để trải nghiệm tốt hơn</p>
          </div>
          <button type="button" onClick={dismiss} className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Thông báo tin nhắn</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Nhận tin nhắn mới ngay cả khi không mở app. Chỉ hiện lời nhắc khi bạn chưa bật.
                </p>
                {pushState !== "granted" && (
                  <button
                    type="button"
                    disabled={requesting}
                    onClick={handleEnablePush}
                    className="mt-3 h-9 px-4 rounded-full bg-blue-500 text-white text-xs font-bold disabled:opacity-60"
                  >
                    {requesting ? "Đang xin quyền..." : "Bật thông báo"}
                  </button>
                )}
                {pushState === "granted" && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600">Đã bật thông báo</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Vị trí (GPS)</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Sau khi đóng bảng này, app sẽ hỏi quyền GPS để gợi ý sự kiện và bạn bè gần bạn.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 pt-0">
          <button
            type="button"
            onClick={dismiss}
            className="w-full h-12 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold"
          >
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}
