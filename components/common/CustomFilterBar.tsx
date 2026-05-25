"use client";

import { motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { useAppStore } from "@/store/app";
import React, { useState, useEffect } from "react";

const haptics = {
  light: () => navigator?.vibrate?.(5),
  medium: () => navigator?.vibrate?.([8, 15, 8]),
};

type FilterTab = "hot" | "nearby" | "friends" | "new";

interface CustomFilterBarProps {
  currentFilter: FilterTab;
  onChangeFilter: (filter: FilterTab) => void;
  searchQueries: Record<FilterTab, string>;
  onSearchChange: (filter: FilterTab, query: string) => void;
}

const TaskIcons = {
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

  Nearby: ({ isActive }: { isActive: boolean }) => {
    const [angle, setAngle] = useState(0);
    const [wobble, setWobble] = useState(0);
    const animationRef = React.useRef<number>();

    useEffect(() => {
      if (!isActive) {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        setAngle(0);
        setWobble(0);
        return;
      }

      let lastTime = performance.now();
      const speed = 60;

      const animate = (time: number) => {
        const delta = time - lastTime;
        lastTime = time;

        setAngle(prev => (prev + (speed * delta) / 1000) % 360);
        setWobble(Math.sin(time / 100) * 2);

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
      };
    }, [isActive]);

    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="needleRed" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FF6B6B" />
            <stop offset="100%" stopColor="#FF3B30" />
          </linearGradient>
          <linearGradient id="needleBlue" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5AC8FA" />
            <stop offset="100%" stopColor="#0A84FF" />
          </linearGradient>
          <filter id="shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2"/>
          </filter>
        </defs>

  <circle
  cx="12" cy="12" r="10"
  fill={isActive? "#FFFFFF" : "none"}  // Đổi #F5F7 thành #FFFFFF
  stroke="currentColor"
  strokeWidth="2"
  opacity={isActive? 1 : 0.3}
  filter={isActive? "url(#shadow)" : "none"}
/>

        <g opacity={isActive? 0.6 : 0.3}>
          <path d="M12 3V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M21 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

          {isActive && (
            <>
              <text x="12" y="2.5" textAnchor="middle" fontSize="4" fontWeight="700" fill="#FF3B30">N</text>
              <text x="21.5" y="13.5" textAnchor="middle" fontSize="4" fontWeight="700" fill="currentColor">E</text>
              <text x="12" y="23" textAnchor="middle" fontSize="4" fontWeight="700" fill="currentColor">S</text>
              <text x="2.5" y="13.5" textAnchor="middle" fontSize="4" fontWeight="700" fill="currentColor">W</text>
            </>
          )}
        </g>

        <g opacity={0.2}>
          <path d="M17.66 6.34L16.95 7.05M17.66 17.66L16.95 16.95M6.34 17.66L7.05 16.95M6.34 6.34L7.05 7.05" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        <g
          style={{
            transform: `rotate(${angle + wobble}deg)`,
            transformOrigin: "12px 12px",
            transition: "none"
          }}
        >
          <path
            d="M12 12L11 5L12 4L13 5L12 12Z"
            fill={isActive? "url(#needleRed)" : "currentColor"}
            filter={isActive? "url(#shadow)" : "none"}
          />
          <path
            d="M12 12L11 19L12 20L13 19L12 12Z"
            fill={isActive? "url(#needleBlue)" : "currentColor"}
            opacity={0.8}
          />
        </g>

        <circle
          cx="12" cy="12" r="2.5"
          fill={isActive? "#FFFFFF" : "currentColor"}
          stroke={isActive? "#0A84FF" : "none"}
          strokeWidth="1.5"
        />
        <circle cx="12" cy="12" r="1" fill={isActive? "#0A84FF" : "currentColor"} />

        {isActive && (
          <>
            <motion.circle
              cx="12" cy="12" r="8"
              stroke="#0A84FF"
              strokeWidth="1"
              fill="none"
              animate={{
                scale: [0.5, 1.2],
                opacity: [0.6, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut"
              }}
            />
            <motion.circle
              cx="12" cy="12" r="8"
              stroke="#0A84FF"
              strokeWidth="1"
              fill="none"
              animate={{
                scale: [0.5, 1.2],
                opacity: [0.6, 0]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.75
              }}
            />
          </>
        )}
      </svg>
    );
  },

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

  New: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="hbTaskNew" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0A84FF" />
          <stop offset="100%" stopColor="#00D9FF" />
        </linearGradient>
      </defs>
      
      <motion.path
        d="M 2 12 L 6 12 L 9 6 L 12 18 L 15 12 L 22 12"
        stroke="url(#hbTaskNew)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={false}
        animate={isActive ? {
          pathLength: [0, 1, 1, 0],
          opacity: [0.5, 1, 1, 0.5]
        } : {
          pathLength: 1,
          opacity: 0.7
        }}
        transition={isActive ? {
          duration: 1.2,
          repeat: Infinity,
          ease: "easeInOut"
        } : { duration: 0.3 }}
      />
    </svg>
  )
};

const PlanIcons = {
  Hot: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="sunGrad" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stopColor="#FF9500" />
          <stop offset="100%" stopColor="#FFD60A" />
        </linearGradient>
      </defs>

      {isActive && [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <motion.line
          key={deg}
          x1="12" y1="15"
          x2="12" y2="4"
          stroke="#FFD60A"
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ originX: "12px", originY: "15px", rotate: deg }}
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

      <motion.circle
        cx="12" cy="15" r="6"
        fill={isActive? "url(#sunGrad)" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        animate={isActive? { y: [15, 11, 15] } : {}}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <path d="M0 24H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  Nearby: ({ isActive }: { isActive: boolean }) => {
    const targetAngle = 45;
    const scanDuration = 2.5;
    const triggerTime = targetAngle / 360;

    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity={0.15} />
        <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.5" opacity={0.25} />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" opacity={0.4} />

        <path d="M12 2V6M12 18V22M2 12H6M18 12H22" stroke="currentColor" strokeWidth="1.5" opacity={0.3} />

        {isActive && (
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ duration: scanDuration, repeat: Infinity, ease: "linear" }}
            style={{ originX: "12px", originY: "12px" }}
          >
            <defs>
              <linearGradient id="scanLine" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0A84FF" stopOpacity={0} />
                <stop offset="100%" stopColor="#0A84FF" stopOpacity={1} />
              </linearGradient>
            </defs>
            <line
              x1="12" y1="12" x2="12" y2="2"
              stroke="url(#scanLine)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </motion.g>
        )}

        <motion.circle
          cx="12" cy="12" r="2"
          fill={isActive? "#FF3B30" : "currentColor"}
          animate={isActive? {
            scale: [1, 1.4, 1],
            opacity: [1, 0.5, 1]
          } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        />

        {isActive && (
          <motion.g>
            <motion.circle
              cx={12 + Math.cos((targetAngle - 90) * Math.PI / 180) * 7}
              cy={12 + Math.sin((targetAngle - 90) * Math.PI / 180) * 7}
              r="2"
              fill="#0A84FF"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 0, 1.6, 1, 0],
                opacity: [0, 0, 1, 1, 0]
              }}
              transition={{
                duration: scanDuration,
                repeat: Infinity,
                times: [0, triggerTime - 0.01, triggerTime, triggerTime + 0.15, triggerTime + 0.25],
                ease: "easeOut"
              }}
            />
            <motion.circle
              cx={12 + Math.cos((targetAngle - 90) * Math.PI / 180) * 7}
              cy={12 + Math.sin((targetAngle - 90) * Math.PI / 180) * 7}
              r="2"
              stroke="#0A84FF"
              strokeWidth="1.5"
              fill="none"
              initial={{ scale: 1, opacity: 0 }}
              animate={{
                scale: [1, 1, 3.5],
                opacity: [0, 0, 0.7, 0]
              }}
              transition={{
                duration: scanDuration,
                repeat: Infinity,
                times: [0, triggerTime, triggerTime + 0.05, triggerTime + 0.4],
                ease: "easeOut"
              }}
            />
          </motion.g>
        )}
      </svg>
    );
  },

  Friends: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M12 21C12 21 4 13.5 4 8.5C4 5.5 6.5 3 9.5 3C11.1 3 12 3.8 12 3.8C12 3.8 12.9 3 14.5 3C17.5 3 20 5.5 20 8.5C20 13.5 12 21 12 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill={isActive? "#FF3B30" : "none"}
        initial={{ scale: 1 }}
        animate={{
          scale: isActive? [1, 1.2, 1] : 1,
        }}
        transition={{
          duration: 0.7,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 0.3
        }}
        style={{
          transformOrigin: "12px 12px",
          transformBox: "fill-box"
        }}
      />
      {isActive && [
        { x: 8, y: 8, delay: 0 },
        { x: 16, y: 8, delay: 0.15 },
        { x: 12, y: 5, delay: 0.3 },
      ].map((p, i) => (
        <motion.circle
          key={i}
          cx={p.x} cy={p.y} r="1"
          fill="#FF3B30"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            y: [0, -8, -14],
            opacity: [0, 1, 0],
            scale: [0, 1.1, 0]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeOut"
          }}
        />
      ))}
    </svg>
  ),

New: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.g
        animate={isActive? { y: [0, -6, 0] } : {}}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "50%", originY: "50%" }}
      >
        <motion.path
          d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z"
          fill={isActive? "#FF9500" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          animate={isActive? {
            fill: ["#FF9500", "#FFD60A", "#FF3B30", "#30D158", "#0A84FF", "#FF9500"]
          } : {}}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </motion.g>
      {isActive && (
        <motion.circle
          cx="12" cy="12" r="8"
          stroke="#FF9500"
          strokeWidth="1"
          fill="none"
          opacity={0.4}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0, 0.4],
            stroke: ["#FF9500", "#FFD60A", "#FF3B30", "#30D158", "#0A84FF", "#FF9500"]
          }}
          transition={{
            scale: { duration: 2, repeat: Infinity },
            opacity: { duration: 2, repeat: Infinity },
            stroke: { duration: 4, repeat: Infinity, ease: "linear" }
          }}
        />
      )}
    </svg>
  ),
};

export default function CustomFilterBar({
  currentFilter,
  onChangeFilter,
  searchQueries,
  onSearchChange,
}: CustomFilterBarProps) {
  const mode = useAppStore((s) => s.mode) || "task";
  const [hovered, setHovered] = useState<string | null>(null);

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

  const currentSearchQuery = searchQueries[currentFilter] || "";

  return (
    <div className="px-4 pb-3 space-y-3 min-h-[116px]">
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
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{ background: currentTheme.bgGradient }}
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
                <Icon
                  isActive={isActive}
                  {...(filter.key === "new" && mode === "task"? { fill: currentTheme.accent } : {})}
                />
                <span className="text-xs whitespace-nowrap">{filter.label}</span>

                {isHovered &&!isActive && (
                  <div className="absolute inset-0 rounded-2xl bg-gray-200 dark:bg-zinc-700 -z-10" />
                )}
              </motion.div>
            </motion.button>
          );
        })}
      </div>

      <div className="relative h-11">
        <div className="relative">
          <div
            className="absolute inset-0 rounded-2xl opacity-15"
            style={{ background: currentTheme.bgGradient }}
          />
          <input
            value={currentSearchQuery}
            onChange={(e) => onSearchChange(currentFilter, e.target.value)}
            placeholder={`Tìm ${filters.find(f => f.key === currentFilter)?.label.toLowerCase()}...`}
            className="relative w-full h-11 px-4 pr-10 rounded-2xl bg-white dark:bg-zinc-900 border-2 outline-none focus:outline-none focus:ring-0 focus:border-blue-400 dark:focus:border-blue-500 font-semibold text-base text-zinc-900 dark:text-zinc-100 transition-colors"
            style={{
              borderColor: mode === "task"? "#93c5fd" : "#86efac"
            }}
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            {currentSearchQuery? (
              <button
                onClick={() => onSearchChange(currentFilter, "")}
                className="p-1.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700"
              >
                <X size={18} className="text-zinc-500" />
              </button>
            ) : (
              <Search size={18} className="text-zinc-400" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}