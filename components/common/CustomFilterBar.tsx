"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowLeft, Flame, TrendingUp, Clock, DollarSign, Check, ChevronDown } from "lucide-react";
import { useAppStore } from "@/store/app";
import React, { useState, useEffect, useRef } from "react";

const haptics = {
  light: () => navigator?.vibrate?.(5),
  medium: () => navigator?.vibrate?.([8, 15, 8]),
};

type SortBy = "new" | "views" | "price_asc" | "price_desc";

interface CustomFilterBarProps {
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
  { id: "free", label: "Giúp đỡ miễn phí", min: 0, max: 0 },
  { id: "lt50", label: "Nhỏ hơn 50,000 VNĐ", min: 1, max: 50000 },
  { id: "50-200", label: "50,000 - 200,000 VNĐ", min: 50000, max: 200000 },
  { id: "200-500", label: "200,000 - 500,000 VNĐ", min: 200000, max: 500000 },
  { id: "gt500", label: "Lớn hơn 500,000 VNĐ", min: 500000, max: Infinity },
];

export default function CustomFilterBar({
  onOpenSearch,
  showSearchModal,
  onCloseSearch,
  onApplyFilters,
}: CustomFilterBarProps) {
  const mode = useAppStore((s) => s.mode) || "task";
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("new");
  const [localQuery, setLocalQuery] = useState("");
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [showPriceList, setShowPriceList] = useState(false);
  const themes = {
    task: {
      bg: "#0A84FF",
      bgGradient: "linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)",
      accent: "#00D9FF",
      secondary: "#5AC8FA",
      glow: "rgba(10, 132, 255, 0.3)"
    },
    plan: {
      bg: "#30D158",
      bgGradient: "linear-gradient(135deg, #30D158 0%, #248A3D 100%)",
      accent: "#FFD60A",
      secondary: "#FF9F0A",
      glow: "rgba(48, 209, 88, 0.3)"
    },
  };
  const currentTheme = themes[mode];
  const CATEGORIES = mode === "task"? CATEGORY_TASKS : CATEGORY_PLANS;

  const sortOptions = [
    { id: "new", label: "Mới nhất", icon: Clock },
    { id: "views", label: "Phổ biến", icon: TrendingUp },
    { id: "price_asc", label: "Giá tăng", icon: DollarSign },
    { id: "price_desc", label: "Giá giảm", icon: DollarSign },
  ];

  useEffect(() => {
    if (showSearchModal) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = "unset"; };
    }
  }, [showSearchModal]);

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
    setSortBy("new");
    setLocalQuery("");
  };

  const handleApply = () => {
    haptics.medium();
    onApplyFilters({
      categories: selectedCategories,
      priceRange,
      sortBy,
      query: localQuery,
    });
    onCloseSearch();
  };

  const activeFilterCount = selectedCategories.length + (priceRange!== "all"? 1 : 0) + (sortBy!== "new"? 1 : 0) + (localQuery? 1 : 0);

  return (
    <>
      <div className="mt-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenSearch}
          className="relative w-full h-12 px-4 pr-11 rounded-[20px] bg-zinc-100/80 dark:bg-zinc-800/80 backdrop-blur-xl text-left outline-none transition-all shadow-sm hover:shadow-md active:shadow-sm group"
        >
          <div className="absolute inset-0 rounded-[20px] bg-gradient-to-b from-white/60 via-white/20 to-transparent dark:from-white/10 dark:via-white/5 pointer-events-none" />
          <div className="absolute inset-[1px] rounded-[20px] ring-1 ring-inset ring-black/[0.04] dark:ring-white/10 pointer-events-none" />
          <span className="relative text-zinc-400 dark:text-zinc-500 font-medium text-[15px]">Tìm kiếm nâng cao...</span>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 dark:bg-zinc-700/80 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Search size={16} className="text-zinc-500 dark:text-zinc-400" strokeWidth={2.5} />
          </div>
        </motion.button>
      </div>

      <AnimatePresence>
        {showSearchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-md"
            onClick={onCloseSearch}
          >
            <motion.div
              ref={modalRef}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 bg-white dark:bg-zinc-950 flex flex-col"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              {/* Header */}
              <div className="flex-shrink-0 px-4 pt-2 pb-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={onCloseSearch}
                    className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
                  >
                    <ArrowLeft size={20} strokeWidth={2.5} />
                  </motion.button>
                  <h2 className="text-[17px] font-bold flex-1 text-center">Tìm kiếm nâng cao</h2>
                  {activeFilterCount > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={resetFilters}
                      className="text-[13px] font-bold text-[#0A84FF] px-3 py-1.5 rounded-full bg-[#0A84FF]/10"
                    >
                      Xóa
                    </motion.button>
                  )}
                  {activeFilterCount === 0 && <div className="w-9" />}
                </div>

                {/* Search Input */}
                <div className="relative">
                  <input
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleApply()}
                    placeholder="Tìm kiếm..."
                    className="w-full h-12 pl-11 pr-11 rounded-2xl bg-zinc-100 dark:bg-zinc-900 outline-none focus:ring-2 ring-offset-0 font-medium text-[16px] text-zinc-900 dark:text-zinc-100 transition-all placeholder:text-zinc-400"
                    style={{ boxShadow: localQuery? `0 0 0 2px ${currentTheme.bg}40` : 'none' }}
                  />
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                    <Search size={20} className="text-zinc-400" strokeWidth={2.5} />
                  </div>
                  <AnimatePresence>
                    {localQuery && (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        onClick={() => setLocalQuery("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center"
                      >
                        <X size={16} strokeWidth={2.5} className="text-zinc-600 dark:text-zinc-400" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-32">
                {/* Sort */}
                <div>
                  <h3 className="text-[13px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wide mb-3 px-1">Sắp xếp</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {sortOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = sortBy === opt.id;
                      return (
                        <motion.button
                          key={opt.id}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => {
                            haptics.light();
                            setSortBy(opt.id as SortBy);
                          }}
                          className={`relative h-12 rounded-2xl flex items-center justify-center gap-2 font-semibold text-[14px] transition-all ${
                            isActive
                             ? "text-white shadow-lg"
                              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                          }`}
                          style={isActive? {
                            background: currentTheme.bgGradient,
                            boxShadow: `0 8px 24px ${currentTheme.glow}`
                          } : {}}
                        >
                          <Icon size={18} strokeWidth={2.5} />
                          {opt.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

              {/* Price Range - Task mode only */}
{mode === "task" && (
  <div>
    <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3.5 px-1 flex items-center justify-between">
      <span>Khoảng giá</span>
    </h3>

    {/* Trigger Button */}
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        haptics.light();
        setShowPriceList(!showPriceList);
      }}
      className="w-full h-14 px-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-between transition-all"
      style={{
        boxShadow: showPriceList ? `0 0 0 2px ${currentTheme.bg}40` : 'none'
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/80 dark:bg-zinc-800 flex items-center justify-center">
          <DollarSign size={20} className="text-[#30D158]" strokeWidth={2.5} />
        </div>
        <div className="text-left">
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {PRICE_RANGES.find(p => p.id === priceRange)?.label || "Tất cả"}
          </div>
        </div>
      </div>
      <motion.div
        animate={{ rotate: showPriceList ? 180 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <ChevronDown size={20} className="text-zinc-400" strokeWidth={2.5} />
      </motion.div>
    </motion.button>

    {/* Collapsible List */}
    <AnimatePresence>
      {showPriceList && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div className="mt-3 space-y-2 pb-2">
            {PRICE_RANGES.map((range, idx) => {
              const isActive = priceRange === range.id;
              return (
                <motion.button
                  key={range.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    haptics.light();
                    setPriceRange(range.id);
                    setShowPriceList(false);
                  }}
                  className="relative w-full h-14 rounded-2xl flex items-center gap-3 px-3.5 transition-all overflow-hidden"
                  style={{
                    background: isActive
                     ? `linear-gradient(135deg, ${currentTheme.bg}15, ${currentTheme.bg}08)`
                      : 'rgba(142, 142, 147, 0.06)',
                    boxShadow: isActive
                     ? `inset 0 0 0 1.5px ${currentTheme.bg}`
                      : 'inset 0 0 0 1px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isActive ? `${currentTheme.bg}25` : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    <DollarSign size={20} className={isActive ? "text-white" : "text-zinc-400"} strokeWidth={2.5} />
                  </div>

                  <div className="flex-1 text-left">
                    <div className={`text-sm font-bold ${
                      isActive? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                    }`}>
                      {range.label}
                    </div>
                  </div>

                  {isActive && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: currentTheme.bg }}
                    >
                      <Check size={12} className="text-white" strokeWidth={3.5} />
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
)}

{/* Categories */}
<div>
  <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3.5 px-1 flex items-center justify-between">
    <span>Danh mục</span>
    <AnimatePresence>
      {selectedCategories.length > 0 && (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="text-xs px-3 py-1.5 rounded-full font-black shadow-lg"
          style={{
            background: currentTheme.bgGradient,
            color: 'white',
            boxShadow: `0 4px 12px ${currentTheme.glow}`
          }}
        >
          {selectedCategories.length}
        </motion.span>
      )}
    </AnimatePresence>
  </h3>

  {/* Trigger Button */}
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={() => {
      haptics.light();
      setShowCategoryList(!showCategoryList);
    }}
    className="w-full h-14 px-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-between transition-all"
    style={{
      boxShadow: showCategoryList ? `0 0 0 2px ${currentTheme.bg}40` : 'none'
    }}
  >
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-white/80 dark:bg-zinc-800 flex items-center justify-center">
        <span className="text-lg">📋</span>
      </div>
      <div className="text-left">
        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {selectedCategories.length === 0 
            ? "Chọn danh mục" 
            : `Đã chọn ${selectedCategories.length} danh mục`}
        </div>
        {selectedCategories.length > 0 && (
          <div className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">
            {CATEGORIES.filter(c => selectedCategories.includes(c.id))
              .slice(0, 2)
              .map(c => c.label)
              .join(', ')}
            {selectedCategories.length > 2 && ` +${selectedCategories.length - 2}`}
          </div>
        )}
      </div>
    </div>
    <motion.div
      animate={{ rotate: showCategoryList ? 180 : 0 }}
      transition={{ duration: 0.2 }}
    >
      <ChevronDown size={20} className="text-zinc-400" strokeWidth={2.5} />
    </motion.div>
  </motion.button>

  {/* Collapsible List */}
  <AnimatePresence>
    {showCategoryList && (
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden"
      >
        <div className="mt-3 space-y-2 max-h-96 pb-2 overflow-y-auto">
          {CATEGORIES.map((cat, idx) => {
            const isActive = selectedCategories.includes(cat.id);
            return (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleCategory(cat.id)}
                className="relative w-full h-14 rounded-2xl flex items-center gap-3 px-3.5 transition-all overflow-hidden"
                style={{
                  background: isActive
                   ? `linear-gradient(135deg, ${cat.color}15, ${cat.color}08)`
                    : 'rgba(142, 142, 147, 0.06)',
                  boxShadow: isActive
                   ? `inset 0 0 0 1.5px ${cat.color}`
                    : 'inset 0 0 0 1px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isActive ? `${cat.color}25` : 'rgba(255,255,255,0.8)',
                  }}
                >
                  <span className="text-lg">{cat.icon}</span>
                </div>

                <div className="flex-1 text-left">
                  <div className={`text-sm font-bold ${
                    isActive? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                  }`}>
                    {cat.label}
                  </div>
                </div>

                {isActive && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: cat.color }}
                  >
                    <Check size={12} className="text-white" strokeWidth={3.5} />
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
</div>
                {/* Trending Tags */}
                <div>
                  <h3 className="text-[13px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wide mb-3 px-1 flex items-center gap-1.5">
                    <Flame size={16} className="text-[#FF9500]" fill="#FF9500" />
                    Thịnh hành
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {["#viecgap", "#luongcao", "#uytin", "#ganday", "#nhannngay"].map((tag) => (
                      <motion.button
                        key={tag}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { haptics.light(); setLocalQuery(tag); }}
                        className="px-4 h-9 rounded-2xl bg-gradient-to-br from-[#FF9500]/15 to-[#FFD60A]/10 text-[#FF9500] dark:text-[#FFD60A] font-semibold text-[13px] hover:from-[#FF9500]/25 hover:to-[#FFD60A]/20 transition-all border border-[#FF9500]/20"
                      >
                        {tag}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div
                className="absolute bottom-0 left-0 right-0 px-4 pt-4 pb-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50"
                style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
              >
                <div className="flex gap-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={onCloseSearch}
                    className="h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-bold text-[15px] px-6 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Hủy
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleApply}
                    className="flex-1 h-14 rounded-2xl text-white font-bold text-[15px] shadow-xl relative overflow-hidden"
                    style={{
                      background: currentTheme.bgGradient,
                      boxShadow: `0 12px 32px ${currentTheme.glow}`
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                    <span className="relative">
                      Áp dụng {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}