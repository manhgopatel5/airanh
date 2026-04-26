"use client";
import { HiFire, HiClock, HiSparkles, HiUsers } from "react-icons/hi2";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import { useState, useRef } from "react";

type TabId = "hot" | "near" | "new" | "friends";

const tabs = [
  {
    id: "hot" as TabId,
    label: "Hot",
    icon: HiFire,
    color: "from-orange-500 via-red-500 to-pink-500",
    glow: "shadow-[0_8px_32px_rgba(249,115,22,0.4)]",
    particles: "✨"
  },
  {
    id: "near" as TabId,
    label: "Gần",
    icon: HiClock,
    color: "from-emerald-500 via-teal-500 to-cyan-500",
    glow: "shadow-[0_8px_32px_rgba(16,185,129,0.4)]",
    particles: "📍"
  },
  {
    id: "new" as TabId,
    label: "Mới",
    icon: HiSparkles,
    color: "from-blue-500 via-indigo-500 to-violet-500",
    glow: "shadow-[0_8px_32px_rgba(59,130,246,0.4)]",
    particles: "⚡"
  },
  {
    id: "friends" as TabId,
    label: "Bạn bè",
    icon: HiUsers,
    color: "from-purple-500 via-pink-500 to-rose-500",
    glow: "shadow-[0_8px_32px_rgba(168,85,247,0.4)]",
    particles: "💫"
  },
] as const;

type Props = {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  counts?: Partial<Record<TabId, number>>;
};

export default function TopTabs({ activeTab, setActiveTab, counts }: Props) {
  const [hoveredTab, setHoveredTab] = useState<TabId | null>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });

  return (
    <div className="sticky top-0 z-30 safe-top">
      <div className="relative bg-gradient-to-b from-white/90 via-white/70 to-white/50 dark:from-zinc-950/90 dark:via-zinc-950/70 dark:to-zinc-950/50 backdrop-blur-3xl">
        {/* Reflection line top */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />

        <div className="flex items-stretch justify-between px-1 h-[68px] max-w-2xl mx-auto">
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
                  if (navigator.vibrate) navigator.vibrate([10, 5, 10]);
                }}
                className="relative flex-1 flex items-center justify-center py-2 group perspective-1000"
              >
                {/* Liquid morph background */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="liquidBg"
                      className="absolute inset-1 overflow-hidden"
                      initial={{ borderRadius: "16px" }}
                      animate={{ borderRadius: "20px" }}
                      transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    >
                      {/* Gradient layer */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${tab.color} ${tab.glow}`} />

                      {/* Animated mesh gradient */}
                      <motion.div
                        animate={{
                          background: [
                            `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
                            `radial-gradient(circle at 80% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
                            `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%)`,
                          ]
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                        className="absolute inset-0"
                      />

                      {/* Glass reflection */}
                      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" />

                      {/* Particles */}
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ y: 20, x: -10, opacity: 0 }}
                          animate={{
                            y: -20,
                            x: 10,
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.6,
                            ease: "easeOut"
                          }}
                          className="absolute bottom-0 left-1/2 text-lg"
                        >
                          {tab.particles}
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hover glow */}
                <AnimatePresence>
                  {isHovered &&!isActive && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`absolute inset-2 rounded-xl bg-gradient-to-br ${tab.color} blur-2xl opacity-20`}
                    />
                  )}
                </AnimatePresence>

                {/* 3D Press effect */}
                <motion.div
                  className="relative flex flex-col items-center justify-center gap-0.5"
                  whileTap={{ scale: 0.85, rotateX: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <div className="relative h-7 flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: isActive? 1.25 : 1,
                        rotateY: isActive? [0, 360] : 0,
                        y: isActive? [0, -4, 0] : 0
                      }}
                      transition={{
                        scale: { type: "spring", stiffness: 400, damping: 15 },
                        rotateY: { duration: 0.6, ease: "easeInOut" },
                        y: { duration: 0.4, ease: "easeOut" }
                      }}
                    >
                      <Icon
                        size={26}
                        className={`transition-all duration-300 ${
                          isActive
                          ? "text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]"
                            : "text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300 group-hover:scale-110"
                        }`}
                      />
                    </motion.div>

                    {/* Badge với pulse */}
                    <AnimatePresence>
                      {count && count > 0 && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 180 }}
                          transition={{ type: "spring", stiffness: 500, damping: 15 }}
                          className="absolute -top-1.5 -right-2.5"
                        >
                          <div className="relative">
                            <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75" />
                            <div className="relative min-w- h- px-1.5 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white text- font-black flex items-center justify-center border-2 border-white dark:border-zinc-950 shadow-xl">
                              {count > 99? "99+" : count}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <motion.span
                    animate={{
                      font