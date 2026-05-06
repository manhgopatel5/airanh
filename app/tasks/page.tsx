"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiInbox, FiZap, FiCalendar } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Task } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import { toast, Toaster } from "sonner";

type MainTab = "task" | "plan";
type SubTab = "mine" | "saved" | "doing" | "applied" | "completed";

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: "mine", label: "Của tôi" },
  { key: "saved", label: "Đã lưu" },
  { key: "doing", label: "Đang nhận" },
  { key: "applied", label: "Đã ứng tuyển" },
  { key: "completed", label: "Hoàn thành" },
];

export default function TasksPage() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("task"); // Task trước giống trang chủ
  const [subTab, setSubTab] = useState<SubTab>("mine");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Plan = xanh lá, Task = xanh dương
  const theme = {
    plan: {
      bg: "bg-green-500",
      bgHover: "hover:bg-green-600",
      text: "text-green-600 dark:text-green-400",
      textActive: "text-green-600 dark:text-green-400",
      bgLight: "bg-green-500 text-white",
      shadow: "shadow-green-500/20",
      icon: FiCalendar,
    },
    task: {
      bg: "bg-blue-500",
      bgHover: "hover:bg-blue-600",
      text: "text-blue-600 dark:text-blue-400", 
      textActive: "text-blue-600 dark:text-blue-400",
      bgLight: "bg-blue-500 text-white",
      shadow: "shadow-blue-500/20",
      icon: FiZap,
    }
  }[mainTab];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (!user) router.push("/login");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    fetchTasks();
  }, [currentUser, mainTab, subTab]);

  const fetchTasks = async () => {
    if (!currentUser) return;
    setLoading(true);
    
    try {
      const baseCollection = collection(db, "tasks");
      let q;
      
      switch (subTab) {
        case "mine":
          q = query(
            baseCollection, 
            where("userId", "==", currentUser.uid),
            where("type", "==", mainTab)
          );
          break;
        case "saved":
          q = query(
            baseCollection,
            where("savedBy", "array-contains", currentUser.uid),
            where("type", "==", mainTab)
          );
          break;
        case "doing":
          q = query(
            baseCollection,
            where("assignees", "array-contains", currentUser.uid),
            where("status", "==", "doing"),
            where("type", "==", mainTab)
          );
          break;
        case "applied":
          q = query(
            baseCollection,
            where("applicants", "array-contains", currentUser.uid),
            where("status", "in", ["open", "pending"]),
            where("type", "==", mainTab)
          );
          break;
        case "completed":
          q = query(
            baseCollection,
            where("assignees", "array-contains", currentUser.uid),
            where("status", "==", "completed"),
            where("type", "==", mainTab)
          );
          break;
      }

      const snap = await getDocs(q);
      const data = snap.docs
      .map(doc => ({ id: doc.id,...doc.data() } as Task))
      .filter(t => t.status!== "deleted" && t.status!== "cancelled")
      .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()); // Sort client
      
      setTasks(data);
    } catch (err) {
      console.error(err);
      toast.error("Tải dữ liệu thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 select-none pb-28">
        {/* Header mới giống trang chủ - không có chữ "Nhiệm vụ" + dấu cộng */}
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
          <div className="h-0.5 w-full bg-zinc-200 dark:bg-zinc-800">
            <motion.div 
              className={`h-full ${theme.bg}`} 
              animate={{ width: `${((SUB_TABS.findIndex(t => t.key === subTab) + 1) / SUB_TABS.length) * 100}%` }}
            />
          </div>

          {/* Main Tab: Task | Plan - giống trang chủ */}
          <div className="px-4 pt-3 pb-2">
            <div className="bg-zinc-100 dark:bg-zinc-900 rounded-xl p-1 flex">
              <button
                onClick={() => setMainTab("task")}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-1.5 text- font-semibold transition-all active:scale-95 ${
                  mainTab === "task" 
               ? "bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400" 
                    : "text-zinc-500"
                }`}
              >
                <FiZap size={16} />
                <span>Task</span>
              </button>
              <button
                onClick={() => setMainTab("plan")}
                className={`flex-1 h-10 rounded-lg flex items-center justify-center gap-1.5 text- font-semibold transition-all active:scale-95 ${
                  mainTab === "plan" 
               ? "bg-white dark:bg-zinc-800 shadow-sm text-green-600 dark:text-green-400" 
                    : "text-zinc-500"
                }`}
              >
                <FiCalendar size={16} />
                <span>Plan</span>
              </button>
            </div>
          </div>

          {/* Sub Tab: scroll ngang */}
          <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              {SUB_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSubTab(tab.key)}
                  className={`px-4 h-9 rounded-full text- font-medium whitespace-nowrap transition-all active:scale-95 ${
                    subTab === tab.key
                   ? `${theme.bgLight} shadow-sm ${theme.shadow}`
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="max-w-[600px] mx-auto p-4">
          {loading? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 rounded- border border-zinc-200 dark:border-zinc-800 p-4 animate-pulse">
                  <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0? (
            <div className="bg-white dark:bg-zinc-900 rounded- border border-zinc-200 dark:border-zinc-800 p-12 text-center">
              <FiInbox size={48} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
              <p className="text- font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Chưa có {mainTab === "task"? "task" : "plan"} nào
              </p>
              <p className="text- text-zinc-500 mb-4">
                {subTab === "mine" && `Tạo ${mainTab} đầu tiên của bạn`}
                {subTab === "saved" && `Lưu ${mainTab} để xem sau`}
                {subTab === "doing" && `Nhận ${mainTab} để bắt đầu làm`}
                {subTab === "applied" && `Ứng tuyển ${mainTab} phù hợp`}
                {subTab === "completed" && `Hoàn thành ${mainTab} đầu tiên`}
              </p>
              {subTab === "mine" && (
                <button
                  onClick={() => router.push(mainTab === "task"? "/create/task" : "/create/plan")}
                  className={`px-5 h-10 rounded-xl ${theme.bg} ${theme.bgHover} text-white text- font-medium active:scale-95 transition-all`}
                >
                  Tạo ngay
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mainTab}-${subTab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} onDelete={(id) => setTasks(prev => prev.filter(t => t.id!== id))} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <style jsx global>{`
     .scrollbar-hide::-webkit-scrollbar { display: none; }
     .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}