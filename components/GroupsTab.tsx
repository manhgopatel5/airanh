"use client";
import { FiUsers, FiSearch, FiPlus, FiHash, FiLock, FiChevronRight } from "react-icons/fi";
import { RiPushpinFill } from "react-icons/ri";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type ChatItem = {
  chatId: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastSenderName?: string;
  updatedAt?: any;
  unreadCount?: number;
  members?: string[];
  hasPassword?: boolean;
};

interface GroupsTabProps {
  groups: ChatItem[];
  pinned: string[];
  onTogglePin: (chatId: string) => void;
  onCreateGroup: () => void;
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
}

export default function GroupsTab({
  groups,
  pinned,
  onTogglePin,
  onCreateGroup,
  loading,
  search,
  setSearch
}: GroupsTabProps) {
  const formatTime = (timestamp?: any): string => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins}p`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return format(date, "dd/MM", { locale: vi });
  };

  const { pinnedGroups, normalGroups } = useMemo(() => {
    const pinnedList = groups.filter(g => pinned.includes(g.chatId));
    const normalList = groups.filter(g =>!pinned.includes(g.chatId));
    return { pinnedGroups: pinnedList, normalGroups: normalList };
  }, [groups, pinned]);

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
            <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/5" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-3/5" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="px-4 pt-4 pb-3">
        <div className="relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhóm..."
            className="w-full h-11 pl-11 pr-4 bg-[#F2F7] dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl text-[15px] outline-none focus:ring-4 focus:ring-[#0a84ff]/20 focus:border-[#0a84ff]"
          />
        </div>
      </div>

      {/* Stats cards - giống trang Bạn bè */}
      <div className="px-4 grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <FiUsers className="text-[#0a84ff]" size={16} />
            <span className="text-[13px] text-[#8e8e93]">Nhóm</span>
          </div>
          <p className="text-[22px] font-[700] tracking-tight">{groups.length}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <RiPushpinFill className="text-purple-500" size={16} />
            <span className="text-[13px] text-[#8e8e93]">Đã ghim</span>
          </div>
          <p className="text-[22px] font-[700] tracking-tight">{pinned.length}</p>
        </div>
      </div>

      {/* Empty state */}
      {groups.length === 0? (
        <div className="mx-4 bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-[#0a84ff]/10 to-purple-500/10 rounded-2xl flex items-center justify-center mb-4">
              <FiUsers className="text-[#0a84ff]" size={32} strokeWidth={1.5} />
            </div>
            <h3 className="text-[17px] font-[600] mb-1.5">
              {search? "Không tìm thấy" : "Chưa có nhóm nào"}
            </h3>
            <p className="text-[15px] text-[#8e8e93] leading-[20px] mb-5 max-w-[260px]">
              {search? "Thử tìm với từ khóa khác" : "Tạo nhóm để trò chuyện với bạn bè"}
            </p>
            {!search && (
              <button
                onClick={onCreateGroup}
                className="h-11 px-6 bg-gradient-to-r from-[#0a84ff] to-purple-500 text-white rounded-xl text-[15px] font-[600] flex items-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-[#0a84ff]/20"
              >
                <FiPlus size={20} strokeWidth={2.5} />
                Tạo nhóm mới
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900">
          {/* Pinned groups */}
          {pinnedGroups.length > 0 && (
            <div>
              <div className="px-4 py-2">
                <p className="text-[12px] font-[600] text-[#8e8e93] uppercase tracking-wider">Đã ghim</p>
              </div>
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {pinnedGroups.map((group) => (
                  <GroupItem
                    key={group.chatId}
                    group={group}
                    isPinned={true}
                    onTogglePin={onTogglePin}
                    formatTime={formatTime}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Normal groups */}
          {normalGroups.length > 0 && (
            <div>
              {pinnedGroups.length > 0 && (
                <div className="px-4 py-2">
                  <p className="text-[12px] font-[600] text-[#8e8e93] uppercase tracking-wider">
                    Nhóm của tôi ({normalGroups.length})
                  </p>
                </div>
              )}
              <div className="divide-y divide-black/[0.06] dark:divide-white/[0.06]">
                {normalGroups.map((group) => (
                  <GroupItem
                    key={group.chatId}
                    group={group}
                    isPinned={false}
                    onTogglePin={onTogglePin}
                    formatTime={formatTime}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GroupItem({
  group,
  isPinned,
  onTogglePin,
  formatTime
}: {
  group: ChatItem;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  formatTime: (t?: any) => string;
}) {
  return (
    <div className="group relative">
      <Link
        href={`/groups/${group.chatId}`}
        className="flex items-center gap-3 px-4 py-3 active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors"
      >
        <div className="relative flex-shrink-0">
          <img
            src={group.avatar}
            alt={group.name}
            className="w-14 h-14 rounded-2xl object-cover bg-zinc-100 dark:bg-zinc-800"
          />
          {group.unreadCount && group.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
              <span className="text-[10px] font-[700] text-white">
                {group.unreadCount > 99? "99+" : group.unreadCount}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-baseline justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-[16px] leading-[22px] font-[600] truncate">{group.name}</p>
              {isPinned && <RiPushpinFill size={14} className="text-[#0a84ff] flex-shrink-0" />}
              {group.hasPassword && <FiLock size={12} className="text-[#8e8e93] flex-shrink-0" />}
            </div>
            <span className="text-[13px] leading-[18px] text-[#8e8e93] flex-shrink-0 tabular-nums">
              {formatTime(group.updatedAt)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] leading-[20px] text-[#8e8e93] truncate flex-1">
              {group.lastSenderName && group.lastSenderName!== "Bạn"? `${group.lastSenderName}: ` : ""}
              {group.lastMessage || "Chưa có tin nhắn"}
            </p>
            <span className="text-[13px] text-[#8e8e93] flex items-center gap-1 flex-shrink-0">
              <FiUsers size={12} />
              {group.members?.length || 0}
            </span>
          </div>
        </div>
      </Link>

      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin(group.chatId);
            if ("vibrate" in navigator) navigator.vibrate(10);
          }}
          className="w-8 h-8 flex items-center justify-center bg-white dark:bg-zinc-800 rounded-lg shadow-md active:scale-95 transition-all"
        >
          <RiPushpinFill size={16} className={isPinned? 'text-[#0a84ff]' : 'text-[#8e8e93]'} />
        </button>
      </div>
    </div>
  );
}