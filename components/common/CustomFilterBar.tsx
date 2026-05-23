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
        <radialGradient id="taskFlameOuter" cx="50%" cy="90%" r="60%">
          <stop offset="0%" stopColor={isActive? fill : "currentColor"} stopOpacity={0.6} />
          <stop offset="100%" stopColor={isActive? fill : "currentColor"} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="taskFlameCore" x1="12" y1="19" x2="12" y2="1">
          <stop offset="0%" stopColor={isActive? "#FF3B30" : "currentColor"} />
          <stop offset="30%" stopColor={isActive? fill : "currentColor"} />
          <stop offset="65%" stopColor={isActive? "#FF9500" : "currentColor"} />
          <stop offset="100%" stopColor={isActive? "#FFD60A" : "currentColor"} />
        </linearGradient>
        <filter id="taskFlameBlur" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
        <filter id="taskFlameGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <motion.g style={{ originX: "50%", originY: "85%" }}>
        {isActive && (
          <>
            {/* Lớp 1: Aura ngoài */}
            <motion.ellipse
              cx="12" cy="16" rx="6" ry="4"
              fill="url(#taskFlameOuter)"
              animate={{
                scale: [1, 1.3, 0.8, 1.2, 1],
                opacity: [0.3, 0.6, 0.2, 0.5, 0.3]
              }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            {/* Lớp 2: Lửa phụ trái */}
            <motion.path
              d="M9 4C7 7 6 10 6 13.5C6 16 7.5 18.5 9.5 18.5C11.5 18.5 12.5 16 12.5 13.5C12.5 10 11 7 9 4Z"
              fill="url(#taskFlameCore)"
              opacity={0.5}
              filter="url(#taskFlameBlur)"
              animate={{
                d: [
                  "M9 4C7 7 6 10 6 13.5C6 16 7.5 18.5 9.5 18.5C11.5 18.5 12.5 16 12.5 13.5C12.5 10 11 7 9 4Z",
                  "M8.5 3.5C6.5 7.5 5.5 10.5 5.5 14C5.5 16.5 7 19 9 19C11 19 12 16.5 12 14C12 10.5 10.5 7.5 8.5 3.5Z",
                  "M9 4C7 7 6 10 6 13.5C6 16 7.5 18.5 9.5 18.5C11.5 18.5 12.5 16 12.5 13.5C12.5 10 11 7 9 4Z"
                ],
                x: [0, -0.5, 0.3, 0]
              }}
              transition={{ duration: 1.3, repeat: Infinity }}
            />
            {/* Lớp 3: Lửa phụ phải */}
            <motion.path
              d="M15 4C17 7 18 10 18 13.5C18 16.5 18.5 14.5 18.5C12.5 18.5 11.5 16 11.5 13.5C11.5 10 13 7 15 4Z"
              fill="url(#taskFlameCore)"
              opacity={0.5}
              filter="url(#taskFlameBlur)"
              animate={{
                d: [
                  "M15 4C17 7 18 10 18 13.5C18 16 16.5 18.5 14.5 18.5C12.5 18.5 11.5 16 11.5 13.5C11.5 10 13 7 15 4Z",
                  "M15.5 3.5C17.5 7.5 18.5 10.5 18.5 14C18.5 16.5 17 19 15 19C13 19 12 16.5 12 14C12 10.5 13.5 7.5 15.5 3.5Z",
                  "M15 4C17 7 18 10 18 13.5C18 16 16.5 18.5 14.5 18.5C12.5 18.5 11.5 16 11.5 13.5C11.5 10 13 7 15 4Z"
                ],
                x: [0, 0.5, -0.3, 0]
              }}
              transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
            />
            {/* Spark bay */}
            {[...Array(4)].map((_, i) => (
              <motion.circle
                key={i}
                cx={10 + i * 1.5}
                cy={9 + (i % 2) * 2}
                r={0.8 - i * 0.15}
                fill={i % 2? fill : "#FFD60A"}
                animate={{
                  y: [-2, -9, -14],
                  x: [0, (i - 1.5) * 2, (i - 1.5) * 3],
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 1.5 + i * 0.2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeOut"
                }}
              />
            ))}
          </>
        )}
        {/* Lửa chính */}
        <motion.path
          d="M12 2C9 6.5 7 9.5 7 13C7 16.866 9.134 20 12 20C14.866 20 17 16.866 17 13C17 9.5 15 6.5 12 2Z"
          fill={isActive? "url(#taskFlameCore)" : "none"}
          stroke={isActive? "none" : "currentColor"}
          strokeWidth={2}
          strokeLinecap="round"
          filter={isActive? "url(#taskFlameGlow)" : undefined}
          animate={isActive? {
            d: [
              "M12 2C9 6.5 7 9.5 7 13C7 16.866 9.134 20 12 20C14.866 20 17 13C17 9.5 15 6.5 12 2Z",
              "M12 1.5C8.5 7 6.5 10 6.5 13.5C6.5 17.5 8.8 20.5 12 20.5C15.2 20.5 17.5 17.5 17.5 13.5C17.5 10 15.5 7 12 1.5Z",
              "M12 2.5C9.2 6.2 7.2 9.2 7.2 12.8C7.2 16.6 9.2 19.8 12 19.8C14.8 19.8 16.6 16.8 12.8C16.8 9.2 14.8 6.2 12 2.5Z",
              "M12 2C9 6.5 7 9.5 7 13C7 16.866 9.134 20 12 20C14.866 20 17 13C17 9.5 15 6.5 12 2Z"
            ],
            scale: [1, 1.08, 0.96, 1.04, 1],
            rotate: [0, -3, 3, -1, 0]
          } : {}}
          transition={{ duration: 1.1, repeat: isActive? Infinity : 0, ease: "easeInOut" }}
        />
        {/* Lõi trắng */}
        {isActive && (
          <motion.path
            d="M12 7C10.5 9.5 9.5 11.5 9.5 13.5C9.5 15.5 10.8 17 12 17C13.2 17 14.5 15.5 14.5 13.5C14.5 11.5 13.5 9.5 12 7Z"
            fill="#FFF"
            style={{ mixBlendMode: "screen" }}
            animate={{
              opacity: [0.6, 1, 0.4, 0.9, 0.6],
              scale: [0.85, 1.15, 0.8, 1.1, 0.85],
              y: [0, -1, 0.5, -0.5, 0]
            }}
            transition={{ duration: 0.7, repeat: Infinity }}
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
        d="M12 2C8.13 2 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
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
  const [showLabel, setShowLabel] = useState(false); // false = chỉ icon, true = chỉ chữ

  // 5s toggle: icon <-> chữ
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
      {/* Hàng 1: 4 tab filter - chia đều 4 cột */}
      <motion.div className="grid grid-cols-4 gap-2">
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
              className="relative w-full"
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
                className={`relative h-12 rounded-2xl flex items-center justify-center font-bold ${
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
                <AnimatePresence mode="wait">
                  {showLabel? (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.25 }}
                      className="text-sm whitespace-nowrap"
                    >
                      {filter.label}
                    </motion.span>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Icon isActive={isActive} fill={currentTheme.accent} />
                    </motion.div>
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