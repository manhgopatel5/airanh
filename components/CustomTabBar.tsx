"use client";
import { motion, AnimatePresence } from "framer-motion";
import { HiHome, HiChat, HiClipboardList, HiUser } from "react-icons/hi";
import { FiPlus } from "react-icons/fi";
import { useAppStore } from "@/store/app";
import { useState, useEffect } from "react";

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
}

const tabs = [
  { key: "home", icon: HiHome },
  { key: "messages", icon: HiChat },
  { key: "create", icon: FiPlus },
  { key: "tasks", icon: HiClipboardList },
  { key: "profile", icon: HiUser },
];

export default function CustomTabBar({ currentTab, onChangeTab, onCreateClick }: CustomTabBarProps) {
  const mode = useAppStore((s) => s.mode) || "task";
  const [unreadCount] = useState(3);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themes = {
    task: {
      gradient: "from-[#0A84FF] via-[#0A84FF] to-[#0051D5]",
      glow: "shadow-[0_12px_40px_rgba(10,132,255,0.45)]",
      iconActive: "text-[#0A84FF]",
      dot: "bg-[#0A84FF]",
    },
    plan: {
      gradient: "from-[#30D158] via-[#30D158] to-[#248A3D]",
      glow: "shadow-[0_12px_40px_rgba(48,209,88,0.45)]",
      iconActive: "text-[#30D158]",
      dot: "bg-[#30D158]",
    },
  };

  const currentTheme = themes[mode];

  const handleTabClick = (key: string) => {
    if (key === "create") {
      haptics.heavy();
      onCreateClick();
    } else {
      haptics.medium();
      onChangeTab(key as MainTab);
    }
  };

  const containerVariants = {
    hidden: { y: 100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 40,
        staggerChildren: 0.06,
      },
    },
  };

  const itemVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
      },
    },
  };

  const createButtonVariants = {
    hidden: { scale: 0.5, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: 0.2,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate={mounted? "visible" : "hidden"}
      variants={containerVariants}
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
    >
      <div className="relative mx-auto max-w-[500px]">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-zinc-950 dark:via-zinc-950/95 pointer-events-none" />

        <div className="relative px-4 pb-3">
          <motion.div
            className="relative bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl rounded- border border-zinc-200/60 dark:border-zinc-800/60 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 dark:via-zinc-600/40 to-transparent rounded-t-" />

            <div className="flex items-center justify-around h-14 px-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.key;
                const isCreate = tab.key === "create";

                if (isCreate) {
                  return (
                    <motion.button
                      key={tab.key}
                      variants={createButtonVariants}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.05 }}
                      onTouchStart={() => haptics.light()}
                      onClick={() => handleTabClick(tab.key)}
                      className="relative"
                      data-plus-button
                    >
                      <motion.div
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2.5,
                          ease: "easeOut",
                        }}
                        className={`absolute inset-0 rounded- bg-gradient-to-br ${currentTheme.gradient}`}
                      />
                      <motion.div
                        animate={{
                          scale: [1, 1.7, 1],
                          opacity: [0.3, 0, 0.3],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2.5,
                          delay: 0.8,
                          ease: "easeOut",
                        }}
                        className={`absolute inset-0 rounded- bg-gradient-to-br ${currentTheme.gradient}`}
                      />

                      <div
                        className={`relative w-16 h-16 rounded- bg-gradient-to-br ${currentTheme.gradient} flex items-center justify-center ${currentTheme.glow} ring-2 ring-white/60 dark:ring-zinc-900/60`}
                      >
                        <motion.div
                          animate={{ rotate: [0, 90, 180, 270, 360] }}
                          transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
                        >
                          <FiPlus size={30} className="text-white" strokeWidth={2.5} />
                        </motion.div>
                      </div>
                    </motion.button>
                  );
                }

                return (
                  <motion.button
                    key={tab.key}
                    variants={itemVariants}
                    whileTap={{ scale: 0.9 }}
                    onTouchStart={() => haptics.light()}
                    onClick={() => handleTabClick(tab.key)}
                    className="relative flex items-center justify-center w-16 h-14"
                  >
                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          layoutId="active-dot"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className={`absolute -bottom-0.5 w-1.5 h-1.5 rounded-full ${currentTheme.dot}`}
                          transition={{ type: "spring", bounce: 0.5 }}
                        />
                      )}
                    </AnimatePresence>

                    <div className="relative">
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 2, opacity: 0.35 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className={`absolute inset-0 rounded-full bg-gradient-to-br ${currentTheme.gradient} blur-2xl`}
                          />
                        )}
                      </AnimatePresence>

                      <motion.div
                        animate={
                          isActive
                         ? {
                                scale: [1, 1.15, 1],
                                y: [0, -3, 0],
                              }
                            : {}
                        }
                        transition={{ duration: 0.4, type: "spring", bounce: 0.4 }}
                      >
                        <Icon
                          size={28}
                          className={`relative transition-colors duration-300 ${
                            isActive
                           ? `${currentTheme.iconActive} drop-shadow-[0_0_16px_rgba(10,132,255,0.6)]`
                              : "text-zinc-400 dark:text-zinc-600"
                          }`}
                        />
                      </motion.div>

                      {tab.key === "messages" && unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-2 -right-2 min-w-5 h-5 bg-gradient-to-br from-red-500 to-red-600 rounded-full px-1.5 flex items-center justify-center shadow-lg shadow-red-500/60 ring-2 ring-white dark:ring-zinc-900"
                        >
                          <motion.span
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                            className="text-xs font-bold text-white leading-none"
                          >
                            {unreadCount > 9? "9+" : unreadCount}
                          </motion.span>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}