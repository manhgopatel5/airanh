"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import dynamic from 'next/dynamic';
import useSWR from 'swr'; // THÊM

import { useAppStore } from "@/store/app";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster } from "sonner";

import CustomTabBar from "@/components/CustomTabBar";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import JobSkeleton from "@/components/JobSkeleton";
import type { FeedTask } from '@/types/task';

const TaskFeedPage = dynamic(() => import('./_tabs/TaskFeedPage'), {
  loading: () => <JobSkeleton count={5} />,
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

const FloatingMenu = dynamic(() => import('@/components/FloatingMenu'), {
  ssr: false
})

type MainTab = "home" | "messages" | "tasks" | "profile";

interface AppContainerProps {
  initialJobs?: FeedTask[];
}

// THÊM: Fetcher cho SWR
const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AppContainer({ initialJobs = [] }: AppContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unreadCount = useAppStore((s) => s.unreadCount);
  const [mounted, setMounted] = useState(false);

  const [currentMainTab, setCurrentMainTab] = useState<MainTab>(
    (searchParams.get("tab") as MainTab) || "home"
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabBarHeight = useTabBarHeight();

  // THÊM: Dùng SWR với fallbackData = initialJobs từ SSR
  // 0ms có UI, sau 60s tự revalidate ngầm 1 lần
  const { data: jobs } = useSWR<FeedTask[]>(
    currentMainTab === 'home'? '/api/jobs' : null,
    fetcher,
    {
      fallbackData: initialJobs, // Key: Dùng data SSR
      revalidateOnFocus: true, // User quay lại tab = check mới
      dedupingInterval: 60000, // 1 phút mới gọi API 1 lần
      revalidateOnReconnect: true,
    }
  );

  useEffect(() => setMounted(true), []);

  const handleChangeTab = useCallback((tab: MainTab) => {
    setCurrentMainTab(tab);
    const newUrl = tab === "home"? "/" : `/?tab=${tab}`;
    router.replace(newUrl, { scroll: false });
  }, [router]);

  useEffect(() => {
    const tabFromUrl = (searchParams.get("tab") as MainTab) || "home";
    if (tabFromUrl!== currentMainTab) {
      setCurrentMainTab(tabFromUrl);
    }
  }, [searchParams, currentMainTab]);

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

  const renderCurrentTab = () => {
    switch (currentMainTab) {
      case "home":
        // SỬA: Truyền jobs từ SWR thay vì initialJobs
        return <TaskFeedPage initialJobs={jobs || initialJobs} />
      case "messages":
        return <ChatClient />
      case "tasks":
        return <TasksPage />
      case "profile":
        return <ProfileTabContent />
      default:
        return <TaskFeedPage initialJobs={jobs || initialJobs} />
    }
  }

  return (
    <div className="h-screen flex flex-col font-sans bg-white dark:bg-zinc-950 select-none relative">
      <Toaster richColors position="top-center" toastOptions={{ duration: 2000, style: { fontSize: "14px" } }} />

      <div
        className="flex-1 w-full max-w-2xl mx-auto overflow-y-auto [-webkit-overflow-scrolling:touch] overscroll-y-contain"
        style={{ paddingBottom: tabBarHeight + 24 }}
      >
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