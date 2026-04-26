"use client";

import { useState } from "react";
import { FiTrendingUp, FiClock, FiZap, FiUsers } from "react-icons/fi";
import { motion } from "framer-motion";

const tabs = [
  { name: "Hot", icon: FiTrendingUp },
  { name: "Gần", icon: FiClock },
  { name: "Mới", icon: FiZap },
  { name: "Bạn bè", icon: FiUsers },
];

export default function TopTabs() {
  const [active, setActive] = useState("Hot");

  return (
    <div className="sticky top-0 z-30 safe-top bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl border-b border-gray-200/50 dark:border-zinc-800/50">
      <div className="flex items-center justify-between px-4 h-12">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => setActive(tab.name)}
              className="relative flex-1 flex items-center justify-center gap-1.5 h-full group"
            >
              <Icon
                size={18}
                className={`transition-colors ${
                  isActive
                ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-400"
                }`}
              />
              <span
                className={`text-sm font-bold tracking-tight transition-colors ${
                  isActive
                ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-zinc-400"
                }`}
              >
                {tab.name}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTopTab"
                  className="absolute bottom-0 h-[3px] w-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}