"use client";

import Image from "next/image";
import { memo } from "react";
import { FiCheck, FiTrendingUp, FiUsers } from "react-icons/fi";
import type { PublicRoomItem } from "@/lib/publicRooms";
import { cn } from "@/lib/utils";

type Props = {
  room: PublicRoomItem;
  layout?: "horizontal" | "vertical";
  className?: string;
  onClick?: () => void;
};

function PublicRoomCard({ room, layout = "vertical", className, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "overflow-hidden rounded-2xl border border-zinc-200/60 bg-white text-left shadow-md shadow-black/[0.04] transition active:scale-[0.98] dark:border-zinc-800/60 dark:bg-zinc-900",
        layout === "horizontal" && "w-40 shrink-0",
        layout === "vertical" && "w-full",
        className
      )}
    >
      <div className="relative h-32">
        <Image
          src={room.imageUrl}
          alt={room.name}
          fill
          sizes={layout === "horizontal" ? "160px" : "100vw"}
          className="object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div
          className={`absolute left-2 top-2 rounded-md bg-gradient-to-r ${room.tagColor} px-2 py-0.5`}
        >
          <span className="text-[10px] font-extrabold text-white">{room.tag}</span>
        </div>
        {room.isHot && (
          <div className="absolute right-2 top-2 flex items-center gap-0.5 rounded-md bg-red-500 px-1.5 py-0.5">
            <FiTrendingUp size={10} className="text-white" />
            <span className="text-[10px] font-extrabold text-white">HOT</span>
          </div>
        )}
        {room.isJoined && (
          <div className="absolute bottom-2 right-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
            <FiCheck className="text-white" size={12} strokeWidth={3} />
          </div>
        )}
        <div className="absolute bottom-2 left-3 right-3">
          <h4 className="line-clamp-1 text-base font-bold text-white drop-shadow-lg">{room.name}</h4>
        </div>
      </div>
      <div className="p-3">
        <p className="mb-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-300">{room.desc}</p>
        <div className="flex items-center justify-between text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1 font-semibold">
            <FiUsers size={12} />
            {room.memberCount}
          </span>
          <span className="inline-flex items-center gap-1 font-semibold">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            {room.onlineCount} online
          </span>
        </div>
      </div>
    </button>
  );
}

export default memo(PublicRoomCard);
