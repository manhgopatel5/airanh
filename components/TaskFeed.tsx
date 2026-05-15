"use client";
import { Task } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import EmptyState from "@/components/EmptyState";
import { AppMode } from "@/types/app";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useMemo, useState, useRef, useEffect } from "react";
import { FiGrid, FiList, FiSliders, FiTrendingUp, FiMapPin, FiUsers, FiClock } from "react-icons/fi";

type TabId = "hot" | "near" | "friends" | "new";

type Props = {
  tasks: Task[];
  mode: AppMode;
  activeTab: TabId;
  onShare?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 450, damping: 28, mass: 0.6 },
  },
  exit: { opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.18 } },
};

export default function TaskFeed({ tasks, mode, activeTab, onShare, onDelete, onTaskUpdate }: Props) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<"newest" | "price" | "distance">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

const sortedTasks = useMemo(() => {
  const sorted = [...tasks];

  switch (sortBy) {
    case "price":
      return sorted.sort((a, b) => {
        const priceA =
          a.type === "task" ? a.price || 0 : 0;

        const priceB =
          b.type === "task" ? b.price || 0 : 0;

        return priceB - priceA;
      });

    case "distance":
      return sorted.sort((a, b) => {
        const distanceA =
          "distance" in a ? a.distance || 999 : 999;

        const distanceB =
          "distance" in b ? b.distance || 999 : 999;

        return distanceA - distanceB;
      });

    default:
      return sorted.sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() || 0) -
          (a.createdAt?.toMillis?.() || 0)
      );
  }
}, [tasks, sortBy]);

  const tabConfig = useMemo(() => ({
    hot: { icon: FiTrendingUp, label: "Hot", color: "#ff3b30" },
    near: { icon: FiMapPin, label: "Gần bạn", color: "#0a84ff" },
    friends: { icon: FiUsers, label: "Bạn bè", color: "#30d158" },
    new: { icon: FiClock, label: "Mới nhất", color: "#af52de" },
  }), []);

  const currentTab = tabConfig[activeTab];

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  if (tasks.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
        <EmptyState tab={activeTab} type={mode} />
      </motion.div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Header bar */}
      <div className="sticky top-0 z-10 bg-[#F2F2F7]/80 dark:bg-black/80 backdrop-blur-2xl border-b border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between px-4 h-11">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg grid place-items-center" style={{ backgroundColor: `${currentTab.color}15` }}>
              <currentTab.icon size={14} style={{ color: currentTab.color }} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text- font-semibold leading-tight">{currentTab.label}</p>
              <p className="text- text-[#8e8e93] leading-tight">{sortedTasks.length} {mode === "task"? "công việc" : "kế hoạch"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setShowFilters(!showFilters); navigator.vibrate?.(3); }} className={`w-8 h-8 grid place-items-center rounded-lg transition-colors ${showFilters? "bg-[#0a84ff]/10 text-[#0a84ff]" : "hover:bg-black/5 dark:hover:bg-white/10 text-[#8e8e93]"}`}>
              <FiSliders size={16} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setViewMode(viewMode === "list"? "grid" : "list"); navigator.vibrate?.(3); }} className="w-8 h-8 grid place-items-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-[#8e8e93] transition-colors">
              {viewMode === "list"? <FiGrid size={16} /> : <FiList size={16} />}
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-black/5 dark:border-white/5">
              <div className="px-4 py-3 flex items-center gap-2">
                {[
                  { id: "newest", label: "Mới nhất" },
                  { id: "price", label: "Giá cao" },
                  { id: "distance", label: "Gần nhất" },
                ].map((opt) => (
                  <button key={opt.id} onClick={() => { setSortBy(opt.id as any); navigator.vibrate?.(3); }} className={`h-7 px-3 rounded-full text-xs font-medium transition-all active:scale-95 ${sortBy === opt.id? "bg-[#0a84ff] text-white shadow-md shadow-[#0a84ff]/20" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Feed */}
      <LayoutGroup>
        <motion.div variants={containerVariants} initial="hidden" animate="show" className={viewMode === "grid"? "grid grid-cols-1 sm:grid-cols-2 gap-3 p-4" : "space-y-0"}>
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task, index) => (
              <motion.div key={task.id} variants={itemVariants} layout layoutId={task.id} initial="hidden" animate="show" exit="exit" className={viewMode === "list"? "px-0" : ""} style={{ zIndex: sortedTasks.length - index }} whileHover={{ y: viewMode === "list"? 0 : -2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                <div className={viewMode === "list"? "border-b border-black/5 dark:border-white/5 last:border-0" : ""}>
                  <div className={viewMode === "list"? "px-4 py-0" : ""}>
                    <TaskCard task={task} mode={mode} theme={mode} {...(onDelete && { onDelete })} {...(onShare && { onShare: () => onShare(task) })} {...(onTaskUpdate && { onTaskUpdate })} />
                  </div>
                </div>

                {/* Separator glow on hover */}
                {viewMode === "list" && index < sortedTasks.length - 1 && (
                  <div className="absolute left-4 right-4 bottom-0 h-px bg-gradient-to-r from-transparent via-[#0a84ff]/0 to-transparent group-hover:via-[#0a84ff]/20 transition-all pointer-events-none" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* Load more indicator */}
      {sortedTasks.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center py-8">
          <div className="flex items-center gap-2 text-xs text-[#8e8e93]">
            <div className="w-1 h-1 rounded-full bg-[#8e8e93] animate-pulse" />
            <span>Đã hiển thị {sortedTasks.length} mục</span>
            <div className="w-1 h-1 rounded-full bg-[#8e8e93] animate-pulse" style={{ animationDelay: "0.2s" }} />
          </div>
        </motion.div>
      )}

      {/* Pull to refresh hint */}
      <div className="h-20" />
    </div>
  );
}