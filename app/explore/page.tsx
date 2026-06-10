"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EVENTS_DATA, CATEGORY_INFO, EventItem } from "@/data/events";
import EventDetailModal from "@/components/EventDetailModal";
import { FiArrowLeft, FiUsers, FiMapPin, FiStar } from "react-icons/fi";

export default function ExplorePage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const filteredEvents = selectedCategory
   ? EVENTS_DATA.filter(e => e.category === selectedCategory)
    : EVENTS_DATA;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center -ml-2 active:opacity-60">
            <FiArrowLeft size={22} />
          </button>
          <h1 className="text-[17px] font-[600]">Khám phá hôm nay</h1>
          <div className="ml-auto text-[13px] text-[#8e8e93]">{filteredEvents.length} địa điểm</div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-24 space-y-3">
        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-[600] whitespace-nowrap ${
            !selectedCategory
              ? 'bg-[#0a84ff] text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Tất cả
          </button>
          {Object.entries(CATEGORY_INFO).map(([key, cat]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-[600] whitespace-nowrap flex items-center gap-1 ${
                selectedCategory === key
                ? 'bg-[#0a84ff] text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* List full */}
        <div className="space-y-3">
          {filteredEvents.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedEvent(item)}
              className="w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-md shadow-black/[0.04] border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden active:scale-[0.98] transition-transform text-left"
            >
              <div className="relative h-32">
                <img src={item.image} className="w-full h-full object-cover" loading="lazy" alt={item.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
                <div className={`absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r ${item.tagColor} rounded-md`}>
                  <span className="text-[10px] font-[800] text-white">{item.tag}</span>
                </div>
                {item.rating && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md flex items-center gap-1">
                    <FiStar className="text-amber-400" size={10} fill="currentColor" />
                    <span className="text-[10px] font-[700] text-white">{item.rating}</span>
                  </div>
                )}
                <div className="absolute bottom-2 left-3 right-3">
                  <div className="flex items-center gap-1.5 text-white">
                    <span className="text-lg">{item.icon}</span>
                    <h4 className="text-base font-[700] drop-shadow-lg">{item.title}</h4>
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 line-clamp-2">{item.desc}</p>
                <div className="flex items-center justify-between text-xs text-[#8e8e93]">
                  <span className="flex items-center gap-1">
                    <FiUsers size={12} />
                    {item.joined} người
                  </span>
                  <span className="flex items-center gap-1">
                    <FiMapPin size={12} />
                    {item.distance}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}