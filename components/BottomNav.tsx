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
  useDragControls,
  MotionConfig
} from "framer-motion";
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
   FLOATING MENU 
   ========================================================================== */
const FloatingMenu = React.memo(({
  isOpen,
  onSelect,
  onClose
}: {
  isOpen: boolean;
  onSelect: (type: "task" | "plan") => void;
  onClose: () => void;
}) => {
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 100], [1, 0]);
  const scale = useTransform(y, [0, 100], [1, 0.95]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 80 || info.velocity.y > 500) {
              onClose();
            }
          }}
          style={{ y, opacity, scale }}
          initial={{ opacity: 0, y: 20, scale: 0.96, filter: "blur(8px)" }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            transition: SPRING_BOUNCY
          }}
          exit={{
            opacity: 0,
            y: 15,
            scale: 0.97,
            filter: "blur(4px)",
            transition: { duration: 0.15, ease: [0.4, 0, 1, 1] }
          }}
          className="w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-3xl rounded-3xl p-3 border border-zinc-200/40 dark:border-zinc-800/40 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] pointer-events-auto flex flex-col gap-1.5 select-none"
        >
          <div 
            onPointerDown={(e) => dragControls.start(e)}
            className="w-full flex justify-center pt-1 pb-2 cursor-grab active:cursor-grabbing touch-none"
          >
            <div className="w-10 h-1 rounded-full bg-zinc-300/60 dark:bg-zinc-700/60" />
          </div>

          <div className="text-xs font-black text-zinc-400/80 px-3.5 pb-1.5 tracking-[0.2em] uppercase">
            Tạo mới nhanh
          </div>

          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ 
              opacity: 1, 
              x: 0,
              transition: {...SPRING, delay: 0.05 }
            }}
            exit={{ opacity: 0, x: -5, transition: { duration: 0.1 } }}
            whileHover={{ 
              scale: 1.02, 
              x: 4,
              backgroundColor: "rgba(0,0,0,0.03)",
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("task")}
            className="w-full flex items-center gap-4 p-3 rounded-2xl transition-colors duration-200 text-left group relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0"
              initial={{ x: "-100%" }}
              whileHover={{ x: "100%" }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative">
              <Sparkles className="w-5 h-5" strokeWidth={2.5} />
              <motion.div
                className="absolute inset-0 rounded-2xl bg-blue-500/20 blur-xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="flex-1 relative">
              <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">Nhiệm vụ mới</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Đầu việc nhỏ cần xử lý ngay</p>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: -10 }}
            animate={{ 
              opacity: 1, 
              x: 0,
              transition: {...SPRING, delay: 0.1 }
            }}
            exit={{ opacity: 0, x: -5, transition: { duration: 0.1 } }}
            whileHover={{ 
              scale: 1.02, 
              x: 4,
              backgroundColor: "rgba(0,0,0,0.03)",
            }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect("plan")}
            className="w-full flex items-center gap-4 p-3 rounded-2xl transition-colors duration-200 text-left group relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0"
              initial={{ x: "-100%" }}
              whileHover={{ x: "100%" }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative">
              <CalendarRange className="w-5 h-5" strokeWidth={2.5} />
              <motion.div
                className="absolute inset-0 rounded-2xl bg-emerald-500/20 blur-xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              />
            </div>
            <div className="flex-1 relative">
              <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">Kế hoạch dài hạn</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Lên lộ trình tuần, tháng chỉn chu</p>
            </div>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
FloatingMenu.displayName = "FloatingMenu";


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

  const springX = useSpring(x, {
    stiffness: 350,
    damping: 18,
    mass: 0.5
  });

  const springY = useSpring(y, {
    stiffness: 350,
    damping: 18,
    mass: 0.5
  });

  const rotateX = useTransform(springY, [-20, 20], [12, -12]);
  const rotateY = useTransform(springX, [-20, 20], [-12, 12]);

  const glowOpacity = useTransform(
    springX,
    [-20, 0, 20],
    [0.4, 0.8, 0.4]
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const moveX = (e.clientX - centerX) * 0.28;
    const moveY = (e.clientY - centerY) * 0.28;

    x.set(moveX);
    y.set(moveY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        x: springX,
        y: springY,
        rotateX,
        rotateY,
        transformStyle: "preserve-3d"
      }}
      whileTap={{
        scale: 0.88
      }}
      className="relative flex-1 flex flex-col items-center justify-center h-full pt-1 pb-3.5 outline-none select-none touch-manipulation"
    >
      {/* glass bg */}
      {active && (
        <motion.div
          layoutId="nav-active-bg"
          transition={SPRING}
          className="absolute inset-x-2 top-1 bottom-1 rounded-2xl bg-white/70 dark:bg-zinc-800/60 backdrop-blur-2xl border border-white/40 dark:border-zinc-700/40"
        />
      )}

      {/* glow */}
      {active && (
        <motion.div
          layoutId="nav-glow"
          style={{ opacity: glowOpacity }}
          className={`absolute inset-x-3 top-2 bottom-2 rounded-2xl blur-2xl ${activeBgClass}`}
        />
      )}

      {/* icon */}
      <motion.div
        animate={{
          y: active ? -2 : 0,
          scale: active ? 1.12 : 1
        }}
        transition={SPRING}
        className="relative z-10"
      >
        <motion.div
          animate={
            active
              ? {
                  rotate: [0, -6, 6, 0]
                }
              : {}
          }
          transition={{
            duration: 0.5
          }}
        >
          <item.Icon
            className={`w-[23px] h-[23px] transition-colors duration-300 ${
              active
                ? activeColorClass
                : "text-zinc-400 dark:text-zinc-500"
            }`}
            strokeWidth={active ? 2.7 : 2.2}
          />
        </motion.div>

        {active && (
          <motion.div
            className={`absolute inset-0 ${activeColorClass} blur-xl`}
            animate={{
              opacity: [0.3, 0.7, 0.3],
              scale: [1, 1.4, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity
            }}
          />
        )}
      </motion.div>

      {/* text */}
      <motion.span
        animate={{
          y: active ? -1 : 0,
          scale: active ? 1.04 : 1
        }}
        transition={SPRING}
        className={`relative z-10 text-[11px] mt-1.5 tracking-tight transition-all duration-300 ${
          active
            ? `${activeColorClass} font-bold`
            : "text-zinc-400 dark:text-zinc-500 font-semibold"
        }`}
      >
        {item.label}
      </motion.span>

      {/* bottom dot */}
      {active && (
        <>
          <motion.div
            layoutId="bottom-dot"
            transition={SPRING}
            className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${activeBgClass}`}
          />

          <motion.div
            className={`absolute bottom-1.5 w-1.5 h-1.5 rounded-full ${activeBgClass}`}
            animate={{
              scale: [1, 2.2, 1],
              opacity: [0.5, 0, 0.5]
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity
            }}
          />
        </>
      )}
    </motion.button>
  );
});
MagneticNavItem.displayName = "MagneticNavItem";


/* ==========================================================================
   MAIN: BOTTOM NAV - Portal Fix
   ========================================================================== */
export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (menuRef.current?.contains(target) || target.closest('[data-plus-button]')) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleNavigation = useCallback((path: string) => {
    if (pathname === path) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigator.vibrate?.(10);
    setIsOpen(false);
    router.push(path);
  }, [pathname, router]);

  const handleSelectCreate = useCallback((type: "task" | "plan") => {
    navigator.vibrate?.([15, 30, 15]);
    setIsOpen(false);
    handleNavigation(`/create/${type}`);
  }, [handleNavigation]);

  const checkActive = useCallback((path: string) =>
    path === "/"? pathname === "/" : pathname.startsWith(path),
    [pathname]
  );

  const activeColorClass = isPlanMode? "text-emerald-500" : "text-blue-600";
  const activeBgClass = isPlanMode? "bg-emerald-500" : "bg-blue-600";
  const dynamicGlow = isPlanMode? "shadow-emerald-500/30" : "shadow-blue-600/30";

  if (!mounted) return null;

  return createPortal(
    <MotionConfig transition={SPRING}>
      <LayoutGroup id="fixed-bottom-nav-scope">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
              animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
              exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="fixed inset-0 z-[60] bg-zinc-950/20 dark:bg-zinc-950/40 pointer-events-none will-change-[backdrop-filter,opacity]"
            />
          )}
        </AnimatePresence>

        <div className="fixed bottom-0 inset-x-0 z-[70] pointer-events-none flex flex-col items-center justify-end">
          <div ref={menuRef} className="w-full max-w-[480px] px-4 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">

            <FloatingMenu isOpen={isOpen} onSelect={handleSelectCreate} onClose={() => setIsOpen(false)} />

        <motion.div 
  layout
  animate={{
    y: [0, -2, 0]
  }}
  transition={{
    duration: 4,
    repeat: Infinity,
    ease: "easeInOut"
  }}
              className="w-full pointer-events-auto relative rounded-[32px] border border-white/40 dark:border-zinc-800/50 bg-white/55 dark:bg-zinc-900/55 backdrop-blur-[40px] backdrop-saturate-200 shadow-[0_20px_80px_rgba(0,0,0,0.12)] dark:shadow-[0_20px_80px_rgba(0,0,0,0.55)] overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/40 before:to-white/5 dark:before:from-white/5 dark:before:to-transparent before:pointer-events-none"
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
                      {!isOpen && (
                        <>
                          {[0, 0.4, 0.8].map((delay) => (
                            <motion.span
                              key={delay}
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ 
                                scale: [1, 1.6, 1.6], 
                                opacity: [0.7, 0, 0] 
                              }}
                              exit={{ opacity: 0 }}
                              transition={{ 
                                repeat: Infinity, 
                                duration: 2, 
                                delay,
                                ease: "easeOut" 
                              }}
                              className={`absolute inset-0 rounded-full ${activeBgClass}`}
                            />
                          ))}
                        </>
                      )}
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
                      animate={{
                        rotate: isOpen? 135 : 0,
                        scale: isOpen? 0.88 : 1
                      }}
                      whileHover={{ scale: isOpen? 0.88 : 1.08 }}
                      whileTap={{ scale: 0.85 }}
                      transition={SPRING_BOUNCY}
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-500 ${dynamicGlow} relative overflow-hidden ${
   isOpen 
                      ? "bg-zinc-900 dark:bg-zinc-800 shadow-zinc-950/20" 
                          : `${activeBgClass} shadow-lg`
                      }`}
                    >
<motion.div
  className="absolute inset-0 bg-gradient-to-tr from-white/40 via-white/10 to-transparent"
  animate={{
    rotate: [0, 360]
  }}
  transition={{
    duration: 8,
    repeat: Infinity,
    ease: "linear"
  }}
/>
                      <Plus className="w-6 h-6" strokeWidth={3.5} />
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent" />
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
    </MotionConfig>,
    document.body
  );
}