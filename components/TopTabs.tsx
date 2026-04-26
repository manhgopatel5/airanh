"use client";
import { HiFire, HiMapPin, HiSparkles, HiUsers } from "react-icons/hi2";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

type TabId = "hot" | "near" | "new" | "friends";

const tabs = [
  {
    id: "hot" as TabId,
    label: "Hot",
    icon: HiFire,
    color: "from-orange-500 via-red-500 to-pink-500",
    glow: "shadow-[0_8px_32px_rgba(249,115,22,0.4)]",
  },
  {
    id: "near" as TabId,
    label: "Gần",
    icon: HiMapPin, // Đổi thành ghim bản đồ
    color: "from-emerald-500 via-teal-500 to-cyan-500",
    glow: "shadow-[0_8px_32px_rgba(16,185,129,0.4)]",
  },
  {
    id: "new" as TabId,
    label: "Mới",
    icon: HiSparkles,
    color: "from-blue-500 via-indigo-500 to-violet-500",
    glow: "shadow-[0_8px_32px_rgba(59,130,246,0.4)]",
  },
  {
    id: "friends" as TabId,
    label: "Bạn bè",
    icon: HiUsers,
    color: "from-purple-500 via-pink-500 to-rose-500",
    glow: "shadow-[0_8px_32px_rgba(168,85,247,0.4)]",
  },
] as const;

type Props = {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  counts?: Partial<Record<TabId, number>>;
};

export default function TopTabs({ activeTab, setActiveTab, counts }: Props) {
  const [hoveredTab, setHoveredTab] = useState<TabId | null>(null);

  return (
    <div className="sticky top-0 z-30 safe-top">
      <div className="relative bg-gradient-to-b from-white/90 via-white/70 to-white/50 dark:from-zinc-950/90 dark:via-zinc-950/70 dark:to-zinc-950/50 backdrop-blur-3xl">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />

        <div className="flex items-stretch justify-between px-1 h-16 max-w-2xl mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isHovered = hoveredTab === tab.id;
            const count = counts?.[tab.id];

            return (
              <button
                key={tab.id}
                onMouseEnter={() => setHoveredTab(tab.id)}
                onMouseLeave={() => setHoveredTab(null)}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (navigator.vibrate) navigator.vibrate([8]);
                }}
                className="relative flex-1 flex items-center justify-center py-2 group"
              >
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="liquidBg"
                      className="absolute inset-1 overflow-hidden rounded-2xl"
                      transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${tab.color} ${tab.glow}`} />
                      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  className="relative flex flex-col items-center justify-center gap-0.5"
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <div className="relative h-7 flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: isActive? 1.2 : 1,
                        y: isActive? [0, -3, 0] : 0
                      }}
                      transition={{
                        scale: { type: "spring", stiffness: 400, damping: 15 },
                        y: { duration: 0.3, ease: "easeOut" }
                      }}
                    >
                      <Icon
                        size={26}
                        className={`transition-all duration-300 ${
                          isActive
                       ? "text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                            : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300"
                        }`}
                      />
                    </motion.div>

                    <AnimatePresence>
                      {count && count > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1.5 -right-2.5 min-w- h- px-1.5 rounded-full bg-red-500 text-white text- font-black flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow-lg"
                        >
                          {count > 99? "99+" : count}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.span
                    animate={{
                      fontWeight: isActive? 900 : 600,
                      scale: isActive? 1.05 : 1,
                    }}
                    className={`text- font-sans transition-all duration-300 ${
                      isActive
                   ? "text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
                        : "text-gray-500 dark:text-zinc-500"
                    }`}
                  >
                    {tab.label}
                  </motion.span>
                </motion.div>

                {/* Ripple nhỏ xíu */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      key={activeTab}
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1.3, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className={`absolute inset-1 rounded-2xl bg-gradient-to-br ${tab.color}`}
                    />
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300/30 to-transparent dark:via-zinc-700/30" />
      </div>
    </div>
  );
}