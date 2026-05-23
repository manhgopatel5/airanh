"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, MapPin, Users, Sparkles, Search, X } from "lucide-react";
import { useAppStore } from "@/store/app";
import { useState } from "react";

const haptics = {
  light: () => navigator?.vibrate?.(5),
  medium: () => navigator?.vibrate?.([8, 15, 8]),
};

type FilterTab = "hot" | "nearby" | "friends" | "new";

interface CustomFilterBarProps {
  currentFilter: FilterTab;
  onChangeFilter: (filter: FilterTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function CustomFilterBar({
  currentFilter,
  onChangeFilter,
  searchQuery,
  onSearchChange,
}: CustomFilterBarProps) {
  const mode = useAppStore((s) => s.mode) || "task";
  const [hovered, setHovered] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);

  // TASK: Cyber/Neon/Glitch - Morph + Stretch
  // PLAN: Organic/Fluid/Breath - Scale + Float
  const themes = {
    task: {
      bg: "#0A84FF",
      bgGradient: "linear-gradient(135deg, #0A84FF 0%, #0051D5 100%)",
      accent: "#00D9FF",
      secondary: "#5AC8FA",
    },
    plan: {
      bg: "#30D158",
      bgGradient: "linear-gradient(135deg, #30D158 0%, #248A3D 100%)",
      accent: "#FFD60A",
      secondary: "#FF9F0A",
    },
  };

  const currentTheme = themes;

  const filters = [
    { 
      key: "hot", 
      label: "Hot", 
      icon: Flame,
      taskAnim: { 
        scale: [1, 1.4, 0.9, 1.1, 1],
        rotate: [0, -15, 15, -5, 0],
      },
      planAnim: { 
        y: [0, -12, 0, -4, 0],
        scale: [1, 1.25, 0.95, 1],
      },
    },
    { 
      key: "nearby", 
      label: "Gần bạn", 
      icon: MapPin,
      taskAnim: { 
        scale: [1, 0.7, 1.5, 1],
        rotate: [0, 10, -10, 0],
      },
      planAnim: { 
        scale: [1, 0.85, 1.15, 1],
        y: [0, 4, -4, 0],
      },
    },
    { 
      key: "friends", 
      label: "Bạn bè", 
      icon: Users,
      taskAnim: { 
        x: [0, -5, 5, -3, 0],
        scale: [1, 1.2, 1],
      },
      planAnim: { 
        rotate: [0, 180, 360],
        scale: [1, 1.3, 1],
      },
    },
    { 
      key: "new", 
      label: "Mới", 
      icon: Sparkles,
      taskAnim: { 
        rotate: [0, 90, 180, 270, 360],
        scale: [1, 1.4, 1],
      },
      planAnim: { 
        y: [0, -10, 0, -5, 0],
        rotate: [0, 25, -25, 0],
        scale: [1, 1.2, 1],
      },
    },
  ];

  const handleClick = (key: FilterTab) => {
    haptics.medium();
    onChangeFilter(key);
    if (isSearchMode) {
      setIsSearchMode(false);
      onSearchChange("");
    }
  };

  const handleSearchClick = () => {
    haptics.medium();
    setIsSearchMode(true);
  };

  const handleCloseSearch = () => {
    haptics.light();
    setIsSearchMode(false);
    onSearchChange("");
  };

  return (
    <div className="flex items-center gap-3 px-4 pb-4 overflow-x-auto no-scrollbar">
      <AnimatePresence mode="wait">
        {!isSearchMode? (
          <motion.div
            key="filters"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex items-center gap-3"
          >
            {filters.map((filter) => {
              const isActive = currentFilter === filter.key;
              const isHovered = hovered === filter.key;
              const Icon = filter.icon;
              const iconAnim = mode === "task" ? filter.taskAnim : filter.planAnim;

              return (
                <motion.button
                  key={filter.key}
                  whileTap={{ scale: 0.82 }}
                  onTouchStart={() => haptics.light()}
                  onClick={() => handleClick(filter.key as FilterTab)}
                  onHoverStart={() => setHovered(filter.key)}
                  onHoverEnd={() => setHovered(null)}
                  className="relative flex-shrink-0"
                >
                  {/* Liquid blob background - morph khi active */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0, borderRadius: "50%" }}
                        animate={{ 
                          scale: 1, 
                          borderRadius: mode === "task" ? ["50%", "40%", "50%"] : ["50%", "45%", "50%"],
                        }}
                        exit={{ scale: 0, borderRadius: "50%" }}
                        transition={{ 
                          scale: { type: "spring", stiffness: 300, damping: 25 },
                          borderRadius: { repeat: Infinity, duration: mode === "task" ? 1.5 : 2.5 }
                        }}
                        className="absolute inset-0"
                        style={{ background: currentTheme.bgGradient }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Pulse rings - Task: 3 rings, Plan: 2 rings */}
                  <AnimatePresence>
                    {isActive && (
                      <>
                        {[...Array(mode === "task" ? 3 : 2)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: mode === "task" ? 1.2 : 1.8,
                              delay: i * (mode === "task" ? 0.2 : 0.3),
                              repeat: Infinity,
                              ease: "easeOut",
                            }}
                            className="absolute inset-0 rounded-2xl"
                            style={{ backgroundColor: currentTheme.accent }}
                          />
                        ))}
                      </>
                    )}
                  </AnimatePresence>

                  <motion.div
                    className={`relative h-12 px-5 rounded-2xl flex items-center gap-2.5 font-bold text- ${
                      isActive
                      ? "text-white"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                    }`}
                    animate={{
                      scale: isActive? 1 : 0.92,
                      y: isActive && mode === "plan" ? [0, -3, 0] : 0,
                    }}
                    transition={{
                      scale: { type: "spring", stiffness: mode === "task" ? 600 : 350, damping: 20 },
                      y: { repeat: isActive && mode === "plan" ? Infinity : 0, duration: 2 },
                    }}
                  >
                    {/* Icon với anim riêng cho mỗi tab */}
                    <motion.div
                      animate={isActive? iconAnim : {}}
                      transition={{
                        duration: mode === "task" ? 0.7 : 1,
                        type: "spring",
                        bounce: mode === "plan" ? 0.6 : 0.2,
                      }}
                    >
                      <Icon 
                        className="w-5 h-5" 
                        strokeWidth={isActive? 2.8 : 2}
                        fill={isActive? currentTheme.accent : "none"}
                        fillOpacity={isActive? 0.3 : 0}
                      />
                    </motion.div>

                    <motion.span
                      animate={isActive? { 
                        letterSpacing: mode === "task" ? ["0px", "1px", "0px"] : "0px",
                      } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      {filter.label}
                    </motion.span>

                    {/* Floating orbs - Task: 4 orbs, Plan: 3 orbs */}
                    {isActive && (
                      <>
                        {[...Array(mode === "task" ? 4 : 3)].map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ scale: 0, x: 0, y: 0 }}
                            animate={{
                              scale: [0, 1, 0],
                              x: Math.cos((i * Math.PI * 2) / (mode === "task" ? 4 : 3)) * 25,
                              y: Math.sin((i * Math.PI * 2) / (mode === "task" ? 4 : 3)) * 25,
                            }}
                            transition={{
                              duration: mode === "task" ? 1.5 : 2,
                              delay: i * 0.15,
                              repeat: Infinity,
                              repeatDelay: 1,
                            }}
                            className="absolute w-1.5 h-1.5 rounded-full"
                            style={{ 
                              backgroundColor: i % 2 === 0? currentTheme.accent : currentTheme.secondary 
                            }}
                          />
                        ))}
                      </>
                    )}

                    {/* Hover indicator */}
                    <AnimatePresence>
                      {isHovered &&!isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute inset-0 rounded-2xl bg-gray-200 dark:bg-zinc-700 -z-10"
                        />
                      )}
                    </AnimatePresence>
                  </motion.div>
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="search"
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }}
            className="flex items-center gap-2 flex-1"
          >
            <div className="relative flex-1">
              {/* Liquid background khi focus */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute inset-0 rounded-2xl"
                style={{ background: currentTheme.bgGradient, opacity: 0.1 }}
              />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={mode === "task" ? "Tìm task..." : "Tìm plan..."}
                className={`relative w-full h-12 px-5 pr-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 outline-none font-semibold text- text-zinc-900 dark:text-zinc-100`}
              />
              {searchQuery && (
                <motion.button
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  onClick={() => onSearchChange("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  <X size={18} className="text-zinc-500" />
                </motion.button>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleCloseSearch}
              className="h-12 w-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-400"
            >
              <X className="w-5 h-5" strokeWidth={2.8} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search button - chỉ hiện khi không search */}
      {!isSearchMode && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          whileHover={{ 
            scale: 1.1, 
            rotate: mode === "task" ? 90 : [0, -10, 10, 0],
          }}
          onTouchStart={() => haptics.light()}
          onClick={handleSearchClick}
          className="flex-shrink-0"
        >
          <motion.div
            className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
              mode === "task"
              ? "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                : "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
            }`}
            animate={mode === "plan"? { 
              scale: [1, 1.05, 1],
            } : {}}
            transition={{ 
              scale: { repeat: mode === "plan" ? Infinity : 0, duration: 2 }
            }}
          >
            <Search className="w-5 h-5" strokeWidth={2.8} />
          </motion.div>
        </motion.button>
      )}
    </div>
  );
}