"use client";

import { useRouter, usePathname } from "next/navigation";
import { HiPlus } from "react-icons/hi2";
import { useEffect, useTransition, useCallback, useMemo } from "react";
import { useAppStore } from "@/store/app";
import LottiePlayer from "@/components/ui/LottiePlayer";
import idle from "@/public/lotties/huha-idle.json";
import searching from "@/public/lotties/huha-searching.json";
import taskLottie from "@/public/lotties/huha-task.json";
import walletOpen from "@/public/lotties/huha-wallet-open.json";
import celebrate from "@/public/lotties/huha-celebrate.json";

type NavItem = {
  path: string;
  label: string;
  lottie: any;
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";

  // Prefetch routes
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
    { path: "/", label: "Trang chủ", lottie: idle },
    { path: "/messages", label: "Tin nhắn", lottie: searching },
  ], []);

  const rightItems: NavItem[] = useMemo(() => [
    { path: "/tasks", label: "Nhiệm vụ", lottie: taskLottie },
    { path: "/profile", label: "Hồ sơ", lottie: walletOpen },
  ], []);

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

    return (
      <button
        onClick={() => handleNav(item.path)}
        onMouseEnter={() => router.prefetch(item.path)}
        aria-current={active? "page" : undefined}
        className="relative flex flex-col items-center justify-center flex-1 h-[64px] active:scale-95 transition-transform duration-150 will-change-transform min-w-0"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {/* Active pill */}
        <div
          className={`absolute inset-2 rounded-2xl transition-all duration-300 ${
            active? `${activeBg} scale-100 opacity-100` : "scale-90 opacity-0"
          }`}
        />

        <div className="relative z-10 flex flex-col items-center">
          <div className={`w-7 h-7 -mb-0.5 transition-transform duration-300 ${active? "scale-110" : "scale-100"}`}>
            <LottiePlayer
              animationData={item.lottie}
              autoplay={active}
              loop={active}
              className="w-7 h-7"
            />
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

              {/* FAB Center */}
              <div className="relative w-[72px] flex justify-center">
                <button
                  onClick={() => handleNav(fabHref)}
                  onMouseEnter={() => router.prefetch(fabHref)}
                  aria-label="Tạo mới"
                  className="relative -mt-6 group active:scale-95 transition-transform duration-150"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <div className={`w-[56px] h-[56px] rounded-full bg-gradient-to-br ${fabGradient} flex items-center justify-center shadow-lg ring-4 ring-white dark:ring-zinc-900 transition-all group-hover:shadow-xl`}>
                    {/* Lottie celebrate - luôn play nhẹ */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <LottiePlayer
                        animationData={celebrate}
                        autoplay
                        loop
                        className="w-14 h-14"
                      />
                    </div>
                    <HiPlus className="text-white relative z-10 transition-transform group-hover:rotate-90" size={26} strokeWidth={2.5} />
                  </div>
                </button>
              </div>

              {rightItems.map((it) => <NavButton key={it.path} item={it} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Reduce motion */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
         .lottie-player { animation: none!important; }
        }
      `}</style>
    </div>
  );
}