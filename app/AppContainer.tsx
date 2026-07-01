"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";

import { useAppStore } from "@/store/app";
import { scheduleAppTabPrefetch, prefetchAppTab } from "./tabPrefetch";
import { AnimatePresence, motion } from "framer-motion";

import CustomTabBar from "@/components/CustomTabBar";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import JobSkeleton from "@/components/JobSkeleton";
import TaskFeedPage from "./_tabs/TaskFeedPage";
import type { FeedTask } from "@/types/task";
import type { EventItem } from "@/data/events";
import { cn } from "@/lib/utils";

const ChatClient = dynamic(() => import("./chat/ChatClient"), {
  ssr: false,
  loading: () => <JobSkeleton count={1} />,
});
const TasksPage = dynamic(() => import("./_tabs/MyTasksPage"), {
  ssr: false,
  loading: () => <JobSkeleton count={5} />,
});
const ProfileTabContent = dynamic(() => import("./profile/ProfileTabContent"), {
  ssr: false,
  loading: () => <JobSkeleton count={1} />,
});

const FloatingMenu = dynamic(() => import("@/components/FloatingMenu"), {
  ssr: false,
});

type MainTab = "home" | "messages" | "tasks" | "profile" | "plans";

type AppContainerProps = {
  initialJobs: FeedTask[];
  initialPlans: FeedTask[];
  initialEvents: EventItem[];
};

export default function AppContainer({ initialJobs, initialPlans, initialEvents }: AppContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unreadCount = useAppStore((s) => s.unreadCount);
  const hideTabBar = useAppStore((s) => s.hideTabBar);
  const [mounted, setMounted] = useState(false);
  const [visitedTabs, setVisitedTabs] = useState<Set<MainTab>>(() => new Set(["home"]));

  const [currentMainTab, setCurrentMainTab] = useState<MainTab>(
    (searchParams.get("tab") as MainTab) || "home"
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabBarHeight = useTabBarHeight();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    scheduleAppTabPrefetch();
  }, []);

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(currentMainTab)) return prev;
      const next = new Set(prev);
      next.add(currentMainTab);
      return next;
    });
  }, [currentMainTab]);

  const handleChangeTab = useCallback((tab: MainTab) => {
    if (tab === currentMainTab) return;
    if (tab === "messages") prefetchAppTab("messages");
    if (tab === "tasks") prefetchAppTab("tasks");
    if (tab === "profile") prefetchAppTab("profile");
    if (tab === "home" || tab === "plans") prefetchAppTab("home");
    setCurrentMainTab(tab);
    const newUrl = tab === "home" ? "/" : `/?tab=${tab}`;
    window.history.replaceState(window.history.state, "", newUrl);
  }, [currentMainTab]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = (params.get("tab") as MainTab) || "home";
      setCurrentMainTab(tab);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
      if (menuRef.current?.contains(target) || target.closest("[data-plus-button]")) return;
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

  const handleSelectCreate = useCallback(
    (type: "task" | "plan") => {
      navigator.vibrate?.([15, 30, 15]);
      setIsMenuOpen(false);
      router.push(`/create/${type}`);
    },
    [router]
  );

  const showHome = currentMainTab === "home" || currentMainTab === "plans";

  return (
    <div className="h-dvh flex flex-col font-sans bg-white dark:bg-zinc-950 relative">
      <div
        className="flex-1 w-full max-w-2xl mx-auto overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] touch-pan-y"
        style={{ paddingBottom: mounted ? tabBarHeight : 0 }}
      >
        {(showHome || visitedTabs.has("home") || visitedTabs.has("plans")) && (
          <div className={cn(!showHome && "hidden")} aria-hidden={!showHome}>
            <TaskFeedPage initialJobs={initialJobs} initialPlans={initialPlans} />
          </div>
        )}

        {visitedTabs.has("messages") && (
          <div className={cn(currentMainTab !== "messages" && "hidden")} aria-hidden={currentMainTab !== "messages"}>
            <ChatClient initialEvents={initialEvents} />
          </div>
        )}

        {visitedTabs.has("tasks") && (
          <div className={cn(currentMainTab !== "tasks" && "hidden")} aria-hidden={currentMainTab !== "tasks"}>
            <TasksPage />
          </div>
        )}

        {visitedTabs.has("profile") && (
          <div className={cn(currentMainTab !== "profile" && "hidden")} aria-hidden={currentMainTab !== "profile"}>
            <ProfileTabContent />
          </div>
        )}
      </div>

      {mounted &&
        createPortal(
          <>
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-60 bg-white/60 dark:bg-zinc-950/40 backdrop-blur-sm"
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

            {!hideTabBar && (
            <CustomTabBar
              currentTab={currentMainTab === "plans" ? "home" : (currentMainTab as "home" | "messages" | "tasks" | "profile")}
              onChangeTab={handleChangeTab}
              unreadCount={unreadCount}
              isMenuOpen={isMenuOpen}
              onCreateClick={() => {
                navigator.vibrate?.([15, 35, 15]);
                setIsMenuOpen(true);
              }}
            />
            )}
          </>,
          document.body
        )}

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        html {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        body {
          overscroll-behavior-y: contain;
        }
      `}</style>
    </div>
  );
}
