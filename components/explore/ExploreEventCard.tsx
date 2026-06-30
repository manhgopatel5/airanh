"use client";

import Image from "next/image";
import { memo } from "react";
import { FiMapPin, FiStar, FiUsers } from "react-icons/fi";
import type { EventItem } from "@/data/events";
import { cn } from "@/lib/utils";

type Props = {
  item: EventItem;
  distanceLabel?: string | undefined;
  layout?: "horizontal" | "vertical";
  className?: string;
  onClick?: () => void;
};

function ExploreEventCard({
  item,
  distanceLabel,
  layout = "vertical",
  className,
  onClick,
}: Props) {
  const imageSrc = item.imageUrl || item.image || "/og-image.png";
  const title = item.name || item.title;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-2xl shadow-md shadow-black/[0.04] border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden active:scale-[0.98] transition-transform text-left feed-item",
        layout === "horizontal" && "flex-shrink-0 w-[88vw] max-w-[340px] snap-center",
        layout === "vertical" && "w-full",
        className
      )}
    >
      <div className="relative h-32">
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes={layout === "horizontal" ? "340px" : "100vw"}
          className="object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
        <div className={`absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r ${item.tagColor} rounded-md`}>
          <span className="text-[10px] font-[800] text-white">{item.tag}</span>
        </div>
        {(item.rating || 0) > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md flex items-center gap-1">
            <FiStar className="text-amber-400" size={10} fill="currentColor" />
            <span className="text-xs font-[700] text-white">
              {item.rating}
              {(item.reviews || 0) > 0 && ` (${item.reviews})`}
            </span>
          </div>
        )}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="flex items-center gap-1.5 text-white">
            <span className="text-lg">{item.icon}</span>
            <h4 className="text-base font-[700] drop-shadow-lg line-clamp-1">{title}</h4>
          </div>
        </div>
      </div>
      <div className="p-3">
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 line-clamp-2">
          {item.desc || item.description}
        </p>
        <div className="flex items-center justify-between text-xs text-[#8e8e93]">
          <span className="flex items-center gap-1">
            <FiUsers size={12} />
            {item.joined || 0} người
          </span>
          <span className="flex items-center gap-1">
            <FiMapPin size={12} />
            {item.province}
            {distanceLabel ? ` • ${distanceLabel}` : ""}
          </span>
        </div>
      </div>
    </button>
  );
}

export default memo(ExploreEventCard);
