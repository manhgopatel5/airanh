"use client";

import { memo } from "react";
import { FiArrowLeft, FiMoreVertical, FiUsers } from "react-icons/fi";

export type RoomHeaderData = {
  name: string;
  emoji: string;
  color: string;
  imageUrl?: string;
  tag?: string;
  tagColor?: string;
  desc?: string;
  memberCount: number;
  onlineCount: number;
};

type Props = {
  room: RoomHeaderData;
  accent: string;
  showMenu: boolean;
  onBack: () => void;
  onToggleMenu: () => void;
  onOpenMembers: () => void;
  onMenuSelect: (action: "search" | "invite" | "poll" | "members") => void;
};

function RoomChatHeader({
  room,
  accent,
  showMenu,
  onBack,
  onToggleMenu,
  onOpenMembers,
  onMenuSelect,
}: Props) {
  return (
    <header className="relative z-50 shrink-0 border-b border-zinc-200/80 bg-white pt-[env(safe-area-inset-top)] dark:border-zinc-800 dark:bg-white">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-900 active:bg-zinc-100"
        >
          <FiArrowLeft size={22} />
        </button>

        <button
          type="button"
          onClick={onOpenMembers}
          className="flex min-w-0 flex-1 items-center gap-3 text-left active:opacity-80"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl ring-2 ring-zinc-100 shadow-sm">
            {room.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={room.imageUrl} alt={room.name} className="h-full w-full object-cover" />
            ) : (
              <div
                className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${room.color} text-xl`}
              >
                {room.emoji}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[17px] font-bold leading-5 text-zinc-900">{room.name}</h1>
              {room.tag && (
                <span
                  className={`shrink-0 rounded-md bg-gradient-to-r ${room.tagColor || "from-zinc-400 to-zinc-500"} px-1.5 py-0.5 text-[9px] font-extrabold text-white`}
                >
                  {room.tag}
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-zinc-500">
              <FiUsers size={11} />
              <span>{room.memberCount} thành viên</span>
              {room.onlineCount > 0 && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ backgroundColor: accent }}
                    />
                    {room.onlineCount} online
                  </span>
                </>
              )}
            </p>
            {room.desc && (
              <p className="mt-0.5 truncate text-[11px] text-zinc-400">{room.desc}</p>
            )}
          </div>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={onToggleMenu}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 active:bg-zinc-100"
          >
            <FiMoreVertical size={20} />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-[9998]" onClick={onToggleMenu} />
              <div className="absolute right-0 top-full z-[9999] mt-1 w-52 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
                {(
                  [
                    { id: "search" as const, label: "Tìm tin nhắn" },
                    { id: "invite" as const, label: "Mời bạn bè" },
                    { id: "poll" as const, label: "Tạo bình chọn" },
                    { id: "members" as const, label: "Thành viên" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onToggleMenu();
                      onMenuSelect(item.id);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-zinc-900 active:bg-zinc-50"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default memo(RoomChatHeader);
