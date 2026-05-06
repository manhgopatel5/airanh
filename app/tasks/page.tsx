"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiInbox } from "react-icons/fi";
import { HiBolt, HiCalendarDays } from "react-icons/hi2"; // Dùng icon giống ModeToggle
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import type { Task } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";
import { toast, Toaster } from "sonner";
import { useAppStore } from "@/store/app"; // Dùng store chung

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
  const { mode, setMode } = useAppStore(); // Dùng chung store với trang chủ
  const [subTab, setSubTab] = useState<SubTab>("mine");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const theme = {
    task: {
      bgLight: "bg-gradient-to-br from-sky-500 to-blue-500",
      shadow: "shadow-blue-500/40",
    },
    plan: {
      bgLight: "bg-gradient-to-br from-green-500 to-emerald-500",
      shadow: "shadow-emerald-500/40",
    }
  }[mode];

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
  }, [currentUser, mode, subTab]);

  const fetchTasks = async () => {
    if (!currentUser) return;
    setLoading(true);
    
    try {
      const baseCollection = collection(db, "tasks");
      let q;
      
      switch (subTab) {
        case "mine":
          q = query(baseCollection, where("userId", "==", currentUser.uid), where("type", "==", mode));
          break;
        case "saved":
          q = query(baseCollection, where("savedBy", "array-contains", currentUser.uid), where("type", "==", mode));
          break;
        case "doing":
          q = query(baseCollection, where("assignees", "array-contains", currentUser.uid), where("status", "==", "doing"), where("type", "==", mode));
          break;
        case "applied":
          q = query(baseCollection, where("applicants", "array-contains", currentUser.uid), where("status", "in", ["open", "pending"]), where("type", "==", mode));
          break;
        case "completed":
          q = query(baseCollection, where("assignees", "array-contains", currentUser.uid), where("status", "==", "completed"), where("type", "==", mode));
          break;
      }

      const snap = await getDocs(q);
      const data = snap.docs
.map(doc => ({ id: doc.id,...doc.data() } as Task))
.filter(t => t.status!== "deleted" && t.status!== "cancelled")
.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
      
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
      <div className="min-h-screen bg-white dark:bg-black text-zinc-900 dark:text-zinc-100 select-none pb-28">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
          
          {/* Main Tab: Task | Plan - COPY Y HỆT ModeToggle */}
          <div className="border-b border-gray-100 dark:border-zinc-800">
            <div className="flex items-center p-1.5 mx-3 my-2 rounded-2xl bg-gray-100 dark:bg-zinc-800">
              <button
                onClick={() => {
                  setMode("task");
                  if ("vibrate" in navigator) navigator.vibrate(8);
                }}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mode === "task"
                 ? "bg-gradient-to-br from-sky-500 to-blue-500 text-white shadow-lg"
                    : "text-gray-500 dark:text-zinc-400"
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <HiBolt className="w-4 h-4" />
                Task
              </button>

              <button
                onClick={() => {
                  setMode("plan");
                  if ("vibrate" in navigator) navigator.vibrate(8);
                }}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  mode === "plan"
                 ? "bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg"
                    : "text-gray-500 dark:text-zinc-400"
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <HiCalendarDays className="w-4 h-4" />
                Plan
              </button>
            </div>
          </div>

          {/* Sub Tab */}
          <div className="px-4 pb-3 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              {SUB_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSubTab(tab.key)}
                  className={`px-4 h-8 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
                    subTab === tab.key
             ? `${theme.bgLight} text-white shadow-sm ${theme.shadow}`
                      : "bg-[#F2F2F7] dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
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
                <div key={i} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 animate-pulse">
                  <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded mb-2" />
                  <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
              <FiInbox size={48} className="mx-auto mb-3 text-zinc-300 dark:text-zinc-700" />
              <p className="text-base font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Chưa có {mode === "task"? "task" : "plan"} nào
              </p>
              <p className="text-sm text-zinc-500 mb-4">
                {subTab === "mine" && `Tạo ${mode} đầu tiên của bạn`}
                {subTab === "saved" && `Lưu ${mode} để xem sau`}
                {subTab === "doing" && `Nhận ${mode} để bắt đầu làm`}
                {subTab === "applied" && `Ứng tuyển ${mode} phù hợp`}
                {subTab === "completed" && `Hoàn thành ${mode} đầu tiên`}
              </p>
              {subTab === "mine" && (
                <button
                  onClick={() => router.push(mode === "task"? "/create/task" : "/create/plan")}
                  className={`px-5 h-10 rounded-xl ${theme.bgLight} text-white text-sm font-medium active:scale-95 transition-all`}
                >
                  Tạo ngay
                </button>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-${subTab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} theme={mode} onDelete={(id) => setTasks(prev => prev.filter(t => t.id!== id))} />
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