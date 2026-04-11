"use client";

import { useState } from "react";
import { Flame, Clock, PlusSquare, Users } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("hot");

  const tabs = [
    { id: "hot", label: "Hot", icon: Flame },
    { id: "recent", label: "Gần đây", icon: Clock },
    { id: "new", label: "New Task", icon: PlusSquare },
    { id: "friends", label: "Bạn bè", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="sticky top-0 bg-white shadow-sm z-50">
        <h1 className="text-xl font-bold text-center py-3">
          AIRANH
        </h1>

        {/* TAB MENU */}
        <div className="flex justify-around border-t">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center py-2 flex-1 transition ${
                  active ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <Icon size={20} />
                <span className="text-xs mt-1">{tab.label}</span>

                {/* underline */}
                {active && (
                  <div className="w-6 h-1 bg-blue-600 rounded-full mt-1"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-4 space-y-4">
        {activeTab === "hot" && <HotTab />}
        {activeTab === "recent" && <RecentTab />}
        {activeTab === "new" && <NewTaskTab />}
        {activeTab === "friends" && <FriendsTab />}
      </div>
    </div>
  );
}

/* ================= TAB COMPONENTS ================= */

function Card({ title, desc }: any) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-sm text-gray-500 mt-1">{desc}</p>
    </div>
  );
}

function HotTab() {
  return (
    <>
      <Card title="🔥 Task hot 1" desc="Đang nhiều người làm" />
      <Card title="🔥 Task hot 2" desc="Trend hôm nay" />
    </>
  );
}

function RecentTab() {
  return (
    <>
      <Card title="🕒 Task vừa đăng" desc="Mới 5 phút trước" />
      <Card title="🕒 Task mới" desc="1 giờ trước" />
    </>
  );
}

function NewTaskTab() {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <h2 className="text-lg font-semibold mb-2">
        Tạo task mới
      </h2>
      <button className="bg-blue-600 text-white px-5 py-2 rounded-lg">
        + Tạo Task
      </button>
    </div>
  );
}

function FriendsTab() {
  return (
    <>
      <Card title="👤 Nguyễn Văn A" desc="Vừa đăng task mới" />
      <Card title="👤 Trần B" desc="Đang làm task" />
    </>
  );
}
