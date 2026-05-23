"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Flame, MapPin, Users, Sparkles, Search, X } from "lucide-react";
import { useAppStore } from "@/store/app";
import { useState, useEffect } from "react";

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

  useEffect(() => {
    if (searchQuery &&!isSearchMode) {
      setIsSearchMode(true);
    }
  }, [searchQuery]);

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

  const currentTheme = themes[mode];

  const filters = [
    {
      key: "hot",
      label: "Hot",
      icon: Flame,
      taskAnim: {
        scale: [1, 1.2, 1],
        rotate: [0, -10, 10, 0],
      },
      planAnim: {
        y: [0, -8, 0],
        scale: [1, 1.15, 1],
      },
    },
    {
      key: "nearby",
      label: "Gần bạn",
      icon: MapPin,
      taskAnim: {
        scale: [1, 1.3, 1],
      },
      planAnim: {
        scale: [1, 1.1, 1],
        y: [0, -4, 0],
      },
    },
    {
      key: "friends",
      label: "Bạn bè",
      icon: Users,
      taskAnim: {
        x: [0, -3, 3, 0],
        scale: [1, 1.1, 1],
      },
      planAnim: {
        rotate: [0, 180, 360],
        scale: [1, 1.2, 1],
      },
    },
    {
      key: "new",
      label: "Mới",
      icon: Sparkles,
      taskAnim: {
        rotate: [0, 360],
        scale: [1, 1.2, 1],
      },
      planAnim: {
        y: [0, -8, 0],
        rotate: [0, 15, -15, 0],
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
              const iconAnim = mode === "task"? filter.taskAnim : filter.planAnim;

              return (
                <motion.button
                  key={filter.key}
                  layout
                  whileTap={{ scale: 0.9 }}
                  onTouchStart={() => haptics.light()}
                  onClick={() => handleClick(filter.key as FilterTab)}
                  onHoverStart={() => setHovered(filter.key)}
                  onHoverEnd={() => setHovered(null)}
                  className="relative flex-shrink-0"
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeFilter"
                      className="absolute inset-0 rounded-2xl"
                      style={{ background: currentTheme.bgGradient }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30
                      }}
                    />
                  )}

                  <motion.div
                    className={`relative h-12 px-5 rounded-2xl flex items-center gap-2.5 font-bold text-[15px] ${
                      isActive
                       ? "text-white"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                    }`}
                    animate={{
                      scale: isActive? 1 : 0.95,
                    }}
                    transition={{
                      scale: { type: "spring", stiffness: 500, damping: 25 },
                    }}
                  >
                    <motion.div
                      animate={isActive? iconAnim : {}}
                      transition={{
                        duration: 0.6,
                        type: "spring",
                        bounce: 0.3,
                      }}
                    >
                      <Icon
                        className="w-5 h-5"
                        strokeWidth={isActive? 2.8 : 2}
                        fill={isActive? currentTheme.accent : "none"}
                        fillOpacity={isActive? 0.3 : 0}
                      />
                    </motion.div>

                    <span>{filter.label}</span>

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
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ background: currentTheme.bgGradient, opacity: 0.1 }}
              />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={mode === "task"? "Tìm task..." : "Tìm plan..."}
                className="relative w-full h-12 px-5 pr-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 outline-none font-semibold text-zinc-900 dark:text-zinc-100"
              />
              {searchQuery && (
                <motion.button
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
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

      {!isSearchMode && (
        <motion.button
          whileTap={{ scale: 0.85 }}
          whileHover={{ scale: 1.05 }}
          onTouchStart={() => haptics.light()}
          onClick={handleSearchClick}
          className="flex-shrink-0"
        >
          <div
            className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
              mode === "task"
               ? "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                : "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
            }`}
          >
            <Search className="w-5 h-5" strokeWidth={2.8} />
          </div>
        </motion.button>
      )}
    </div>
  );
}