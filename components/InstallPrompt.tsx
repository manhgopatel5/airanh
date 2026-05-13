"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FiShare, FiPlusSquare, FiX, FiDownload } from "react-icons/fi";
import { HiDevicePhoneMobile } from "react-icons/hi2";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "installPromptDismissed";
const DISMISS_DAYS = 7;

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ LOTTIE
  const phoneLottie = "/lotties/huha-celebrate-full.lottie";

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setShow(false);
      return;
    }

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed);
      const daysPassed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
      if (daysPassed < DISMISS_DAYS) return;
    }

    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);

    if (isIosDevice) {
      setIsIOS(true);
      timeoutRef.current = setTimeout(() => setShow(true), 3000);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };

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

    if (typeof window!== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "pwa_install_prompt_shown");
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShow(false);
      navigator.vibrate?.([10,20,10]);
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

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{y:100,opacity:0}} animate={{y:0,opacity:1}} exit={{y:100,opacity:0}} transition={{type:"spring",damping:25,stiffness:300}} className="fixed bottom-4 left-4 right-4 z-50">
          <div className="bg-white/95 dark:bg-zinc-950/95 backdrop-blur-2xl border border-zinc-200/50 dark:border-zinc-800 rounded-3xl shadow-2xl p-4">
            <button
              onClick={handleDismiss}
              className="absolute top-2.5 right-2.5 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
            >
              <FiX size={18} />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="relative w-12 h-12 shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] rounded-2xl blur-xl opacity-30" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-[#0042B2] to-[#1A5FFF] rounded-2xl flex items-center justify-center shadow-lg">
                  <DotLottieReact src={phoneLottie} autoplay loop style={{width:28,height:28}} />
                </div>
              </div>

              <div className="flex-1 space-y-2.5">
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Cài đặt ứng dụng
                </h3>

                {isIOS? (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-2.5">
                    <p>Thêm vào màn hình chính:</p>
                    <div className="flex items-center gap-2 text-xs bg-zinc-100 dark:bg-zinc-900 rounded-2xl px-3 py-2.5 border border-zinc-200 dark:border-zinc-800">
                      <FiShare size={14} className="text-[#0042B2]" />
                      <span>Chia sẻ</span>
                      <span>→</span>
                      <FiPlusSquare size={14} className="text-[#0042B2]" />
                      <span className="font-semibold">Thêm vào MH chính</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Truy cập nhanh, offline, nhận thông báo
                    </p>
                    <button
                      onClick={handleInstall}
                      className="w-full h-11 text-white font-bold text-sm rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg"
                      style={{background:'linear-gradient(135deg,#0042B2,#0066FF)',boxShadow:'0 8px 20px -6px rgba(0,66,178,0.5)'}}
                    >
                      <FiDownload size={18} />
                      Cài đặt ngay
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}