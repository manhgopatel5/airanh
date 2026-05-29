"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import dynamic from 'next/dynamic';
import useSWR from 'swr';

import { useAppStore } from "@/store/app";
import { AnimatePresence, motion } from "framer-motion";

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

type MainTab = "home" | "messages" | "tasks" | "profile" | "plans";

interface AppContainerProps {
  initialJobs?: FeedTask[];
  initialPlans?: FeedTask[];
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AppContainer({ initialJobs = [], initialPlans = [] }: AppContainerProps) {
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

  // Public feeds are prefetched and kept warm so Task/Plan switching is instant.
  const { data: jobs } = useSWR<FeedTask[]>(
    '/api/jobs?type=task&limit=12',
    fetcher,
    {
      fallbackData: initialJobs,
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000,
      keepPreviousData: true,
    }
  );

  const { data: plans } = useSWR<FeedTask[]>(
    '/api/jobs?type=plan&limit=12',
    fetcher,
    {
      fallbackData: initialPlans,
      revalidateOnMount: false,
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 300000,
      keepPreviousData: true,
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
      case "plans":
        return <TaskFeedPage initialJobs={jobs || initialJobs} initialPlans={plans || initialPlans} />
      case "messages":
        return <ChatClient />
      case "tasks":
        return <TasksPage />
      case "profile":
        return <ProfileTabContent />
      default:
        return <TaskFeedPage initialJobs={jobs || initialJobs} initialPlans={plans || initialPlans} />
    }
  }

  return (
    <div className="h-dvh flex flex-col font-sans bg-white dark:bg-zinc-950 relative">
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
  currentTab={currentMainTab === "plans"? "home" : currentMainTab as "home" | "messages" | "tasks" | "profile"}
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