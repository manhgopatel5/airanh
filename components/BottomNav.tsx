"use client";

import { useRouter, usePathname } from "next/navigation";
import { HiPlus } from "react-icons/hi2";
import { useEffect, useTransition, useCallback, useMemo } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useAppStore } from "@/store/app";

type NavItem = {
  path: string;
  label: string;
  lottie: string;
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
    { path: "/", label: "Trang chủ", lottie: "/lotties/huha-idle-full.lottie" },
    { path: "/messages", label: "Tin nhắn", lottie: "/lotties/huha-searching-full.lottie" },
  ], []);

  const rightItems: NavItem[] = useMemo(() => [
    { path: "/tasks", label: "Nhiệm vụ", lottie: "/lotties/huha-task-full.lottie" },
    { path: "/profile", label: "Hồ sơ", lottie: "/lotties/huha-wallet-open-full.lottie" },
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
            <DotLottieReact
              src={item.lottie}
              autoplay={active}
              loop={active}
              style={{ width: 28, height: 28 }}
              // freeze at first frame when inactive
              speed={active? 1 : 0}
              data-lottie
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
                      <DotLottieReact
                        src="/lotties/huha-celebrate-full.lottie"
                        autoplay
                        loop
                        style={{ width: 56, height: 56 }}
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
          [data-lottie] { display: none!important; }
        }
      `}</style>
    </div>
  );
}