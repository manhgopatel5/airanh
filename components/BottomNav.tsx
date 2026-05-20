"use client";

import React, { useEffect, useCallback, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import {
  motion,
  AnimatePresence,
  LayoutGroup,
  useMotionValue,
  useSpring,
  useTransform,
  MotionConfig
} from "framer-motion";
import { useAppStore } from "@/store/app";
import {
  Home,
  MessageSquare,
  ClipboardList,
  User,
  Plus,
  
  
  Briefcase,
  PartyPopper,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  Icon: LucideIcon;
}

const SPRING = {
  type: "spring" as const,
  stiffness: 550,
  damping: 32,
  mass: 0.8
};

const SPRING_BOUNCY = {
  type: "spring" as const,
  stiffness: 400,
  damping: 25,
  mass: 0.6
};

/* ==========================================================================
   CENTER MODAL: HỎI BẠN MUỐN LÀM GÌ
   ========================================================================== */
const CenterActionModal = React.memo(({
  isOpen,
  onSelect,
  onClose
}: {
  isOpen: boolean;
  onSelect: (type: "task" | "plan") => void;
  onClose: () => void;
}) => {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur mờ xung quanh */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-md"
          />

          {/* Modal ở giữa */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={SPRING_BOUNCY}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-[380px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-3xl rounded-[32px] p-6 border border-zinc-200/50 dark:border-zinc-800/50 shadow-[0_32px_80px_rgba(0,0,0,0.3)] pointer-events-auto">

              {/* Nút X đóng */}
              <div className="flex justify-end mb-2">
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  <X size={18} className="text-zinc-500" />
                </button>
              </div>

              {/* Tiêu đề */}
              <div className="text-center mb-6">
                <h2 className="text-[22px] font-black text-zinc-900 dark:text-zinc-100 mb-1">
                  Bạn muốn làm gì?
                </h2>
                <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Chọn loại hoạt động bạn muốn tạo
                </p>
              </div>

              {/* 2 nút chọn */}
              <div className="space-y-3">
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect("task")}
                  className="w-full p-5 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-xl shadow-blue-500/30 transition-all group relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                  <div className="flex items-center gap-4 relative">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <Briefcase size={26} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-[18px] font-black mb-0.5">Đăng công việc</div>
                      <div className="text-[13px] text-white/80 font-medium">
                        Tìm người làm việc, giao task
                      </div>
                    </div>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect("plan")}
                  className="w-full p-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-xl shadow-emerald-500/30 transition-all group relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0"
                    initial={{ x: "-100%" }}
                    whileHover={{ x: "100%" }}
                    transition={{ duration: 0.6 }}
                  />
                  <div className="flex items-center gap-4 relative">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-transform">
                      <PartyPopper size={26} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-[18px] font-black mb-0.5">Rủ bạn đi chơi</div>
                      <div className="text-[13px] text-white/80 font-medium">
                        Lên kèo đi chơi, hẹn hò, tụ tập
                      </div>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
});
CenterActionModal.displayName = "CenterActionModal";

/* ==========================================================================
   MAGNETIC NAV ITEM
   ========================================================================== */
const MagneticNavItem = React.memo(({
  item,
  active,
  onClick,
  activeColorClass,
  activeBgClass
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
  activeColorClass: string;
  activeBgClass: string;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 350, damping: 18, mass: 0.5 });
  const springY = useSpring(y, { stiffness: 350, damping: 18, mass: 0.5 });
  const rotateX = useTransform(springY, [-20, 20], [12, -12]);
  const rotateY = useTransform(springX, [-20, 20], [-12, 12]);
  const glowOpacity = useTransform(springX, [-20, 0, 20], [0.4, 0.8, 0.4]);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.28);
    y.set((e.clientY - centerY) * 0.28);
  };

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ x: springX, y: springY, rotateX, rotateY, transformStyle: "preserve-3d" }}
      whileTap={{ scale: 0.88 }}
      className="relative flex-1 flex flex-col items-center justify-center h-full pt-1 pb-3.5 outline-none select-none touch-manipulation"
    >
      {active && (
        <motion.div
          layoutId="nav-active-bg"
          transition={SPRING}
          className="absolute inset-x-2 top-1 bottom-1 rounded-2xl bg-white/70 dark:bg-zinc-800/60 backdrop-blur-2xl border border-white/40 dark:border-zinc-700/40"
        />
      )}
      {active && (
        <motion.div
          layoutId="nav-glow"
          style={{ opacity: glowOpacity }}
          className={`absolute inset-x-3 top-2 bottom-2 rounded-2xl blur-2xl ${activeBgClass}`}
        />
      )}
      <motion.div animate={{ y: active? -2 : 0, scale: active? 1.12 : 1 }} transition={SPRING} className="relative z-10">
        <item.Icon
          className={`w-[23px] h-[23px] transition-colors duration-300 ${active? activeColorClass : "text-zinc-400 dark:text-zinc-500"}`}
          strokeWidth={active? 2.7 : 2.2}
        />
        {active && (
          <motion.div
            className={`absolute inset-0 ${activeColorClass} blur-xl`}
            animate={{ opacity: [0.3, 0.7, 0.3], scale: [1, 1.4, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>
      <motion.span
        animate={{ y: active? -1 : 0, scale: active? 1.04 : 1 }}
        transition={SPRING}
        className={`relative z-10 text-[11px] mt-1.5 tracking-tight transition-all duration-300 ${active? `${activeColorClass} font-bold` : "text-zinc-400 dark:text-zinc-500 font-semibold"}`}
      >
        {item.label}
      </motion.span>
      {active && (
        <>
          <motion.div layoutId="bottom-dot" transition={SPRING} className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${activeBgClass}`} />
          <motion.div
            className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${activeBgClass}`}
            animate={{ scale: [1, 2.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
        </>
      )}
    </motion.button>
  );
});
MagneticNavItem.displayName = "MagneticNavItem";

/* ==========================================================================
   MAIN: BOTTOM NAV
   ========================================================================== */
export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mode = useAppStore((s) => s.mode);
  const isPlanMode = mode === "plan";

  const plusX = useMotionValue(0);
  const plusY = useMotionValue(0);
  const plusSpringX = useSpring(plusX, SPRING);
  const plusSpringY = useSpring(plusY, SPRING);

  const leftItems: NavItem[] = useMemo(() => [
    { path: "/", label: "Home", Icon: Home },
    { path: "/messages", label: "Messages", Icon: MessageSquare },
  ], []);

  const rightItems: NavItem[] = useMemo(() => [
    { path: "/tasks", label: "Tasks", Icon: ClipboardList },
    { path: "/profile", label: "Profile", Icon: User },
  ], []);

  useEffect(() => setMounted(true), []);

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

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleNavigation = useCallback((path: string) => {
    if (pathname === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigator.vibrate?.(10);
    router.push(path);
  }, [pathname, router]);

  const handleSelectCreate = useCallback((type: "task" | "plan") => {
    navigator.vibrate?.([15, 30, 15]);
    setIsOpen(false);
    router.push(`/create/${type}`);
  }, [router]);

  const checkActive = useCallback((path: string) =>
    path === "/"? pathname === "/" : pathname.startsWith(path),
    [pathname]
  );

  const activeColorClass = isPlanMode? "text-emerald-500" : "text-blue-600";
  const activeBgClass = isPlanMode? "bg-emerald-500" : "bg-blue-600";
  const dynamicGlow = isPlanMode? "shadow-emerald-500/30" : "shadow-blue-600/30";

  if (!mounted) return null;

  return (
    <MotionConfig transition={SPRING}>
      <LayoutGroup id="fixed-bottom-nav-scope">
        <CenterActionModal
          isOpen={isOpen}
          onSelect={handleSelectCreate}
          onClose={() => setIsOpen(false)}
        />

        <div className="fixed bottom-0 inset-x-0 z-[70] pointer-events-none flex flex-col items-center justify-end">
          <div className="w-full max-w-[480px] px-4 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
            <motion.div
              layout
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-full pointer-events-auto relative rounded-[32px] border border-white/40 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/55 backdrop-blur-[40px] backdrop-saturate-200 shadow-[0_20px_80px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.55)] overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:to-white/5 dark:before:from-white/5 dark:before:to-transparent before:pointer-events-none"
            >
              <motion.div
                className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              />

              <div className="flex items-center justify-between h-16 px-2 relative">
                <div className="flex-1 grid grid-cols-2 h-full">
                  {leftItems.map((item) => (
                    <MagneticNavItem
                      key={item.path}
                      item={item}
                      active={checkActive(item.path)}
                      onClick={() => handleNavigation(item.path)}
                      activeColorClass={activeColorClass}
                      activeBgClass={activeBgClass}
                    />
                  ))}
                </div>

                <div className="w-20 flex justify-center h-full items-center relative">
                  <motion.button
                    data-plus-button
                    onClick={() => {
                      navigator.vibrate?.(12);
                      setIsOpen(!isOpen);
                    }}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      plusX.set((e.clientX - rect.left - rect.width / 2) * 0.2);
                      plusY.set((e.clientY - rect.top - rect.height / 2) * 0.2);
                    }}
                    onMouseLeave={() => {
                      plusX.set(0);
                      plusY.set(0);
                    }}
                    style={{ x: plusSpringX, y: plusSpringY }}
                    className="outline-none select-none touch-manipulation z-10 p-2 relative group"
                  >
                    <AnimatePresence>
                      {!isOpen && [0, 0.4, 0.8].map((delay) => (
                        <motion.span
                          key={delay}
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: [1, 1.6, 1.6], opacity: [0.7, 0, 0] }}
                          exit={{ opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 2, delay, ease: "easeOut" }}
                          className={`absolute inset-0 rounded-full ${activeBgClass}`}
                        />
                      ))}
                    </AnimatePresence>

                    <motion.div
                      className={`absolute inset-0 rounded-full ${activeBgClass} blur-2xl opacity-60`}
                      animate={{
                        scale: isOpen? 0.8 : [1, 1.2, 1],
                        opacity: isOpen? 0.3 : [0.6, 0.8, 0.6]
                      }}
                      transition={{
                        scale: { duration: 2, repeat: Infinity },
                        opacity: { duration: 2, repeat: Infinity }
                      }}
                    />

                    <motion.div
                      animate={{ rotate: isOpen? 135 : 0, scale: isOpen? 0.88 : 1 }}
                      whileHover={{ scale: isOpen? 0.88 : 1.08 }}
                      whileTap={{ scale: 0.85 }}
                      transition={SPRING_BOUNCY}
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${dynamicGlow} relative overflow-hidden ${
                        isOpen? "bg-zinc-900 dark:bg-zinc-800 shadow-zinc-950/20" : `${activeBgClass} shadow-lg`
                      }`}
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-tr from-white/40 via-white/10 to-transparent"
                        animate={{ rotate: [0, 360] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      />
                      <Plus className="w-6 h-6" strokeWidth={3.5} />
                    </motion.div>
                  </motion.button>
                </div>

                <div className="flex-1 grid grid-cols-2 h-full">
                  {rightItems.map((item) => (
                    <MagneticNavItem
                      key={item.path}
                      item={item}
                      active={checkActive(item.path)}
                      onClick={() => handleNavigation(item.path)}
                      activeColorClass={activeColorClass}
                      activeBgClass={activeBgClass}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}