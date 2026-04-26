"use client";

import { useRouter, usePathname } from "next/navigation";
import { FiMessageSquare, FiClipboard, FiUser } from "react-icons/fi";
import { HiHome, HiPlus } from "react-icons/hi2";
import { useEffect, useTransition, useCallback } from "react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

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
  }: {
    path: string;
    icon: React.ElementType;
    label: string;
  }) => {
    const active = isActive(path);

    return (
      <button
        onClick={() => handleNav(path)}
        onMouseEnter={() => router.prefetch(path)}
        aria-current={active? "page" : undefined}
        className="relative flex flex-col items-center justify-center flex-1 h-14 active:scale-95 transition-transform min-w-"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {active && (
          <div className="absolute inset-1.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-0.5">
          <Icon
            className={`w-5 h-5 sm:w-6 sm:h-6 ${
              active
          ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 dark:text-zinc-400"
            }`}
          />
          <span
            className={`text-xs font-semibold tracking-tight leading-none ${
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
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="pb-safe px-safe">
        <div className="mx-3 mb-2">
          <div className="relative bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl shadow-lg shadow-gray-900/5 dark:shadow-black/20">
            <div className="flex items-center justify-around h-16 px-1">
              <NavItem path="/" icon={HiHome} label="Trang chủ" />
              <NavItem path="/messages" icon={FiMessageSquare} label="Tin nhắn" />

              <button
                onClick={() => handleNav("/create")}
                onMouseEnter={() => router.prefetch("/create")}
                aria-label="Tạo mới"
                className="relative -mt-7 active:scale-95 transition-transform"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <HiPlus className="text-white" size={26} strokeWidth={2.5} />
                </div>
              </button>

              <NavItem path="/tasks" icon={FiClipboard} label="Nhiệm vụ" />
              <NavItem path="/profile" icon={FiUser} label="Hồ sơ" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}