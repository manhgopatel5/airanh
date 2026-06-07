"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowLeft, Flame, SlidersHorizontal, TrendingUp, Clock, DollarSign, Check } from "lucide-react";
import { useAppStore } from "@/store/app";
import React, { useState, useEffect, useRef } from "react";

const haptics = {
  light: () => navigator?.vibrate?.(5),
  medium: () => navigator?.vibrate?.([8, 15, 8]),
};

type FilterTab = "hot" | "nearby" | "new"; 
type SortBy = "views" | "recent" | "price_asc" | "price_desc";

interface CustomFilterBarProps {
  currentFilter: FilterTab;
  onChangeFilter: (filter: FilterTab) => void;
  searchQueries: Record<FilterTab, string>;
  onSearchChange: (filter: FilterTab, query: string) => void;
  onOpenSearch: () => void;
  showSearchModal: boolean;
  onCloseSearch: () => void;
  onApplyFilters: (filters: any) => void; 
}

const CATEGORY_TASKS = [
  { id: "doing", label: "Việc gấp", icon: "⚡️", color: "#0A84FF", suggestPrice: 50000 },
  { id: "skill", label: "Kỹ năng", icon: "🎓", color: "#5E5CE6", suggestPrice: 100000 },
  { id: "shopping", label: "Mua hộ", icon: "🛍️", color: "#FF9F0A", suggestPrice: 30000 },
  { id: "help", label: "Giúp đỡ", icon: "🤝", color: "#30D158", suggestPrice: 0 },
  { id: "moving", label: "Chuyển đồ", icon: "🚚", color: "#FF375F", suggestPrice: 150000 },
  { id: "cleaning", label: "Dọn dẹp", icon: "🧹", color: "#64D2FF", suggestPrice: 80000 },
  { id: "repair", label: "Sửa chữa", icon: "🔧", color: "#BF5AF2", suggestPrice: 120000 },
  { id: "tutoring", label: "Gia sư", icon: "📚", color: "#0A84FF", suggestPrice: 200000 },
  { id: "photography", label: "Chụp ảnh", icon: "📸", color: "#FF9F0A", suggestPrice: 300000 },
  { id: "design", label: "Thiết kế", icon: "🎨", color: "#BF5AF2", suggestPrice: 500000 },
  { id: "cooking", label: "Nấu ăn", icon: "🍳", color: "#FF375F", suggestPrice: 100000 },
  { id: "petcare", label: "Chăm thú cưng", icon: "🐕", color: "#30D158", suggestPrice: 70000 },
  { id: "babysit", label: "Trông trẻ", icon: "👶", color: "#64D2FF", suggestPrice: 150000 },
  { id: "elderly", label: "Chăm người già", icon: "👴", color: "#5E5CE6", suggestPrice: 180000 },
  { id: "event", label: "Sự kiện", icon: "🎉", color: "#FF9F0A", suggestPrice: 400000 },
  { id: "marketing", label: "Marketing", icon: "📢", color: "#0A84FF", suggestPrice: 600000 },
  { id: "writing", label: "Viết lách", icon: "✍️", color: "#BF5AF2", suggestPrice: 250000 },
  { id: "translate", label: "Dịch thuật", icon: "🌐", color: "#64D2FF", suggestPrice: 150000 },
  { id: "consulting", label: "Tư vấn", icon: "💼", color: "#30D158", suggestPrice: 350000 },
  { id: "other", label: "Khác", icon: "📋", color: "#8E8E93", suggestPrice: 50000 },
] as const;

const CATEGORY_PLANS = [
  { id: "coffee", label: "Cà phê", icon: "☕", color: "#8B4513", suggestPrice: 0 },
  { id: "meal", label: "Ăn uống", icon: "🍜", color: "#FF6347", suggestPrice: 0 },
  { id: "sport", label: "Thể thao", icon: "⚽", color: "#30D158", suggestPrice: 0 },
  { id: "party", label: "Tiệc tùng", icon: "🎉", color: "#FF9F0A", suggestPrice: 0 },
  { id: "movie", label: "Xem phim", icon: "🎬", color: "#BF5AF2", suggestPrice: 0 },
  { id: "music", label: "Âm nhạc", icon: "🎵", color: "#FF375F", suggestPrice: 0 },
  { id: "travel", label: "Du lịch", icon: "✈️", color: "#0A84FF", suggestPrice: 0 },
  { id: "game", label: "Game", icon: "🎮", color: "#5E5CE6", suggestPrice: 0 },
  { id: "study", label: "Học nhóm", icon: "📚", color: "#64D2FF", suggestPrice: 0 },
  { id: "volunteer", label: "Tình nguyện", icon: "❤️", color: "#FF375F", suggestPrice: 0 },
  { id: "hiking", label: "Leo núi", icon: "⛰️", color: "#30D158", suggestPrice: 0 },
  { id: "camping", label: "Cắm trại", icon: "🏕️", color: "#FF9F0A", suggestPrice: 0 },
  { id: "beach", label: "Đi biển", icon: "🏖️", color: "#0A84FF", suggestPrice: 0 },
  { id: "karaoke", label: "Karaoke", icon: "🎤", color: "#BF5AF2", suggestPrice: 0 },
  { id: "boardgame", label: "Board game", icon: "🎲", color: "#5E5CE6", suggestPrice: 0 },
  { id: "picnic", label: "Dã ngoại", icon: "🧺", color: "#30D158", suggestPrice: 0 },
  { id: "workshop", label: "Workshop", icon: "🔨", color: "#FF9F0A", suggestPrice: 0 },
  { id: "networking", label: "Kết nối", icon: "🤝", color: "#0A84FF", suggestPrice: 0 },
  { id: "clubbing", label: "Club", icon: "🪩", color: "#BF5AF2", suggestPrice: 0 },
  { id: "other", label: "Khác", icon: "📋", color: "#8E8E93", suggestPrice: 0 },
] as const;

const PRICE_RANGES = [
  { id: "all", label: "Tất cả", min: 0, max: Infinity },
  { id: "free", label: "Miễn phí", min: 0, max: 0 },
  { id: "lt50", label: "< 50K", min: 1, max: 50000 },
  { id: "50-200", label: "50K - 200K", min: 50000, max: 200000 },
  { id: "200-500", label: "200K - 500K", min: 200000, max: 500000 },
  { id: "gt500", label: "> 500K", min: 500000, max: Infinity },
];

const TaskIcons = {
  Hot: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="14" width="3" height="6" rx="1.5" fill="currentColor" opacity={isActive? 1 : 0.5} />
      <rect x="9" y="10" width="3" height="10" rx="1.5" fill="currentColor" opacity={isActive? 1 : 0.5} />
      <rect x="15" y="6" width="3" height="14" rx="1.5" fill="currentColor" opacity={isActive? 1 : 0.5} />
      {isActive && (
        <>
          <motion.rect x="3" y="14" width="3" height="6" rx="1.5" fill="#FF3B30" animate={{ height: [6, 9, 6], y: [14, 11, 14] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} />
          <motion.rect x="9" y="10" width="3" height="10" rx="1.5" fill="#FF9500" animate={{ height: [10, 14, 10], y: [10, 6, 10] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.1 }} />
          <motion.rect x="15" y="6" width="3" height="14" rx="1.5" fill="#FFD60A" animate={{ height: [14, 18, 14], y: [6, 2, 6] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
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
          <filter id="shadow"><feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.2"/></filter>
        </defs>
        <circle cx="12" cy="12" r="10" fill={isActive? "#FFFFFF" : "none"} stroke="currentColor" strokeWidth="2" opacity={isActive? 1 : 0.3} filter={isActive? "url(#shadow)" : "none"} />
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
        <g style={{ transform: `rotate(${angle + wobble}deg)`, transformOrigin: "12px 12px", transition: "none" }}>
          <path d="M12 12L11 5L12 4L13 5L12 12Z" fill={isActive? "url(#needleRed)" : "currentColor"} filter={isActive? "url(#shadow)" : "none"} />
          <path d="M12 12L11 19L12 20L13 19L12 12Z" fill={isActive? "url(#needleBlue)" : "currentColor"} opacity={0.8} />
        </g>
        <circle cx="12" cy="12" r="2.5" fill={isActive? "#FFFFFF" : "currentColor"} stroke={isActive? "#0A84FF" : "none"} strokeWidth="1.5" />
        <circle cx="12" cy="12" r="1" fill={isActive? "#0A84FF" : "currentColor"} />
        {isActive && (
          <>
            <motion.circle cx="12" cy="12" r="8" stroke="#0A84FF" strokeWidth="1" fill="none" animate={{ scale: [0.5, 1.2], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }} />
            <motion.circle cx="12" cy="12" r="8" stroke="#0A84FF" strokeWidth="1" fill="none" animate={{ scale: [0.5, 1.2], opacity: [0.6, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.75 }} />
          </>
        )}
      </svg>
    );
  },
  New: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs><linearGradient id="hbTaskNew" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0A84FF" /><stop offset="100%" stopColor="#00D9FF" /></linearGradient></defs>
      <motion.path d="M 2 12 L 6 12 L 9 6 L 12 18 L 15 12 L 22 12" stroke="url(#hbTaskNew)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" initial={false} animate={isActive? { pathLength: [0, 1, 1, 0], opacity: [0.5, 1, 1, 0.5] } : { pathLength: 1, opacity: 0.7 }} transition={isActive? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 }} />
    </svg>
  )
};

const PlanIcons = {
  Hot: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs><linearGradient id="sunGrad" x1="50%" y1="100%" x2="50%" y2="0%"><stop offset="0%" stopColor="#FF9500" /><stop offset="100%" stopColor="#FFD60A" /></linearGradient></defs>
      {isActive && [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
        <motion.line key={deg} x1="12" y1="15" x2="12" y2="4" stroke="#FFD60A" strokeWidth="1.5" strokeLinecap="round" style={{ originX: "12px", originY: "15px", rotate: deg }} animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }} />
      ))}
      <motion.circle cx="12" cy="15" r="6" fill={isActive? "url(#sunGrad)" : "none"} stroke="currentColor" strokeWidth="2" animate={isActive? { y: [15, 11, 15] } : {}} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
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
          <motion.g animate={{ rotate: 360 }} transition={{ duration: scanDuration, repeat: Infinity, ease: "linear" }} style={{ originX: "12px", originY: "12px" }}>
            <defs><linearGradient id="scanLine" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#0A84FF" stopOpacity={0} /><stop offset="100%" stopColor="#0A84FF" stopOpacity={1} /></linearGradient></defs>
            <line x1="12" y1="12" x2="12" y2="2" stroke="url(#scanLine)" strokeWidth="2" strokeLinecap="round" />
          </motion.g>
        )}
        <motion.circle cx="12" cy="12" r="2" fill={isActive? "#FF3B30" : "currentColor"} animate={isActive? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}} transition={{ duration: 1, repeat: Infinity }} />
        {isActive && (
          <motion.g>
            <motion.circle cx={12 + Math.cos((targetAngle - 90) * Math.PI / 180) * 7} cy={12 + Math.sin((targetAngle - 90) * Math.PI / 180) * 7} r="2" fill="#0A84FF" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 0, 1.6, 1, 0], opacity: [0, 0, 1, 0] }} transition={{ duration: scanDuration, repeat: Infinity, times: [0, triggerTime - 0.01, triggerTime, triggerTime + 0.15, triggerTime + 0.25], ease: "easeOut" }} />
            <motion.circle cx={12 + Math.cos((targetAngle - 90) * Math.PI / 180) * 7} cy={12 + Math.sin((targetAngle - 90) * Math.PI / 180) * 7} r="2" stroke="#0A84FF" strokeWidth="1.5" fill="none" initial={{ scale: 1, opacity: 0 }} animate={{ scale: [1, 1, 3.5], opacity: [0, 0, 0.7, 0] }} transition={{ duration: scanDuration, repeat: Infinity, times: [0, triggerTime, triggerTime + 0.05, triggerTime + 0.4], ease: "easeOut" }} />
          </motion.g>
        )}
      </svg>
    );
  },
  New: ({ isActive }: { isActive: boolean }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <motion.g animate={isActive? { y: [0, -6, 0] } : {}} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} style={{ originX: "50%", originY: "50%" }}>
        <motion.path d="M12 2L15 8L21 9L17 14L18 20L12 17L6 20L7 14L3 9L9 8L12 2Z" fill={isActive? "#FF9500" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" animate={isActive? { fill: ["#FF9500", "#FFD60A", "#FF3B30", "#30D158", "#0A84FF", "#FF9500"] } : {}} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
      </motion.g>
      {isActive && (
        <motion.circle cx="12" cy="12" r="8" stroke="#FF9500" strokeWidth="1" fill="none" opacity={0.4} animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4], stroke: ["#FF9500", "#FFD60A", "#FF3B30", "#30D158", "#0A84FF", "#FF9500"] }} transition={{ scale: { duration: 2, repeat: Infinity }, opacity: { duration: 2, repeat: Infinity }, stroke: { duration: 4, repeat: Infinity, ease: "linear" } }} />
      )}
    </svg>
  ),
};

export default function CustomFilterBar({
  currentFilter,
  onChangeFilter,
  searchQueries,
  onSearchChange,
  onOpenSearch,
  showSearchModal,
  onCloseSearch,
  onApplyFilters,
}: CustomFilterBarProps) {
  const mode = useAppStore((s) => s.mode) || "task";
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("views");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localQuery, setLocalQuery] = useState("");

  useEffect(() => {
    setLocalQuery(searchQueries[currentFilter] || "");
  }, [currentFilter, searchQueries, showSearchModal]);

  const handleApply = () => {
    haptics.medium();
    onApplyFilters({
      tab: currentFilter,
      categories: selectedCategories,
      priceRange,
      sortBy,
      query: localQuery,
    });
    onCloseSearch();
  };

  const themes = {
    task: { bg: "#0A84FF", bgGradient: "linear-gradient(135deg, #0A84FF 0%, #0051D5 100%)", accent: "#00D9FF", secondary: "#5AC8FA" },
    plan: { bg: "#30D158", bgGradient: "linear-gradient(135deg, #30D158 0%, #248A3D 100%)", accent: "#FFD60A", secondary: "#FF9F0A" },
  };
  const currentTheme = themes[mode];

  const IconSet = mode === "task"? TaskIcons : PlanIcons;
  const CATEGORIES = mode === "task"? CATEGORY_TASKS : CATEGORY_PLANS;

  const filters = [
    { key: "hot", label: "Hot", Icon: IconSet.Hot },
    { key: "nearby", label: "Gần bạn", Icon: IconSet.Nearby },
    { key: "new", label: "Mới", Icon: IconSet.New },
  ];

  const sortOptions = [
    { id: "views", label: "Phổ biến nhất", icon: TrendingUp },
    { id: "recent", label: "Mới nhất", icon: Clock },
    { id: "price_asc", label: "Giá tăng dần", icon: DollarSign },
    { id: "price_desc", label: "Giá giảm dần", icon: DollarSign },
  ];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current &&!modalRef.current.contains(event.target as Node)) {
        onCloseSearch();
      }
    }
    if (showSearchModal) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSearchModal, onCloseSearch]);

  const handleClick = (key: FilterTab) => {
    haptics.medium();
    onChangeFilter(key);
  };

  const toggleCategory = (id: string) => {
    haptics.light();
    setSelectedCategories(prev =>
      prev.includes(id)? prev.filter(c => c!== id) : [...prev, id]
    );
  };

  const resetFilters = () => {
    haptics.light();
    setSelectedCategories([]);
    setPriceRange("all");
    setSortBy("views");
    setLocalQuery("");
  };

  const activeFilterCount = selectedCategories.length + (priceRange!== "all"? 1 : 0) + (sortBy!== "views"? 1 : 0) + (localQuery? 1 : 0);

  return (
    <>
      <div className="mt-3">
        <button
          onClick={onOpenSearch}
          className="relative w-full h-11 px-4 pr-10 rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-black/[0.08] dark:ring-white/10 text-left outline-none hover:ring-black/[0.12] dark:hover:ring-white/15 transition-all shadow-sm hover:shadow-md active:scale-[0.99] active:shadow-sm"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/40 via-transparent to-black/[0.03] pointer-events-none" />
          <div className="absolute inset-[1px] rounded-2xl ring-1 ring-inset ring-white/30 pointer-events-none" />
          <span className="relative text-zinc-400 font-semibold">Tìm kiếm nâng cao...</span>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <Search size={18} className="text-zinc-400" />
          </div>
        </button>
      </div>

      <AnimatePresence>
        {showSearchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20 px-4"
          >
            <motion.div
              ref={modalRef}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-[680px] rounded- p-4 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-white dark:bg-zinc-900 pb-2 z-10">
                <div className="flex items-center gap-3">
                  <button onClick={onCloseSearch} className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                    <ArrowLeft size={20} />
                  </button>
                  <h2 className="text-lg font-black">Tìm kiếm nâng cao</h2>
                </div>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs font-bold text-[#0A84FF] hover:opacity-70">
                    Xóa bộ lọc ({activeFilterCount})
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {filters.map((filter) => {
                  const isActive = currentFilter === filter.key;
                  const Icon = filter.Icon;
                  return (
                    <motion.button
                      key={filter.key}
                      whileTap={{ scale: 0.92 }}
                      onTouchStart={() => haptics.light()}
                      onClick={() => handleClick(filter.key as FilterTab)}
                      className="relative w-full"
                    >
                      {isActive && <div className="absolute inset-0 rounded-2xl" style={{ background: currentTheme.bgGradient }} />}
                      <div className={`relative h-12 rounded-2xl flex items-center justify-center gap-1.5 font-bold overflow-hidden px-2 ${isActive? "text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400"}`}>
                        <Icon isActive={isActive} />
                        <span className="text-xs whitespace-nowrap">{filter.label}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="relative h-11 mb-4">
                <input
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                  placeholder={`Tìm ${filters.find(f => f.key === currentFilter)?.label.toLowerCase()}...`}
                  className="w-full h-11 px-4 pr-10 rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-black/[0.08] dark:ring-white/10 outline-none focus:ring-2 focus:ring-[#0A84FF]/40 dark:focus:ring-[#0A84FF]/50 font-semibold text-base text-zinc-900 dark:text-zinc-100 transition-all placeholder:text-zinc-400 shadow-sm focus:shadow-md"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/40 via-transparent to-black/[0.03] pointer-events-none" />
                <div className="absolute inset-[1px] rounded-2xl ring-1 ring-inset ring-white/30 pointer-events-none" />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10">
                  {localQuery? (
                    <button
                      onClick={() => setLocalQuery("")}
                      className="p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <X size={18} className="text-zinc-500" />
                    </button>
                  ) : (
                    <Search size={18} className="text-zinc-400" />
                  )}
                </div>
              </div>

              {currentFilter === "hot" && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Sắp xếp theo</h3>
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-1 text-xs font-bold text-[#0A84FF] hover:opacity-70"
                      >
                        <SlidersHorizontal size={14} />
                        {showAdvanced? "Ẩn" : "Nâng cao"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {sortOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isActive = sortBy === opt.id;
                        return (
                          <motion.button
                            key={opt.id}
                            whileTap={{ scale: 0.95 }}
                                                     className={`relative h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                              isActive
                               ? "text-white"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            }`}
                            style={isActive? { background: currentTheme.bgGradient } : {}}
                          >
                            <Icon size={16} />
                            {opt.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {mode === "task" && (
                    <div>
                      <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Khoảng giá</h3>
                      <div className="flex flex-wrap gap-2">
                        {PRICE_RANGES.map((range) => {
                          const isActive = priceRange === range.id;
                          return (
                            <motion.button
                              key={range.id}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => { haptics.light(); setPriceRange(range.id); }}
                              className={`px-3 h-9 rounded-xl font-bold text-xs transition-all ${
                                isActive
                                 ? "text-white"
                                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              }`}
                              style={isActive? { background: currentTheme.bgGradient } : {}}
                            >
                              {range.label}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                      Danh mục {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                    </h3>
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                      {CATEGORIES.map((cat) => {
                        const isActive = selectedCategories.includes(cat.id);
                        return (
                          <motion.button
                            key={cat.id}
                            whileTap={{ scale: 0.92 }}
                            onClick={() => toggleCategory(cat.id)}
                            className={`relative h-20 rounded-2xl flex flex-col items-center justify-center gap-1 p-2 transition-all ${
                              isActive
                               ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900"
                                : "bg-zinc-100 dark:bg-zinc-800"
                            }`}
                            style={isActive? {
                              background: `linear-gradient(135deg, ${cat.color}20, ${cat.color}10)`,
                              borderColor: cat.color,
                              borderWidth: '2px'
                            } : {}}
                          >
                            <span className="text-2xl">{cat.icon}</span>
                            <span className={`text-[10px] font-bold leading-tight text-center ${isActive? "text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                              {cat.label}
                            </span>
                            {isActive && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: cat.color }}>
                                <Check size={10} className="text-white" strokeWidth={3} />
                              </div>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Flame size={14} className="text-[#FF9500]" />
                      Đang thịnh hành
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {["#viecgap", "#luongcao", "#uytin", "#ganday", "#nhannngay"].map((tag) => (
                        <motion.button
                          key={tag}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { haptics.light(); setLocalQuery(tag); }}
                          className="px-3 h-8 rounded-xl bg-gradient-to-r from-[#FF9500]/10 to-[#FFD60A]/10 text-[#FF9500] dark:text-[#FFD60A] font-bold text-xs hover:from-[#FF9500]/20 hover:to-[#FFD60A]/20 transition-all"
                        >
                          {tag}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={onCloseSearch}
                  className="flex-1 h-11 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-black text-sm hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                >
                  Hủy
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleApply}
                  className="flex-1 h-11 rounded-2xl text-white font-black text-sm shadow-lg"
                  style={{ background: currentTheme.bgGradient }}
                >
                  Áp dụng ({activeFilterCount})
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}