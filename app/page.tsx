"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthContext";
import { useAppStore } from "@/store/app";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useDragControls
} from "framer-motion";
import { Toaster } from "sonner";
import { Sparkles, CalendarRange } from "lucide-react";
import { FiLoader } from "react-icons/fi";

import ChatClient from "./chat/ChatClient";
import ProfileTabContent from "./profile/ProfileTabContent";
import TaskFeedPage from "./_tabs/TaskFeedPage";
import TasksPage from "./_tabs/MyTasksPage";
import CustomTabBar from "@/components/CustomTabBar";

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
          className="w-full max-w-[500px] mx-auto bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] pointer-events-auto flex flex-col gap-3 select-none mb-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: {...SPRING, delay: 0.05 } }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect("task")}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Sparkles className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">Hỗ trợ tức thì</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 leading-tight">Đăng việc nhanh, có người nhận ngay</p>
              </div>
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: {...SPRING, delay: 0.1 } }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelect("plan")}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-left"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CalendarRange className="w-6 h-6" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <h4 className="font-black text-zinc-900 dark:text-zinc-100 text-sm tracking-tight">Cùng chung sở thích</h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mt-0.5 leading-tight">Gặp gỡ những người cùng đam mê</p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
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

  const isPlanMode = mode === "plan";

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

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <FiLoader className={`animate-spin ${activeColorClass}`} size={32} />
          <p className="text-sm text-gray-500">Đang tải...</p>
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
          {loadedTabs.has("tasks") && <TasksPage />}
        </div>
        <div className={currentMainTab!== "profile"? "hidden" : ""}>
          {loadedTabs.has("profile") && <ProfileTabContent onNavigateTab={(tab) => setCurrentMainTab(tab)} />}
        </div>
      </div>

      {mounted && createPortal(
        <>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
                animate={{ opacity: 1, backdropFilter: "blur(8px)" }}
                exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="fixed inset-0 z-[60] bg-zinc-950/20 dark:bg-zinc-950/40"
                onClick={() => setIsMenuOpen(false)}
              />
            )}
          </AnimatePresence>

          <div className="fixed bottom-0 inset-x-0 z-[70] pointer-events-none">
            <div ref={menuRef} className="w-full flex-col items-center">
              <FloatingMenu
                isOpen={isMenuOpen}
                onSelect={handleSelectCreate}
                onClose={() => setIsMenuOpen(false)}
              />
            </div>
          </div>

          <CustomTabBar
            currentTab={currentMainTab}
            onChangeTab={setCurrentMainTab}
            onCreateClick={() => {
              navigator.vibrate?.([15, 35, 15]);
              setIsMenuOpen(true);
            }}
          />
        </>,
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