"use client";
import { useState, useMemo } from "react";
import { FiSearch, FiPlus, FiUsers, FiLock, FiChevronRight, FiHash } from "react-icons/fi";
import { RiPushpinFill } from "react-icons/ri";
import Link from "next/link";
import { toast } from "sonner";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";

type ChatItem = {
  uid: string;
  chatId: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastSenderName?: string;
  updatedAt?: any;
  unreadCount?: number;
  members?: string[];
  isGroup: boolean;
  hasPassword?: boolean;
  groupCode?: string;
};

interface GroupsTabProps {
  groups: ChatItem[];
  pinned: string[];
  onTogglePin: (chatId: string) => void;
  onCreateGroup: () => void;
  loading: boolean;
}

export default function GroupsTab({
  groups,
  pinned,
  onTogglePin,
  onCreateGroup,
  loading
}: GroupsTabProps) {
  const [search, setSearch] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [finding, setFinding] = useState(false);
  const router = useRouter();
  const db = getFirebaseDB();

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  const { pinnedGroups, normalGroups } = useMemo(() => {
    const pinnedList = filteredGroups.filter(g => pinned.includes(g.chatId));
    const normalList = filteredGroups.filter(g =>!pinned.includes(g.chatId));
    return { pinnedGroups: pinnedList, normalGroups: normalList };
  }, [filteredGroups, pinned]);

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
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const handleFindByCode = async () => {
  if (searchCode.length!== 6) return toast.error("Mã nhóm phải 6 số");

  setFinding(true);
  try {
    const q = query(
      collection(db, "groups"),
      where("groupCode", "==", searchCode)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      toast.error("Không tìm thấy nhóm");
      return;
    }

    // Thêm dấu? để check undefined
    const groupId = snap.docs[0]?.id;
    if (!groupId) {
      toast.error("Không tìm thấy nhóm");
      return;
    }

    router.push(`/groups/${groupId}`);
    setSearchCode("");
  } catch (e: any) {
    console.error(e);
    toast.error("Lỗi: " + e.message);
  } finally {
    setFinding(false);
  }
};

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
            <div className="w-14 h-14 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Search + Create + Find by Code */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhóm..."
            className="w-full h-11 pl-10 pr-3.5 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-4 focus:ring-[#0a84ff]/20 focus:border-[#0a84ff]"
          />
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <FiHash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
            <input
              type="text"
              inputMode="numeric"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyPress={(e) => e.key === 'Enter' && handleFindByCode()}
              placeholder="Nhập mã 6 số"
              className="w-full h-11 pl-10 pr-3.5 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-4 focus:ring-[#0a84ff]/20 focus:border-[#0a84ff]"
              maxLength={6}
            />
          </div>
          <button
            onClick={handleFindByCode}
            disabled={finding || searchCode.length!== 6}
            className="h-11 px-5 bg-[#f2f2f7] dark:bg-zinc-800 hover:bg-black/5 dark:hover:bg-white/5 text-sm font-[600] rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            {finding? "..." : "Tìm"}
          </button>
        </div>

        <button
          onClick={onCreateGroup}
          className="w-full h-12 bg-gradient-to-r from-[#0a84ff] to-purple-500 text-white rounded-xl text-sm font-[600] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-[#0a84ff]/20"
        >
          <FiPlus size={20} strokeWidth={2.5} />
          Tạo nhóm mới
        </button>
      </div>

      {/* My Groups */}
      {filteredGroups.length === 0? (
        <div className="flex flex-col items-center px-8 text-center mt-12">
          <div className="w-20 h-20 bg-gradient-to-br from-[#0a84ff]/10 to-purple-500/10 rounded-3xl flex items-center justify-center mb-4">
            <FiUsers className="text-[#0a84ff]" size={36} strokeWidth={1.5} />
          </div>
          <h3 className="text-sm font-[700] mb-1.5">
            {search? "Không tìm thấy" : "Chưa có nhóm nào"}
          </h3>
          <p className="text-sm text-[#8e8e93] leading-5 max-w-[280px]">
            {search? "Thử tìm với từ khóa khác" : "Tạo nhóm để trò chuyện với bạn bè"}
          </p>
        </div>
      ) : (
        <div>
          {pinnedGroups.length > 0 && (
            <div className="mb-3">
              <div className="px-4 py-2">
                <p className="text-sm font-[700] text-[#8e8e93] uppercase tracking-wider">Đã ghim</p>
              </div>
              <div className="bg-white dark:bg-zinc-900">
                {pinnedGroups.map((group, idx) => (
                  <GroupItem
                    key={group.chatId}
                    group={group}
                    isPinned={true}
                    onTogglePin={onTogglePin}
                    formatTime={formatTime}
                    isLast={idx === pinnedGroups.length - 1 && normalGroups.length === 0}
                  />
                ))}
              </div>
            </div>
          )}

          {normalGroups.length > 0 && (
            <div>
              {pinnedGroups.length > 0 && (
                <div className="px-4 py-2">
                  <p className="text-sm font-[700] text-[#8e8e93] uppercase tracking-wider">
                    Nhóm của tôi ({normalGroups.length})
                  </p>
                </div>
              )}
              <div className="bg-white dark:bg-zinc-900">
                {normalGroups.map((group, idx) => (
                  <GroupItem
                    key={group.chatId}
                    group={group}
                    isPinned={false}
                    onTogglePin={onTogglePin}
                    formatTime={formatTime}
                    isLast={idx === normalGroups.length - 1}
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
  formatTime,
  isLast
}: {
  group: ChatItem;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  formatTime: (t?: any) => string;
  isLast: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors ${!isLast? 'border-b border-black/[0.06] dark:border-white/[0.06]' : ''}`}>
      <Link
        href={`/groups/${group.chatId}`}
        className="flex items-center gap-3 flex-1 min-w-0"
      >
        <div className="relative flex-shrink-0">
          <img
            src={group.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=0a84ff&color=fff&bold=true`}
            alt={group.name}
            className="w-14 h-14 rounded-2xl object-cover bg-zinc-100 dark:bg-zinc-800"
          />
          {group.unreadCount && group.unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 min-w-5 h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
              <span className="text-sm font-[700] text-white">{group.unreadCount > 99? '99+' : group.unreadCount}</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="text-sm font-[600] truncate">{group.name}</p>
              {isPinned && <RiPushpinFill size={13} className="text-[#0a84ff] flex-shrink-0" />}
              {group.hasPassword && <FiLock size={12} className="text-[#8e8e93] flex-shrink-0" />}
            </div>
            <span className="text-sm text-[#8e8e93] flex-shrink-0 tabular-nums">{formatTime(group.updatedAt)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-[#8e8e93] truncate flex-1">
              {group.lastSenderName && group.lastSenderName!== "Bạn"? `${group.lastSenderName}: ` : ""}
              {group.lastMessage || "Chưa có tin nhắn"}
            </p>
            <span className="text-sm text-[#8e8e93] flex items-center gap-1 flex-shrink-0">
              <FiUsers size={11} />
              {group.members?.length || 0}
            </span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTogglePin(group.chatId);
            if ("vibrate" in navigator) navigator.vibrate(10);
          }}
          className="w-8 h-8 flex items-center justify-center active:bg-black/5 dark:active:bg-white/5 rounded-lg transition-colors"
        >
          <RiPushpinFill
            size={18}
            className={isPinned? 'text-[#0a84ff]' : 'text-[#8e8e93]'}
          />
        </button>
        <FiChevronRight size={16} className="text-[#8e8e93]" />
      </div>
    </div>
  );
}