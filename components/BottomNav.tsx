"use client";

import React, { useEffect, useTransition, useCallback, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app";

// Sử dụng chung 1 bộ icon cao cấp từ lucide-react hoặc tương đương (ở đây dùng SVG tối giản gốc)
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

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);

  const mode = useAppStore((s) => s.mode);
  const isPlanMode = mode === "plan";

  // Danh mục Navigation chia làm 2 bên trái/phải rõ ràng
  const leftItems: NavItem[] = useMemo(() => [
    { path: "/", label: "Home", Icon: Home },
    { path: "/messages", label: "Messages", Icon: MessageSquare },
  ], []);

  const rightItems: NavItem[] = useMemo(() => [
    { path: "/tasks", label: "Tasks", Icon: ClipboardList },
    { path: "/profile", label: "Profile", Icon: User },
  ], []);

  // Prefetch các tuyến đường tối ưu SEO/Performance
  useEffect(() => {
    const targets = ["/", "/messages", "/tasks", "/profile", "/create/task", "/create/plan"];
    targets.forEach((p) => router.prefetch(p));
  }, [router]);

  // Khóa cuộn màn hình nền khi menu mở ra
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const handleNavigation = useCallback((path: string) => {
    if (pathname === path) return;
    navigator.vibrate?.(10);
    startTransition(() => router.push(path));
  }, [pathname, router]);

  const handleSelectCreate = (type: "task" | "plan") => {
    navigator.vibrate?.([10, 15]);
    setIsOpen(false);
    // Điều hướng ngay lập tức, tính mượt mà giao phó cho animation đóng của AnimatePresence
    handleNavigation(`/create/${type}`);
  };

  const checkActive = (path: string) => 
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  // Định nghĩa mã màu thương hiệu theo state "mode" từ store
  const activeColorClass = isPlanMode ? "text-emerald-500" : "text-blue-600";
  const activeBgClass = isPlanMode ? "bg-emerald-500" : "bg-blue-600";

  // Helper render nút chức năng icon
  const renderNavItem = (item: NavItem) => {
    const active = checkActive(item.path);
    return (
      <button
        key={item.path}
        onClick={() => handleNavigation(item.path)}
        className="flex-1 flex flex-col items-center justify-center relative group h-full py-2 outline-none select-none touch-manipulation"
      >
        <item.Icon 
          className={`w-[22px] h-[22px] transition-all duration-300 ${
            active ? `${activeColorClass} scale-110` : "text-zinc-400 group-hover:text-zinc-600"
          }`} 
        />
        <span className={`text-[10px] font-medium mt-1 transition-colors duration-300 ${
          active ? activeColorClass : "text-zinc-400"
        }`}>
          {item.label}
        </span>
        {active && (
          <motion.div 
            layoutId="activeIndicator"
            className={`absolute bottom-1 w-1 h-1 rounded-full ${activeBgClass}`}
          />
        )}
      </button>
    );
  };

  return (
    <>
      {/* BACKGROUND OVERLAYkhi mở menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md transition-all"
          />
        )}
      </AnimatePresence>

      {/* FLOATING CONTEXT MENU (Bản nâng cấp thay thế cho Bottom Sheet thô kệch) */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-24 inset-x-0 z-50 pointer-events-none flex justify-center px-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="w-full max-w-[360px] bg-white/90 backdrop-blur-2xl rounded-3xl p-3 border border-zinc-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.15)] pointer-events-auto flex flex-col gap-2"
            >
              <div className="text-[11px] font-bold text-zinc-400 px-3 pt-1 tracking-wider uppercase">
                Tạo mới nhanh
              </div>
              
              {/* Option: Task */}
              <button
                onClick={() => handleSelectCreate("task")}
                className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 active:bg-zinc-100 transition duration-200 text-left group"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 text-sm">Nhiệm vụ mới</h4>
                  <p className="text-xs text-zinc-500">Thêm đầu việc cần xử lý ngay</p>
                </div>
              </button>

              {/* Option: Plan */}
              <button
                onClick={() => handleSelectCreate("plan")}
                className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-zinc-50 active:bg-zinc-100 transition duration-200 text-left group"
              >
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                  <CalendarRange className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 text-sm">Kế hoạch dài hạn</h4>
                  <p className="text-xs text-zinc-500">Lên lộ trình chỉn chu theo tuần/tháng</p>
                </div>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN BOTTOM NAVIGATION */}
      <nav className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div className="mx-auto max-w-[480px] px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto relative rounded-[24px] border border-zinc-200/60 bg-white/80 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
            <div className="flex items-center justify-between h-[66px] px-2 relative">
              
              {/* Left Side Items */}
              <div className="flex-1 grid grid-cols-2 h-full">
                {leftItems.map(renderNavItem)}
              </div>

              {/* Center Trigger Button (Nút Plus) */}
              <div className="w-[72px] flex justify-center relative h-full items-center">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="outline-none select-none touch-manipulation relative"
                  style={{ transform: "translateY(-14px)" }} // Đẩy nhẹ nút lên trên tạo điểm nhấn thị giác
                >
                  {/* Hiệu ứng sóng ngầm (Pulse glow) tinh tế, nhẹ nhàng hơn */}
                  <span className={`absolute inset-0 rounded-full blur-xl opacity-40 transition-colors duration-500 ${activeBgClass}`} />
                  
                  <motion.div
                    animate={{ rotate: isOpen ? 135 : 0 }}
                    transition={{ type: "spring", damping: 15 }}
                    className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all duration-300 ${
                      isOpen ? "bg-zinc-900 shadow-zinc-900/20" : activeBgClass
                    }`}
                  >
                    <Plus className="w-6 h-6" strokeWidth={2.5} />
                  </motion.div>
                </button>
              </div>

              {/* Right Side Items */}
              <div className="flex-1 grid grid-cols-2 h-full">
                {rightItems.map(renderNavItem)}
              </div>

            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
