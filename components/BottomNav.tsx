// components/BottomNav.tsx
"use client";

import { HiPlus } from "react-icons/hi2";
import { useRouter, usePathname } from "next/navigation";

import { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import { useAppStore } from "@/store/app";
// XÓA dòng này: import { useAuthStore } from "@/store/auth";
import LottiePlayer from "@/components/ui/LottiePlayer";

type NavItem = {
  path: string;
  label: string;
  lottieFile: string;
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const mode = useAppStore((s) => s.mode);
  // XÓA: const user = useAuthStore((s) => s.user);
  const isPlan = mode === "plan";

  // Lottie states
  const [idleLottie, setIdleLottie] = useState<any>(null);
  const [searchingLottie, setSearchingLottie] = useState<any>(null);
  const [taskLottie, setTaskLottie] = useState<any>(null);
  const [walletOpenLottie, setWalletOpenLottie] = useState<any>(null);
  const [celebrateLottie, setCelebrateLottie] = useState<any>(null);

  useEffect(() => {
    fetch('/lotties/huha-idle.json').then(r => r.json()).then(setIdleLottie).catch(() => {});
    fetch('/lotties/huha-searching.json').then(r => r.json()).then(setSearchingLottie).catch(() => {});
    fetch('/lotties/huha-task.json').then(r => r.json()).then(setTaskLottie).catch(() => {});
    fetch('/lotties/huha-wallet-open.json').then(r => r.json()).then(setWalletOpenLottie).catch(() => {});
    fetch('/lotties/huha-celebrate.json').then(r => r.json()).then(setCelebrateLottie).catch(() => {});
  }, []);

  useEffect(() => {
    ["/", "/messages", "/tasks", "/profile", "/create", "/create/plan", "/create/task"].forEach(
      (p) => router.prefetch(p)
    );
  }, [router]);

  const handleNav = useCallback((path: string) => {
    if (pathname === path) return;
    if ("vibrate" in navigator) navigator.vibrate(8);
    startTransition(() => router.push(path));
  }, [pathname, router]);

  const isActive = useCallback((path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }, [pathname]);

  const items: NavItem[] = useMemo(() => [
    { path: "/", label: "Trang chủ", lottieFile: "idle" },
    { path: "/messages", label: "Tin nhắn", lottieFile: "searching" },
  ], []);

  const rightItems: NavItem[] = useMemo(() => [
    { path: "/tasks", label: "Nhiệm vụ", lottieFile: "task" },
    { path: "/profile", label: "Hồ sơ", lottieFile: "wallet" },
  ], []);

  const getLottieData = (key: string) => {
    switch(key) {
      case "idle": return idleLottie;
      case "searching": return searchingLottie;
      case "task": return taskLottie;
      case "wallet": return walletOpenLottie;
      default: return null;
    }
  };

  const activeBg = isPlan
  ? "bg-green-500/10 dark:bg-green-500/20"
    : "bg-sky-500/10 dark:bg-sky-500/20";
  const activeText = isPlan
  ? "text-green-600 dark:text-green-400"
    : "text-sky-600 dark:text-sky-400";
  const fabGradient = isPlan
  ? "from-green-500 to-emerald-500 shadow-green-500/25"
    : "from-sky-500 to-blue-600 shadow-sky-500/25";
  const fabHref = isPlan? "/create/plan" : "/create/task";

  const NavButton = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    const lottieData = getLottieData(item.lottieFile);

    return (
      <button
        onClick={() => handleNav(item.path)}
        onMouseEnter={() => router.prefetch(item.path)}
        aria-current={active? "page" : undefined}
        className="relative flex flex-col items-center justify-center flex-1 h-[64px] active:scale-95 transition-transform duration-150 will-change-transform min-w-0"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div
          className={`absolute inset-2 rounded-2xl transition-all duration-300 ${
            active? `${activeBg} scale-100 opacity-100` : "scale-90 opacity-0"
          }`}
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-7 h-7 -mb-0.5 transition-transform duration-300 ${active? "scale-110" : "scale-100"}`}>
            {lottieData? (
              <LottiePlayer
                animationData={lottieData}
                autoplay={active}
                loop={active}
                className="w-7 h-7"
              />
            ) : (
              <div className="w-7 h-7 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
            )}
          </div>
          <span
            className={`text-[11px] font-semibold tracking-tight transition-colors ${
              active? activeText : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {item.label}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="pb-safe px-safe pointer-events-auto">
        <div className="mx-3 mb-3">
          <div className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-zinc-200/70 dark:border-zinc-800 rounded-[28px] shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)]">
            <div className="flex items-center h-[68px] px-1.5">
              {items.map((it) => <NavButton key={it.path} item={it} />)}

              <div className="relative w-[72px] flex justify-center">
                <button
                  onClick={() => handleNav(fabHref)}
                  onMouseEnter={() => router.prefetch(fabHref)}
                  aria-label="Tạo mới"
                  className="relative -mt-6 group active:scale-95 transition-transform duration-150"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className={`w-[56px] h-[56px] rounded-full bg-gradient-to-br ${fabGradient} flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-zinc-900 transition-all group-hover:shadow-xl`}>
                    {celebrateLottie && (
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <LottiePlayer
                          animationData={celebrateLottie}
                          autoplay
                          loop
                          className="w-14 h-14"
                        />
                      </div>
                    )}
                    <HiPlus className="text-white relative z-10 transition-transform group-hover:rotate-90" size={26} strokeWidth={2.5} />
                  </div>
                </button>
              </div>

              {rightItems.map((it) => <NavButton key={it.path} item={it} />)}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
       .lottie-player { animation: none!important; }
        }
      `}</style>
    </div>
  );
}