"use client";

import { useRouter } from "next/navigation";
import PublicRoomCard from "@/components/rooms/PublicRoomCard";
import { usePublicRooms } from "@/hooks/usePublicRooms";
import type { PublicRoomItem } from "@/lib/publicRooms";

const PREVIEW_LIMIT = 6;

type Props = {
  userId?: string | undefined;
  onJoinRoom: (room: PublicRoomItem) => void;
};

export default function PublicRoomsSection({ userId, onJoinRoom }: Props) {
  const router = useRouter();
  const { rooms, loading } = usePublicRooms(userId);

  return (
    <section className="px-4 pt-6">
      <div className="mb-3 flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Phòng chat công cộng</h3>
          <p className="text-xs text-zinc-500">Gặp gỡ theo từng thành phố</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/rooms")}
          className="text-xs font-semibold text-[#0a84ff] active:opacity-60"
        >
          Xem tất cả
        </button>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-52 w-40 shrink-0 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
              />
            ))
          : rooms.slice(0, PREVIEW_LIMIT).map((room) => (
              <PublicRoomCard
                key={room.id}
                room={room}
                layout="horizontal"
                onClick={() => onJoinRoom(room)}
              />
            ))}
      </div>
    </section>
  );
}

export type { PublicRoomItem } from "@/lib/publicRooms";
export { PUBLIC_CITIES } from "@/lib/publicRooms";
