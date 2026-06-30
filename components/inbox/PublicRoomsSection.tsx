"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { FiCheck, FiTrendingUp, FiUsers } from "react-icons/fi";
import { getFirebaseDB } from "@/lib/firebase";

export type PublicRoomItem = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  memberCount: number;
  onlineCount: number;
  lastMessage?: string;
  isJoined: boolean;
  isHot: boolean;
};

const PUBLIC_CITIES = [
  { id: "hcm", name: "SÀI GÒN", emoji: "🏙️", color: "from-blue-500 to-cyan-500" },
  { id: "hn", name: "HÀ NỘI", emoji: "🏛️", color: "from-orange-500 to-red-500" },
  { id: "dn", name: "ĐÀ NẴNG", emoji: "🌉", color: "from-teal-500 to-emerald-500" },
  { id: "ct", name: "CẦN THƠ", emoji: "🌾", color: "from-green-500 to-lime-500" },
  { id: "hp", name: "HẢI PHÒNG", emoji: "⚓", color: "from-purple-500 to-pink-500" },
  { id: "dl", name: "ĐÀ LẠT", emoji: "🌸", color: "from-pink-500 to-rose-500" },
  { id: "nt", name: "NHA TRANG", emoji: "🏖️", color: "from-sky-500 to-blue-500" },
  { id: "hue", name: "HUẾ", emoji: "🏯", color: "from-violet-500 to-purple-500" },
] as const;

function buildDefaultRooms(): PublicRoomItem[] {
  return PUBLIC_CITIES.map((city) => ({
    id: `public_${city.id}`,
    name: city.name,
    emoji: city.emoji,
    color: city.color,
    memberCount: 0,
    onlineCount: 0,
    lastMessage: `Chào mừng đến ${city.name}!`,
    isJoined: false,
    isHot: false,
  }));
}

type Props = {
  userId?: string | undefined;
  onJoinRoom: (room: PublicRoomItem) => void;
};

export default function PublicRoomsSection({ userId, onJoinRoom }: Props) {
  const [rooms, setRooms] = useState<PublicRoomItem[]>(buildDefaultRooms);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const db = getFirebaseDB();

    async function loadRooms() {
      const results = await Promise.all(
        PUBLIC_CITIES.map(async (city) => {
          const roomId = `public_${city.id}`;
          try {
            const snap = await getDoc(doc(db, "chats", roomId));
            if (!snap.exists()) {
              return {
                id: roomId,
                name: city.name,
                emoji: city.emoji,
                color: city.color,
                memberCount: 0,
                onlineCount: 0,
                lastMessage: `Chào mừng đến ${city.name}!`,
                isJoined: false,
                isHot: false,
              } satisfies PublicRoomItem;
            }
            const data = snap.data();
            const onlineCount = data.onlineCount || 0;
            return {
              id: roomId,
              name: city.name,
              emoji: city.emoji,
              color: city.color,
              memberCount: data.memberCount || data.members?.length || 0,
              onlineCount,
              lastMessage: data.lastMessage || `Chào mừng đến ${city.name}!`,
              isJoined: userId ? data.members?.includes(userId) || false : false,
              isHot: onlineCount > 20,
            } satisfies PublicRoomItem;
          } catch {
            return {
              id: roomId,
              name: city.name,
              emoji: city.emoji,
              color: city.color,
              memberCount: 0,
              onlineCount: 0,
              isJoined: false,
              isHot: false,
            } satisfies PublicRoomItem;
          }
        })
      );

      if (!cancelled) {
        setRooms(results.sort((a, b) => b.onlineCount - a.onlineCount));
        setLoading(false);
      }
    }

    loadRooms();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-[700] flex items-center gap-1.5">
          <span className="text-lg">💬</span>
          Phòng Chat Công Cộng
        </h3>
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="text-xs font-[600] text-[#0a84ff] active:opacity-60 transition-opacity"
        >
          Xem tất cả
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        {loading
          ? [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-36 h-36 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse"
              />
            ))
          : rooms.slice(0, 8).map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => onJoinRoom(room)}
                className="flex-shrink-0 w-36 bg-white dark:bg-zinc-900 rounded-2xl shadow-md shadow-black/[0.04] border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden active:scale-[0.98] transition-transform text-left feed-item"
              >
                <div className={`relative h-20 bg-gradient-to-br ${room.color} flex items-center justify-center`}>
                  <span className="text-4xl drop-shadow-lg">{room.emoji}</span>
                  {room.isHot && (
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-red-500 rounded-md flex items-center gap-0.5">
                      <FiTrendingUp size={10} className="text-white" />
                      <span className="text-sm font-[800] text-white">HOT</span>
                    </div>
                  )}
                  {room.isJoined && (
                    <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                      <FiCheck className="text-white" size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <h4 className="text-sm font-[700] mb-1 tracking-tight">{room.name}</h4>
                  <div className="flex items-center justify-between text-sm text-[#8e8e93]">
                    <span className="flex items-center gap-1">
                      <FiUsers size={11} />
                      <span className="font-[600]">{room.memberCount || 0}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      <span className="font-[600]">{room.onlineCount || 0}</span>
                    </span>
                  </div>
                </div>
              </button>
            ))}
      </div>

      {showAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAll(false)} />
          <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-5 max-w-md w-full">
            <h3 className="text-lg font-bold mb-3">Tất cả phòng công cộng</h3>
            <div className="space-y-2 max-h-96 overflow-auto">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => {
                    setShowAll(false);
                    onJoinRoom(room);
                  }}
                  className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-left"
                >
                  {room.emoji} {room.name} - {room.onlineCount} online
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAll(false)}
              className="mt-3 w-full h-10 bg-zinc-200 dark:bg-zinc-700 rounded-xl"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { PUBLIC_CITIES };
