"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { TaskListItem } from "@/types/task";
import TaskCard from "@/components/TaskCard";
import { FiBookmark, FiArrowLeft } from "react-icons/fi";
import Link from "next/link";

export default function BookmarksPage() {
  const db = getFirebaseDB();
  const router = useRouter();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace("/login");
      return;
    }

    const q = query(
      collection(db, "task_bookmarks"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      try {
        const taskIds: string[] = snap.docs
          .map((d) => d.data()?.taskId)
          .filter(Boolean);

        if (taskIds.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        // 🔥 chunk để tránh giới hạn Firestore (10 items/query)
        const chunks: string[][] = [];
        for (let i = 0; i < taskIds.length; i += 10) {
          chunks.push(taskIds.slice(i, i + 10));
        }

        const taskPromises = chunks.map(async (chunk) => {
          const snaps = await Promise.all(
            chunk.map((id) => getDoc(doc(db, "tasks", id)))
          );

          return snaps
            .filter(
              (s) =>
                s.exists() &&
                s.data()?.status !== "cancelled" &&
                !s.data()?.banned
            )
            .map(
              (s) =>
                ({
                  id: s.id,
                  ...s.data(),
                } as TaskListItem)
            );
        });

        const taskArrays = await Promise.all(taskPromises);

        // 🔥 FIX crash createdAt undefined
        const allTasks = taskArrays
          .flat()
          .sort(
            (a, b) =>
              (b.createdAt?.toMillis?.() || 0) -
              (a.createdAt?.toMillis?.() || 0)
          );

        setTasks(allTasks);
      } catch (e) {
        console.error("Load bookmarks error:", e);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 pb-24">
      <div className="sticky top-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2">
            <FiArrowLeft size={20} />
          </Link>
          <h1 className="font-bold text-gray-900 dark:text-gray-100">
            Đã lưu
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-4 animate-pulse"
              >
                <div className="flex gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                    <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-2/3" />
                    <div className="h-20 bg-gray-200 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiBookmark
                className="text-gray-400 dark:text-zinc-600"
                size={40}
              />
            </div>

            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Chưa có công việc nào
            </h2>

            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
              Lưu các công việc bạn quan tâm để xem lại sau
            </p>

            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              Khám phá ngay
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                mode={task.price === 0 ? "plan" : "task"} // ✅ Thêm dòng này
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}