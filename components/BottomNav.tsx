"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  User,
  Plus,
  MessageCircle,
} from "lucide-react";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNav = (path: string) => {
    if (pathname === path) return;
    router.push(path);
  };

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const navItem = (path: string, icon: any, label: string) => {
    const Icon = icon;
    const active = isActive(path);

    return (
      <button
        onClick={() => handleNav(path)}
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

      {/* NAV BAR */}
      <div className="mx-4 mb-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg flex items-center px-4 py-3 relative">

        {navItem("/", Home, "Trang chủ")}
        {navItem("/friends", User, "Bạn bè")}

        {/* 🔥 FLOAT BUTTON CHUẨN CENTER */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-6">
          <button
            onClick={() => handleNav("/create")}
            className="bg-gradient-to-r from-green-400 to-green-600 text-white p-4 rounded-full shadow-xl active:scale-95 transition"
          >
            <Plus size={24} />
          </button>
        </div>

        {navItem("/messages", MessageCircle, "Tin nhắn")}
        {navItem("/profile", User, "Hồ sơ")}
      </div>
    </div>
  );
}
