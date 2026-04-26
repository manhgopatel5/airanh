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
    router.prefetch("/create");
  }, [router]);

  const handleNav = useCallback((path: string) => {
    if (pathname === path) return;
    if ("vibrate" in navigator) navigator.vibrate(8);

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
        className="relative flex flex-col items-center justify-center flex-1 h-16 group"
      >
        {active && (
          <div className="absolute inset-2 bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl animate-in fade-in duration-300" />
        )}
        <div className="relative z-10 flex flex-col items-center">
          <div className="relative">
            <Icon
              size={24}
              className={`transition-all duration-300 ${
                active
               ? "text-blue-600 dark:text-blue-400 scale-110"
                  : "text-gray-500 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-300 group-active:scale-95"
              }`}
            />
            {badge && badge > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-white dark:ring-zinc-900 shadow-lg">
                {badge > 99? "99+" : badge}
              </span>
            )}
          </div>
          <span
            className={`text-[11px] font-bold mt-1.5 tracking-tight transition-colors duration-300 ${
              active
             ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-zinc-400"
            }`}
          >
            {label}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-4 mb-4">
        <div className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-gray-200/60 dark:border-zinc-800/60 rounded-3xl shadow-2xl shadow-gray-900/10 dark:shadow-black/40">
          <div className="flex items-center justify-around h-20 px-2">
            <NavItem path="/" icon={FiHome} label="Trang chủ" />
            <NavItem path="/messages" icon={FiMessageSquare} label="Tin nhắn" badge={unreadCount} />

            <button
              onClick={() => handleNav("/create")}
              onMouseEnter={() => router.prefetch("/create")}
              aria-label="Tạo mới"
              className="relative -mt-8 group"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/50 group-hover:shadow-blue-500/70 group-active:scale-90 transition-all duration-300">
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-white/0 to-white/20" />
                <HiPlus className="text-white relative z-10" size={28} />
              </div>
            </button>

            <NavItem path="/tasks" icon={FiClipboard} label="Nhiệm vụ" />
            <NavItem path="/profile" icon={FiUser} label="Hồ sơ" />
          </div>
        </div>
      </div>
    </div>
  );
}