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

const TaskIcons = {
  Hot: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="taskFireGrad" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#FF9500" />
          <stop offset="40%" stopColor="#FF3B30" />
          <stop offset="100%" stopColor="#FFD60A" />
        </linearGradient>
        <filter id="taskFireGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

    <motion.path
  d="M12 2C9.5 2 7 4.5 7 9C7 11.5 8 14 9.5 17C10.5 18.5 11.5 20 12 22C12.5 20 13.5 18.5 14.5 17C16 14 17 11.5 17 9C17 4.5 14.5 2 12 2Z"
  fill={isActive? "url(#taskFireGrad)" : "none"}
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
  filter={isActive? "url(#taskFireGlow)" : undefined}
  animate={isActive? {
    scaleY: [1, 1.12, 0.96, 1.08, 1],
    scaleX: [1, 0.92, 1.04, 0.96, 1],
    rotate: [0, -2, 2, -1, 0]
  } : {}}
  transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
  style={{ originX: "50%", originY: "85%" }}
/>

<motion.path
  d="M12 5C10.8 5 9.5 7 9.5 10C9.5 12 10.2 14 11 16C11.5 17 11.8 18 12 20C12.2 18 12.5 17 13 16C13.8 14 14.5 12 14.5 10C14.5 7 13.2 5 12 5Z"
  fill={isActive? "#FFD60A" : "none"}
  stroke="currentColor"
  strokeWidth="1.5"
  opacity={isActive? 0.9 : 0}
  animate={isActive? {
    scaleY: [1, 1.18, 0.92, 1.12, 1],
    opacity: [0.9, 1, 0.8, 1, 0.9]
  } : {}}
  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
  style={{ originX: "50%", originY: "85%" }}
/>

      {isActive && [
        { x: 10, delay: 0 },
        { x: 12, delay: 0.3 },
        { x: 14, delay: 0.6 },
      ].map((spark, i) => (
        <motion.circle
          key={i}
          cx={spark.x}
          cy="10"
          r="0.8"
          fill="#FFD60A"
          animate={{
            y: [0, -10, -14],
            opacity: [0, 1, 0],
            scale: [0, 1.2, 0]
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: spark.delay,
            ease: "easeOut"
          }}
        />
      ))}
    </svg>
  ),
  Nearby: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <radialGradient id="mapPulse" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.6} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </radialGradient>
      </defs>
      
      <path
        d="M3 7L9 4L15 7L21 4V17L15 20L9 17L3 20V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <motion.path
        d="M9 4V17M15 7V20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        animate={isActive? { pathLength: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <motion.g
        animate={isActive? { y: [0, -3, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          d="M12 8C10.3 8 9.3 9 11C9 13.5 12 17 12 17C12 17 15 13.5 15 11C15 9.3 13.7 8 12 8Z"
          fill={isActive? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="12" cy="11" r="1.5" fill="white" />
      </motion.g>

      {isActive && (
        <motion.circle
          cx="12" cy="11" r="3"
          fill="url(#mapPulse)"
          animate={{
            scale: [1, 2.5, 1],
            opacity: [0.6, 0, 0.6]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </svg>
  ),
  Friends: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2"
        animate={isActive? { y: [0, -4, 0], scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.2 }}
      />
      <motion.circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="2"
        animate={isActive? { y: [0, -4, 0], scale: [1, 1.15, 1] } : {}}
        transition={{ duration: 0.6, delay: 0.2, repeat: Infinity, repeatDelay: 1.2 }}
      />
      <motion.path
        d="M5 21V17C5 14.7909 6.79086 13 9 13H11C13.2091 13 15 14.7909 15 17V21"
        stroke="currentColor" strokeWidth="2"
        animate={isActive? { pathLength: [0.6, 1, 0.6], pathOffset: [0, 0.3, 0] } : {}}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
      <motion.path
        d="M13 21V17C13 14.7909 14.7909 13 17 13H19C21.2091 13 23 14.7909 23 17V21"
        stroke="currentColor" strokeWidth="2"
        animate={isActive? { pathLength: [0.6, 1, 0.6], pathOffset: [0, 0.3, 0] } : {}}
        transition={{ duration: 2.5, delay: 0.3, repeat: Infinity }}
      />
    </svg>
  ),
  New: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill={isActive? fill : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        animate={isActive? {
          rotate: [0, 180, 360],
          scale: [1, 1.5, 1]
        } : {}}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
      />
      {isActive && [0, 72, 144, 216, 288].map((deg, i) => (
        <motion.circle
          key={deg}
          cx="12" cy="12" r="10"
          fill={fill}
          style={{ originX: "50%", originY: "50%", rotate: deg }}
          animate={{ y: [0, -8, 0], opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.08 + 1 }}
        />
      ))}
    </svg>
  ),
};

const PlanIcons = {
  Hot: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="planFireGrad" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#FF9F0A" />
          <stop offset="100%" stopColor={fill} />
        </linearGradient>
      </defs>
      <motion.path
        d="M12 22C10 22 7.5 19 7.5 15C7.5 12 9.5 9.5 12 6C14.5 9.5 16.5 12 16.5 15C16.5 19 14 22 12 22Z"
        fill={isActive? "url(#planFireGrad)" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        animate={isActive? {
          scaleY: [1, 1.08, 0.97, 1.04, 1],
          scaleX: [1, 0.96, 1.02, 0.98, 1],
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "50%", originY: "85%" }}
      />
      {isActive && (
        <motion.circle cx="12" cy="13" r="2.5" fill={fill} opacity={0.6}
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      )}
    </svg>
  ),
  Nearby: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 7L9 4L15 7L21 4V17L15 20L9 17L3 20V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <motion.path
        d="M9 4V17M15 7V20"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        animate={isActive? { pathLength: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      {isActive && (
        <motion.circle
          cx="12" cy="12" r="2"
          stroke={fill} strokeWidth="1.5" fill="none"
          animate={{
            r: [2, 6, 2],
            opacity: [0.8, 0, 0.8]
          }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      )}
    </svg>
  ),
  Friends: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 21C12 21 4 13.5 4 8.5C4 5.5 6.5 3 9.5 3C11.1 3 12 3.8 12 3.8C12 3.8 12.9 3 14.5 3C17.5 3 20 5.5 20 8.5C20 13.5 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill={isActive? fill : "none"}
        animate={isActive? {
          scale: [1, 1.15, 1],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "50%", originY: "50%" }}
      />
      {isActive && [
        { x: 8, y: 8, delay: 0 },
        { x: 16, y: 8, delay: 0.3 },
        { x: 12, y: 5, delay: 0.6 },
      ].map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x} cy={p.y} r="1"
          fill={fill}
          animate={{
            y: [0, -6, -10],
            opacity: [0, 1, 0],
            scale: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut"
          }}
        />
      ))}
    </svg>
  ),
  New: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.g
        animate={isActive? { y: [0, -6, 0], rotate: [0, 20, -20, 0] } : {}}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "50%", originY: "50%" }}
      >
        <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z"
          fill={isActive? fill : "none"}
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
    document.body.style.overscrollBehavior = 'none';
    return () => {
      document.body.style.overscrollBehavior = 'auto';
    };
  }, []);

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

  const currentTheme = themes[mode];
  const IconSet = mode === "task"? TaskIcons : PlanIcons;

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
      <div className="grid grid-cols-4 gap-2">
        {filters.map((filter) => {
          const isActive = currentFilter === filter.key;
          const isHovered = hovered === filter.key;
          const Icon = filter.Icon;

          return (
            <motion.button
              key={filter.key}
              whileTap={{ scale: 0.92 }}
              onTouchStart={() => haptics.light()}
              onClick={() => handleClick(filter.key as FilterTab)}
              onHoverStart={() => setHovered(filter.key)}
              onHoverEnd={() => setHovered(null)}
              className="relative w-full"
            >
              {isActive && (
                <motion.div
                  layoutId="activeFilter"
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: currentTheme.bgGradient }}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 35,
                  }}
                />
              )}

              <motion.div
                className={`relative h-12 rounded-2xl flex items-center justify-center gap-1.5 font-bold overflow-hidden px-2 ${
                  isActive
              ? "text-white"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"
                }`}
                animate={{
                  scale: isActive? 1 : 0.96,
                }}
                transition={{
                  scale: { type: "spring", stiffness: 600, damping: 30 },
                }}
              >
                <Icon isActive={isActive} fill={currentTheme.accent} />
                <span className="text-xs whitespace-nowrap">{filter.label}</span>

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
      </div>

      <AnimatePresence initial={false} mode="wait">
        {isSearchMode? (
          <motion.div
            key="search"
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
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
                  exit={{ scale: 0, rotate: 90 }}
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
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.3 }}
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