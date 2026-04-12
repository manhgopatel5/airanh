"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  MessageCircle,
  ClipboardList,
  User,
  Plus,
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
          className={`${
            active ? "text-green-500 scale-110" : "text-gray-400"
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
      <div className="mx-4 mb-4 bg-white/90 backdrop-blur-xl rounded-2xl shadow-lg flex items-center px-2 py-2">

        {navItem("/", Home, "Trang chủ")}
        {navItem("/messages", MessageCircle, "Tin nhắn")}

        {/* ➕ CENTER */}
        <button
          onClick={() => handleNav("/create")}
          className="flex flex-col items-center justify-center flex-1"
        >
          <div className="bg-green-500 text-white p-3 rounded-full shadow-md active:scale-95 transition">
            <Plus size={20} />
          </div>
        </button>

        {navItem("/tasks", ClipboardList, "Nhiệm vụ")}
        {navItem("/profile", User, "Hồ sơ")}
      </div>
    </div>
  );
}
