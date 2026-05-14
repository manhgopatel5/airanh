"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { TaskListItem } from "@/types/task";
import TaskCard from "@/components/TaskCard";
import { FiBookmark, FiArrowLeft, FiSearch, FiFilter, FiGrid, FiList } from "react-icons/fi";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";
import { toast, Toaster } from "sonner";

export default function BookmarksPage() {
  const db = useMemo(() => getFirebaseDB(), []);
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "task" | "plan">("all");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const q = query(collection(db, "task_bookmarks"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      try {
        const taskIds: string[] = snap.docs.map((d) => d.data()?.taskId).filter(Boolean);
        if (taskIds.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        const chunks: string[][] = [];
        for (let i = 0; i < taskIds.length; i += 10) chunks.push(taskIds.slice(i, i + 10));

        const taskArrays = await Promise.all(
          chunks.map(async (chunk) => {
            const snaps = await Promise.all(chunk.map((id) => getDoc(doc(db, "tasks", id))));
            return snaps
             .filter((s) => s.exists() && s.data()?.status!== "cancelled" &&!s.data()?.banned)
             .map((s) => ({ id: s.id,...s.data() } as TaskListItem));
          })
        );

        const allTasks = taskArrays.flat().sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setTasks(allTasks);
        navigator.vibrate?.(5);
      } catch (e) {
        console.error("Load bookmarks error:", e);
        toast.error("Lỗi tải dữ liệu");
        setTasks([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [user, router, db]);

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (filter!== "all") filtered = filtered.filter((t) => t.type === filter);
    if (search) filtered = filtered.filter((t) => t.title?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()));
    return filtered;
  }, [tasks, filter, search]);

  const stats = useMemo(() => ({
    total: tasks.length,
    tasks: tasks.filter((t) => t.type === "task").length,
    plans: tasks.filter((t) => t.type === "plan").length,
  }), [tasks]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F2F2F7] dark:bg-black pb-24">
      <Toaster richColors position="top-center" />

      {/* Header - iOS style */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-black/5 dark:border-white/10">
        <div className="max-w-[720px] mx-auto px-4 h-">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-9 h-9 -ml-1 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all">
              <FiArrowLeft size={22} className="text-[#0a84ff]" />
            </Link>
            <div className="flex-1">
              <h1 className="text- font-bold leading-tight">Đã lưu</h1>
              <p className="text- text-[#8e8e93] leading-tight">{stats.total} mục • {stats.tasks} việc • {stats.plans} kế hoạch</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewMode(viewMode === "list"? "grid" : "list")} className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all">
                {viewMode === "list"? <FiGrid size={18} className="text-[#8e8e93]" /> : <FiList size={20} className="text-[#8e8e93]" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[720px] mx-auto px-4 py-4">
        {/* Search & Filter */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 space-y-3">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm trong mục đã lưu" className="w-full h-10 pl-10 pr-3 bg-white dark:bg-zinc-900 rounded-xl outline-none text- border-black/5 dark:border-white/10 focus:border-[#0a84ff]/50 focus:ring-4 focus:ring-[#0a84ff]/10 transition-all" />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {[
              { id: "all", label: "Tất cả", count: stats.total },
              { id: "task", label: "Công việc", count: stats.tasks },
              { id: "plan", label: "Kế hoạch", count: stats.plans },
            ].map((tab) => (
              <button key={tab.id} onClick={() => { setFilter(tab.id as any); navigator.vibrate?.(5); }} className={`h-8 px-3.5 rounded-full text- font-medium whitespace-nowrap transition-all active:scale-95 ${filter === tab.id? "bg-[#0a84ff] text-white shadow-lg shadow-[#0a84ff]/20" : "bg-white dark:bg-zinc-900 text-[#3a3a3c] dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/5 border-black/5 dark:border-white/10"}`}>
                {tab.label} <span className={`ml-1 ${filter === tab.id? "opacity-80" : "opacity-60"}`}>({tab.count})</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {loading? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border-black/5 dark:border-white/5">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-[#E5E5EA] dark:bg-zinc-800 rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2.5">
                      <div className="h-4 bg-[#E5E5EA] dark:bg-zinc-800 rounded-lg w-1/3 animate-pulse" />
                      <div className="h-4 bg-[#E5E5EA] dark:bg-zinc-800 rounded-lg w-3/4 animate-pulse" />
                      <div className="h-16 bg-[#E5E5EA] dark:bg-zinc-800 rounded-2xl animate-pulse" />
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="flex justify-center pt-4">
                <LottiePlayer animationData={loadingPull} loop autoplay className="w-12 h-12 opacity-60" />
              </div>
            </motion.div>
          ) : filteredTasks.length === 0? (
            <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-16">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#0a84ff]/20 to-[#5e5ce6]/20 rounded-full blur-2xl" />
                <div className="relative w-full h-full bg-white dark:bg-zinc-900 rounded-full grid place-items-center shadow-xl border-black/5 dark:border-white/10">
                  <FiBookmark className="text-[#8e8e93]" size={40} strokeWidth={1.5} />
                </div>
              </motion.div>

              <h2 className="text-xl font-bold text-black dark:text-white mb-2">{search || filter!== "all"? "Không tìm thấy" : "Chưa có mục nào"}</h2>
              <p className="text- text-[#8e8e93] max-w-xs mx-auto leading-relaxed mb-8">{search || filter!== "all"? "Thử tìm với từ khóa khác hoặc đổi bộ lọc" : "Lưu các công việc và kế hoạch bạn quan tâm để xem lại sau"}</p>

              {!search && filter === "all" && (
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/" className="inline-flex items-center gap-2 px-6 h-12 rounded-2xl text-white font-semibold bg-[#0a84ff] shadow-lg shadow-[#0a84ff]/25 active:shadow-md transition-all">
                    <span>Khám phá ngay</span>
                  </Link>
                </motion.div>
              )}

              {(search || filter!== "all") && (
                <button onClick={() => { setSearch(""); setFilter("all"); }} className="px-5 h-10 rounded-xl bg-white dark:bg-zinc-900 font-medium text-[#0a84ff] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all">
                  Xóa bộ lọc
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={viewMode === "grid"? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "space-y-3"}>
              <AnimatePresence>
                {filteredTasks.map((task, index) => (
                  <motion.div key={task.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.03, type: "spring", stiffness: 400, damping: 25 }} layout>
                    <div className="group relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-[#0a84ff]/0 via-[#0a84ff]/10 to-[#5e5ce6]/0 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
                      <div className="relative">
                        <TaskCard task={task} mode={task.type} />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats footer */}
        {!loading && filteredTasks.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-8 pt-6 border-t border-black/5 dark:border-white/5">
            <p className="text-center text- text-[#8e8e93]">
              Hiển thị {filteredTasks.length} / {stats.total} mục đã lưu
            </p>
          </motion.div>
        )}
      </div>

      <style jsx global>{`
       .scrollbar-hide::-webkit-scrollbar { display: none; }
       .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}