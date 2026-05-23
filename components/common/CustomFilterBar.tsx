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
        <radialGradient id="targetCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={isActive? "#FF3B30" : "currentColor"} stopOpacity={1} />
          <stop offset="60%" stopColor={isActive? fill : "currentColor"} stopOpacity={0.8} />
          <stop offset="100%" stopColor={isActive? "#00D9FF" : "currentColor"} stopOpacity={0} />
        </radialGradient>
        <filter id="targetGlow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feColorMatrix in="blur" type="saturate" values="3"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="targetDistort">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="1" seed="10" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.5"/>
        </filter>
        <filter id="targetGlitch">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="turb"/>
          <feDisplacementMap in="SourceGraphic" in2="turb" scale="3"/>
        </filter>
      </defs>

      <motion.g style={{ originX: "50%", originY: "50%" }}>
        {isActive && (
          <>
            {/* Layer 1: Radar Scan */}
            <motion.circle
              cx="12" cy="12" r="10"
              fill="none"
              stroke={fill}
              strokeWidth="1"
              strokeDasharray="2 4"
              opacity={0.3}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />

            {/* Layer 2: Corner Lock */}
            {[
              { d: "M4 4 L4 7 L7 7", delay: 0 },
              { d: "M20 4 L20 7 L17 7", delay: 0.1 },
              { d: "M4 20 L4 17 L7 17", delay: 0.2 },
              { d: "M20 20 L20 17 L17 17", delay: 0.3 },
            ].map((corner, i) => (
              <motion.path
                key={i}
                d={corner.d}
                stroke={fill}
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                filter="url(#targetGlow)"
                animate={{
                  pathLength: [0, 1, 1, 0],
                  opacity: [0, 1, 1, 0],
                  scale: [0.8, 1, 1, 0.8]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: corner.delay,
                  ease: "easeInOut"
                }}
              />
            ))}

            {/* Layer 3: Pulse Rings */}
            {[0, 1, 2].map((i) => (
              <motion.circle
                key={`ring-${i}`}
                cx="12" cy="12"
                r={9 - i * 2}
                fill="none"
                stroke={fill}
                strokeWidth={1.5 - i * 0.3}
                opacity={0.6 - i * 0.15}
                animate={{
                  scale: [1.3, 0.7, 1.3],
                  opacity: [0, 0.8, 0]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeOut"
                }}
              />
            ))}

            {/* Layer 4: Crosshair */}
            <motion.line
              x1="12" y1="4" x2="12" y2="20"
              stroke={fill}
              strokeWidth="1"
              opacity={0.5}
              animate={{
                rotate: [0, 180, 360],
                opacity: [0, 0.7, 0]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ originX: "50%", originY: "50%" }}
            />
            <motion.line
              x1="4" y1="12" x2="20" y2="12"
              stroke={fill}
              strokeWidth="1"
              opacity={0.5}
              animate={{
                rotate: [0, 180, 360],
                opacity: [0, 0.7, 0]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ originX: "50%", originY: "50%" }}
            />

            {/* Layer 5: Particle Burst */}
            {[...Array(8)].map((_, i) => {
              const angle = (i * 45) * Math.PI / 180;
              return (
                <motion.circle
                  key={`particle-${i}`}
                  cx="12"
                  cy="12"
                  r="1"
                  fill={i % 2? fill : "#FF3B30"}
                  filter="url(#targetGlow)"
                  animate={{
                    x: [0, Math.cos(angle) * 8, Math.cos(angle) * 12],
                    y: [0, Math.sin(angle) * 8, Math.sin(angle) * 12],
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeOut"
                  }}
                />
              );
            })}

            {/* Layer 8: Scan Line */}
            <motion.rect
              x="4" y="4" width="16" height="1"
              fill={fill}
              opacity={0.6}
              filter="url(#targetGlow)"
              animate={{
                y: [4, 20, 4],
                opacity: [0, 0.8, 0]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "linear"
              }}
            />

            {/* Layer 9: Glitch Distort */}
            <motion.g
              filter="url(#targetGlitch)"
              animate={{
                opacity: [0, 0, 1, 0, 0]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                times: [0, 0.92, 0.93, 0.94, 1]
              }}
            >
              <rect x="4" y="4" width="16" height="16" fill={fill} opacity={0.1} />
            </motion.g>

            {/* Layer 10: Data Stream */}
            {[0, 1, 2, 3].map((i) => (
              <motion.text
                key={`data-${i}`}
                x="12"
                y="12"
                fontSize="2"
                fill={fill}
                opacity={0.4}
                textAnchor="middle"
                animate={{
                  rotate: [i * 90, i * 90 + 360]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear"
                }}
                style={{ originX: "50%", originY: "50%" }}
              >
                {i % 2? "101" : "010"}
              </motion.text>
            ))}
          </>
        )}

        {/* Layer 6: Core Target */}
        <motion.circle
          cx="12" cy="12" r="3"
          fill={isActive? "url(#targetCore)" : "none"}
          stroke={isActive? "none" : "currentColor"}
          strokeWidth={2}
          filter={isActive? "url(#targetDistort)" : undefined}
          animate={isActive? {
            scale: [1, 1.4, 0.9, 1.2, 1],
            opacity: [0.8, 1, 0.7, 1, 0.8]
          } : {}}
          transition={{ duration: 1, repeat: isActive? Infinity : 0 }}
        />

        {/* Layer 7: Lock Point */}
        {isActive && (
          <motion.circle
            cx="12" cy="12" r="1"
            fill="#FFFFFF"
            style={{ mixBlendMode: "screen" }}
            animate={{
              scale: [0.5, 1.5, 0.5],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 0.5, repeat: Infinity }}
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
      {/* Hàng 1: 4 tab filter - chia đều 4 cột, width cố định */}
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
      </div>

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