"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
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

// Bộ icon custom cho Task - style tech, nhanh, sắc
const TaskIcons = {
  Hot: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 2L7 9L10 11L8 15L16 9L13 7L15 2H12Z"
        fill={isActive ? fill : "none"}
        stroke={isActive ? fill : "currentColor"}
        strokeWidth={isActive ? 0 : 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={isActive ? {
          d: [
            "M12 2L7 9L10 11L8 15L16 9L13 7L15 2H12Z",
            "M12 1L6 9L10 12L7 16L17 8L13 6L16 1H12Z",
            "M12 2L7 9L10 11L8 15L16 9L13 7L15 2H12Z"
          ],
          scale: [1, 1.2, 1],
        } : {}}
        transition={{ duration: 0.6, repeat: isActive ? Infinity : 0, repeatDelay: 2 }}
      />
    </svg>
  ),
  Nearby: ({ isActive }: { isActive: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <motion.circle
        cx="12" cy="12" r="8"
        stroke="currentColor" strokeWidth="2"
        animate={isActive ? {
          r: [8, 10, 8],
          strokeWidth: [2, 3, 2]
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.circle
        cx="12" cy="12" r="3"
        fill="currentColor"
        animate={isActive ? {
          scale: [1, 1.3, 1],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </svg>
  ),
  Friends: ({ isActive }: { isActive: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <motion.circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2"
        animate={isActive ? { y: [0, -2, 0] } : {}}
        transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 1 }}
      />
      <motion.circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="2"
        animate={isActive ? { y: [0, -2, 0] } : {}}
        transition={{ duration: 0.4, delay: 0.1, repeat: Infinity, repeatDelay: 1 }}
      />
      <path d="M5 21V17C5 14.7909 6.79086 13 9 13H11C13.2091 13 15 14.7909 15 17V21" stroke="currentColor" strokeWidth="2"/>
      <path d="M13 21V17C13 14.7909 14.7909 13 17 13H19C21.2091 13 23 14.7909 23 17V21" stroke="currentColor" strokeWidth="2"/>
    </svg>
  ),
  New: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill={isActive ? fill : "none"}
        stroke="currentColor"
        strokeWidth="2"
        animate={isActive ? {
          rotate: [0, 180, 360],
          scale: [1, 1.3, 1]
        } : {}}
        transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
      />
    </svg>
  ),
};

// Bộ icon custom cho Plan - style organic, mềm, chill
const PlanIcons = {
  Hot: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 3C12 3 7 8 7 13C7 16.3137 9.68629 19 13 19C16.3137 19 19 16.3137 19 13C19 8 14 3 12 3Z"
        fill={isActive ? fill : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        animate={isActive ? {
          scale: [1, 1.1, 1],
          y: [0, -3, 0]
        } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  ),
  Nearby: ({ isActive }: { isActive: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        stroke="currentColor" strokeWidth="2"
        animate={isActive ? {
          scale: [1, 1.05, 1],
        } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <circle cx="12" cy="9" r="2.5" fill="currentColor"/>
    </svg>
  ),
  Friends: ({ isActive }: { isActive: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <motion.g
        animate={isActive ? {
          rotate: [0, 5, -5, 0]
        } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M5 21V19C5 16.2386 7.23858 14 10 14H14C16.7614 14 19 16.2386 19 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </motion.g>
    </svg>
  ),
  New: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <motion.g
        animate={isActive ? {
          y: [0, -4, 0],
          rotate: [0, 10, -10, 0]
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" 
          fill={isActive ? fill : "none"} 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </motion.g>
    </svg>
  ),
};

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
  }, [searchQuery, isSearchMode]);

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

const currentTheme = themes[mode]; // Đúng
  const IconSet = mode === "task" ? TaskIcons : PlanIcons;

  const filters = [
    { key: "hot", label: "Hot", Icon: IconSet.Hot },
    { key: "nearby", label: "Gần bạn", Icon: IconSet.Nearby },
    { key: "friends", label: "Bạn bè", Icon: IconSet.Friends },
    { key: "new", label: "Mới", Icon: IconSet.New },
  ];

  const handleClick = (key: FilterTab) => {
    haptics.medium();
    onChangeFilter(key);
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
    <div className="px-4 pb-3 space-y-3">
      {/* Hàng 1: 4 tab filter - luôn hiển thị */}
      <motion.div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {filters.map((filter) => {
          const isActive = currentFilter === filter.key;
          const isHovered = hovered === filter.key;
          const Icon = filter.Icon;

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
                    damping: 30,
                  }}
                />
              )}

              <motion.div
                className={`relative h-10 px-4 rounded-2xl flex items-center gap-2 font-bold ${
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
                <Icon isActive={isActive} fill={currentTheme.accent} />
                <span className="text-sm">{filter.label}</span>

                <AnimatePresence>
                  {isHovered &&!isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className="absolute inset-0 rounded-2xl bg-gray-200 dark:bg-zinc-700 -z-10"
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Hàng 2: Search - To hơn */}
      <AnimatePresence initial={false} mode="wait">
        {isSearchMode? (
          <motion.div
            key="search"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <div className="relative flex-1">
              <motion.div
                className="absolute inset-0 rounded-2xl"
                style={{ background: currentTheme.bgGradient }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
              />
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={mode === "task"? "Tìm task nhanh..." : "Tìm plan chill..."}
                className="relative w-full h-11 px-4 pr-10 rounded-2xl bg-gray-100 dark:bg-zinc-800 outline-none font-semibold text-base text-zinc-900 dark:text-zinc-100"
              />
              {searchQuery && (
                <motion.button
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
                >
                  <X size={18} className="text-zinc-500" />
                </motion.button>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleCloseSearch}
              className="h-11 w-11 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-zinc-400 flex-shrink-0"
            >
              <X className="w-5 h-5" strokeWidth={2.8} />
            </motion.button>
          </motion.div>
        ) : (
          <motion.button
            key="search-btn"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            onTouchStart={() => haptics.light()}
            onClick={handleSearchClick}
            className="w-full h-11 rounded-2xl bg-gray-100 dark:bg-zinc-800 flex items-center justify-center gap-2.5 text-gray-600 dark:text-zinc-400 font-bold text-base overflow-hidden shadow-sm"
          >
            <motion.div
              animate={{ x: [0, -2, 2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Search className="w-5 h-5" strokeWidth={2.8} />
            </motion.div>
            <span>Tìm kiếm</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}