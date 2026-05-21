"use client";

import { motion, AnimatePresence } from "framer-motion";
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

const IconHome = ({ active }: { active: boolean }) => (
  <motion.svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <motion.path
      d="M4 12L14 4L24 12V23C24 23.5523 23.5523 24 23 24H5C4.44772 24 4 23.5523 4 23V12Z"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={false}
      animate={{
        pathLength: active ? 1 : 0.85,
        opacity: active ? 1 : 0.6,
        scale: active ? 1 : 0.95,
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
        scaleY: active ? 1 : 0,
        opacity: active ? 1 : 0,
      }}
      transition={{ delay: 0.1, duration: 0.25 }}
    />

    <motion.circle
      cx="14"
      cy="12"
      r="1.5"
      fill="currentColor"
      initial={false}
      animate={{ scale: active ? [0, 1.3, 1] : 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
    />
  </motion.svg>
);

const IconMessages = ({ active }: { active: boolean }) => (
  <motion.svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <motion.path
      d="M4 6C4 4.89543 4.89543 4 6 4H22C23.1046 4 24 4.89543 24 6V16C24 17.1046 23.1046 18 22 18H9L4 22V6Z"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={false}
      animate={{
        pathLength: 1,
        opacity: active ? 1 : 0.6,
      }}
    />

    <motion.g initial={false} animate={{ opacity: active ? 1 : 0 }}>
      {[0, 1, 2].map((i) => (
        <motion.circle
          key={i}
          cx={10 + i * 4}
          cy="11"
          r="1.5"
          fill="currentColor"
          animate={{ y: active ? [0, -2, 0] : 0 }}
          transition={{
            delay: i * 0.1,
            repeat: active ? Infinity : 0,
            duration: 0.6,
            repeatDelay: 0.8,
          }}
        />
      ))}
    </motion.g>
  </motion.svg>
);

const IconTasks = ({ active }: { active: boolean }) => (
  <motion.svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <motion.rect
      x="5"
      y="4"
      width="18"
      height="20"
      rx="3"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      initial={false}
      animate={{ opacity: active ? 1 : 0.6 }}
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
            pathLength: active ? 1 : 0,
            opacity: active ? 1 : 0,
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
            scaleX: active ? 1 : 0.3,
            opacity: active ? 0.8 : 0.4,
          }}
          transition={{ delay: i * 0.08 + 0.1 }}
        />
      </motion.g>
    ))}
  </motion.svg>
);

const IconProfile = ({ active }: { active: boolean }) => (
  <motion.svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <motion.circle
      cx="14"
      cy="10"
      r="4"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      initial={false}
      animate={{
        scale: active ? [1, 1.15, 1] : 1,
        opacity: active ? 1 : 0.6,
      }}
      transition={{ duration: 0.4 }}
    />

    <motion.path
      d="M6 22C6 18.6863 9.58172 16 14 16C18.4183 16 22 18.6863 22 22"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 2}
      strokeLinecap="round"
      initial={false}
      animate={{
        pathLength: active ? 1 : 0.7,
        opacity: active ? 1 : 0.6,
      }}
    />

    <motion.circle
      cx="14"
      cy="10"
      r="2"
      fill="currentColor"
      initial={false}
      animate={{ scale: active ? 1 : 0 }}
      transition={{ delay: 0.1 }}
    />
  </motion.svg>
);

const IconCreate = ({ isOpen }: { isOpen: boolean }) => (
  <motion.svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <motion.path
      d="M16 8V24M8 16H24"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      initial={false}
      animate={{ rotate: isOpen ? 45 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    />
  </motion.svg>
);

const tabs = [
  { key: "home", icon: IconHome },
  { key: "messages", icon: IconMessages },
  { key: "create", icon: IconCreate },
  { key: "tasks", icon: IconTasks },
  { key: "profile", icon: IconProfile },
];

export default function CustomTabBar({
  currentTab,
  onChangeTab,
  onCreateClick,
}: CustomTabBarProps) {
  const mode = useAppStore((s) => s.mode) || "task";

  const [unreadCount] = useState(3);
  const [mounted, setMounted] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [particles, setParticles] = useState<
    { id: number; x: number; y: number }[]
  >([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const themes = {
    task: {
      gradient: "from-[#0A84FF] via-[#0A84FF] to-[#0051D5]",
      glow: "shadow-[0_16px_48px_rgba(10,132,255,0.55)]",
      iconActive: "text-[#0A84FF]",
      pillBg: "bg-[#0A84FF]/15",
      ripple: "bg-[#0A84FF]/20",
    },

    plan: {
      gradient: "from-[#30D158] via-[#30D158] to-[#248A3D]",
      glow: "shadow-[0_16px_48px_rgba(48,209,88,0.55)]",
      iconActive: "text-[#30D158]",
      pillBg: "bg-[#30D158]/15",
      ripple: "bg-[#30D158]/20",
    },
  };

  const currentTheme = themes[mode];

  const handleTabClick = (key: string) => {
    if (key === "create") {
      haptics.heavy();

      setIsCreateOpen(!isCreateOpen);

      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.cos((i / 8) * Math.PI * 2) * 40,
        y: Math.sin((i / 8) * Math.PI * 2) * 40,
      }));

      setParticles(newParticles);

      setTimeout(() => setParticles([]), 600);

      onCreateClick();
    } else {
      haptics.medium();
      onChangeTab(key as MainTab);
    }
  };

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={mounted ? { y: 0, opacity: 1 } : { y: 120, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className="fixed bottom-0 left-0 right-0 z-50 pb-safe"
    >
      <div className="relative mx-auto max-w-[500px]">


        <div className="relative px-5 pb-4">
        <motion.div
  className="relative bg-transparent"
  whileHover={{ y: -3 }}
  transition={{ duration: 0.3 }}
>




            <div className="relative flex items-center justify-between h-20 px-2">
              {tabs.map((tab) => {
                const isActive = currentTab === tab.key;
                const isCreate = tab.key === "create";

                if (isCreate) {
                  return (
                    <div key={tab.key} className="relative">
                      <AnimatePresence>
                        {particles.map((p) => (
                          <motion.div
                            key={p.id}
                            initial={{
                              x: 0,
                              y: 0,
                              opacity: 1,
                              scale: 0,
                            }}
                            animate={{
                              x: p.x,
                              y: p.y,
                              opacity: 0,
                              scale: 1,
                            }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 0.6,
                              ease: "easeOut",
                            }}
                            className={`absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-gradient-to-br ${currentTheme.gradient}`}
                          />
                        ))}
                      </AnimatePresence>

                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        whileHover={{ scale: 1.08 }}
                        onTouchStart={() => haptics.light()}
                        onClick={() => handleTabClick(tab.key)}
                        className="relative"
                      >
                        <motion.div
                          animate={{
                            scale: [1, 1.6, 1],
                            opacity: [0.6, 0, 0.6],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 3,
                            ease: "easeOut",
                          }}
                          className={`absolute inset-0 rounded-full bg-gradient-to-br ${currentTheme.gradient} blur-xl`}
                        />

                        <motion.div
                          className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${currentTheme.gradient} flex items-center justify-center ${currentTheme.glow} ring-[3px] ring-white/70 dark:ring-zinc-900/70`}
                          animate={{
                            rotate: isCreateOpen
                              ? [0, 5, -5, 0]
                              : 0,
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          <IconCreate isOpen={isCreateOpen} />
                        </motion.div>
                      </motion.button>
                    </div>
                  );
                }

                const IconComponent =
                  tab.key === "home"
                    ? IconHome
                    : tab.key === "messages"
                    ? IconMessages
                    : tab.key === "tasks"
                    ? IconTasks
                    : IconProfile;

                return (
                  <motion.button
                    key={tab.key}
                    whileTap={{ scale: 0.88 }}
                    onTouchStart={() => haptics.light()}
                    onClick={() => handleTabClick(tab.key)}
                    className="relative flex items-center justify-center w-16 h-16"
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className={`absolute inset-0 rounded-2xl ${currentTheme.pillBg}`}
                        transition={{
                          type: "spring",
                          bounce: 0.2,
                          duration: 0.6,
                        }}
                      />
                    )}

                    <div className="relative z-10">
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0.5 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.8 }}
                            className={`absolute inset-0 rounded-full ${currentTheme.ripple}`}
                          />
                        )}
                      </AnimatePresence>

                      <motion.div
                        animate={
                          isActive
                            ? { y: [0, -4, 0] }
                            : { y: 0 }
                        }
                        transition={{
                          duration: 0.5,
                          type: "spring",
                          bounce: 0.5,
                        }}
                        className={
                          isActive
                            ? currentTheme.iconActive
                            : "text-zinc-400 dark:text-zinc-600"
                        }
                      >
                        <IconComponent active={isActive} />
                      </motion.div>

                      {tab.key === "messages" &&
                        unreadCount > 0 && (
                          <motion.div
                            initial={{
                              scale: 0,
                              rotate: -180,
                            }}
                            animate={{
                              scale: 1,
                              rotate: 0,
                            }}
                            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] bg-gradient-to-br from-red-500 to-red-600 rounded-full px-[6px] flex items-center justify-center shadow-lg shadow-red-500/50 ring-2 ring-white dark:ring-zinc-900"
                          >
                            <motion.span
                              animate={{
                                scale: [1, 1.15, 1],
                              }}
                              transition={{
                                repeat: Infinity,
                                duration: 2,
                              }}
                              className="text-[10px] font-black text-white leading-none"
                            >
                              {unreadCount > 9
                                ? "9+"
                                : unreadCount}
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