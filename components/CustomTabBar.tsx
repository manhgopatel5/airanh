"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/app";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { prefetchTab, type PrefetchTab } from "@/lib/tabPrefetch";

const haptics = {
  light: () => navigator?.vibrate?.(8),
  medium: () => navigator?.vibrate?.([10, 20, 10]),
  heavy: () => navigator?.vibrate?.([15, 35, 15]),
};

type MainTab = "home" | "messages" | "tasks" | "profile";

interface CustomTabBarProps {
  currentTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  onCreateClick: () => void;
  unreadCount?: number;
  isMenuOpen: boolean;
}

const IconHome = ({ active }: { active: boolean }) => (
  <motion.svg width="24" height="24" viewBox="0 0 28 28" fill="none">
    <motion.path
      d="M4 12L14 4L24 12V23C24 23.5523 23.5523 24 23 24H5C4.44772 24 4 23.5523 4 23V12Z"
      stroke="currentColor"
      strokeWidth={active? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={false}
      animate={{
        pathLength: active? 1 : 0.85,
        opacity: active? 1 : 0.6,
        scale: active? 1 : 0.95,
      }}
      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
    />
    <motion.rect
      x="11"
      y="16"
      width="6"
      height="8"
      rx="1"
      fill="currentColor"
      initial={false}
      animate={{
        scaleY: active? 1 : 0,
        opacity: active? 1 : 0,
      }}
      transition={{ delay: 0.1, duration: 0.25 }}
    />
    <motion.circle
      cx="14"
      cy="12"
      r="1.5"
      fill="currentColor"
      initial={false}
      animate={{ scale: active? [0, 1.3, 1] : 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    />
  </motion.svg>
);

const IconMessages = ({ active }: { active: boolean }) => (
  <motion.svg width="24" height="24" viewBox="0 0 28 28" fill="none">
    <motion.path
      d="M4 6C4 4.89543 4.89543 4 6 4H22C23.1046 4 24 4.89543 24 6V16C24 17.1046 23.1046 18 22 18H9L4 22V6Z"
      stroke="currentColor"
      strokeWidth={active? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={false}
      animate={{
        pathLength: 1,
        opacity: active? 1 : 0.6,
      }}
    />
    <motion.g initial={false} animate={{ opacity: active? 1 : 0 }}>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={10 + i * 4}
          cy="11"
          r="1.5"
          fill="currentColor"
          animate={{ y: active? [0, -2, 0] : 0 }}
          transition={{
            delay: i * 0.1,
            repeat: active? Infinity : 0,
            duration: 0.6,
            repeatDelay: 0.8,
          }}
        />
      ))}
    </motion.g>
  </motion.svg>
);

const IconTasks = ({ active }: { active: boolean }) => (
  <motion.svg width="24" height="24" viewBox="0 0 28 28" fill="none">
    <motion.rect
      x="5"
      y="4"
      width="18"
      height="20"
      rx="3"
      stroke="currentColor"
      strokeWidth={active? 2.5 : 2}
      initial={false}
      animate={{ opacity: active? 1 : 0.6 }}
    />
    {[8, 14, 20].map((y, i) => (
      <motion.g key={y}>
        <motion.path
          d="M9 8L11 10L15 6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{
            pathLength: active? 1 : 0,
            opacity: active? 1 : 0,
          }}
          transition={{ delay: i * 0.08, duration: 0.3 }}
        />
        <motion.line
          x1="17"
          y1={y}
          x2="21"
          y2={y}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          initial={false}
          animate={{
            scaleX: active? 1 : 0.3,
            opacity: active? 0.8 : 0.4,
          }}
          transition={{ delay: i * 0.08 + 0.1 }}
        />
      </motion.g>
    ))}
  </motion.svg>
);

const IconProfile = ({ active }: { active: boolean }) => (
  <motion.svg width="24" height="24" viewBox="0 0 28 28" fill="none">
    <motion.circle
      cx="14"
      cy="10"
      r="4"
      stroke="currentColor"
      strokeWidth={active? 2.5 : 2}
      initial={false}
      animate={{
        scale: active? [1, 1.15, 1] : 1,
        opacity: active? 1 : 0.6,
      }}
      transition={{ duration: 0.4 }}
    />
    <motion.path
      d="M6 22C6 18.6863 9.58172 16 14 16C18.4183 16 22 18.6863 22 22"
      stroke="currentColor"
      strokeWidth={active? 2.5 : 2}
      strokeLinecap="round"
      initial={false}
      animate={{
        pathLength: active? 1 : 0.7,
        opacity: active? 1 : 0.6,
      }}
    />
    <motion.circle
      cx="14"
      cy="10"
      r="2"
      fill="currentColor"
      initial={false}
      animate={{ scale: active? 1 : 0 }}
      transition={{ delay: 0.1 }}
    />
  </motion.svg>
);

const tabs = [
  { key: "home", label: "Home", icon: IconHome },
  { key: "messages", label: "Inbox", icon: IconMessages },
  { key: "create", label: "", icon: Plus },
  { key: "tasks", label: "Tasks", icon: IconTasks },
  { key: "profile", label: "Profile", icon: IconProfile },
];

export default function CustomTabBar({
  currentTab,
  onChangeTab,
  onCreateClick,
  unreadCount = 0,
  isMenuOpen,
}: CustomTabBarProps) {
  const [mounted, setMounted] = useState(false);
  const mode = useAppStore((s) => s.mode) || "task";

  useEffect(() => {
    setMounted(true);
  }, []);

  const themeColors = {
    task: {
      gradient: "from-[#0A84FF] via-[#0A84FF] to-[#0051D5]",
      labelActive: "text-[#0A84FF]",
    },
    plan: {
      gradient: "from-[#30D158] via-[#30D158] to-[#248A3D]",
      labelActive: "text-[#30D158]",
    },
  };

  const currentTheme = themeColors[mode];

  const handleTabClick = (key: string) => {
    if (key === "create") {
      haptics.heavy();
      onCreateClick();
    } else {
      haptics.medium();
      const tab = key as PrefetchTab;
      if (tab === "home" || tab === "messages" || tab === "tasks" || tab === "profile") {
        prefetchTab(tab);
      }
      onChangeTab(key as MainTab);
    }
  };

  const handleTabHover = (key: string) => {
    if (key === "create") return;
    const tab = key as PrefetchTab;
    if (tab === "home" || tab === "messages" || tab === "tasks" || tab === "profile") {
      prefetchTab(tab);
    }
  };

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={mounted? { y: 0, opacity: 1 } : { y: 120, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className="fixed bottom-0 left-0 right-0 z-50"
      data-tab-bar
    >
<div className="relative w-full px-4 pb-safe">
        <motion.div
          className="relative bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-full border border-zinc-200/60 dark:border-zinc-800/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] overflow-hidden"
          whileHover={{ y: -3 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative flex items-center justify-between h-16 px-2">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.key;
              const isCreate = tab.key === "create";
              const IconComponent = tab.icon;

              if (isCreate) {
                return (
                  <div key={tab.key} className="relative flex justify-center">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onTouchStart={() => haptics.light()}
                      onClick={() => handleTabClick(tab.key)}
                      className="relative"
                    >
                      <motion.div
                        className={`relative w-14 h-14 rounded-full bg-gradient-to-br ${currentTheme.gradient} flex items-center justify-center shadow-lg`}
                        animate={{ rotate: isMenuOpen? 135 : 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent rounded-full" />
                        <Plus className="w-6 h-6 text-white relative z-10" strokeWidth={3} />
                      </motion.div>
                    </motion.button>
                  </div>
                );
              }

              return (
                <motion.button
                  key={tab.key}
                  whileTap={{ scale: 0.9 }}
                  onTouchStart={() => haptics.light()}
                  onPointerEnter={() => handleTabHover(tab.key)}
                  onClick={() => handleTabClick(tab.key)}
                  className="relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1"
                >
             

                  {tab.key === "messages" && unreadCount > 0 && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute -top-1 -right-1 z-20 min-w-[22px] h-[22px] bg-gradient-to-br from-red-500 to-red-600 rounded-full px-[6px] flex items-center justify-center shadow-lg"
                    >
                      <span className="text-[10px] font-black text-white">
                        {unreadCount > 9? "9+" : unreadCount}
                      </span>
                    </motion.div>
                  )}

                  <div
                    className={`relative z-10 ${
                      isActive
                      ? "text-zinc-900 dark:text-white"
                        : "text-zinc-400 dark:text-zinc-500"
                    }`}
                  >
                    <IconComponent active={isActive} />
                  </div>

                  <span
                    className={`text-xs transition-all relative z-10 ${
                      isActive
                      ? `${currentTheme.labelActive} font-bold`
                        : "text-zinc-500 dark:text-zinc-400 font-medium"
                    }`}
                  >
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}