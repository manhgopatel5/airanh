"use client";

import { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { RiEqualizerLine } from "react-icons/ri";
import { toast } from "sonner";
import PublicRoomCard from "@/components/rooms/PublicRoomCard";
import { useAuth } from "@/lib/AuthContext";
import { usePublicRooms } from "@/hooks/usePublicRooms";
import { joinPublicRoom } from "@/lib/joinPublicRoom";
import { REGION_LABELS, type PublicRoomItem } from "@/lib/publicRooms";

type SortOption = "online" | "members" | "name";
type RegionFilter = "all" | "north" | "central" | "south";

export default function PublicRoomsClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { rooms, loading } = usePublicRooms(user?.uid);
  const [sortBy, setSortBy] = useState<SortOption>("online");
  const [region, setRegion] = useState<RegionFilter>("all");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const filteredRooms = useMemo(() => {
    let list = [...rooms];
    if (region !== "all") {
      list = list.filter((r) => r.region === region);
    }
    list.sort((a, b) => {
      if (sortBy === "online") return b.onlineCount - a.onlineCount;
      if (sortBy === "members") return b.memberCount - a.memberCount;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [rooms, region, sortBy]);

  const joinedCount = useMemo(() => rooms.filter((r) => r.isJoined).length, [rooms]);

  const handleJoin = useCallback(
    async (room: PublicRoomItem) => {
      if (!user?.uid) {
        toast.error("Vui lòng đăng nhập");
        router.push("/login");
        return;
      }
      if (room.isJoined) {
        router.push(`/rooms/${room.id}`);
        return;
      }
      setJoiningId(room.id);
      try {
        await joinPublicRoom(room, user.uid);
        if ("vibrate" in navigator) navigator.vibrate(10);
        toast.success(`Đã vào ${room.name}`, { icon: room.emoji });
        router.push(`/rooms/${room.id}`);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Lỗi vào phòng";
        toast.error(message);
      } finally {
        setJoiningId(null);
      }
    },
    [user?.uid, router]
  );

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">
      <div className="sticky top-0 z-40 border-b border-black/5 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/80">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="-ml-2 flex h-8 w-8 items-center justify-center active:opacity-60"
          >
            <FiArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold">Phòng chat công cộng</h1>
            <p className="text-xs text-zinc-500">
              {joinedCount > 0 ? `Đã tham gia ${joinedCount} phòng · ` : ""}
              {filteredRooms.length} phòng
            </p>
          </div>
          <RiEqualizerLine size={20} className="text-zinc-400" />
        </div>
      </div>

      <div className="space-y-3 px-4 pb-24 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(["all", "north", "central", "south"] as RegionFilter[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRegion(key)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                region === key
                  ? "bg-[#0a84ff] text-white"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {key === "all" ? "Tất cả" : REGION_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { value: "online" as const, label: "🔥 Đông người" },
            { value: "members" as const, label: "👥 Thành viên" },
            { value: "name" as const, label: "🔤 Tên A-Z" },
          ].map((sort) => (
            <button
              key={sort.value}
              type="button"
              onClick={() => setSortBy(sort.value)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                sortBy === sort.value
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {sort.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRooms.map((room) => (
              <div key={room.id} className={joiningId === room.id ? "opacity-70" : ""}>
                <PublicRoomCard room={room} layout="vertical" onClick={() => handleJoin(room)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
