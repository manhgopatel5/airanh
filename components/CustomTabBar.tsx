"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { HiHome, HiChat, HiClipboardList, HiUser } from "react-icons/hi";
import { FiPlus } from "react-icons/fi";
import { useAppStore } from "@/store/app";
import { useState, useEffect } from "react";

const haptics = {
  light: () => navigator?.vibrate?.(8),
  medium: () => navigator?.vibrate?.([10, 20, 10]),
  heavy: () => navigator?.vibrate?.([15, 35, 15]),
  success: () => navigator?.vibrate?.([10, 40, 10, 40]),
};

const tabs = [
  { key: "home", label: "Home", icon: HiHome, path: "/" },
  { key: "messages", label: "Messages", icon: HiChat, path: "/messages" },
  { key: "create", label: "Create", icon: FiPlus, path: "/create" },
  { key: "tasks", label: "Tasks", icon: HiClipboardList, path: "/tasks" },
  { key: "profile", label: "Profile", icon: HiUser, path: "/profile" },
];

export default function CustomTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { mode = "task" } = useAppStore();
  const [unreadCount] = useState(3);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const theme = {
    task: {
      gradient: "from-[#0A84FF] to-[#0066CC]",
      glow: "shadow-[0_0_50px_rgba(10,132,255,0.8)]",
      bgActive: "bg-[#0A84FF]/15",
      iconActive: "text-[#0A84FF]",
      borderActive: "border-[#0A84FF]/30",
    },
    plan: {
      gradient: "from-[#30D158] to-[#28B44C]",
      glow: "shadow-[0_0_50px_rgba(48,209,88,0.8)]",
      bgActive: "bg-[#30D158]/15",
      iconActive: "text-[#30D158]",
      borderActive: "border-[#30D158]/30",
    },
  };

  const currentTheme = theme;

  const handleTabClick = (path: string, isCreate: boolean) => {
    if (isCreate) {
      haptics.heavy();
    } else {
      haptics.medium();
    }
    router.push(path);
  };

  // Animation variants cho từng loại
  const containerVariants = {
    hidden: { y: 100, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0, scale: 0.8 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
      },
    },
  };

  const createButtonVariants = {
    hidden: { y: 30, opacity: 0, scale: 0.5 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
        delay: 0.3,
      },
    },
    tap: {
      scale: 0.85,
      transition: { duration: 0.1 },
    },
    hover: {
      scale: 1.08,
      transition: { duration: 0.2 },
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
        {/* Gradient fade */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white/98 to-transparent dark:from-zinc-950 dark:via-zinc-950/98 pointer-events-none" />

        <div className="relative px-4 pb-2">
          <motion.div
            className="relative bg-white/75 dark:bg-zinc-900/75 backdrop-blur-3xl rounded- border border-zinc-200/60 dark:border-zinc-800/60 shadow-[0_-10px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_-10px_50px_rgba(0,0,0,0.5)]"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            {/* Top glow line */}
            <motion.div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-zinc-300/60 to-transparent dark:via-zinc-700/60"
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 3 }}
            />

            <div className="flex items-center justify-around h- px-1">
              {tabs.map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.path;
                const isCreate = tab.key === "create";

                if (isCreate) {
                  return (
                    <motion.button
                      key={tab.key}
                      variants={createButtonVariants}
                      whileTap="tap"
                      whileHover="hover"
                      onTouchStart={() => haptics.light()}
                      onClick={() => handleTabClick(tab.path, true)}
                      className="relative -mt-7"
                    >
                      {/* Pulse rings */}
                      <motion.div
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0.6, 0, 0.6],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          ease: "easeOut",
                        }}
                        className={`absolute inset-0 rounded-full bg-gradient-to-r ${currentTheme.gradient}`}
                      />
                      <motion.div
                        animate={{
                          scale: [1, 1.6, 1],
                          opacity: [0.4, 0, 0.4],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 2,
                          delay: 0.5,
                          ease: "easeOut",
                        }}
                        className={`absolute inset-0 rounded-full bg-gradient-to-r ${currentTheme.gradient}`}
                      />

                      {/* Main button */}
                      <motion.div
                        className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${currentTheme.gradient} flex items-center justify-center ${currentTheme.glow} border-4 border-white dark:border-zinc-900`}
                        animate={{
                          rotate: [0, 90, 180, 270, 360],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 20,
                          ease: "linear",
                        }}
                      >
                        <motion.div
                          animate={{
                            rotate: [0, -90, -180, -270, -360],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 20,
                            ease: "linear",
                          }}
                        >
                          <FiPlus size={28} className="text-white" strokeWidth={3.5} />
                        </motion.div>
                      </motion.div>
                    </motion.button>
                  );
                }

                return (
                  <motion.button
                    key={tab.key}
                    variants={itemVariants}
                    whileTap={{ scale: 0.88 }}
                    onTouchStart={() => haptics.light()}
                    onClick={() => handleTabClick(tab.path, false)}
                    className="relative flex flex-col items-center justify-center w- h- gap-1"
                  >
                    <AnimatePresence mode="wait">
                      {isActive && (
                        <motion.div
                          layoutId="tab-bg"
                          className={`absolute inset-0 rounded-2xl ${currentTheme.bgActive} border-2 ${currentTheme.borderActive}`}
                          initial={{ scale: 0.6, opacity: 0, rotate: -5 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          exit={{ scale: 0.6, opacity: 0, rotate: 5 }}
                          transition={{
                            type: "spring",
                            bounce: 0.4,
                            duration: 0.6,
                          }}
                          onAnimationComplete={() => {
                            if (isActive) haptics.light();
                          }}
                        />
                      )}
                    </AnimatePresence>

                    <div className="relative">
                      {/* Icon glow */}
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 0.6 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className={`absolute inset-0 rounded-full bg-gradient-to-r ${currentTheme.gradient} blur-xl`}
                          />
                        )}
                      </AnimatePresence>

                      {/* Icon với animation riêng */}
                      <motion.div
                        animate={
                          isActive
                       ? {
                                y: [0, -4, 0],
                                rotate: [0, -10, 10, -10, 0],
                              }
                            : {}
                        }
                        transition={{
                          y: { duration: 0.4 },
                          rotate: { duration: 0.5 },
                        }}
                      >
                        <Icon
                          size={26}
                          className={`relative transition-all duration-300 ${
                            isActive
                         ? `${currentTheme.iconActive} drop-shadow-[0_0_12px_rgba(10,132,255,0.8)]`
                              : "text-zinc-400 dark:text-zinc-600"
                          }`}
                        />
                      </motion.div>

                      {/* Badge Messages */}
                      {tab.key === "messages" && unreadCount > 0 && (
                        <motion.div
                          initial={{ scale: 0, y: -10 }}
                          animate={{ scale: 1, y: 0 }}
                          className="absolute -top-1.5 -right-1.5 min-w- bg-gradient-to-br from-red-500 to-red-600 rounded-full px-1.5 h-5 flex items-center justify-center shadow-lg shadow-red-500/50 border-2 border-white dark:border-zinc-900"
                        >
                          <motion.span
                            animate={{
                              scale: [1, 1.3, 1],
                            }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.2,
                            }}
                            className="text- font-black text-white"
                          >
                            {unreadCount > 9? "9+" : unreadCount}
                          </motion.span>
                        </motion.div>
                      )}
                    </div>

                    {/* Label với fade */}
                    <motion.span
                      animate={{
                        opacity: isActive? 1 : 0.5,
                        y: isActive? 0 : 2,
                      }}
                      className={`text- font-bold transition-all duration-300 ${
                        isActive
                     ? currentTheme.iconActive
                          : "text-zinc-400 dark:text-zinc-600"
                      }`}
                    >
                      {tab.label}
                    </motion.span>
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