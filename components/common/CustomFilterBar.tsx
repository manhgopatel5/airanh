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
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <defs>
        {/* Gradient lõi lửa - từ trắng -> vàng -> cam -> đỏ */}
        <radialGradient id="taskFlameInner" cx="50%" cy="70%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity={isActive? 1 : 0} />
          <stop offset="30%" stopColor={isActive? "#FFF700" : "currentColor"} stopOpacity={0.9} />
          <stop offset="60%" stopColor={isActive? "#FF9500" : "currentColor"} stopOpacity={0.7} />
          <stop offset="100%" stopColor={isActive? fill : "currentColor"} stopOpacity={0.5} />
        </radialGradient>
        
        {/* Gradient thân lửa */}
        <linearGradient id="taskFlameBody" x1="12" y1="20" x2="12" y2="0">
          <stop offset="0%" stopColor={isActive? "#FF3B30" : "currentColor"} />
          <stop offset="25%" stopColor={isActive? fill : "currentColor"} />
          <stop offset="55%" stopColor={isActive? "#FF9500" : "currentColor"} />
          <stop offset="85%" stopColor={isActive? "#FFD60A" : "currentColor"} />
          <stop offset="100%" stopColor={isActive? "#FFF" : "currentColor"} stopOpacity={0.3} />
        </linearGradient>

        {/* Noise filter cho lửa thật */}
        <filter id="taskFlameTurbulence">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.15" numOctaves="3" seed="5" result="turb"/>
          <feDisplacementMap in="SourceGraphic" in2="turb" scale="2"/>
        </filter>

        {/* Glow mạnh */}
        <filter id="taskFlameGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <motion.g style={{ originX: "50%", originY: "90%" }}>
        {isActive && (
          <>
            {/* Lớp 1: Halo xa */}
            <motion.ellipse
              cx="12" cy="18" rx="7" ry="3.5"
              fill={fill}
              opacity={0.15}
              filter="url(#taskFlameGlow)"
              animate={{
                scaleX: [1, 1.4, 0.7, 1.2, 1],
                scaleY: [1, 0.9, 1.3, 1, 1],
                opacity: [0.1, 0.3, 0.05, 0.25, 0.1]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            
            {/* Lớp 2: Lửa phụ trái - có turbulence */}
            <motion.path
              d="M8.5 4.5C6 8 5 11 5 14.5C5 17 6.5 19.5 9 19.5C11.5 19.5 12.5 17 12.5 14.5C12.5 11 10.5 8 8.5 4.5Z"
              fill="url(#taskFlameBody)"
              opacity={0.6}
              filter="url(#taskFlameTurbulence)"
              animate={{
                d: [
                  "M8.5 4.5C6 8 5 11 5 14.5C5 17 6.5 19.5 9 19.5C11.5 19.5 12.5 17 12.5 14.5C12.5 11 10.5 8 8.5 4.5Z",
                  "M8 4C5.5 8.5 4.5 11.5 4.5 15C4.5 17.5 6 20 8.5 20C11 20 12 17.5 12 15C12 11.5 10 8.5 8 4Z",
                  "M9 5C6.5 7.5 5.5 10.5 5.5 14C5.5 16.5 7 19 9.5 19C12 19 13 16.5 13 14C13 10.5 11.5 7.5 9 5Z",
                  "M8.5 4.5C6 8 5 11 5 14.5C5 17 6.5 19.5 9 19.5C11.5 19.5 12.5 17 12.5 14.5C12.5 11 10.5 8 8.5 4.5Z"
                ],
                x: [0, -1, 0.5, 0]
              }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Lớp 3: Lửa phụ phải */}
            <motion.path
              d="M15.5 4.5C18 8 19 11 19 14.5C19 17 17.5 19.5 15 19.5C12.5 19.5 11.5 17 11.5 14.5C11.5 11 13.5 8 15.5 4.5Z"
              fill="url(#taskFlameBody)"
              opacity={0.6}
              filter="url(#taskFlameTurbulence)"
              animate={{
                d: [
                  "M15.5 4.5C18 8 19 11 19 14.5C19 17 17.5 19.5 15 19.5C12.5 19.5 11.5 17 11.5 14.5C11.5 11 13.5 8 15.5 4.5Z",
                  "M16 4C18.5 8.5 19.5 11.5 19.5 15C19.5 17.5 18 20 15.5 20C13 20 12 17.5 12 15C12 11.5 14 8.5 16 4Z",
                  "M15 5C17.5 7.5 18.5 10.5 18.5 14C18.5 16.5 17 19 14.5 19C12 19 11 16.5 11 14C11 10.5 12.5 7.5 15 5Z",
                  "M15.5 4.5C18 8 19 11 19 14.5C19 17 17.5 19.5 15 19.5C12.5 19.5 11.5 17 11.5 14.5C11.5 11 13.5 8 15.5 4.5Z"
                ],
                x: [0, 1, -0.5, 0]
              }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
            />

            {/* Spark particles */}
            {[...Array(6)].map((_, i) => (
              <motion.circle
                key={i}
                cx={9 + i * 1.2}
                cy={10 + (i % 3)}
                r={1.2 - i * 0.15}
                fill={i % 2? "#FFD60A" : fill}
                filter="url(#taskFlameGlow)"
                animate={{
                  y: [-2, -10, -18],
                  x: [0, (i - 2.5) * 1.5, (i - 2.5) * 2.5],
                  opacity: [0, 1, 0],
                  scale: [0, 1.2, 0]
                }}
                transition={{
                  duration: 1.8 + i * 0.15,
                  repeat: Infinity,
                  delay: i * 0.25,
                  ease: "easeOut"
                }}
              />
            ))}
          </>
        )}

        {/* Lửa chính - có turbulence */}
        <motion.path
          d="M12 1.5C8 6.5 6 10 6 14C6 18 8.5 21 12 21C15.5 21 18 18 14C18 10 16 6.5 12 1.5Z"
          fill={isActive? "url(#taskFlameBody)" : "none"}
          stroke={isActive? "none" : "currentColor"}
          strokeWidth={2}
          strokeLinecap="round"
          filter={isActive? "url(#taskFlameTurbulence)" : undefined}
          animate={isActive? {
            d: [
              "M12 1.5C8 6.5 6 10 6 14C6 18 8.5 21 12 21C15.5 21 18 18 18 14C18 10 16 6.5 12 1.5Z",
              "M12 1C7.5 7 5.5 10.5 5.5 14.5C5.5 18.5 8 21.5 12 21.5C16 21.5 18.5 18.5 18.5 14.5C18.5 10.5 16.5 7 12 1Z",
              "M12 2C8.5 6 6.5 9.5 6.5 13.5C6.5 17.5 8.8 20.5 12 20.5C15.2 20.5 17.5 13.5C17.5 9.5 15.5 6 12 2Z",
              "M12 1.8C8.2 6.8 6.2 10.2 6.2 14.2C6.2 18.2 8.7 21.2 12 21.2C15.3 21.2 17.8 18.2 17.8 14.2C17.8 10.2 15.8 6.8 12 1.8Z",
              "M12 1.5C8 6.5 6 10 6 14C6 18 8.5 21 12 21C15.5 21 18 18 18 14C18 10 16 6.5 12 1.5Z"
            ],
            scale: [1, 1.1, 0.95, 1.06, 1],
            rotate: [0, -4, 4, -2, 0]
          } : {}}
          transition={{ duration: 1.3, repeat: isActive? Infinity : 0, ease: "easeInOut" }}
        />

        {/* Lõi lửa sáng */}
        {isActive && (
          <motion.path
            d="M12 6C10 9 9 11.5 9 14C9 16 10.5 18 12 18C13.5 18 15 16 15 14C15 11.5 14 9 12 6Z"
            fill="url(#taskFlameInner)"
            animate={{
              scale: [0.9, 1.2, 0.85, 1.15, 0.9],
              y: [0, -1.5, 0.8, -1, 0],
              opacity: [0.8, 1, 0.6, 0.95, 0.8]
            }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </motion.g>
    </svg>
  ),
  Nearby: ({ isActive }: { isActive: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <motion.g
        animate={isActive? { rotate: [0, 360] } : {}}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        style={{ originX: "50%", originY: "50%" }}
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"/>
      </motion.g>
      <motion.circle
        cx="12" cy="12" r="6"
        stroke="currentColor" strokeWidth="2"
        animate={isActive? { scale: [1, 1.3, 1], opacity: [1, 0.4, 1] } : {}}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <motion.circle
        cx="12" cy="12" r="2.5"
        fill="currentColor"
        animate={isActive? { scale: [1, 1.5, 1] } : {}}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
    </svg>
  ),
  Friends: ({ isActive }: { isActive: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
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
        strokeDasharray="1"
        animate={isActive? { pathLength: [0.6, 1, 0.6], pathOffset: [0, 0.3, 0] } : {}}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
      <motion.path
        d="M13 21V17C13 14.7909 14.7909 13 17 13H19C21.2091 13 23 14.7909 23 17V21"
        stroke="currentColor" strokeWidth="2"
        strokeDasharray="1"
        animate={isActive? { pathLength: [0.6, 1, 0.6], pathOffset: [0, 0.3, 0] } : {}}
        transition={{ duration: 2.5, delay: 0.3, repeat: Infinity }}
      />
    </svg>
  ),
  New: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
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

// Bộ icon custom cho Plan - style organic, mềm, chill
const PlanIcons = {
  Hot: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 3C12 3 7 8 7 13C7 16.3137 9.68629 19 13 19C16.3137 19 16.3137 19 13C19 8 14 3 12 3Z"
        fill={isActive? fill : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        animate={isActive? {
          scale: [1, 1.2, 1],
          y: [0, -5, 0]
        } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {isActive && (
        <motion.circle cx="12" cy="13" r="3.5" fill={fill} opacity={0.5}
          animate={{ scale: [0.7, 1.4, 0.7], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </svg>
  ),
  Nearby: ({ isActive }: { isActive: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        stroke="currentColor" strokeWidth="2"
        animate={isActive? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.circle cx="12" cy="9" r="2.5" fill="currentColor"
        animate={isActive? { scale: [1, 1.4, 1] } : {}}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </svg>
  ),
  Friends: ({ isActive }: { isActive: boolean }) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <motion.g
        animate={isActive? { rotate: [0, 10, -10, 0] } : {}}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "50%", originY: "70%" }}
      >
        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M5 21V19C5 16.2386 7.23858 14 10 14H14C16.7614 14 19 16.2386 19 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </motion.g>
    </svg>
  ),
  New: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
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
  const [showLabel, setShowLabel] = useState(false);

  // Hiệu ứng vào trang: fade + slide up + scale
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: "spring", stiffness: 400, damping: 25 }
    }
  };

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

  const currentTheme = themes;
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
      {/* Hàng 1: 4 tab filter - chia đều 4 cột, width cố định */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-4 gap-2"
      >
        {filters.map((filter) => {
          const isActive = currentFilter === filter.key;
          const isHovered = hovered === filter.key;
          const Icon = filter.Icon;

          return (
            <motion.button
              key={filter.key}
              variants={itemVariants}
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
                className={`relative h-12 rounded-2xl flex items-center justify-center font-bold overflow-hidden ${
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
                <AnimatePresence mode="wait">
                  {showLabel? (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, y: 10, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.8 }}
                      transition={{ 
                        duration: 0.35,
                        type: "spring",
                        stiffness: 500,
                        damping: 30
                      }}
                      className="text-sm whitespace-nowrap px-1"
                    >
                      {filter.label}
                    </motion.span>
                  ) : (
                    <motion.div
                      key="icon"
                      initial={{ opacity: 0, scale: 0.6, rotate: -180 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.6, rotate: 180 }}
                      transition={{ 
                        duration: 0.35,
                        type: "spring",
                        stiffness: 500,
                        damping: 25
                      }}
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