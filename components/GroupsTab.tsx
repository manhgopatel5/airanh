"use client";
import { useState, useMemo } from "react";
import { FiSearch, FiPlus, FiUsers, FiLoader, FiTrendingUp, FiLock, FiCheck, FiChevronRight } from "react-icons/fi";
import { RiPushpinFill, RiCompass3Line } from "react-icons/ri";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { getFirebaseDB } from "@/lib/firebase";
import { doc, setDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

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
};

type PublicRoomItem = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  memberCount: number;
  onlineCount: number;
  isJoined: boolean;
  isHot: boolean;
};

interface GroupsTabProps {
  groups: ChatItem[];
  publicRooms: PublicRoomItem[];
  publicRoomsLoading: boolean;
  pinned: string[];
  onTogglePin: (chatId: string) => void;
  onCreateGroup: () => void;
  loading: boolean;
  userVip: { tier: 'free' | 'pro' | 'elite' } | null;
}

export default function GroupsTab({
  groups,
  publicRooms,
  publicRoomsLoading,
  pinned,
  onTogglePin,
  onCreateGroup,
  loading,
  userVip
}: GroupsTabProps) {
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();
  const [search, setSearch] = useState("");
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);

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
    return `${Math.floor(hours / 24)}d`;
  };

  const handleJoinPublicRoom = async (room: PublicRoomItem) => {
    if (!user?.uid) return toast.error("Vui lòng đăng nhập");
    if (room.isJoined) return router.push(`/rooms/${room.id}`);
    setJoiningRoom(room.id);
    try {
      const roomRef = doc(db, "chats", room.id);
      await setDoc(roomRef, {
        members: arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success(`Đã vào ${room.name}`, { icon: room.emoji });
      router.push(`/rooms/${room.id}`);
    } catch (e: any) {
      toast.error("Lỗi: " + e.message);
    } finally {
      setJoiningRoom(null);
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
    <div className="pb-24">
      {/* Search + Create */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhóm..."
            className="w-full h-11 pl-10 pr-3.5 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl text-[15px] outline-none focus:ring-4 focus:ring-[#0a84ff]/20 focus:border-[#0a84ff]"
          />
        </div>

        <button
          onClick={onCreateGroup}
          className="w-full h-12 bg-gradient-to-r from-[#0a84ff] to-purple-500 text-white rounded-xl text-[15px] font-[600] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-[#0a84ff]/20"
        >
          <FiPlus size={20} strokeWidth={2.5} />
          Tạo nhóm mới
        </button>
      </div>

      {/* Public Rooms */}
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-[13px] font-[700] flex items-center gap-1.5 text-[#8e8e93] uppercase tracking-wider">
            <RiCompass3Line size={16} />
            Khám phá
          </h3>
        </div>
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
          {publicRoomsLoading? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-32 h-32 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
            ))
          ) : publicRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleJoinPublicRoom(room)}
              disabled={joiningRoom === room.id}
              className="flex-shrink-0 w-32 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-black/5 dark:border-white/5 overflow-hidden active:scale-[0.98] transition-transform"
            >
              <div className={`relative h-20 bg-gradient-to-br ${room.color} flex items-center justify-center`}>
                <span className="text-4xl drop-shadow-lg">{room.emoji}</span>
                {room.isHot && (
                  <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-red-500 rounded-md flex items-center gap-0.5">
                    <FiTrendingUp size={10} className="text-white" />
                    <span className="text-[10px] font-[800] text-white">HOT</span>
                  </div>
                )}
                {room.isJoined && (
                  <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                    <FiCheck className="text-white" size={12} strokeWidth={3} />
                  </div>
                )}
                {joiningRoom === room.id && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <FiLoader className="animate-spin text-white" size={20} />
                  </div>
                )}
              </div>
              <div className="p-2.5">
                <h4 className="text-[13px] font-[700] mb-1 truncate">{room.name}</h4>
                <div className="flex items-center justify-between text-[11px] text-[#8e8e93]">
                  <span className="flex items-center gap-1">
                    <FiUsers size={10} />
                    {room.memberCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    {room.onlineCount}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* My Groups */}
      {filteredGroups.length === 0? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#0a84ff]/10 to-purple-500/10 rounded-3xl flex items-center justify-center mb-4">
            <FiUsers className="text-[#0a84ff]" size={36} strokeWidth={1.5} />
          </div>
          <h3 className="text-[18px] font-[700] mb-1.5">Chưa có nhóm nào</h3>
          <p className="text-[14px] text-[#8e8e93] leading-5 max-w-[280px]">
            {search? "Thử tìm với từ khóa khác" : "Tạo nhóm để trò chuyện với bạn bè"}
          </p>
        </div>
      ) : (
        <div>
          {pinnedGroups.length > 0 && (
            <div className="mb-3">
              <div className="px-4 py-2">
                <p className="text-[11px] font-[700] text-[#8e8e93] uppercase tracking-wider">Đã ghim</p>
              </div>
              <div className="bg-white dark:bg-zinc-900">
                {pinnedGroups.map((group, idx) => (
                  <GroupItem
                    key={group.chatId}
                    group={group}
                    isPinned={true}
                    onTogglePin={onTogglePin}
                    formatTime={formatTime}
                    userVip={userVip}
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
                  <p className="text-[11px] font-[700] text-[#8e8e93] uppercase tracking-wider">Nhóm của tôi</p>
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
                    userVip={userVip}
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
  userVip,
  isLast
}: {
  group: ChatItem;
  isPinned: boolean;
  onTogglePin: (id: string) => void;
  formatTime: (t?: any) => string;
  userVip: { tier: 'free' | 'pro' | 'elite' } | null;
  isLast: boolean;
}) {
  return (
  <div className={`flex items-center gap-3 px-4 py-3 active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors ${!isLast? 'border-b border-black/[0.06] dark:border-white/[0.06]' : ''}`}>
  <Link
    href={`/rooms/${group.chatId}`}
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
          <span className="text-[11px] font-[700] text-white">{group.unreadCount > 99? '99+' : group.unreadCount}</span>
        </div>
      )}
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[16px] font-[600] truncate">{group.name}</p>
          {isPinned && <RiPushpinFill size={13} className="text-[#0a84ff] flex-shrink-0" />}
          <FiLock size={12} className="text-[#8e8e93] flex-shrink-0" />
        </div>
        <span className="text-[13px] text-[#8e8e93] flex-shrink-0 tabular-nums">{formatTime(group.updatedAt)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <p className="text-[14px] text-[#8e8e93] truncate flex-1">
          {group.lastSenderName && group.lastSenderName!== "Bạn"? `${group.lastSenderName}: ` : ""}
          {group.lastMessage || "Chưa có tin nhắn"}
        </p>
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