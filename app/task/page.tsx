"use client";

import { useEffect, useState, useCallback } from "react";
import { useTaskFeed } from "@/hooks/useTaskFeed";
import TaskFeed from "@/components/TaskFeed";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { FiLoader, FiRefreshCw } from "react-icons/fi";
import type { AppMode } from "@/types/app";

type TabId = "hot" | "near" | "friends" | "new";

export default function TaskPage() {
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  const [mode] = useState<AppMode>("task");
  const {
    tasks,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh
  } = useTaskFeed(activeTab); // FIX: Bỏ newTaskCount, resetNewTaskCount

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    navigator.vibrate?.(5);

    try {
      await refresh();
      toast.success("Đã cập nhật");
    } catch {
      toast.error("Lỗi tải dữ liệu");
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refresh]);

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500 &&
      !loadingMore &&
        hasMore &&
      !loading
      ) {
        loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loadingMore, hasMore, loading, loadMore]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-zinc-900 shadow-lg rounded-full px-4 py-2 flex items-center gap-2"
          >
            <FiRefreshCw className="animate-spin text-[#0A84FF]" size={16} />
            <span className="text-sm font-medium">Đang làm mới...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-hide">
          {([
            { id: "hot", label: "Hot" },
            { id: "near", label: "Gần bạn" },
            { id: "friends", label: "Bạn bè" },
            { id: "new", label: "Mới" },
          ] as { id: TabId; label: string }[]).map((tab) => (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setActiveTab(tab.id);
                navigator.vibrate?.(5);
              }}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                ? "bg-[#0A84FF] text-white"
                  : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 active:bg-zinc-200 dark:active:bg-zinc-800"
              }`}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="pb-20">
        {loading? (
          <div className="space-y-3 px-4 pt-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-4 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0? (
          <EmptyState tab={activeTab} type={mode} onRefresh={handleRefresh} />
        ) : (
          <>
            <TaskFeed
              tasks={tasks}
              mode={mode}
              activeTab={activeTab}
            />

            {/* Load more indicator */}
            {loadingMore && (
              <div className="flex justify-center py-6">
                <FiLoader className="animate-spin text-zinc-400" size={24} />
              </div>
            )}

            {!hasMore && tasks.length > 0 && (
              <p className="text-center text-sm text-zinc-400 dark:text-zinc-600 py-6">
                Đã xem hết rồi
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}