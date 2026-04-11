
"use client";

import { useRouter, usePathname } from "next/navigation";
import { Home, ClipboardList, MessageCircle, User, Plus } from "lucide-react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItem = (path: string, icon: any, label: string) => {
    const Icon = icon;
    const active = pathname === path;

    return (
      <button
        onClick={() => router.push(path)}
        className="flex flex-col items-center justify-center flex-1"
      >
        <Icon
          size={22}
          className={`transition ${
            active
              ? "text-green-500 scale-110"
              : "text-gray-400"
          }`}
        />
        <span
          className={`text-xs mt-1 ${
            active ? "text-green-500" : "text-gray-400"
          }`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      
      
      {/* NAV */}
      <div className="mx-4 mb-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg flex items-center px-4 py-3">

        {navItem("/", Home, "🔥 NEW NAV")}
        {navItem("/friends", User, "Bạn bè")}

        {/* FLOAT BUTTON */}
        <div className="flex-1 flex justify-center">
          <button
            onClick={() => router.push("/create")}
            className="bg-gradient-to-r from-green-400 to-green-600 text-white p-4 rounded-full shadow-xl -mt-8 scale-110 active:scale-95 transition"
          >
            <Plus size={24} />
          </button>
        </div>

        {navItem("/tasks", ClipboardList, "Task")}
        {navItem("/profile", User, "Hồ sơ")}
      </div>
    </div>
  );
}

