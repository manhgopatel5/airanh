"use client";

import React, { useEffect, useTransition, useCallback, useState, useMemo } from "react";
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

// Khai báo các biến cấu hình Animation dùng chung để tối ưu bộ nhớ
const menuVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      damping: 22,
      stiffness: 350,
      staggerChildren: 0.06, // Tạo hiệu ứng nối đuôi mượt mà cho các item con
      delayChildren: 0.02
    }
  },
  exit: { 
    opacity: 0, 
    y: 12, 
    scale: 0.96,
    transition: { duration: 0.15, ease: "easeInOut" }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", damping: 20, stiffness: 300 } },
  exit: { opacity: 0, x: -5, transition: { duration: 0.1 } }
};

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
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

  // Prefetch các routes tối ưu hóa tốc độ tải trang ngầm
  useEffect(() => {
    const targets = ["/", "/messages", "/tasks", "/profile", "/create/task", "/create/plan"];
    targets.forEach((p) => router.prefetch(p));
  }, [router]);

  // Đóng menu khi bấm phím Escape (Tăng cường tính năng Accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Khóa cuộn thông minh, chống giật layout (Layout Shift)
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
    startTransition(() => router.push(path));
  }, [pathname, router]);

  const handleSelectCreate = (type: "task" | "plan") => {
    navigator.vibrate?.([10, 20]);
    setIsOpen(false);
    handleNavigation(`/create/${type}`);
  };

  const checkActive = useCallback((path: string) => 
    path === "/" ? pathname === "/" : pathname.startsWith(path), 
    [pathname]
  );

  const activeColorClass = isPlanMode ? "text-emerald-500" : "text-blue-600";
  const activeBgClass = isPlanMode ? "bg-emerald-500" : "bg-blue-600";
  const dynamicGlow = isPlanMode ? "shadow-emerald-500/30" : "shadow-blue-600/30";

  const renderNavItem = (item: NavItem) => {
    const active = checkActive(item.path);
    return (
      <button
        key={item.path}
        onClick={() => handleNavigation(item.path)}
        className="flex-1 flex flex-col items-center justify-center relative h-full py-2 outline-none select-none touch-manipulation group will-change-transform"
      >
        <item.Icon 
          className={`w-[21px] h-[21px] transition-all duration-300 ease-out ${
            active ? `${activeColorClass} scale-110` : "text-zinc-400 group-hover:text-zinc-600 group-active:scale-95"
          }`} 
        />
        <span className={`text-[10px] font-semibold mt-1 tracking-tight transition-colors duration-300 ${
          active ? activeColorClass : "text-zinc-400"
        }`}>
          {item.label}
        </span>
        
        {/* Chấm tròn báo Tab active với hiệu ứng Elastic Jelly mượt mà */}
        {active && (
          <motion.div 
            layoutId="activeIndicator"
            transition={{ 
              type: "spring", 
              stiffness: 420, 
              damping: 26,
              mass: 0.6 // Giảm trọng khối giúp chấm di chuyển có độ dẻo đàn hồi tốt hơn
            }}
            className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${activeBgClass}`}
          />
        )}
      </button>
    );
  };

  return (
    <LayoutGroup id="bottom-navigation-advanced">
      {/* OVERLAY NỀN MỜ CAO CẤP */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-zinc-950/25 backdrop-blur-md pointer-events-auto transition-all"
          />
        )}
      </AnimatePresence>

      {/* CONTAINER CHÍNH CHỐNG PHÁ LAYOUT */}
      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none flex flex-col items-center justify-end">
        <div className="w-full max-w-[480px] px-4 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
          
          {/* 1. FLOATING CONTEXT MENU (Hiệu ứng bung nở Staggered mới) */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                variants={menuVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full bg-white/85 backdrop-blur-2xl rounded-[30px] p-2.5 border border-zinc-200/40 shadow-[0_24px_60px_rgba(0,0,0,0.14)] pointer-events-auto flex flex-col gap-1.5 will-change-transform"
              >
                <div className="text-[10px] font-bold text-zinc-400/90 px-3.5 pt-2 tracking-widest uppercase select-none">
                  Tạo mới nhanh
                </div>
                
                {/* Nút Tạo Task */}
                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectCreate("task")}
                  className="w-full flex items-center gap-4 p-3 rounded-2.5xl hover:bg-zinc-50/80 active:bg-zinc-100/50 transition-colors duration-200 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-100/70 transition-all duration-300">
                    <Sparkles className="w-[18px] h-[18px]" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-zinc-900 text-sm tracking-tight">Nhiệm vụ mới</h4>
                    <p className="text-xs text-zinc-400 font-medium">Đầu việc nhỏ cần xử lý ngay</p>
                  </div>
                </motion.button>

                {/* Nút Tạo Plan */}
                <motion.button
                  variants={itemVariants}
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectCreate("plan")}
                  className="w-full flex items-center gap-4 p-3 rounded-2.5xl hover:bg-zinc-50/80 active:bg-zinc-100/50 transition-colors duration-200 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-emerald-100/70 transition-all duration-300">
                    <CalendarRange className="w-[18px] h-[18px]" strokeWidth={2.2} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-zinc-900 text-sm tracking-tight">Kế hoạch dài hạn</h4>
                    <p className="text-xs text-zinc-400 font-medium">Lên lộ trình tuần, tháng chỉn chu</p>
                  </div>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. THANH NAVIGATION GỐC */}
          <div className="w-full pointer-events-auto relative rounded-[26px] border border-zinc-200/50 bg-white/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
            
            {/* Thanh line-loading mượt chạy ngầm khi chuyển trang */}
            {isPending && (
              <div className="absolute top-0 inset-x-6 h-[2px] bg-gradient-to-r from-transparent via-zinc-400 to-transparent animate-pulse" />
            )}

            <div className="flex items-center justify-between h-[66px] px-2 relative">
              {/* Cụm trái */}
              <div className="flex-1 grid grid-cols-2 h-full">
                {leftItems.map(renderNavItem)}
              </div>

              {/* Cụm nút bấm Plus trung tâm */}
              <div className="w-[66px] flex justify-center h-full items-center relative">
                <button
                  onClick={() => {
                    navigator.vibrate?.(12);
                    setIsOpen(!isOpen);
                  }}
                  className="outline-none select-none touch-manipulation z-10 p-1"
                >
                  <motion.div
                    animate={{ 
                      rotate: isOpen ? 135 : 0,
                      scale: isOpen ? 0.90 : 1
                    }}
                    whileHover={{ scale: isOpen ? 0.90 : 1.06 }}
                    whileTap={{ scale: 0.85 }}
                    transition={{ type: "spring", damping: 14, stiffness: 380 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all duration-300 ${dynamicGlow} ${
                      isOpen ? "bg-zinc-900 shadow-zinc-950/20" : activeBgClass
                    }`}
                  >
                    <Plus className="w-5 h-5" strokeWidth={2.8} />
                  </motion.div>
                </button>
              </div>

              {/* Cụm phải */}
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

