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
  GoHome,
  GoHomeFill,
  GoInbox,
  GoTelescope,
  GoTelescopeFill,
} from "react-icons/go";
import { RiRobot2Fill, RiRobot2Line } from "react-icons/ri";
import { Sparkles, Plus, CalendarRange } from "lucide-react"; // THÊM DÒNG NÀY
import type { IconType } from "react-icons";

interface NavItem {
  path: string;
  label: string;
  Icon: IconType;
  ActiveIcon: IconType;
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
            transition: { duration: 0.15, ease: [0.4, 0, 1] }
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
            <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative">
              <Sparkles className="w-5 h-5" strokeWidth={2.5} />
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
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 relative">
              <CalendarRange className="w-5 h-5" strokeWidth={2.5} />
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
   NAV ITEM - GITHUB STYLE: NỀN XÁM, KHÔNG MÀU XANH
   ========================================================================== */
const NavItem = React.memo(({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
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

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.2);
    y.set((e.clientY - centerY) * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const Icon = active? item.ActiveIcon : item.Icon;

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        x: springX,
        y: springY,
      }}
      whileTap={{ scale: 0.9 }}
      className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 outline-none select-none touch-manipulation"
    >
      {/* NỀN ACTIVE - XÁM NHƯ GITHUB */}
      {active && (
        <motion.div
          layoutId="nav-active-pill"
          transition={SPRING}
          className="absolute inset-0 rounded-full bg-zinc-900/10 dark:bg-white/15"
        />
      )}

      <Icon
        className={`w-6 h-6 transition-colors ${
          active
           ? "text-zinc-900 dark:text-white"
            : "text-zinc-400 dark:text-zinc-500"
        }`}
      />
      
      <span
        className={`text-xs transition-all ${
          active
           ? "text-[#0A84FF] font-bold"
            : "text-zinc-500 dark:text-zinc-400 font-medium"
        }`}
      >
        {item.label}
      </span>
    </motion.button>
  );
});
NavItem.displayName = "NavItem";

/* ==========================================================================
   MAIN: BOTTOM NAV - GITHUB MOBILE STYLE
   ========================================================================== */
export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const mode = useAppStore((s) => s.mode);
  const isPlanMode = mode === "plan";

  const leftItems: NavItem[] = useMemo(() => [
    { path: "/", label: "Home", Icon: GoHome, ActiveIcon: GoHomeFill },
    { path: "/inbox", label: "Inbox", Icon: GoInbox, ActiveIcon: GoInbox },
  ], []);

  const rightItems: NavItem[] = useMemo(() => [
    { path: "/explore", label: "Explore", Icon: GoTelescope, ActiveIcon: GoTelescopeFill },
    { path: "/copilot", label: "Copilot", Icon: RiRobot2Line, ActiveIcon: RiRobot2Fill },
  ], []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const targets = ["/", "/inbox", "/explore", "/copilot", "/create/task", "/create/plan"];
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
      document.body.classList.add("modal-open");
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("touchstart", handleClickOutside);
        document.body.classList.remove("modal-open");
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

  const activeBgClass = isPlanMode? "bg-emerald-500" : "bg-blue-600";

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

        <div
          className="fixed inset-x-0 z-[70] pointer-events-none flex flex-col items-center justify-end"
          style={{
            bottom: 0,
          }}
        >
          <div
            ref={menuRef}
            className="w-full max-w-[500px] px-4 flex flex-col items-center gap-2"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
            }}
          >
            <FloatingMenu isOpen={isOpen} onSelect={handleSelectCreate} onClose={() => setIsOpen(false)} />

            {/* GITHUB STYLE: PILL XÁM NHẠT, BO TRÒN NHIỀU */}
            <motion.div
              layout
              className="w-full pointer-events-auto relative rounded-full border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden"
            >
              <div className="flex items-center justify-between h-[64px] px-2 relative">
                <div className="flex-1 grid grid-cols-2 h-full">
                  {leftItems.map((item) => (
                    <NavItem
                      key={item.path}
                      item={item}
                      active={checkActive(item.path)}
                      onClick={() => handleNavigation(item.path)}
                    />
                  ))}
                </div>

                {/* NÚT + GIỮA */}
                <div className="w-[72px] flex justify-center h-full items-center relative">
                  <motion.button
                    data-plus-button
                    onClick={() => {
                      navigator.vibrate?.(12);
                      setIsOpen(!isOpen);
                    }}
                    whileTap={{ scale: 0.9 }}
                    className="outline-none select-none touch-manipulation z-10 relative"
                  >
                    <motion.div
                      animate={{
                        rotate: isOpen? 135 : 0,
                      }}
                      transition={SPRING_BOUNCY}
                      className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg relative overflow-hidden ${
                        isOpen
                    ? "bg-zinc-900 dark:bg-zinc-800"
                          : `${activeBgClass}`
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent" />
                      <Plus className="w-6 h-6 text-white relative z-10" strokeWidth={3} />
                    </motion.div>
                  </motion.button>
                </div>

                <div className="flex-1 grid grid-cols-2 h-full">
                  {rightItems.map((item) => (
                    <NavItem
                      key={item.path}
                      item={item}
                      active={checkActive(item.path)}
                      onClick={() => handleNavigation(item.path)}
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