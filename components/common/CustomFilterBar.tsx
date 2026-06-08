"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowLeft, ArrowUp, ArrowDown, Star, Clock, Check, MapPin, Navigation, ChevronDown } from "lucide-react";
import { useAppStore } from "@/store/app";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const haptics = {
  light: () => navigator?.vibrate?.(5),
  medium: () => navigator?.vibrate?.([8, 15, 8]),
};

type SortBy = "new" | "views" | "price_asc" | "price_desc" | "distance";

interface CustomFilterBarProps {
  onOpenSearch: () => void;
  showSearchModal: boolean;
  onCloseSearch: () => void;
  onApplyFilters: (filters: any) => void;
}

const CATEGORY_TASKS = [
  { id: "doing", label: "Việc gấp" },
  { id: "skill", label: "Kỹ năng" },
  { id: "shopping", label: "Mua hộ" },
  { id: "help", label: "Giúp đỡ" },
  { id: "moving", label: "Chuyển đồ" },
  { id: "cleaning", label: "Dọn dẹp" },
  { id: "repair", label: "Sửa chữa" },
  { id: "tutoring", label: "Gia sư" },
  { id: "photography", label: "Chụp ảnh" },
  { id: "design", label: "Thiết kế" },
  { id: "cooking", label: "Nấu ăn" },
  { id: "petcare", label: "Chăm thú cưng" },
  { id: "babysit", label: "Trông trẻ" },
  { id: "elderly", label: "Chăm người già" },
  { id: "event", label: "Sự kiện" },
  { id: "marketing", label: "Marketing" },
  { id: "writing", label: "Viết lách" },
  { id: "translate", label: "Dịch thuật" },
  { id: "consulting", label: "Tư vấn" },
  { id: "other", label: "Khác" },
] as const;

const CATEGORY_PLANS = [
  { id: "coffee", label: "Cà phê" },
  { id: "meal", label: "Ăn uống" },
  { id: "sport", label: "Thể thao" },
  { id: "party", label: "Tiệc tùng" },
  { id: "movie", label: "Xem phim" },
  { id: "music", label: "Âm nhạc" },
  { id: "travel", label: "Du lịch" },
  { id: "game", label: "Game" },
  { id: "study", label: "Học nhóm" },
  { id: "volunteer", label: "Tình nguyện" },
  { id: "hiking", label: "Leo núi" },
  { id: "camping", label: "Cắm trại" },
  { id: "beach", label: "Đi biển" },
  { id: "karaoke", label: "Karaoke" },
  { id: "boardgame", label: "Board game" },
  { id: "picnic", label: "Dã ngoại" },
  { id: "workshop", label: "Workshop" },
  { id: "networking", label: "Kết nối" },
  { id: "clubbing", label: "Club" },
  { id: "other", label: "Khác" },
] as const;

const PRICE_RANGES = [
  { id: "all", label: "Tất cả", min: 0, max: Infinity },
  { id: "free", label: "Giúp đỡ miễn phí", min: 0, max: 0 },
  { id: "lt50", label: "Nhỏ hơn 50,000 VNĐ", min: 1, max: 50000 },
  { id: "50-200", label: "50,000 - 200,000 VNĐ", min: 50000, max: 200000 },
  { id: "200-500", label: "200,000 - 500,000 VNĐ", min: 200000, max: 500000 },
  { id: "gt500", label: "Lớn hơn 500,000 VNĐ", min: 500000, max: Infinity },
];

const DEADLINE_RANGES = [
  { id: "all", label: "Tất cả" },
  { id: "1h", label: "Trong 1 giờ" },
  { id: "today", label: "Trong ngày" },
  { id: "3days", label: "3 ngày tới" },
  { id: "week", label: "Tuần này" },
  { id: "month", label: "Tháng này" },
];

const RADIUS_MARKS = [1, 2, 5, 10, 20, 50];

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
  const [deadlineRange, setDeadlineRange] = useState<string>("all");
  const [radius, setRadius] = useState<number>(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Dropdown states
  const [showPriceList, setShowPriceList] = useState(false);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [showDeadlineList, setShowDeadlineList] = useState(false);

  const themes = {
    task: {
      bg: "#0A84FF",
      bgGradient: "linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)",
    },
    plan: {
      bg: "#30D158",
      bgGradient: "linear-gradient(135deg, #30D158 0%, #248A3D 100%)",
    },
  };
const currentTheme = themes[mode];
  const CATEGORIES = mode === "task"? CATEGORY_TASKS : CATEGORY_PLANS;

  const sortOptions = [
    { id: "new", label: "Mới nhất", icon: Clock },
    { id: "views", label: "Phổ biến", icon: Star },
    { id: "price_asc", label: "Giá tăng", icon: ArrowUp },
    { id: "price_desc", label: "Giá giảm", icon: ArrowDown },
    { id: "distance", label: "Gần nhất", icon: Navigation },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (showSearchModal) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = "unset"; };
    }
  }, [showSearchModal]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Thiết bị không hỗ trợ GPS");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (radius === 0) setRadius(5);
        setLocating(false);
        haptics.light();
      },
      () => {
        setLocating(false);
        toast.error("Không lấy được vị trí. Cho phép GPS để lọc gần bạn.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
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
    setSortBy("new");
    setDeadlineRange("all");
    setRadius(0);
    setLocalQuery("");
  };

  const handleApply = () => {
    haptics.medium();
    onApplyFilters({
      categories: selectedCategories,
      priceRange,
      deadlineRange,
      radius: radius > 0? radius : null,
      lat: radius > 0? userLocation?.lat : null,
      lng: radius > 0? userLocation?.lng : null,
      sortBy,
      query: localQuery,
    });
    onCloseSearch();
  };

  const activeFilterCount = selectedCategories.length + 
    (priceRange!== "all"? 1 : 0) + 
    (deadlineRange!== "all"? 1 : 0) + 
    (radius > 0? 1 : 0) + 
    (sortBy!== "new"? 1 : 0) + 
    (localQuery? 1 : 0);

  const currentPriceLabel = PRICE_RANGES.find(p => p.id === priceRange)?.label || "Tất cả";
  const currentDeadlineLabel = DEADLINE_RANGES.find(d => d.id === deadlineRange)?.label || "Tất cả";
  const categoryLabel = selectedCategories.length === 0 
 ? "Tất cả" 
    : selectedCategories.length === 1 
 ? CATEGORIES.find(c => c.id === selectedCategories[0])?.label 
    : `Đã chọn ${selectedCategories.length}`;

  const modalContent = (
    <AnimatePresence>
      {showSearchModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[999999] bg-black/30 backdrop-blur-md"
          onClick={onCloseSearch}
        >
          <motion.div
            ref={modalRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 bg-white dark:bg-zinc-950 flex flex-col h-full"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-4 pt-2 pb-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50">
              <div className="flex items-center justify-between gap-3 mb-3">
                <button
                  onClick={onCloseSearch}
                  className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
                >
                  <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
                <h2 className="text-[17px] font-bold flex-1 text-center font-serif">Tìm kiếm nâng cao</h2>
                {activeFilterCount > 0 && (
                  <button
                    onClick={resetFilters}
                    className="text-[13px] font-bold text-[#0A84FF] px-3.5 h-9 rounded-[28px] bg-white dark:bg-zinc-900 transition-all font-serif"
                    style={{ border: '2px solid #0A84FF' }}
                  >
                    Xóa
                  </button>
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
                  className="w-full h-14 pl-12 pr-12 rounded-[28px] bg-white dark:bg-zinc-900 outline-none font-serif font-bold text-[16px] text-zinc-900 dark:text-zinc-100 transition-all placeholder:text-zinc-400"
                  style={{ border: `2px solid ${currentTheme.bg}` }}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Search size={20} style={{ color: currentTheme.bg }} strokeWidth={2.5} />
                </div>
                {localQuery && (
                  <button
                    onClick={() => setLocalQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
                  >
                    <X size={16} strokeWidth={2.5} className="text-zinc-600 dark:text-zinc-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-32">
              {/* SẮP XẾP */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3 px-1 font-serif">SẮP XẾP</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {sortOptions.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = sortBy === opt.id;
                    const disabled = opt.id === "distance" &&!userLocation;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          if (disabled) {
                            requestLocation();
                            return;
                          }
                          haptics.light();
                          setSortBy(opt.id as SortBy);
                        }}
                        disabled={disabled}
                        className={`relative h-12 rounded-[20px] flex items-center justify-center gap-2 font-serif font-semibold text-[14px] transition-all ${
                          isActive
                         ? "text-white shadow-lg"
                            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                        } ${disabled? "opacity-40" : ""}`}
                        style={isActive? { background: currentTheme.bgGradient } : { border: '2px solid rgba(0,0,0,0.06)' }}
                      >
                        {Icon && <Icon size={18} strokeWidth={2.5} />}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* KHOẢNG CÁCH - THAY CHO TỈNH/TP */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3.5 px-1 font-serif flex items-center justify-between">
                  <span>KHOẢNG CÁCH</span>
                  {radius > 0 && (
                    <span className="text-[13px] font-black" style={{ color: currentTheme.bg }}>
                      {radius}km
                    </span>
                  )}
                </h3>
                
                {!userLocation? (
                  <button
                    onClick={requestLocation}
                    disabled={locating}
                    className="w-full h-14 px-4 rounded-[28px] bg-white dark:bg-zinc-900 flex items-center justify-center gap-2 transition-all font-serif font-bold"
                    style={{ border: `2px solid ${currentTheme.bg}` }}
                  >
                    <MapPin size={20} strokeWidth={2.5} style={{ color: currentTheme.bg }} />
                    <span className="text-zinc-900 dark:text-zinc-100">
                      {locating? "Đang lấy vị trí..." : "Cho phép vị trí để lọc gần bạn"}
                    </span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="px-2">
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={radius}
                        onChange={(e) => {
                          haptics.light();
                          setRadius(Number(e.target.value));
                        }}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${currentTheme.bg} 0%, ${currentTheme.bg} ${(radius/50)*100}%, rgb(228 228 231) ${(radius/50)*100}%, rgb(228 228 231) 100%)`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between px-2">
                      <span className="text-xs font-bold text-zinc-500">Toàn quốc</span>
                      <div className="flex gap-2">
                        {RADIUS_MARKS.map((km) => (
                          <button
                            key={km}
                            onClick={() => {
                              haptics.light();
                              setRadius(km);
                            }}
                            className={`text-xs font-bold px-2 py-1 rounded-lg transition-all ${
                              radius === km
                             ? "text-white"
                                : "text-zinc-500 bg-zinc-100 dark:bg-zinc-900"
                            }`}
                            style={radius === km? { background: currentTheme.bg } : {}}
                          >
                            {km}km
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* KHOẢNG GIÁ */}
              {mode === "task" && (
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3.5 px-1 font-serif">
                    KHOẢNG GIÁ
                  </h3>
                  <button
                    onClick={() => setShowPriceList(!showPriceList)}
                    className="w-full h-14 px-4 rounded-[28px] bg-white dark:bg-zinc-900 flex items-center justify-between transition-all"
                    style={{ border: `2px solid ${currentTheme.bg}` }}
                  >
                    <div className="text-left">
                      <div className="text-xs text-zinc-500 dark:text-zinc-500 font-serif">Chọn khoảng giá</div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-serif mt-0.5">
                        {currentPriceLabel}
                      </div>
                    </div>
                    <ChevronDown 
                      size={20} 
                      className="text-zinc-400 transition-transform" 
                      strokeWidth={2.5}
                      style={{ transform: showPriceList? 'rotate(180deg)' : 'rotate(0deg)' }}
                    />
                  </button>
                  
                  <AnimatePresence>
                    {showPriceList && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-2 pb-2">
                          {PRICE_RANGES.map((range) => {
                            const isActive = priceRange === range.id;
                            return (
                              <button
                                key={range.id}
                                onClick={() => {
                                  haptics.light();
                                  setPriceRange(range.id);
                                  setShowPriceList(false);
                                }}
                                className="relative w-full h-14 rounded-[20px] flex items-center px-4 transition-all overflow-hidden bg-zinc-100/60 dark:bg-zinc-900/60"
                                style={{
                                  border: isActive? `2px solid ${currentTheme.bg}` : '1px solid rgba(0,0,0,0.04)',
                                }}
                              >
                                <div className="flex-1 text-left">
                                  <div className={`text-sm font-serif font-bold ${
                                    isActive? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                                  }`}>
                                    {range.label}
                                  </div>
                                </div>
                                {isActive && (
                                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: currentTheme.bg }}>
                                    <Check size={12} className="text-white" strokeWidth={3.5} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* DANH MỤC */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3.5 px-1 font-serif">
                  DANH MỤC
                </h3>
                <button
                  onClick={() => setShowCategoryList(!showCategoryList)}
                  className="w-full h-14 px-4 rounded-[28px] bg-white dark:bg-zinc-900 flex items-center justify-between transition-all"
                  style={{ border: `2px solid ${currentTheme.bg}` }}
                >
                  <div className="text-left">
                    <div className="text-xs text-zinc-500 dark:text-zinc-500 font-serif">Chọn danh mục</div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-serif mt-0.5">
                      {categoryLabel}
                    </div>
                  </div>
                  <ChevronDown 
                    size={20} 
                    className="text-zinc-400 transition-transform" 
                    strokeWidth={2.5}
                    style={{ transform: showCategoryList? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
                
                <AnimatePresence>
                  {showCategoryList && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2 max-h-80 overflow-y-auto pb-2">
                        {CATEGORIES.map((cat) => {
                          const isActive = selectedCategories.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              onClick={() => toggleCategory(cat.id)}
                              className="relative w-full h-14 rounded-[20px] flex items-center px-4 transition-all overflow-hidden bg-zinc-100/60 dark:bg-zinc-900/60"
                              style={{
                                border: isActive? `2px solid ${currentTheme.bg}` : '1px solid rgba(0,0,0,0.04)',
                              }}
                            >
                              <div className="flex-1 text-left">
                                <div className={`text-sm font-serif font-bold ${
                                  isActive? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                                }`}>
                                  {cat.label}
                                </div>
                              </div>
                              {isActive && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: currentTheme.bg }}>
                                  <Check size={12} className="text-white" strokeWidth={3.5} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* THỜI HẠN CÒN LẠI */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3.5 px-1 font-serif">
                  THỜI HẠN CÒN LẠI
                </h3>
                <button
                  onClick={() => setShowDeadlineList(!showDeadlineList)}
                  className="w-full h-14 px-4 rounded-[28px] bg-white dark:bg-zinc-900 flex items-center justify-between transition-all"
                  style={{ border: `2px solid ${currentTheme.bg}` }}
                >
                  <div className="text-left">
                    <div className="text-xs text-zinc-500 dark:text-zinc-500 font-serif">Chọn thời hạn</div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-serif mt-0.5">
                      {currentDeadlineLabel}
                    </div>
                  </div>
                  <ChevronDown 
                    size={20} 
                    className="text-zinc-400 transition-transform" 
                    strokeWidth={2.5}
                    style={{ transform: showDeadlineList? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
                
                <AnimatePresence>
                  {showDeadlineList && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-2 pb-2">
                        {DEADLINE_RANGES.map((deadline) => {
                          const isActive = deadlineRange === deadline.id;
                          return (
                            <button
                              key={deadline.id}
                              onClick={() => {
                                haptics.light();
                                setDeadlineRange(deadline.id);
                                setShowDeadlineList(false);
                              }}
                              className="relative w-full h-14 rounded-[20px] flex items-center px-4 transition-all overflow-hidden bg-zinc-100/60 dark:bg-zinc-900/60"
                              style={{
                                border: isActive? `2px solid ${currentTheme.bg}` : '1px solid rgba(0,0,0,0.04)',
                              }}
                            >
                              <div className="flex-1 text-left">
                                <div className={`text-sm font-serif font-bold ${
                                  isActive? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-300"
                                }`}>
                                  {deadline.label}
                                </div>
                              </div>
                              {isActive && (
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: currentTheme.bg }}>
                                  <Check size={12} className="text-white" strokeWidth={3.5} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pt-4 pb-4 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl z-[1000000]" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
              <div className="flex gap-3">
                <button
                  onClick={onCloseSearch}
                  className="h-14 rounded-[28px] bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-serif font-bold text-[15px] px-6 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                  style={{ border: '2px solid rgba(0,0,0,0.06)' }}
                >
                  Hủy
                </button>
                <button
                  onClick={handleApply}
                  className="flex-1 h-14 rounded-[28px] text-white font-serif font-bold text-[15px] relative overflow-hidden"
                  style={{ background: currentTheme.bgGradient }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
                  <span className="relative">
                    Áp dụng {activeFilterCount > 0 && `(${activeFilterCount})`}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <div className="mt-3">
        <button
          onClick={onOpenSearch}
          className="relative w-full h-12 px-4 pr-11 rounded-[28px] bg-zinc-100/80 dark:bg-zinc-800/80 backdrop-blur-xl text-left outline-none transition-all shadow-sm hover:shadow-md active:shadow-sm group"
          style={{ border: `2px solid ${currentTheme.bg}` }}
        >
          <span className="relative text-zinc-500 dark:text-zinc-400 font-serif font-semibold text-[15px]">Tìm kiếm nâng cao...</span>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 dark:bg-zinc-700/80 flex items-center justify-center">
            <Search size={16} className="text-zinc-500 dark:text-zinc-400" strokeWidth={2.5} />
          </div>
        </button>
      </div>
      {mounted && createPortal(modalContent, document.body)}
    </>
  );
}