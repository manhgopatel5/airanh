"use client";

import { useRouter, usePathname } from "next/navigation";
import { FiHome, FiMessageSquare, FiClipboard, FiUser } from "react-icons/fi";
import { HiPlus } from "react-icons/hi";
import { useEffect, useTransition, useCallback } from "react";

type Props = {
  unreadCount?: number;
};

export default function BottomNav({ unreadCount = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  /* ================= PREFETCH ================= */
  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/messages");
    router.prefetch("/tasks");
    router.prefetch("/profile");
  }, [router]);

  const handleNav = useCallback((path: string) => {
    if (pathname === path) return;
    if ("vibrate" in navigator) navigator.vibrate(10);

    startTransition(() => {
      router.push(path);
    });
  }, [pathname, router]);

  const isActive = useCallback((path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  }, [pathname]);

  const NavItem = ({
    path,
    icon: Icon,
    label,
    badge,
  }: {
    path: string;
    icon: React.ElementType;
    label: string;
    badge?: number;
  }) => {
    const active = isActive(path);

    return (
      <button
        onClick={() => handleNav(path)}
        onMouseEnter={() => router.prefetch(path)}
        aria-current={active? "page" : undefined}
        className="flex flex-col items-center justify-center flex-1 py-1 active:scale-[0.98] active:bg-gray-100 dark:active:bg-zinc-800 rounded-2xl transition-all relative"
      >
        <div className="relative">
          <Icon
            size={24}
            className={`transition-all duration-200 ${
              active
               ? "text-blue-600 dark:text-blue-400 scale-110"
                : "text-gray-400 dark:text-zinc-500"
            }`}
          />
          {badge && badge > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
              {badge > 9? "9+" : badge}
            </span>
          )}
        </div>
        <span
          className={`text-xs font-semibold mt-1 transition-colors ${
            active
             ? "text-blue-600 dark:text-blue-400"
              : "text-gray-400 dark:text-zinc-500"
          }`}
        >
          {label}
        </span>
        <div
          className={`mt-0.5 h-0.5 rounded-full transition-all duration-300 ${
            active? "w-5 bg-blue-600 dark:bg-blue-400" : "w-0 bg-transparent"
          }`}
        />
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-gray-100 dark:border-zinc-800 rounded-3xl shadow-lg shadow-gray-200/50 dark:shadow-black/30 flex items-center px-2 py-2.5">
        <NavItem path="/" icon={FiHome} label="Trang chủ" />
        <NavItem path="/messages" icon={FiMessageSquare} label="Tin nhắn" badge={unreadCount} />

        <button
          onClick={() => handleNav("/create")}
          onMouseEnter={() => router.prefetch("/create")}
          aria-label="Tạo mới"
          className="flex flex-col items-center justify-center flex-1 -mt-6"
        >
          <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20 active:scale-90 transition-transform">
            <HiPlus size={28} className="text-white" />
          </div>
        </button>

        <NavItem path="/tasks" icon={FiClipboard} label="Nhiệm vụ" />
        <NavItem path="/profile" icon={FiUser} label="Hồ sơ" />
      </div>
    </div>
  );
}