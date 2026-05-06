"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiInbox } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import type { Task } from "@/types/task";
import TaskCard from "@/components/task/TaskCard";

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
  const [mainTab, setMainTab] = useState<MainTab>("task");
  const [subTab, setSubTab] = useState<SubTab>("mine");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

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
      const typeFilter = mainTab === "task"? "task" : "plan";
      let q;
      
      switch (subTab) {
        case "mine":
          q = query(
            baseCollection, 
            where("userId", "==", currentUser.uid),
            where("type", "==", typeFilter),
            orderBy("createdAt", "desc")
          );
          break;
        case "saved":
          q = query(
            baseCollection,
            where("savedBy", "array-contains", currentUser.uid),
            where("type", "==", typeFilter)
          );
          break;
        case "doing":
          q = query(
            baseCollection,
            where("assignees", "array-contains", currentUser.uid),
            where("status", "==", "doing"),
            where("type", "==", typeFilter)
          );
          break;
        case "applied":
          q = query(
            baseCollection,
            where("applicants", "array-contains", currentUser.uid),
            where("status", "in", ["open", "pending"]),
            where("type", "==", typeFilter)
          );
          break;
        case "completed":
          q = query(
            baseCollection,
            where("assignees", "array-contains", currentUser.uid),
            where("status", "==", "completed"),
            where("type", "==", typeFilter)
          );
          break;
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id,...doc.data() } as Task));
      setTasks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-[#F2F2F7] dark:bg-black min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-zinc-800">
        <div className="px-4 py-3">
          <h1 className="font-semibold text-[17px] text-center mb-3 text-[#1C1C1E] dark:text-white">Nhiệm vụ</h1>
          
          {/* Main Tab: Task | Plan */}
          <div className="bg-[#F2F2F7] dark:bg-zinc-900 rounded-lg p-1 flex">
            <button
              onClick={() => setMainTab("task")}
              className={`flex-1 py-1.5 rounded-md text-[15px] font-medium transition-all ${
                mainTab === "task" 
                ? "bg-white dark:bg-zinc-800 shadow-sm text-[#1C1C1E] dark:text-white" 
                  : "text-[#8E8E93]"
              }`}
            >
              Task
            </button>
            <button
              onClick={() => setMainTab("plan")}
              className={`flex-1 py-1.5 rounded-md text-[15px] font-medium transition-all ${
                mainTab === "plan" 
                ? "bg-white dark:bg-zinc-800 shadow-sm text-[#1C1C1E] dark:text-white" 
                  : "text-[#8E8E93]"
              }`}
            >
              Plan
            </button>
          </div>
        </div>

        {/* Sub Tab: scroll ngang */}
        <div className="px-4 pb-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSubTab(tab.key)}
                className={`px-4 py-1.5 rounded-full text-[15px] whitespace-nowrap transition-all ${
                  subTab === tab.key
                  ? "bg-[#0a84ff] text-white font-medium"
                    : "bg-[#F2F2F7] dark:bg-zinc-900 text-[#1C1C1E] dark:text-zinc-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 pt-3 space-y-3">
        {loading? (
          <div className="text-center py-20 text-[#8E8E93]">Đang tải...</div>
        ) : tasks.length === 0? (
          <div className="text-center py-20">
            <FiInbox size={48} className="mx-auto mb-3 text-[#8E8E93] opacity-30" />
            <p className="text-[#8E8E93] text-[15px]">Chưa có {mainTab}</p>
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
  );
}