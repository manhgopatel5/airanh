"use client";
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
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
import { Toaster } from "sonner";
import {
  Home as HomeIcon, MessageSquare, ClipboardList, User, Plus,
  Sparkles, CalendarRange
} from "lucide-react";
import { FiLoader } from "react-icons/fi";

import ChatClient from "./chat/ChatClient";
import ProfileTabContent from "./profile/ProfileTabContent";
import TaskFeedPage from "./_tabs/TaskFeedPage";
import MyTasksPage from "./_tabs/MyTasksPage";

type MainTab = "home" | "messages" | "tasks" | "profile";

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

const FloatingMenu = ({
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
            if (info.offset.y > 80 || info.velocity.y > 500) onClose();
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
            animate={{ opacity: 1, x: 0, transition: {...SPRING, delay: 0.05 } }}
            whileHover={{ scale: 1.02, x: 4, backgroundColor: "rgba(0,0,0,0.03)" }}
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
            animate={{ opacity: 1, x: 0, transition: {...SPRING, delay: 0.1 } }}
            whileHover={{ scale: 1.02, x: 4, backgroundColor: "rgba(0,0,0,0.03)" }}
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
};

const MagneticNavItem = ({
  item,
  active,
  onClick,
  activeColorClass,
  
}: {
  item: { id: MainTab; label: string; Icon: any };
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
 

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * 0.28);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.28);
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


      <motion.div
       animate={{ y: 0, scale: 1 }}
        transition={SPRING}
        className="relative z-10"
      >
        <motion.div animate={active? { rotate: [0, -6, 6, 0] } : {}} transition={{ duration: 0.5 }}>
          <item.Icon
            className={`w-[23px] h-[23px] transition-colors duration-300 ${
              active? activeColorClass : "text-zinc-400 dark:text-zinc-500"
            }`}
            strokeWidth={active? 2.7 : 2.2}
          />
        </motion.div>
  
      </motion.div>

      <motion.span
     animate={{ y: 0, scale: 1 }}
        transition={SPRING}
        className={`relative z-10 text-[11px] mt-1.5 tracking-tight transition-all duration-300 ${
          active? `${activeColorClass} font-bold` : "text-zinc-400 dark:text-zinc-500 font-semibold"
        }`}
      >
        {item.label}
      </motion.span>

      
    </motion.button>
  );
};

export default function AppContainer() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const mode = useAppStore((s) => s.mode);
  const [mounted, setMounted] = useState(false);
  const [currentMainTab, setCurrentMainTab] = useState<MainTab>("home");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Set<MainTab>>(new Set(["home"]));
  const menuRef = useRef<HTMLDivElement>(null);

  const plusX = useMotionValue(0);
  const plusY = useMotionValue(0);
  const plusSpringX = useSpring(plusX, SPRING);
  const plusSpringY = useSpring(plusY, SPRING);

  const isPlanMode = mode === "plan";

  const mainNavItems = useMemo(() => [
    { id: "home" as MainTab, label: "Home", Icon: HomeIcon },
    { id: "messages" as MainTab, label: "Messages", Icon: MessageSquare },
    { id: "tasks" as MainTab, label: "Tasks", Icon: ClipboardList },
    { id: "profile" as MainTab, label: "Profile", Icon: User },
  ], []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    setLoadedTabs(prev => new Set(prev).add(currentMainTab));
  }, [currentMainTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (menuRef.current?.contains(target) || target.closest('[data-plus-button]')) return;
      setIsMenuOpen(false);
    };

    if (isMenuOpen) {
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
  }, [isMenuOpen]);

  const handleSelectCreate = useCallback((type: "task" | "plan") => {
    navigator.vibrate?.([15, 30, 15]);
    setIsMenuOpen(false);
    router.push(`/create/${type}`);
  }, [router]);

  const activeColorClass = isPlanMode? "text-emerald-500" : "text-blue-600";
  const activeBgClass = isPlanMode? "bg-emerald-500" : "bg-blue-600";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <FiLoader className={`animate-spin ${activeColorClass}`} size={32} />
          <p className="text-[14px] text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28 font-sans bg-white dark:bg-zinc-950 select-none relative">
      <Toaster richColors position="top-center" toastOptions={{ duration: 2000, style: { fontSize: "14px" } }} />

      <div className="w-full max-w-2xl mx-auto">
        <div className={currentMainTab!== "home"? "hidden" : ""}>
          {loadedTabs.has("home") && <TaskFeedPage />}
        </div>
        <div className={currentMainTab!== "messages"? "hidden" : ""}>
          {loadedTabs.has("messages") && <ChatClient />}
        </div>
        <div className={currentMainTab!== "tasks"? "hidden" : ""}>
          {loadedTabs.has("tasks") && <MyTasksPage />}
        </div>
        <div className={currentMainTab!== "profile"? "hidden" : ""}>
          {loadedTabs.has("profile") && <ProfileTabContent onNavigateTab={(tab) => setCurrentMainTab(tab)} />}
        </div>
      </div>

      {mounted && createPortal(
        <MotionConfig transition={SPRING}>
          <LayoutGroup id="app-global-navigation-flow">
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                  exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className="fixed inset-0 z-[60] bg-zinc-950/20 dark:bg-zinc-950/40 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <div className="fixed bottom-0 inset-x-0 z-[70] pointer-events-none flex flex-col items-center justify-end">
              <div ref={menuRef} className="w-full max-w-[480px] px-4 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
                <FloatingMenu
                  isOpen={isMenuOpen}
                  onSelect={handleSelectCreate}
                  onClose={() => setIsMenuOpen(false)}
                />

           <motion.div
  layout
  className="w-full pointer-events-auto relative border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
>

              

                  <div className="flex items-center justify-between h-16 px-2 relative">
                    <div className="flex-1 grid grid-cols-2 h-full">
                      {mainNavItems.slice(0, 2).map((item) => (
                        <MagneticNavItem
                          key={item.id}
                          item={item}
                          active={currentMainTab === item.id}
                          onClick={() => {
                            setCurrentMainTab(item.id);
                            navigator.vibrate?.(10);
                          }}
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
                          setIsMenuOpen(!isMenuOpen);
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
                          {!isMenuOpen && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="absolute inset-0 -m-1"
                            >
                              <motion.div
                                className={`absolute inset-0 rounded-full opacity-60`}
                                style={{
                                  background: `conic-gradient(from 0deg, ${isPlanMode? '#10b981' : '#3b82f6'}00, ${isPlanMode? '#10b981' : '#3b82f6'}80, ${isPlanMode? '#10b981' : '#3b82f6'}00)`,
                                  filter: 'blur(8px)',
                                }}
                                animate={{ rotate: 360 }}
                                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <AnimatePresence>
                          {!isMenuOpen && (
                            <motion.div
                              initial={{ scale: 1, opacity: 0 }}
                              animate={{ 
                                scale: [1, 1.15, 1],
                                opacity: [0.5, 0.2, 0.5]
                              }}
                              exit={{ opacity: 0 }}
                              transition={{ 
                                duration: 2.5, 
                                repeat: Infinity,
                                ease: "easeInOut" 
                              }}
                              className={`absolute inset-0 rounded-full ${activeBgClass}`}
                            />
                          )}
                        </AnimatePresence>

                        <motion.div
                          animate={{
                            rotate: isMenuOpen? 135 : 0,
                            borderRadius: isMenuOpen? "16px" : "50%",
                            scale: isMenuOpen? 0.9 : 1
                          }}
                          whileHover={{ scale: isMenuOpen? 0.9 : 1.08 }}
                          whileTap={{ scale: 0.82 }}
                          transition={SPRING_BOUNCY}
                          className={`w-14 h-14 flex items-center justify-center text-white relative overflow-hidden transition-colors duration-500 ${
                            isMenuOpen
                            ? "bg-zinc-900 dark:bg-zinc-800"
                              : activeBgClass
                          }`}
                        >
                          {!isMenuOpen && (
                            <motion.div
                              className="absolute inset-0 opacity-60"
                              style={{
                                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4), transparent 60%)`,
                              }}
                              animate={{
                                x: ["-30%", "30%", "-30%"],
                                y: ["-30%", "30%", "-30%"],
                              }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            />
                          )}
                          
                          <div 
                            className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")`
                            }}
                          />
                          
                          <Plus className="w-6 h-6 relative z-10" strokeWidth={3.5} />
                        </motion.div>
                      </motion.button>
                    </div>

                    <div className="flex-1 grid grid-cols-2 h-full">
                      {mainNavItems.slice(2, 4).map((item) => (
                        <MagneticNavItem
                          key={item.id}
                          item={item}
                          active={currentMainTab === item.id}
                          onClick={() => {
                            setCurrentMainTab(item.id);
                            navigator.vibrate?.(10);
                          }}
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
      )}

      <style jsx global>{`
       .scrollbar-hide::-webkit-scrollbar{display:none}
       .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
        html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
        body{overscroll-behavior-y:contain}
      `}</style>
    </div>
  );
}