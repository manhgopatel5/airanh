"use client";

import { Task } from "../types/task";
import { useState } from "react";
import Link from "next/link";
import { Flame, Clock, Sparkles, Users } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import useTasks from "@/hooks/useTasks";

export default function Home() {
  const [activeTab, setActiveTab] = useState("hot");

  // 🔥 FIX: đổi messages -> friends
  const tabs = [
    { id: "hot", label: "Hot", icon: Flame },
    { id: "recent", label: "Gần đây", icon: Clock },
    { id: "new", label: "New", icon: Sparkles },
    { id: "friends", label: "Bạn bè", icon: Users },
  ];

  const tasks = useTasks() as Task[];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">

      {/* 🔥 TOP NAV */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">

        {/* fix notch iPhone */}
        <div className="pt-[env(safe-area-inset-top)]" />

        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-2 flex-1 transition-all duration-200 ${
                  active ? "text-black" : "text-gray-400"
                }`}
              >
                <Icon size={20} />

                <span className="text-xs mt-1">
                  {tab.label}
                </span>

                {/* underline */}
                <div
                  className={`mt-1 h-[2px] w-6 rounded-full transition-all duration-200 ${
                    active ? "bg-black" : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* 📦 CONTENT */}
      <div className="max-w-xl mx-auto p-3 space-y-3">

        {activeTab === "hot" && <HotTab tasks={tasks} />}
        {activeTab === "recent" && <RecentTab tasks={tasks} />}
        {activeTab === "new" && <NewTaskTab />}
        {activeTab === "friends" && <FriendsTab tasks={tasks} />}

      </div>
    </div>
  );
}

/* ================= TAB LOGIC ================= */

function HotTab({ tasks }: { tasks: Task[] }) {
  const sorted = [...tasks].sort(
    (a, b) => (b.likes || 0) - (a.likes || 0)
  );

  if (!sorted.length) return <EmptyState />;

  return (
    <>
      {sorted.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </>
  );
}

function RecentTab({ tasks }: { tasks: Task[] }) {
  const sorted = [...tasks].sort(
    (a, b) =>
      (b.createdAt?.seconds || 0) -
      (a.createdAt?.seconds || 0)
  );

  if (!sorted.length) return <EmptyState />;

  return (
    <>
      {sorted.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </>
  );
}

function NewTaskTab() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <h2 className="text-lg font-semibold mb-2">
        Tạo task mới
      </h2>

      <Link
        href="/create"
        className="bg-black text-white px-5 py-2 rounded-xl shadow active:scale-95 transition"
      >
        Tạo Task
      </Link>
    </div>
  );
}

// 🔥 NEW: FriendsTab thay cho MessagesTab
function FriendsTab({ tasks }: { tasks: Task[] }) {
  if (!tasks.length) return <EmptyState />;

  return (
    <>
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </>
  );
}

/* ================= UI ================= */

function EmptyState() {
  return (
    <div className="text-center text-gray-400 mt-10">
      Chưa có task nào
    </div>
  );
}
