"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Clock,
  Flame,
  MapPin,
  Navigation,
  Search,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import type { FeedFilters, FeedScope, FeedSortBy } from "@/lib/feed";
import { hasActiveFilters } from "@/lib/feed";
import { getGeolocationErrorMessage } from "@/lib/geolocation";

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
  { id: "all", label: "Tất cả" },
  { id: "free", label: "Miễn phí / Giúp đỡ" },
  { id: "lt50", label: "Dưới 50.000đ" },
  { id: "50-200", label: "50.000 – 200.000đ" },
  { id: "200-500", label: "200.000 – 500.000đ" },
  { id: "gt500", label: "Trên 500.000đ" },
];

const DEADLINE_RANGES = [
  { id: "all", label: "Tất cả" },
  { id: "1h", label: "Trong 1 giờ" },
  { id: "today", label: "Trong ngày" },
  { id: "3days", label: "3 ngày tới" },
  { id: "week", label: "Tuần này" },
  { id: "month", label: "Tháng này" },
];

const SCOPES: { id: FeedScope; label: string; icon: typeof Search }[] = [
  { id: "all", label: "Tất cả", icon: Search },
  { id: "near", label: "Gần bạn", icon: MapPin },
  { id: "hot", label: "Hot", icon: Flame },
  { id: "new", label: "Mới", icon: Sparkles },
  { id: "friends", label: "Bạn bè", icon: Users },
];

type Props = {
  mode: "task" | "plan";
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  currentFilters: FeedFilters;
  onApply: (filters: FeedFilters) => void;
  isLoggedIn?: boolean;
};

const haptics = {
  light: () => navigator?.vibrate?.(5),
  medium: () => navigator?.vibrate?.([8, 15, 8]),
};

export default function FeedSearchPanel({
  mode,
  open,
  onOpen,
  onClose,
  currentFilters,
  onApply,
  isLoggedIn,
}: Props) {
  const themes = {
    task: { bg: "#0A84FF", gradient: "linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)" },
    plan: { bg: "#30D158", gradient: "linear-gradient(135deg, #30D158 0%, #248A3D 100%)" },
  };
  const theme = themes[mode];
  const categories = mode === "task" ? CATEGORY_TASKS : CATEGORY_PLANS;
  const noun = mode === "task" ? "việc" : "sự kiện";

  const [mounted, setMounted] = useState(false);
  const [scope, setScope] = useState<FeedScope>(currentFilters.scope ?? "all");
  const [query, setQuery] = useState(currentFilters.query);
  const [category, setCategory] = useState<string | undefined>(currentFilters.category);
  const [priceRange, setPriceRange] = useState(currentFilters.priceRange);
  const [deadlineRange, setDeadlineRange] = useState(currentFilters.deadlineRange);
  const [sortBy, setSortBy] = useState<FeedSortBy>(currentFilters.sortBy);
  const [radiusKm, setRadiusKm] = useState(currentFilters.radiusKm ?? 50);
  const [showCategoryList, setShowCategoryList] = useState(false);
  const [showPriceList, setShowPriceList] = useState(false);
  const [showDeadlineList, setShowDeadlineList] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    currentFilters.lat != null && currentFilters.lng != null
      ? { lat: currentFilters.lat, lng: currentFilters.lng }
      : null
  );
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setScope(currentFilters.scope ?? "all");
    setQuery(currentFilters.query);
    setCategory(currentFilters.category);
    setPriceRange(currentFilters.priceRange);
    setDeadlineRange(currentFilters.deadlineRange);
    setSortBy(currentFilters.sortBy);
    setRadiusKm(currentFilters.radiusKm ?? 50);
    if (currentFilters.lat != null && currentFilters.lng != null) {
      setUserLocation({ lat: currentFilters.lat, lng: currentFilters.lng });
    }
  }, [open, currentFilters]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  useEffect(() => {
    if (!open || scope !== "near" || userLocation) return;
    requestLocation();
  }, [open, scope, userLocation]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Trình duyệt không hỗ trợ GPS");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocationError(getGeolocationErrorMessage(err.code));
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const sortOptions = useMemo(
    () => [
      { id: "new" as const, label: "Mới nhất", icon: Clock },
      { id: "views" as const, label: "Phổ biến", icon: Star },
      { id: "likes" as const, label: "Nhiều thích", icon: Flame },
      { id: "price_asc" as const, label: "Giá tăng", icon: ArrowUp },
      { id: "price_desc" as const, label: "Giá giảm", icon: ArrowDown },
    ],
    []
  );

  const activeCount = useMemo(() => {
    let n = 0;
    if (scope !== "all") n++;
    if (query.trim()) n++;
    if (category) n++;
    if (priceRange !== "all") n++;
    if (deadlineRange !== "all") n++;
    if (sortBy !== "new" && scope === "all") n++;
    if (scope === "near" && radiusKm !== 50) n++;
    return n;
  }, [scope, query, category, priceRange, deadlineRange, sortBy, radiusKm]);

  const reset = () => {
    haptics.light();
    setScope("all");
    setQuery("");
    setCategory(undefined);
    setPriceRange("all");
    setDeadlineRange("all");
    setSortBy("new");
    setRadiusKm(50);
  };

  const apply = () => {
    if (scope === "near" && !userLocation) {
      setLocationError("Cần bật vị trí để tìm gần bạn");
      requestLocation();
      return;
    }
    if (scope === "friends" && !isLoggedIn) {
      setLocationError("Đăng nhập để xem bài của bạn bè");
      return;
    }

    haptics.medium();
    const tab =
      scope === "all"
        ? undefined
        : scope === "near"
          ? "near"
          : scope === "hot"
            ? "hot"
            : scope === "new"
              ? "new"
              : "friends";

    onApply({
      category,
      priceRange,
      deadlineRange,
      sortBy: scope === "hot" ? "likes" : scope === "new" ? "new" : sortBy,
      query: query.trim(),
      scope,
      tab,
      lat: scope === "near" ? userLocation?.lat : undefined,
      lng: scope === "near" ? userLocation?.lng : undefined,
      radiusKm: scope === "near" ? radiusKm : undefined,
    });
    onClose();
  };

  const triggerLabel = useMemo(() => {
    if (currentFilters.scope === "near") return `Tìm ${noun} gần bạn`;
    if (hasActiveFilters(currentFilters)) return "Đang lọc kết quả…";
    return `Tìm ${noun} gần bạn & lọc nâng cao`;
  }, [currentFilters, noun]);

  const modal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[999999] bg-black/40 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 top-[6vh] sm:top-[10vh] flex flex-col rounded-t-[2rem] bg-white dark:bg-zinc-950 shadow-2xl"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
            <div className="flex-shrink-0 px-4 pt-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3 mb-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-9 h-9 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="flex-1 text-center">
                  <h2 className="text-[17px] font-bold">Tìm {noun}</h2>
                  <p className="text-xs text-zinc-500">Gần bạn · Lọc nâng cao</p>
                </div>
                {activeCount > 0 ? (
                  <button type="button" onClick={reset} className="text-sm font-bold text-[#0A84FF] px-2">
                    Xóa
                  </button>
                ) : (
                  <div className="w-9" />
                )}
              </div>

              <div className="relative mb-3">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && apply()}
                  placeholder={`Từ khóa ${noun}…`}
                  className="w-full h-12 pl-10 pr-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 outline-none text-[15px] font-medium"
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X size={16} className="text-zinc-400" />
                  </button>
                )}
              </div>

              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                {SCOPES.map((s) => {
                  const Icon = s.icon;
                  const active = scope === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        haptics.light();
                        setScope(s.id);
                      }}
                      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-all ${
                        active ? "text-white shadow-md" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
                      }`}
                      style={active ? { background: theme.gradient } : undefined}
                    >
                      <Icon size={14} />
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-36">
              {scope === "near" && (
                <div className="rounded-2xl border border-zinc-200/80 dark:border-zinc-800 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Navigation size={18} style={{ color: theme.bg }} />
                      <span className="text-sm font-bold">Vị trí của bạn</span>
                    </div>
                    <button
                      type="button"
                      onClick={requestLocation}
                      disabled={locating}
                      className="text-xs font-bold text-[#0A84FF]"
                    >
                      {locating ? "Đang lấy…" : "Làm mới"}
                    </button>
                  </div>
                  {userLocation ? (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Đã có vị trí · bán kính {radiusKm}km
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">{locationError || "Cần GPS để tìm gần bạn"}</p>
                  )}
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                    className="w-full accent-[#0A84FF]"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-400 font-semibold">
                    <span>5km</span>
                    <span>{radiusKm}km</span>
                    <span>100km</span>
                  </div>
                </div>
              )}

              {scope === "all" && (
                <div>
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Sắp xếp</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {sortOptions.map((opt) => {
                      const Icon = opt.icon;
                      const active = sortBy === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSortBy(opt.id)}
                          className={`h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold ${
                            active ? "text-white" : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300"
                          }`}
                          style={active ? { background: theme.gradient } : undefined}
                        >
                          <Icon size={16} />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {mode === "task" && (
                <FilterDropdown
                  label="Khoảng giá"
                  value={PRICE_RANGES.find((p) => p.id === priceRange)?.label || "Tất cả"}
                  open={showPriceList}
                  onToggle={() => setShowPriceList((v) => !v)}
                >
                  {PRICE_RANGES.map((range) => (
                    <OptionRow
                      key={range.id}
                      label={range.label}
                      active={priceRange === range.id}
                      themeBg={theme.bg}
                      onClick={() => {
                        setPriceRange(range.id);
                        setShowPriceList(false);
                      }}
                    />
                  ))}
                </FilterDropdown>
              )}

              <FilterDropdown
                label="Danh mục"
                value={category ? categories.find((c) => c.id === category)?.label : "Tất cả"}
                open={showCategoryList}
                onToggle={() => setShowCategoryList((v) => !v)}
              >
                <OptionRow
                  label="Tất cả"
                  active={!category}
                  themeBg={theme.bg}
                  onClick={() => {
                    setCategory(undefined);
                    setShowCategoryList(false);
                  }}
                />
                {categories.map((cat) => (
                  <OptionRow
                    key={cat.id}
                    label={cat.label}
                    active={category === cat.id}
                    themeBg={theme.bg}
                    onClick={() => {
                      setCategory(cat.id);
                      setShowCategoryList(false);
                    }}
                  />
                ))}
              </FilterDropdown>

              <FilterDropdown
                label="Thời hạn"
                value={DEADLINE_RANGES.find((d) => d.id === deadlineRange)?.label || "Tất cả"}
                open={showDeadlineList}
                onToggle={() => setShowDeadlineList((v) => !v)}
              >
                {DEADLINE_RANGES.map((d) => (
                  <OptionRow
                    key={d.id}
                    label={d.label}
                    active={deadlineRange === d.id}
                    themeBg={theme.bg}
                    onClick={() => {
                      setDeadlineRange(d.id);
                      setShowDeadlineList(false);
                    }}
                  />
                ))}
              </FilterDropdown>

              {locationError && scope !== "near" && (
                <p className="text-sm text-red-500 font-medium text-center">{locationError}</p>
              )}
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 px-4 pt-3 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-800"
              style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
            >
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-12 px-5 rounded-2xl bg-zinc-100 dark:bg-zinc-900 font-bold text-sm text-zinc-700 dark:text-zinc-300"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={apply}
                  className="flex-1 h-12 rounded-2xl text-white font-bold text-sm shadow-lg"
                  style={{ background: theme.gradient }}
                >
                  Áp dụng{activeCount > 0 ? ` (${activeCount})` : ""}
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
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 w-full h-12 px-4 flex items-center gap-3 rounded-2xl bg-zinc-100/90 dark:bg-zinc-900/90 ring-1 ring-black/[0.06] dark:ring-white/10 active:scale-[0.99] transition-transform text-left"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${theme.bg}18` }}
        >
          <MapPin size={18} style={{ color: theme.bg }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{triggerLabel}</p>
          <p className="text-xs text-zinc-500 truncate">Từ khóa · Gần bạn · Danh mục · Giá</p>
        </div>
        <Search size={18} className="text-zinc-400 shrink-0" />
      </button>
      {mounted && createPortal(modal, document.body)}
    </>
  );
}

function FilterDropdown({
  label,
  value,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string | undefined;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">{label}</h3>
      <button
        type="button"
        onClick={onToggle}
        className="w-full h-12 px-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between ring-1 ring-black/[0.05] dark:ring-white/10"
      >
        <span className="text-sm font-bold truncate">{value}</span>
        <ChevronDown size={18} className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1 max-h-52 overflow-y-auto">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OptionRow({
  label,
  active,
  themeBg,
  onClick,
}: {
  label: string;
  active: boolean;
  themeBg: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full h-11 px-3 rounded-xl flex items-center justify-between text-sm font-semibold ${
        active ? "bg-zinc-100 dark:bg-zinc-800" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
      }`}
      style={active ? { boxShadow: `inset 0 0 0 2px ${themeBg}` } : undefined}
    >
      {label}
      {active && (
        <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: themeBg }}>
          <Check size={12} className="text-white" />
        </span>
      )}
    </button>
  );
}
