"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiFilter, FiX } from "react-icons/fi";
import { RiEqualizerLine } from "react-icons/ri";
import { CATEGORY_INFO, type EventItem } from "@/data/events";
import ExploreEventCard from "@/components/explore/ExploreEventCard";
import EventDetailModal from "@/components/EventDetailModal";
import { useAuth } from "@/lib/AuthContext";
import { useEvents } from "@/hooks/useEvents";
import { onEventCheckin } from "@/lib/xp";

const PROVINCES = [
  "Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ",
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu",
  "Bắc Ninh", "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước",
  "Bình Thuận", "Cà Mau", "Cao Bằng", "Đắk Lắk", "Đắk Nông",
  "Điện Biên", "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang",
  "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang", "Hòa Bình",
  "Hưng Yên", "Khánh Hòa", "Kiên Giang", "Kon Tum", "Lai Châu",
  "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
  "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
  "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị",
  "Sóc Trăng", "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên",
  "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang", "Trà Vinh", "Tuyên Quang",
  "Vĩnh Long", "Vĩnh Phúc", "Yên Bái",
];

type SortOption = "rating" | "reviews" | "distance" | "newest";
type FilterState = {
  category: string | null;
  minRating: number;
  maxDistance: number;
  sortBy: SortOption;
  province: string | null;
};

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

type Props = {
  initialEvents: EventItem[];
};

export default function ExploreClient({ initialEvents }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { events, loading } = useEvents(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    category: null,
    minRating: 0,
    maxDistance: 999,
    sortBy: "rating",
    province: null,
  });

  useEffect(() => {
    const lat = localStorage.getItem("userLat");
    const lng = localStorage.getItem("userLng");
    if (lat && lng) {
      setUserLat(Number(lat));
      setUserLng(Number(lng));
    }
  }, []);

  const getEventDistance = (event: EventItem): number => {
    if (!userLat || !userLng || !event.lat || !event.lng) return 999;
    return getDistanceKm(userLat, userLng, event.lat, event.lng);
  };

  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (filters.category) {
      filtered = filtered.filter((e) => e.category === filters.category);
    }
    if (filters.minRating > 0) {
      filtered = filtered.filter((e) => (e.rating || 0) >= filters.minRating);
    }
    if (filters.maxDistance < 999) {
      filtered = filtered.filter((e) => getEventDistance(e) <= filters.maxDistance);
    }
    if (filters.province) {
      filtered = filtered.filter((e) => e.province === filters.province);
    }

    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "reviews":
          return (b.reviews || 0) - (a.reviews || 0);
        case "distance":
          return getEventDistance(a) - getEventDistance(b);
        case "newest":
          return (
            (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) -
            (a.updatedAt ? new Date(a.updatedAt).getTime() : 0)
          );
        default:
          return 0;
      }
    });

    return filtered;
  }, [events, filters, userLat, userLng]);

  const resetFilters = () => {
    setFilters({
      category: null,
      minRating: 0,
      maxDistance: 999,
      sortBy: "rating",
      province: null,
    });
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3 px-4 h-14">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center -ml-2 active:opacity-60"
          >
            <FiArrowLeft size={22} />
          </button>
          <h1 className="text-base font-[600]">Khám phá hôm nay</h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-[#8e8e93]">{filteredEvents.length} địa điểm</span>
            <button
              type="button"
              onClick={() => setShowFilter(true)}
              className="w-8 h-8 flex items-center justify-center active:opacity-60 relative"
            >
              <RiEqualizerLine size={20} />
              {(filters.minRating > 0 || filters.maxDistance < 999 || filters.province) && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-[#0a84ff] rounded-full" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <button
            type="button"
            onClick={() => setFilters((prev) => ({ ...prev, category: null }))}
            className={`px-3 py-1.5 rounded-full text-xs font-[600] whitespace-nowrap ${
              !filters.category
                ? "bg-[#0a84ff] text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            Tất cả
          </button>
          {Object.entries(CATEGORY_INFO).map(([key, cat]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilters((prev) => ({ ...prev, category: key }))}
              className={`px-3 py-1.5 rounded-full text-xs font-[600] whitespace-nowrap flex items-center gap-1 ${
                filters.category === key
                  ? "bg-[#0a84ff] text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {[
            { value: "rating", label: "⭐ Đánh giá" },
            { value: "reviews", label: "🔥 Phổ biến" },
            { value: "distance", label: "📍 Gần nhất" },
            { value: "newest", label: "✨ Mới nhất" },
          ].map((sort) => (
            <button
              key={sort.value}
              type="button"
              onClick={() =>
                setFilters((prev) => ({ ...prev, sortBy: sort.value as SortOption }))
              }
              className={`px-3 py-1.5 rounded-full text-xs font-[600] whitespace-nowrap ${
                filters.sortBy === sort.value
                  ? "bg-[#0a84ff] text-white"
                  : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {sort.label}
            </button>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          {loading && !filteredEvents.length ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
            ))
          ) : filteredEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mb-3">
                <FiFilter className="text-gray-400" size={28} />
              </div>
              <p className="text-sm font-[600] mb-1">Không tìm thấy địa điểm</p>
              <p className="text-xs text-[#8e8e93] mb-4">Thử thay đổi bộ lọc</p>
              <button
                type="button"
                onClick={resetFilters}
                className="px-4 h-9 bg-[#0a84ff] text-white rounded-full text-sm font-[600]"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            filteredEvents.map((item) => (
              <ExploreEventCard
                key={item.id}
                item={item}
                layout="vertical"
                distanceLabel={
                  userLat && userLng && item.lat && item.lng
                    ? formatDistance(getEventDistance(item))
                    : undefined
                }
                onClick={() => setSelectedEvent(item)}
              />
            ))
          )}
        </div>
      </div>

      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl" onClick={() => setShowFilter(false)} />
          <div className="relative w-full sm:max-w-[400px] bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 dark:border-white/5">
              <h2 className="text-lg font-[700]">Bộ lọc</h2>
              <button type="button" onClick={() => setShowFilter(false)} className="w-7 h-7 flex items-center justify-center text-[#8e8e93]">
                <FiX size={22} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5 space-y-5">
              <div>
                <label className="text-sm font-[600] mb-3 block">Tỉnh/Thành phố</label>
                <select
                  value={filters.province || ""}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, province: e.target.value || null }))
                  }
                  className="w-full h-11 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm outline-none"
                >
                  <option value="">Tất cả</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-[600] mb-3 block">Đánh giá tối thiểu</label>
                <div className="flex gap-2">
                  {[0, 3, 4, 4.5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, minRating: rating }))}
                      className={`flex-1 h-11 rounded-xl text-sm font-[600] ${
                        filters.minRating === rating
                          ? "bg-[#0a84ff] text-white"
                          : "bg-zinc-100 dark:bg-zinc-800"
                      }`}
                    >
                      {rating === 0 ? "Tất cả" : `${rating}⭐`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-[600] mb-3 block">Khoảng cách</label>
                <div className="space-y-2">
                  {[5, 10, 20, 999].map((km) => (
                    <button
                      key={km}
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, maxDistance: km }))}
                      className={`w-full h-11 rounded-xl text-sm font-[600] text-left px-4 ${
                        filters.maxDistance === km
                          ? "bg-[#0a84ff] text-white"
                          : "bg-zinc-100 dark:bg-zinc-800"
                      }`}
                    >
                      {km === 999 ? "Không giới hạn" : `Trong ${km}km`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-black/5 dark:border-white/5 flex gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="flex-1 h-11 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm font-[600]"
              >
                Đặt lại
              </button>
              <button
                type="button"
                onClick={() => setShowFilter(false)}
                className="flex-1 h-11 bg-[#0a84ff] text-white rounded-xl text-sm font-[600]"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onCheckinSuccess={async () => {
          if (user?.uid) {
            await onEventCheckin(user.uid);
          }
          router.refresh();
        }}
      />
    </div>
  );
}
