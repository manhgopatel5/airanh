"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_INFO, type EventItem } from "@/data/events";
import ExploreEventCard from "@/components/explore/ExploreEventCard";
import { useEvents } from "@/hooks/useEvents";

const PREVIEW_LIMIT = 6;

type Props = {
  initialEvents?: EventItem[];
  userLat?: number | null;
  userLng?: number | null;
  primaryBg?: string;
  onSelectEvent: (event: EventItem) => void;
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

export default function ExploreTodaySection({
  initialEvents,
  userLat,
  userLng,
  primaryBg = "bg-[#0a84ff]",
  onSelectEvent,
}: Props) {
  const router = useRouter();
  const { events, loading } = useEvents(initialEvents);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    const list = selectedCategory
      ? events.filter((e) => e.category === selectedCategory)
      : events;
    return list.slice(0, PREVIEW_LIMIT);
  }, [events, selectedCategory]);

  const getDistanceLabel = (event: EventItem) => {
    if (!userLat || !userLng || !event.lat || !event.lng) return undefined;
    return formatDistance(getDistanceKm(userLat, userLng, event.lat, event.lng));
  };

  return (
    <div className="px-4 pt-4 space-y-3">
      <div className="flex items-center justify-between mb-1 px-1">
        <h3 className="text-sm font-[700] flex items-center gap-1.5">
          <span className="text-lg">🔥</span>
          Khám phá hôm nay
        </h3>
        <button
          type="button"
          onClick={() => router.push("/explore")}
          className="text-xs font-[600] text-[#0a84ff] active:opacity-60 transition-opacity"
        >
          Xem thêm
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-[600] whitespace-nowrap ${
            !selectedCategory
              ? `${primaryBg} text-white`
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          }`}
        >
          Tất cả
        </button>
        {Object.entries(CATEGORY_INFO).map(([key, cat]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedCategory(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-[600] whitespace-nowrap flex items-center gap-1 ${
              selectedCategory === key
                ? `${primaryBg} text-white`
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4">
        {loading && !filteredEvents.length ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[88vw] max-w-[340px] snap-center h-56 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse"
            />
          ))
        ) : filteredEvents.length === 0 ? (
          <div className="w-full py-8 text-center text-sm text-zinc-500">
            Chưa có địa điểm phù hợp
          </div>
        ) : (
          filteredEvents.map((item) => (
            <ExploreEventCard
              key={item.id}
              item={item}
              layout="horizontal"
              distanceLabel={getDistanceLabel(item)}
              onClick={() => onSelectEvent(item)}
            />
          ))
        )}
      </div>
    </div>
  );
}
