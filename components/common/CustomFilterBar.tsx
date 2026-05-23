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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="taskFlameCore" x1="12" y1="18" x2="12" y2="2">
          <stop offset="0%" stopColor={isActive? fill : "currentColor"} />
          <stop offset="50%" stopColor={isActive? fill : "currentColor"} stopOpacity={0.8} />
          <stop offset="100%" stopColor={isActive? "#FFD60A" : "currentColor"} />
        </linearGradient>
        <filter id="taskFlameGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <motion.g style={{ originX: "50%", originY: "85%" }}>
        {isActive && (
          <>
            <motion.path
              d="M12 1C8 6 6 9 6 13C6 17 8.5 20 12 20C15.5 20 18 17 18 13C18 9 16 6 12 1Z"
              fill="url(#taskFlameCore)"
              opacity={0.3}
              filter="url(#taskFlameGlow)"
              animate={{
                scale: [1, 1.2, 0.85, 1.15, 1],
                opacity: [0.2, 0.5, 0.15, 0.4, 0.2]
              }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle
              cx="10" cy="10" r="1" fill="#FFD60A"
              animate={{ y: [-2, -8, -12], opacity: [0, 1, 0], x: [0, -2, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: 0.2 }}
            />
            <motion.circle
              cx="14" cy="11" r="0.7" fill={fill}
              animate={{ y: [-1, -7, -11], opacity: [0, 0.9, 0], x: [0, 2, -1] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: 0.9 }}
            />
          </>
        )}
        <motion.path
          d="M12 2.5C9 7 7.5 10 7.5 13.5C7.5 16.5 9.5 19 12 19C14.5 19 16.5 16.5 16.5 13.5C16.5 10 15 7 12 2.5Z"
          fill={isActive? "url(#taskFlameCore)" : "none"}
          stroke={isActive? "none" : "currentColor"}
          strokeWidth={2}
          strokeLinecap="round"
          filter={isActive? "url(#taskFlameGlow)" : undefined}
          animate={isActive? {
            d: [
              "M12 2.5C9 7 7.5 10 7.5 13.5C7.5 16.5 9.5 19 12 19C14.5 19 16.5 13.5C16.5 10 15 7 12 2.5Z",
              "M12 2C8.5 7.5 7 10.5 7 14C7 17 9 19.5 12 19.5C15 19.5 17 17 17 14C17 10.5 15.5 7.5 12 2Z",
              "M12 3C9.5 6.8 8 9.8 8 13.2C8 16.2 9.8 18.8 12 18.8C14.2 18.8 16 16.2 16 13.2C16 9.8 14.5 6.8 12 3Z",
              "M12 2.5C9 7 7.5 10 7.5 13.5C7.5 16.5 9.5 19 12 19C14.5 19 16.5 13.5C16.5 10 15 7 12 2.5Z"
            ],
            scale: [1, 1.05, 0.98, 1.03, 1],
            rotate: [0, -2, 2, -1, 0]
          } : {}}
          transition={{ duration: 1.2, repeat: isActive? Infinity : 0, ease: "easeInOut" }}
        />
        {isActive && (
          <motion.path
            d="M12 8C11 10.3 11.5 10.3 13.5C10.3 14.88 11.1 16 12 16C12.9 16 13.7 14.88 13.7 13.5C13.7 11.5 13 10 12 8Z"
            fill="#FFF"
            style={{ mixBlendMode: "screen" }}
            animate={{
              opacity: [0.7, 1, 0.5, 0.9, 0.7],
              scale: [0.9, 1.1, 0.85, 1.05, 0.9]
            }}
            transition={{ duration: 0.6, repeat: Infinity }}
          />
        )}
      </motion.g>
    </svg>
  ),
  Nearby: ({ isActive }: { isActive: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <motion.g
        animate={isActive? { rotate: [0, 360] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        style={{ originX: "50%", originY: "50%" }}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2"/>
      </motion.g>
      <motion.circle
        cx="12" cy="12" r="6"
        stroke="currentColor" strokeWidth="2"
        animate={isActive? { scale: [1, 1.2, 1], opacity: [1, 0.5, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <motion.circle
        cx="12" cy="12" r="2.5"
        fill="currentColor"
        animate={isActive? { scale: [1, 1.4, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    </svg>
  ),
  Friends: ({ isActive }: { isActive: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <motion.circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="2"
        animate={isActive? { y: [0, -3, 0], scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
      />
      <motion.circle cx="16" cy="8" r="3" stroke="currentColor" strokeWidth="2"
        animate={isActive? { y: [0, -3, 0], scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, delay: 0.15, repeat: Infinity, repeatDelay: 1 }}
      />
      <motion.path
        d="M5 21V17C5 14.7909 6.79086 13 9 13H11C13.2091 13 15 14.7909 15 17V21"
        stroke="currentColor" strokeWidth="2"
        animate={isActive? { pathLength: [0.7, 1, 0.7] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.path
        d="M13 21V17C13 14.7909 14.7909 13 17 13H19C21.2091 13 23 14.7909 23 17V21"
        stroke="currentColor" strokeWidth="2"
        animate={isActive? { pathLength: [0.7, 1, 0.7] } : {}}
        transition={{ duration: 2, delay: 0.2, repeat: Infinity }}
      />
    </svg>
  ),
  New: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill={isActive? fill : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        animate={isActive? {
          rotate: [0, 180, 360],
          scale: [1, 1.4, 1]
        } : {}}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
      />
      {isActive && [0, 90, 180, 270].map((deg, i) => (
        <motion.circle
          key={deg}
          cx="12" cy="12" r="10"
          fill={fill}
          style={{ originX: "50%", originY: "50%", rotate: deg }}
          animate={{ y: [0, -6, 0], opacity: [0, 1, 0], scale: [0, 1, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 + 1 }}
        />
      ))}
    </svg>
  ),
};

// Bộ icon custom cho Plan - style organic, mềm, chill
const PlanIcons = {
  Hot: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 3C12 3 7 8 7 13C7 16.3137 9.68629 19 13 19C16.3137 19 19 16.3137 19 13C19 8 14 3 12 3Z"
        fill={isActive? fill : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        animate={isActive? {
          scale: [1, 1.15, 1],
          y: [0, -4, 0]
        } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {isActive && (
        <motion.circle cx="12" cy="13" r="3" fill={fill} opacity={0.6}
          animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        />
      )}
    </svg>
  ),
  Nearby: ({ isActive }: { isActive: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        stroke="currentColor" strokeWidth="2"
        animate={isActive? { scale: [1, 1.08, 1] } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle cx="12" cy="9" r="2.5" fill="currentColor"
        animate={isActive? { scale: [1, 1.3, 1] } : {}}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
    </svg>
  ),
  Friends: ({ isActive }: { isActive: boolean }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <motion.g
        animate={isActive? { rotate: [0, 8, -8, 0] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "50%", originY: "70%" }}
      >
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M5 21V19C5 16.2386 7.23858 14 10 14H14C16.7614 14 19 16.2386 19 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </motion.g>
    </svg>
  ),
  New: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <motion.g
        animate={isActive? { y: [0, -5, 0], rotate: [0, 15, -15, 0] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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
  const [showLabel, setShowLabel] = useState(false);

  // 5s đầu chỉ icon, sau đó hiện chữ, lặp
  useEffect(() => {
    const interval = setInterval(() => {
      setShowLabel(prev =>!prev);
    }, 5000);
    return () => clearInterval(interval);
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
      {/* Hàng 1: 4 tab filter */}
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
                className={`relative h-11 px-4 rounded-2xl flex items-center gap-2 font-bold transition-all ${
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
                <AnimatePresence mode="wait">
                  {showLabel && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0, x: -10 }}
                      animate={{ opacity: 1, width: "auto", x: 0 }}
                      exit={{ opacity: 0, width: 0, x: -10 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm whitespace-nowrap overflow-hidden"
                    >
                      {filter.label}
                    </motion.span>
                  )}
                </AnimatePresence>

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

      {/* Hàng 2: Search */}
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