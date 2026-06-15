"use client";
import { EventItem } from "@/data/events";
import { useCheckinCount } from "@/hooks/useCheckinCount";
import { FiUsers, FiMapPin, FiStar } from "react-icons/fi";

export default function ExploreCard({
  item,
  onClick,
  distance
}: {
  item: EventItem;
  onClick: () => void;
  distance?: string;
}) {
  const { count, loading } = useCheckinCount(item.id);

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-md shadow-black/[0.04] border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden active:scale-[0.98] transition-transform text-left"
    >
      <div className="relative h-32">
        <img src={item.imageUrl || item.image} className="w-full h-full object-cover" loading="lazy" alt={item.name || item.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
        <div className={`absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r ${item.tagColor} rounded-md`}>
          <span className="text-xs font-[800] text-white">{item.tag}</span>
        </div>
        {item.rating && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md flex items-center gap-1">
            <FiStar className="text-amber-400" size={10} fill="currentColor" />
            <span className="text-xs font-[700] text-white">{item.rating}</span>
          </div>
        )}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="flex items-center gap-1.5 text-white">
            <span className="text-lg">{item.icon}</span>
            <h4 className="text-base font-[700] drop-shadow-lg">{item.name || item.title}</h4>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 line-clamp-2">{item.desc || item.description}</p>
        <div className="flex items-center justify-between text-xs text-[#8e8e93]">
          <span className="flex items-center gap-1">
            <FiUsers size={12} />
            {loading? '...' : `${count} người`}
          </span>
          <span className="flex items-center gap-1">
            <FiMapPin size={12} />
            {item.province} • {distance || '?km'}
          </span>
        </div>
      </div>
    </button>
  );
}