"use client";

import Image from "next/image";
import { FiMapPin, FiRefreshCw, FiUserPlus, FiUsers } from "react-icons/fi";
import type { UserSuggestion } from "./types";

type Props = {
  nearbyUsers: UserSuggestion[];
  suggestions: UserSuggestion[];
  loadingNearby: boolean;
  loadingSuggested: boolean;
  locationDenied: boolean;
  userLocation: { lat: number; lng: number } | null;
  sentRequests: Set<string>;
  onRefreshNearby: () => void;
  onAddFriend: (uid: string, username?: string) => void;
  onRequestLocation: () => void;
};

function UserRow({
  user,
  sentRequests,
  onAddFriend,
  showDistance,
}: {
  user: UserSuggestion;
  sentRequests: Set<string>;
  onAddFriend: (uid: string, username?: string) => void;
  showDistance?: boolean;
}) {
  const avatar = user.avatarUrl;
  const isSent = user.status === "sent" || sentRequests.has(user.uid);
  const isReceived = user.status === "received";

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      {avatar ? (
        <Image src={avatar} alt={user.name} width={48} height={48} className="rounded-2xl object-cover" />
      ) : (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0A84FF] to-[#5E5CE6] flex items-center justify-center text-white font-bold text-lg">
          {user.name[0]?.toUpperCase() || "?"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[15px] truncate text-zinc-900 dark:text-white">{user.name}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 mt-0.5">
          {user.username && <span>@{user.username}</span>}
          {showDistance && user.distance != null && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-[#0A84FF]">
              <FiMapPin size={11} />
              {user.distance}km
            </span>
          )}
          {user.mutualFriends != null && user.mutualFriends > 0 && (
            <span className="inline-flex items-center gap-0.5 font-semibold text-purple-600 dark:text-purple-400">
              <FiUsers size={11} />
              {user.mutualFriends} bạn chung
            </span>
          )}
          {user.mutualFriends === 0 && !showDistance && (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Mới tham gia</span>
          )}
        </div>
      </div>
      {isSent ? (
        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 text-orange-600">Đã gửi</span>
      ) : isReceived ? (
        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600">Chờ xác nhận</span>
      ) : (
        <button
          type="button"
          onClick={() => onAddFriend(user.uid, user.username)}
          className="inline-flex items-center gap-1 px-3.5 h-9 rounded-xl bg-[#0A84FF] text-white text-xs font-bold active:scale-95 shadow-md shadow-[#0A84FF]/25"
        >
          <FiUserPlus size={14} />
          Kết bạn
        </button>
      )}
    </div>
  );
}

export default function FriendsDiscoveryPanel({
  nearbyUsers,
  suggestions,
  loadingNearby,
  loadingSuggested,
  locationDenied,
  userLocation,
  sentRequests,
  onRefreshNearby,
  onAddFriend,
  onRequestLocation,
}: Props) {
  const hasMutual = suggestions.some((u) => (u.mutualFriends ?? 0) > 0);

  return (
    <div className="space-y-4">
      <section className="rounded-[1.75rem] overflow-hidden bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-950/40 dark:to-blue-950/30 ring-1 ring-sky-200/60 dark:ring-sky-800/40">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0A84FF] flex items-center justify-center shadow-lg shadow-[#0A84FF]/30">
              <FiMapPin className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">Tìm xung quanh</h3>
              <p className="text-xs text-zinc-500">Người dùng gần vị trí của bạn</p>
            </div>
          </div>
          {userLocation && (
            <button
              type="button"
              onClick={onRefreshNearby}
              disabled={loadingNearby}
              className="w-9 h-9 rounded-xl bg-white/80 dark:bg-zinc-900/80 flex items-center justify-center text-[#0A84FF] disabled:opacity-40"
            >
              <FiRefreshCw size={18} className={loadingNearby ? "animate-spin" : ""} />
            </button>
          )}
        </div>

        <div className="px-4 pb-4 space-y-2">
          {locationDenied && !userLocation && (
            <div className="rounded-2xl bg-white/70 dark:bg-zinc-900/70 p-4 text-center">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Cần quyền vị trí</p>
              <p className="text-xs text-zinc-500 mt-1 mb-3">Bật GPS để tìm bạn bè gần bạn</p>
              <button
                type="button"
                onClick={onRequestLocation}
                className="h-10 px-4 rounded-xl bg-[#0A84FF] text-white text-sm font-bold"
              >
                Bật vị trí
              </button>
            </div>
          )}

          {loadingNearby && (
            <div className="py-10 text-center text-zinc-500 text-sm">
              <FiRefreshCw className="animate-spin mx-auto mb-2" size={22} />
              Đang tìm người gần bạn…
            </div>
          )}

          {!loadingNearby && userLocation && nearbyUsers.length === 0 && (
            <div className="py-8 text-center text-sm text-zinc-500">
              <p className="font-semibold text-zinc-700 dark:text-zinc-300">Chưa có ai gần đây</p>
              <p className="mt-1">Thử mở rộng bộ lọc khoảng cách</p>
            </div>
          )}

          {!loadingNearby &&
            nearbyUsers.map((u) => (
              <UserRow
                key={u.uid}
                user={u}
                sentRequests={sentRequests}
                onAddFriend={onAddFriend}
                showDistance
              />
            ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/20 ring-1 ring-purple-200/50 dark:ring-purple-800/40">
        <div className="px-4 pt-4 pb-2 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
            <FiUsers className="text-white" size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-white">
              {hasMutual ? "Có thể bạn biết" : "Gợi ý kết bạn"}
            </h3>
            <p className="text-xs text-zinc-500">
              {hasMutual ? "Dựa trên bạn chung" : "Người dùng mới trên AIR"}
            </p>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-2">
          {loadingSuggested ? (
            <div className="py-10 text-center text-zinc-500 text-sm">
              <FiRefreshCw className="animate-spin mx-auto mb-2" size={22} />
              Đang tải gợi ý…
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-8 text-center text-sm text-zinc-500">
              <p className="font-semibold">Chưa có gợi ý</p>
              <p className="mt-1">Quay lại sau nhé</p>
            </div>
          ) : (
            suggestions.map((u) => (
              <UserRow key={u.uid} user={u} sentRequests={sentRequests} onAddFriend={onAddFriend} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
