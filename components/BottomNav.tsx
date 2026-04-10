"use client";

import { useRouter, usePathname } from "next/navigation";

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const navItem = (path: string, icon: string) => {
    const active = pathname === path;

    return (
      <button
        onClick={() => router.push(path)}
        className={`text-xl ${
          active ? "text-blue-500" : "text-gray-400"
        }`}
      >
        {icon}
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 flex items-center justify-around bg-white border-t z-0 shadow-md">
      {navItem("/", "🏠")}
      {navItem("/tasks", "📋")}

      <button className="text-2xl bg-green-500 text-white px-3 py-1 rounded-full -mt-6 shadow-lg">
        ➕
      </button>

      {navItem("/chat", "💬")}
      {navItem("/profile", "👤")}
    </div>
  );
}
