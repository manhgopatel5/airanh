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
  // HOT TASK: 3 sọc đầy đủ kể cả khi không active, bỏ chấm đỏ
  Hot: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect
        x="3" y="14" width="3" height="6" rx="1.5"
        fill="currentColor"
        opacity={isActive? 1 : 0.5}
      />
      <rect
        x="9" y="10" width="3" height="10" rx="1.5"
        fill="currentColor"
        opacity={isActive? 1 : 0.5}
      />
      <rect
        x="15" y="6" width="3" height="14" rx="1.5"
        fill="currentColor"
        opacity={isActive? 1 : 0.5}
      />
      {isActive && (
        <>
          <motion.rect
            x="3" y="14" width="3" height="6" rx="1.5"
            fill="#FF3B30"
            animate={{ height: [6, 9, 6], y: [14, 11, 14] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
          />
          <motion.rect
            x="9" y="10" width="3" height="10" rx="1.5"
            fill="#FF9500"
            animate={{ height: [10, 14, 10], y: [10, 6, 10] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.1 }}
          />
          <motion.rect
            x="15" y="6" width="3" height="14" rx="1.5"
            fill="#FFD60A"
            animate={{ height: [14, 18, 14], y: [6, 2, 6] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
          />
        </>
      )}
    </svg>
  ),

  // NEARBY TASK: Radar quét vật thể - sóng lan rộng + ping mạnh
Nearby: ({ isActive }: { isActive: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    {/* Grid nền rõ hơn */}
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity={0.2} />
    <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" opacity={0.3} />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" opacity={0.4} />
    
    {/* Crosshair */}
    <path d="M12 2V22M2 12H22" stroke="currentColor" strokeWidth="1" opacity={0.3} />

    {/* Tia quét xoay - to hơn */}
    <motion.g
      animate={isActive? { rotate: 360 } : {}}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      style={{ originX: "50%", originY: "50%" }}
    >
      <defs>
        <linearGradient id="taskScanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0A84FF" stopOpacity={0} />
          <stop offset="50%" stopColor="#0A84FF" stopOpacity={0.3} />
          <stop offset="100%" stopColor="#0A84FF" stopOpacity={1} />
        </linearGradient>
      </defs>
      <path d="M12 12L12 2A10 10 0 0 1 22 12Z" fill={isActive? "url(#taskScanGrad)" : "none"} />
      <line x1="12" y1="12" x2="12" y2="2" stroke="#0A84FF" strokeWidth="2" strokeLinecap="round" opacity={isActive? 1 : 0} />
    </motion.g>

    {/* Sóng lan rộng từ tâm - rõ hơn */}
    {isActive && [0, 0.6, 1.2].map((delay, i) => (
      <motion.circle
        key={i}
        cx="12" cy="12" r="2"
        stroke="#0A84FF"
        strokeWidth="2.5"
        fill="none"
        animate={{
          scale: [1, 5],
          opacity: [1, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: delay,
          ease: "easeOut"
        }}
      />
    ))}

    {/* Tâm pulse */}
    <motion.circle
      cx="12" cy="12" r="2.5"
      fill={isActive? "#0A84FF" : "currentColor"}
      animate={isActive? {
        scale: [1, 1.3, 1],
        opacity: [1, 0.6, 1]
      } : {}}
      transition={{ duration: 1, repeat: Infinity }}
    />

    {/* Vật thể bị quét - hiện rõ + pulse */}
    {isActive && [
      { x: 7, y: 8, delay: 0.4 },
      { x: 17, y: 7, delay: 1.2 },
      { x: 16, y: 16, delay: 1.8 },
      { x: 8, y: 17, delay: 2.4 },
    ].map((obj, i) => (
      <motion.g key={i}>
        <motion.circle
          cx={obj.x} cy={obj.y} r="2"
          fill="#0A84FF"
          animate={{
            scale: [0, 1.5, 1],
            opacity: [0, 1, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: obj.delay
          }}
        />
        <motion.circle
          cx={obj.x} cy={obj.y} r="2"
          stroke="#0A84FF"
          strokeWidth="1.5"
          fill="none"
          animate={{
            scale: [1, 2.5],
            opacity: [1, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: obj.delay + 0.3
          }}
        />
      </motion.g>
    ))}
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

  // NEW TASK: Xoay tròn mỗi 3s khi bấm vào
  New: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"
        fill={isActive? fill : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        animate={isActive? {
          rotate: [0, 360],
          scale: [1, 1.15, 1]
        } : {}}
        transition={{
          rotate: { duration: 3, repeat: Infinity, ease: "linear" },
          scale: { duration: 0.8, repeat: Infinity, repeatDelay: 2.2 }
        }}
      />
      {isActive && (
        <motion.circle
          cx="12" cy="12" r="3"
          fill={fill}
          opacity={0.3}
          animate={{ scale: [1, 1.8, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </svg>
  ),
};

const PlanIcons = {
  // HOT PLAN: Rising Sun - thanh ngang đưa xuống xíu
  Hot: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="sunGrad" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#FF9500" />
          <stop offset="100%" stopColor="#FFD60A" />
        </linearGradient>
      </defs>

      <motion.circle
        cx="12" cy="16" r="5"
        fill={isActive? "url(#sunGrad)" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        animate={isActive? { y: [16, 12, 16] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      {isActive && [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <motion.line
          key={deg}
          x1="12" y1="12"
          x2="12" y2="4"
          stroke="#FFD60A"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ originX: "50%", originY: "50%", rotate: deg }}
          animate={{
            opacity: [0.3, 1, 0.3],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.1
          }}
        />
      ))}

      {/* Thanh ngang đưa xuống xíu từ 18 xuống 20 */}
      <path d="M2 20H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

 // NEARBY PLAN: Location pin + ripple màu xanh dương - bỏ chấm đỏ
Nearby: ({ isActive }: { isActive: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <motion.g
      animate={isActive? { y: [0, -4, 0] } : {}}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <path
        d="M12 21C16 16 20 12.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 12.4183 8 16 12 21Z"
        fill={isActive? "#0A84FF" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="12" cy="9" r="3" fill={isActive? "white" : "currentColor"} />
    </motion.g>

    {/* Chấm xanh nhấp nháy đưa xuống y=13 */}
    {isActive && (
      <motion.circle
        cx="12" cy="13" r="2"
        fill="#0A84FF"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1]
        }}
        transition={{ duration: 1, repeat: Infinity }}
      />
    )}

    {isActive && [
      { scale: 1.5, opacity: 0.6, delay: 0 },
      { scale: 2.2, opacity: 0.3, delay: 0.4 },
      { scale: 3, opacity: 0, delay: 0.8 }
    ].map((ring, i) => (
      <motion.circle
        key={i}
        cx="12" cy="21" r="2"
        stroke="#0A84FF"
        strokeWidth="1.5"
        fill="none"
        animate={{
          scale: [1, ring.scale],
          opacity: [ring.opacity, 0]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          delay: ring.delay
        }}
      />
    ))}
  </svg>
),

  // FRIENDS PLAN: Trái tim đỏ + lật ngang mỗi 3s khi bấm
  Friends: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 21C12 21 4 13.5 4 8.5C4 5.5 6.5 3 9.5 3C11.1 3 12 3.8 12 3.8C12 3.8 12.9 3 14.5 3C17.5 3 20 5.5 20 8.5C20 13.5 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill={isActive? "#FF3B30" : "none"}
        animate={isActive? {
          scale: [1, 1.15, 1],
          rotateY: [0, 180, 360]
        } : {}}
        transition={{
          scale: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
          rotateY: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }}
        style={{ originX: "50%", originY: "60%" }}
      />
      {isActive && [
        { x: 8, y: 8, delay: 0 },
        { x: 16, y: 8, delay: 0.3 },
        { x: 12, y: 5, delay: 0.6 },
      ].map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x} cy={p.y} r="1"
          fill="#FF3B30"
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

  // NEW PLAN: Màu cam + xoay tròn mỗi 3s khi bấm
  New: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.g
        animate={isActive? {
          y: [0, -6, 0],
          rotate: [0, 360]
        } : {}}
        transition={{
          y: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 3, repeat: Infinity, ease: "linear" }
        }}
        style={{ originX: "50%", originY: "50%" }}
      >
        <path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z"
          fill={isActive? "#FF9500" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </motion.g>
      {isActive && (
        <motion.circle
          cx="12" cy="12" r="8"
          stroke="#FF9500"
          strokeWidth="1"
          fill="none"
          opacity={0.4}
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
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