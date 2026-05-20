"use client";

import React, { useEffect, useCallback, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useAppStore } from "@/store/app";
import {
  Home,
  MessageSquare,
  ClipboardList,
  User,
  Plus,
  Sparkles,
  CalendarRange
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  Icon: LucideIcon;
}

const menuVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 400,
      staggerChildren: 0.05,
      delayChildren: 0.01
    }
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.98,
    transition: { duration: 0.12, ease: "easeInOut" }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", damping: 20, stiffness: 350 } },
  exit: { opacity: 0, transition: { duration: 0.08 } }
};

/* ==========================================================================
   COMPONENT 1: FLOATING MENU 
   ========================================================================== */
const FloatingMenu = React.memo(({
  isOpen,
  onSelect
}: {
  isOpen: boolean;
  onSelect: (type: "task" | "plan") => void;
}) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          variants={menuVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()} // Chặn click lan ra overlay
          className="w-full bg-white/95 backdrop-blur-2xl rounded- p-2.5 border border-zinc-200/40 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.15)] pointer-events-auto flex flex-col gap-1 select-none will-change-[transform,opacity] z-[70]"
        >
          <div className="text- font-bold text-zinc-400/90 px-3.5 pt-2 pb-1 tracking-widest uppercase">
            Tạo mới nhanh
          </div>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.01, x: 2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelect("task")}
            className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-zinc-50/80 active:bg-zinc-100/50 transition-colors duration-150 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w- h-" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-zinc-900 text-sm tracking-tight">Nhiệm vụ mới</h4>
              <p className="text-xs text-zinc-400 font-medium">Đầu việc nhỏ cần xử lý ngay</p>
            </div>
          </motion.button>

          <motion.button
            variants={itemVariants}
            whileHover={{ scale: 1.01, x: 2 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelect("plan")}
            className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-zinc-50/80 active:bg-zinc-100/50 transition-colors duration-150 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <CalendarRange className="w- h-" strokeWidth={2.2} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-zinc-900 text-sm tracking-tight">Kế hoạch dài hạn</h4>
              <p className="text-xs text-zinc-400 font-medium">Lên lộ trình tuần, tháng chỉn chu</p>
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
FloatingMenu.displayName = "FloatingMenu";


/* ==========================================================================
   COMPONENT MAIN: BOTTOM NAV
   ========================================================================== */
export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const mode = useAppStore((s) => s.mode);
  const isPlanMode = mode === "plan";

  const leftItems: NavItem[] = useMemo(() => [
    { path: "/", label: "Home", Icon: Home },
    { path: "/messages", label: "Messages", Icon: MessageSquare },
  ], []);

  const rightItems: NavItem[] = useMemo(() => [
    { path: "/tasks", label: "Tasks", Icon: ClipboardList },
    { path: "/profile", label: "Profile", Icon: User },
  ], []);

  useEffect(() => {
    const targets = ["/", "/messages", "/tasks", "/profile", "/create/task", "/create/plan"];
    targets.forEach((p) => router.prefetch(p));
  }, [router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Tự tắt menu khi chuyển route
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = originalStyle; };
    }
  }, [isOpen]);

  const handleNavigation = useCallback((path: string) => {
    if (pathname === path) return;
    navigator.vibrate?.(10);
    setIsOpen(false);
    router.push(path);
  }, [pathname, router]);

  const handleSelectCreate = useCallback((type: "task" | "plan") => {
    navigator.vibrate?.([10, 20]);
    setIsOpen(false);
    handleNavigation(`/create/${type}`);
  }, [handleNavigation]);

  const checkActive = useCallback((path: string) =>
    path === "/"? pathname === "/" : pathname.startsWith(path),
    [pathname]
  );

  const activeColorClass = isPlanMode? "text-emerald-500" : "text-blue-600";
  const activeBgClass = isPlanMode? "bg-emerald-500" : "bg-blue-600";
  const dynamicGlow = isPlanMode? "shadow-emerald-500/20" : "shadow-blue-600/20";

  const renderNavItem = (item: NavItem) => {
    const active = checkActive(item.path);
    return (
      <button
        key={item.path}
        onClick={() => handleNavigation(item.path)}
        className="flex-1 flex flex-col items-center justify-center relative h-full pt-1 pb-3.5 outline-none select-none touch-manipulation group"
      >
        <item.Icon
          className={`w- h- transition-all duration-200 ease-out ${
            active? `${activeColorClass} scale-105` : "text-zinc-400 group-hover:text-zinc-600"
          }`}
        />
        <span className={`text- font-semibold mt-1 tracking-tight transition-colors duration-200 ${
          active? activeColorClass : "text-zinc-400"
        }`}>
          {item.label}
        </span>

        {active && (
          <>
            <div className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${activeBgClass} opacity-100 block`} />
            <motion.div
              layoutId="activeIndicator"
              layout="position"
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 30,
                mass: 0.4
              }}
              className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${activeBgClass} z-10 hidden md:block`}
            />
          </>
        )}
      </button>
    );
  };

  return (
    <LayoutGroup id="fixed-bottom-nav-scope">
      {/* Overlay bấm ra ngoài là tắt - z-[60] */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-[60] bg-zinc-950/15 backdrop-blur-[6px] pointer-events-auto will-change-opacity"
          />
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 inset-x-0 z-[70] pointer-events-none flex flex-col items-center justify-end">
        <div className="w-full max-w-[480px] px-4 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">

          <FloatingMenu isOpen={isOpen} onSelect={handleSelectCreate} />

          <div className="w-full pointer-events-auto relative rounded- border border-zinc-200/50 bg-white/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden z-[70]">

            <div className="flex items-center justify-between h- px-2 relative">
              <div className="flex-1 grid grid-cols-2 h-full">
                {leftItems.map(renderNavItem)}
              </div>

              <div className="w- flex justify-center h-full items-center relative">
                <button
                  onClick={() => {
                    navigator.vibrate?.(8);
                    setIsOpen(!isOpen);
                  }}
                  className="outline-none select-none touch-manipulation z-10 p-2 relative"
                >
                  {/* Hiệu ứng pulse thu hút bấm khi đóng */}
                  <AnimatePresence>
                    {!isOpen && (
                      <motion.span
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                        exit={{ opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                        className={`absolute inset-0 rounded-full ${activeBgClass} blur-md`}
                      />
                    )}
                  </AnimatePresence>

                  <motion.div
                    animate={{
                      rotate: isOpen? 135 : 0,
                      scale: isOpen? 0.90 : 1
                    }}
                    whileHover={{ scale: isOpen? 0.90 : 1.05 }}
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: "spring", damping: 15, stiffness: 400 }}
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md transition-all duration-200 ${dynamicGlow} ${
                      isOpen? "bg-zinc-900 shadow-zinc-950/10" : activeBgClass
                    }`}
                  >
                    <Plus className="w-4 h-4" strokeWidth={3} />
                  </motion.div>
                </button>
              </div>

              <div className="flex-1 grid grid-cols-2 h-full">
                {rightItems.map(renderNavItem)}
              </div>
            </div>

          </div>
        </div>
      </div>
    </LayoutGroup>
  );
}