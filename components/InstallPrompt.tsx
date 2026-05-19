"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FiShare, FiPlusSquare, FiX, FiDownload } from "react-icons/fi";
import { HiDevicePhoneMobile } from "react-icons/hi2";

const DISMISS_KEY = "installPromptDismissed";
const DISMISS_DAYS = 7;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check standalone mỗi lần mount
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setShow(false);
      return;
    }

    // Check dismiss có hết hạn chưa
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysPassed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysPassed < DISMISS_DAYS) return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);

    // iOS: Hiện hướng dẫn thủ công
    if (isIosDevice) {
      setIsIOS(true);
      // Delay 3s cho UX, không hiện ngay khi vào app
      timeoutRef.current = setTimeout(() => setShow(true), 3000);
      return;
    }

    // Android: Dùng beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

    // Ẩn khi đã cài xong
    const handleAppInstalled = () => {
      setShow(false);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    // Analytics
    if (typeof window!== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "pwa_install_prompt_shown");
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    // Dismiss nếu user bấm Hủy
    if (outcome === "accepted") {
      setShow(false);
      if ((window as any).gtag) (window as any).gtag("event", "pwa_installed");
    } else {
      handleDismiss();
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200 dark:border-zinc-700 rounded-3xl shadow-2xl shadow-gray-900/10 dark:shadow-black/40 p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 transition-colors"
        >
          <FiX size={18} />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
            <HiDevicePhoneMobile size={24} className="text-white" />
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100">
              Cài đặt ứng dụng
            </h3>

            {isIOS? (
              <div className="text-sm text-gray-600 dark:text-zinc-400 space-y-2">
                <p>Thêm vào màn hình chính để dùng như app:</p>
                <div className="flex items-center gap-2 text-xs bg-gray-100 dark:bg-zinc-800 rounded-xl px-3 py-2">
                  <FiShare size={14} className="text-blue-500" />
                  <span>Nhấn</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Chia sẻ</span>
                  <span>→</span>
                  <FiPlusSquare size={14} className="text-blue-500" />
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Thêm vào MH chính</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  Nút Chia sẻ nằm ở dưới cùng Safari
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  Cài đặt để truy cập nhanh, dùng offline và nhận thông báo
                </p>
                <button
                  onClick={handleInstall}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-2.5 rounded-2xl font-semibold text-sm shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <FiDownload size={18} />
                  Cài đặt ngay
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}