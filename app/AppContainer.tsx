"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import dynamic from 'next/dynamic';

import { useAppStore } from "@/store/app";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";

import CustomTabBar from "@/components/CustomTabBar";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import JobSkeleton from "@/components/JobSkeleton";
import type { FeedTask } from '@/types/task';

// 1. DYNAMIC IMPORT: Giảm 400KB JS ban đầu. Chỉ tab home SSR
const TaskFeedPage = dynamic(() => import('./_tabs/TaskFeedPage'), {
  loading: () => <JobSkeleton theme="task" count={5} />,
  ssr: true // SEO + FCP nhanh cho tab chính
})
const PlanFeedPage = dynamic(() => import('./_tabs/PlanFeedPage'), {
  loading: () => <JobSkeleton theme="plan" count={5} />,
  ssr: true
})
const ChatClient = dynamic(() => import('./chat/ChatClient'), { 
  ssr: false,
  loading: () => <JobSkeleton count={1} /> 
})
const TasksPage = dynamic(() => import('./_tabs/MyTasksPage'), { 
  ssr: false,
  loading: () => <JobSkeleton count={5} /> 
})
const ProfileTabContent = dynamic(() => import('./profile/ProfileTabContent'), { 
  ssr: false,
  loading: () => <JobSkeleton count={1} /> 
})

// 2. TÁCH FRAMER-MOTION: 120KB chỉ load khi bấm nút +
const FloatingMenu = dynamic(() => import('@/components/FloatingMenu'), { 
  ssr: false
})

type MainTab = "home" | "messages" | "tasks" | "profile";

interface AppContainerProps {
  initialJobs?: FeedTask[]; // Nhận từ Server Component page.tsx
}

export default function AppContainer({ initialJobs = [] }: AppContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ĐÃ DÙNG: mode để switch Task/Plan, unreadCount cho badge
  const mode = useAppStore((s) => s.mode);
  const unreadCount = useAppStore((s) => s.unreadCount);
  const [mounted, setMounted] = useState(false);

  const [currentMainTab, setCurrentMainTab] = useState<MainTab>(
    (searchParams.get("tab") as MainTab) || "home"
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabBarHeight = useTabBarHeight();

  useEffect(() => setMounted(true), []);

  // 3. ĐÃ XÓA useEffect check user. Middleware.ts lo

  const handleChangeTab = useCallback((tab: MainTab) => {
    setCurrentMainTab(tab);
    const newUrl = tab === "home"? "/" : `/?tab=${tab}`;
    router.replace(newUrl, { scroll: false });
  }, [router]);

  // 4. Đồng bộ tab từ URL khi back/forward
  useEffect(() => {
    const tabFromUrl = (searchParams.get("tab") as MainTab) || "home";
    if (tabFromUrl!== currentMainTab) {
      setCurrentMainTab(tabFromUrl);
    }
  }, [searchParams, currentMainTab]);

  // Đóng menu bằng ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click ngoài đóng menu + lock scroll
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

  // 5. SỬA: Dùng mode để render đúng feed, không bị lỗi unused var
  const renderCurrentTab = () => {
    switch (currentMainTab) {
      case "home":
        return mode === 'task'
         ? <TaskFeedPage initialJobs={initialJobs.filter(j => j.type === 'task')} />
          : <PlanFeedPage initialJobs={initialJobs.filter(j => j.type === 'plan')} />
      case "messages":
        return <ChatClient />
      case "tasks":
        return <TasksPage />
      case "profile":
        return <ProfileTabContent />
      default:
        return <TaskFeedPage initialJobs={initialJobs} />
    }
  }

  return (
    <div className="h-screen flex flex-col font-sans bg-white dark:bg-zinc-950 select-none relative">
      <Toaster richColors position="top-center" toastOptions={{ duration: 2000, style: { fontSize: "14px" } }} />

      <div
        className="flex-1 w-full max-w-2xl mx-auto overflow-y-auto [-webkit-overflow-scrolling:touch] overscroll-y-contain"
        style={{ paddingBottom: tabBarHeight + 24 }}
      >
        {/* 6. Render có điều kiện: Unmount tab cũ để đỡ RAM */}
        {renderCurrentTab()}
      </div>

      {mounted && createPortal(
        <>
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-[60] bg-zinc-950/20 dark:bg-zinc-950/40 backdrop-blur-sm"
                onClick={() => setIsMenuOpen(false)}
              />
            )}
          </AnimatePresence>

          <div className="fixed inset-0 z-[70] pointer-events-none flex items-center justify-center p-5">
            <div ref={menuRef} className="w-full max-w-[500px] pointer-events-auto">
              {isMenuOpen && (
                <FloatingMenu
                  isOpen={isMenuOpen}
                  onSelect={handleSelectCreate}
                  onClose={() => setIsMenuOpen(false)}
                />
              )}
            </div>
          </div>

          <CustomTabBar
            currentTab={currentMainTab}
            onChangeTab={handleChangeTab}
            unreadCount={unreadCount}
            isMenuOpen={isMenuOpen}
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