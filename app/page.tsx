"use client";

import { useState } from "react";
import Link from "next/link"; // 🔥 thêm
import { Flame, Clock, PlusSquare, Users } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import useTasks from "@/hooks/useTasks";

export default function Home() {
  const [activeTab, setActiveTab] = useState("hot");

  const tabs = [
    { id: "hot", label: "Hot", icon: Flame },
    { id: "recent", label: "Gần đây", icon: Clock },
    { id: "new", label: "New Task", icon: PlusSquare },
    { id: "friends", label: "Bạn bè", icon: Users },
  ];

  const tasks = useTasks();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <div className="sticky top-0 bg-white z-50 border-b">
        <h1 className="text-xl font-bold text-center py-3">
          AIRANH
        </h1>

        {/* TAB */}
        <div className="flex justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-2 flex-1 transition ${
                  active ? "text-black" : "text-gray-400"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs">{tab.label}</span>

                {active && (
                  <div className="w-6 h-1 bg-black rounded-full mt-1"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
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

function HotTab({ tasks }: any) {
  const sorted = [...tasks].sort((a, b) => b.likes - a.likes);

  if (sorted.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {sorted.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </>
  );
}

function RecentTab({ tasks }: any) {
  const sorted = [...tasks].sort(
    (a, b) =>
      (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  );

  if (sorted.length === 0) {
    return <EmptyState />;
  }

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

      {/* 🔥 FIX CHUẨN NEXT */}
      <Link
        href="/create"
        className="bg-black text-white px-5 py-2 rounded-lg"
      >
        + Tạo Task
      </Link>
    </div>
  );
}

function FriendsTab({ tasks }: any) {
  if (tasks.length === 0) {
    return <EmptyState />;
  }

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