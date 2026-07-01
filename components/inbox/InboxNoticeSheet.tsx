"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, MapPin, Loader2 } from "lucide-react";
import { readPushPermission } from "@/lib/pushPermissions";
import { enablePushNotifications } from "@/lib/fcmRegister";
import { useAppStore } from "@/store/app";

const DISMISS_KEY = "inbox-notice-dismissed";

type Props = {
  onDismissed: (location?: { lat: number; lng: number }) => void;
};

async function requestPushPermission(): Promise<void> {
  const perm = readPushPermission();
  if (perm === "granted" || perm === "denied" || perm === "unsupported" || perm === "ios-install") {
    return;
  }
  try {
    await enablePushNotifications();
  } catch {
    /* browser may block — continue to GPS */
  }
}

function requestGpsPermission(): Promise<{ lat: number; lng: number } | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined);
      return;
    }

    const savedLat = localStorage.getItem("userLat");
    const savedLng = localStorage.getItem("userLng");
    if (savedLat && savedLng) {
      resolve({ lat: Number(savedLat), lng: Number(savedLng) });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        localStorage.setItem("userLat", String(lat));
        localStorage.setItem("userLng", String(lng));
        resolve({ lat, lng });
      },
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 }
    );
  });
}

export default function InboxNoticeSheet({ onDismissed }: Props) {
  const setHideTabBar = useAppStore((s) => s.setHideTabBar);
  const [open, setOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      setOpen(!dismissed);
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    setHideTabBar(open);
    return () => setHideTabBar(false);
  }, [open, setHideTabBar]);

  const finish = useCallback(
    async (location?: { lat: number; lng: number }) => {
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
      setOpen(false);
      onDismissed(location);
    },
    [onDismissed]
  );

  const handleComplete = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRequesting(true);

    await requestPushPermission();
    const location = await requestGpsPermission();

    setRequesting(false);
    await finish(location);
    busyRef.current = false;
  }, [finish]);

  if (!open) return null;

  const pushState = readPushPermission();
  const pushGranted = pushState === "granted";
  const hasGps = !!(localStorage.getItem("userLat") && localStorage.getItem("userLng"));

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={() => void handleComplete()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inbox-welcome-title"
    >
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 text-center">
          <h2 id="inbox-welcome-title" className="text-lg font-black text-zinc-900 dark:text-white">
            Chào mừng đến Hộp thư
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Cho phép thông báo và vị trí để trải nghiệm tốt hơn
          </p>
        </div>

        <div className="p-5 space-y-3">
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Thông báo tin nhắn</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Nhận tin nhắn mới ngay cả khi không mở app.
                </p>
                {pushGranted && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600">Đã bật thông báo</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-white">Vị trí (GPS)</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                  Gợi ý sự kiện và bạn bè gần bạn. Chỉ dùng để tính khoảng cách.
                </p>
                {hasGps && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600">Đã có vị trí</p>
                )}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-center text-zinc-400 px-2">
            Bấm bất kỳ đâu hoặc nút bên dưới để cấp quyền
          </p>
        </div>

        <div className="p-5 pt-0 space-y-2">
          <button
            type="button"
            disabled={requesting}
            onClick={() => void handleComplete()}
            className="w-full h-12 rounded-2xl bg-blue-500 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-70 active:scale-[0.98] transition-transform"
          >
            {requesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang xin quyền...
              </>
            ) : (
              "Cho phép & Tiếp tục"
            )}
          </button>
          <button
            type="button"
            disabled={requesting}
            onClick={(e) => {
              e.stopPropagation();
              void finish();
            }}
            className="w-full h-10 rounded-2xl text-sm font-semibold text-zinc-500 active:scale-[0.98] transition-transform"
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
}
