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

 // NEW TASK: Ngôi sao ma thuật + sparkle bay + hào quang
New: ({ isActive, fill }: { isActive: boolean; fill: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <defs>
      <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor={fill} stopOpacity={0.8} />
        <stop offset="70%" stopColor={fill} stopOpacity={0.2} />
        <stop offset="100%" stopColor={fill} stopOpacity={0} />
      </radialGradient>
      <filter id="starBlur">
        <feGaussianBlur stdDeviation="0.8" />
      </filter>
    </defs>

    {/* Hào quang xoay */}
    {isActive && (
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        style={{ originX: "12px", originY: "12px" }}
      >
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <motion.line
            key={deg}
            x1="12" y1="12"
            x2="12" y2="2"
            stroke={fill}
            strokeWidth="1"
            strokeLinecap="round"
            opacity={0.4}
            style={{ rotate: deg, originX: "12px", originY: "12px" }}
            animate={{
              opacity: [0.2, 0.6, 0.2],
              scaleY: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: deg / 180
            }}
          />
        ))}
      </motion.g>
    )}

    {/* Ngôi sao chính */}
    <motion.path
      d="M12 2L14.8 8.2L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9.2 8.2L12 2Z"
      fill={isActive? fill : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      filter={isActive? "url(#starBlur)" : "none"}
      animate={isActive? {
        scale: [1, 1.15, 1],
        rotate: [0, 15, -15, 0]
      } : {}}
      transition={{
        scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 3, repeat: Infinity, ease: "easeInOut" }
      }}
      style={{ originX: "12px", originY: "12px" }}
    />

    {/* Glow nền */}
    {isActive && (
      <motion.circle
        cx="12" cy="12" r="8"
        fill="url(#starGlow)"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.6, 0.3, 0.6]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    )}

    {/* Hạt sparkle bay ra 6 hướng */}
    {isActive && [
      { angle: 0, delay: 0 },
      { angle: 60, delay: 0.2 },
      { angle: 120, delay: 0.4 },
      { angle: 180, delay: 0.6 },
      { angle: 240, delay: 0.8 },
      { angle: 300, delay: 1 },
    ].map((s, i) => (
      <motion.g key={`sparkle-${i}`}>
        <motion.circle
          cx="12" cy="12" r="1.5"
          fill={fill}
          animate={{
            x: [0, Math.cos(s.angle * Math.PI / 180) * 10],
            y: [0, Math.sin(s.angle * Math.PI / 180) * 10],
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: s.delay,
            ease: "easeOut"
          }}
        />
        {/* Tia sparkle */}
        <motion.path
          d="M12 12L12 10"
          stroke={fill}
          strokeWidth="1.5"
          strokeLinecap="round"
          style={{ 
            originX: "12px", 
            originY: "12px",
            rotate: s.angle 
          }}
          animate={{
            scaleY: [0, 1.5, 0],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: s.delay + 0.1
          }}
        />
      </motion.g>
    ))}

    {/* Lấp lánh nhỏ ngẫu nhiên */}
    {isActive && [
      { x: 7, y: 7, delay: 0.3 },
      { x: 17, y: 8, delay: 1.1 },
      { x: 16, y: 17, delay: 1.7 },
      { x: 8, y: 16, delay: 0.8 },
    ].map((p, i) => (
      <motion.circle
        key={`twinkle-${i}`}
        cx={p.x} cy={p.y} r="0.8"
        fill={fill}
        animate={{
          scale: [0, 1.5, 0],
          opacity: [0, 1, 0],
          rotate: [0, 180, 360]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: p.delay
        }}
      />
    ))}
  </svg>
),
};
const PlanIcons = {
// HOT PLAN: Rising Sun - tia sáng dài hơn
Hot: ({ isActive }: { isActive: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="sunGrad" x1="50%" y1="100%" x2="50%" y2="0%">
        <stop offset="0%" stopColor="#FF9500" />
        <stop offset="100%" stopColor="#FFD60A" />
      </linearGradient>
    </defs>

    {/* Tia sáng dài hơn y2="7" -> y2="4" */}
    {isActive && [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
      <motion.line
        key={deg}
        x1="12" y1="15"
        x2="12" y2="4" // Đổi từ 7 -> 4
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

    {/* Mặt trời render sau để đè lên tia */}
    <motion.circle
      cx="12" cy="15" r="6"
      fill={isActive? "url(#sunGrad)" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      animate={isActive? { y: [15, 11, 15] } : {}}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    />

    {/* Thanh ngang dài full + xuống y=23 */}
    <path d="M0 24H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
),

// NEARBY PLAN: Location pin + Sonar quét + Ripple 3 lớp
Nearby: ({ isActive }: { isActive: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <defs>
      <radialGradient id="sonarGrad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#0A84FF" stopOpacity={0.8} />
        <stop offset="70%" stopColor="#0A84FF" stopOpacity={0.2} />
        <stop offset="100%" stopColor="#0A84FF" stopOpacity={0} />
      </radialGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>

    {/* Vòng ripple lan rộng 3 lớp từ đáy */}
    {isActive && [
      { delay: 0, duration: 2.5 },
      { delay: 0.8, duration: 2.5 },
      { delay: 1.6, duration: 2.5 },
    ].map((r, i) => (
      <motion.circle
        key={`ripple-${i}`}
        cx="12" cy="21" r="1"
        stroke="#0A84FF"
        strokeWidth="2"
        fill="none"
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{
          scale: [0, 8],
          opacity: [0.8, 0]
        }}
        transition={{
          duration: r.duration,
          repeat: Infinity,
          delay: r.delay,
          ease: "easeOut"
        }}
      />
    ))}

    {/* Sonar quét hình nón */}
    {isActive && (
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{ originX: "12px", originY: "12px" }}
      >
        <path
          d="M12 12 L12 2 A10 10 0 0 1 19.5 5.5 Z"
          fill="url(#sonarGrad)"
          opacity={0.6}
        />
      </motion.g>
    )}

    {/* Pin location chính */}
    <motion.g
      animate={isActive? { 
        y: [0, -5, 0],
        scale: [1, 1.05, 1]
      } : {}}
      transition={{ 
        y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
      }}
      style={{ originX: "12px", originY: "21px" }}
    >
      {/* Bóng pin */}
      {isActive && (
        <motion.ellipse
          cx="12" cy="22" rx="4" ry="1"
          fill="#0A84FF"
          opacity={0.3}
          animate={{
            scaleX: [1, 1.3, 1],
            opacity: [0.3, 0.15, 0.3]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Thân pin */}
      <path
        d="M12 21C16 16 20 12.4183 20 9C20 4.58172 16.4183 1 12 1C7.58172 1 4 4.58172 4 9C4 12.4183 8 16 12 21Z"
        fill={isActive? "#0A84FF" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        filter={isActive? "url(#glow)" : "none"}
      />
      
      {/* Chấm trắng tâm */}
      <circle cx="12" cy="9" r="3" fill={isActive? "white" : "currentColor"} />
      
      {/* Chấm xanh pulse đè lên */}
      {isActive && (
        <motion.circle
          cx="12" cy="9" r="3"
          fill="#0A84FF"
          animate={{
            scale: [1, 1.8, 1],
            opacity: [1, 0, 1]
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.g>

    {/* Ping xung quanh khi quét trúng */}
    {isActive && [
      { x: 6, y: 6, delay: 0.5 },
      { x: 18, y: 7, delay: 1.2 },
      { x: 17, y: 17, delay: 1.9 },
      { x: 7, y: 16, delay: 2.6 },
    ].map((p, i) => (
      <motion.g key={`ping-${i}`}>
        <motion.circle
          cx={p.x} cy={p.y} r="1.5"
          fill="#0A84FF"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1.5, 1],
            opacity: [0, 1, 0.8]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: p.delay
          }}
        />
        <motion.circle
          cx={p.x} cy={p.y} r="1.5"
          stroke="#0A84FF"
          strokeWidth="1.5"
          fill="none"
          initial={{ scale: 1, opacity: 1 }}
          animate={{
            scale: [1, 3],
            opacity: [1, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: p.delay + 0.2
          }}
        />
      </motion.g>
    ))}
  </svg>
),
// FRIENDS PLAN: Trái tim đỏ phóng to thu nhỏ - đập nhẹ hơn
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
        scale: isActive? [1, 1.2, 1] : 1, // Đổi 1.35 -> 1.2
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
          scale: [0, 1.1, 0] // Hạt cũng nhỏ hơn
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
 // NEW PLAN: Ngôi sao đổi màu liên tục
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