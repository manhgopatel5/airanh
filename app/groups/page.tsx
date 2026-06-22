"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import GroupsTab from "@/components/GroupsTab";
import CreateGroupModal from "@/components/CreateGroupModal";
import { FiUsers, FiSearch, FiHash } from "react-icons/fi";
import { RiAddLine, RiPushpinFill } from "react-icons/ri";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { toast } from "sonner";

type ChatItem = {
  uid: string;
  chatId: string;
  name: string;
  username: string;
  avatar: string;
  userId: string;
  lastMessage?: string;
  lastSenderId?: string;
  lastSenderName?: string;
  updatedAt?: any;
  isOnline?: boolean;
  unreadCount?: number;
  isTyping?: boolean;
  isGroup: boolean;
  members?: string[];
  hasPassword?: boolean;
  groupCode?: string;
  createdAt?: any;
};

const PINNED_KEY = "pinned_chats";

export default function GroupsPage() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();

  const [groupItems, setGroupItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [pinned, setPinned] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [searchCode, setSearchCode] = useState("");
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const pinnedData = localStorage.getItem(PINNED_KEY);
      if (pinnedData) setPinned(JSON.parse(pinnedData));
    } catch (e) {}
  }, []);

  const savePinned = (values: string[]) => {
    setPinned(values);
    localStorage.setItem(PINNED_KEY, JSON.stringify(values));
    if ("vibrate" in navigator) navigator.vibrate(10);
  };

  const handleTogglePin = (chatId: string) => {
    const newPinned = pinned.includes(chatId)
   ? pinned.filter(id => id!== chatId)
      : [...pinned, chatId];
    savePinned(newPinned);
    toast.success(newPinned.includes(chatId)? "Đã ghim nhóm" : "Đã bỏ ghim");
  };

  useEffect(() => {
    if (authLoading ||!user?.uid) return;

    // Bỏ orderBy để tránh lỗi index - sort bằng JS
    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: ChatItem[] = snap.docs.map(d => {
        const data = d.data();
        return {
          uid: d.id,
          chatId: d.id,
          name: data.name || "Nhóm",
          username: "",
          avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=0a84ff&color=fff&bold=true`,
          userId: "",
          lastMessage: data.lastMessage || "",
          lastSenderId: data.lastSenderId || "",
          lastSenderName: data.lastSenderName || "",
          updatedAt: data.updatedAt,
          unreadCount: data.unreadCount?.[user.uid] || 0,
          isGroup: true,
          members: data.members || [],
          hasPassword: data.hasPassword || false,
          groupCode: data.groupCode || "",
          createdAt: data.createdAt,
        };
      });

      // Sort JS thay vì orderBy Firestore
      list.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setGroupItems(list);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Groups error:", err);
      setError("Không thể tải danh sách nhóm");
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid, authLoading, db]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groupItems;
    return groupItems.filter(g =>
      g.name.toLowerCase().includes(q) ||
      g.groupCode?.includes(q)
    );
  }, [groupItems, search]);

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

      const groupId = snap.docs[0]?.id;
      const groupData = snap.docs[0]?.data();
      if (!groupId ||!groupData?.members?.includes(user?.uid)) {
        toast.error("Bạn không phải thành viên nhóm này");
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

  const totalUnread = useMemo(() =>
    groupItems.reduce((sum, g) => sum + (g.unreadCount || 0), 0),
    [groupItems]
  );

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-black">
      <div className="px-4 pt-4 pb-3 space-y-3">
        {/* Error banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-3.5 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-[700]">!</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhóm theo tên hoặc mã..."
            className="w-full h-11 pl-10 pr-3.5 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 rounded-xl text-sm outline-none focus:ring-4 focus:ring-[#0a84ff]/20 focus:border-[#0a84ff]"
          />
        </div>

        {/* Find by Code */}
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

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <FiUsers className="text-[#0a84ff]" size={16} />
              <span className="text-sm text-[#8e8e93]">Nhóm</span>
            </div>
            <p className="text-xl font-[700] tracking-tight">{groupItems.length}</p>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 rounded-2xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <RiPushpinFill className="text-purple-500" size={16} />
              <span className="text-sm text-[#8e8e93]">Chưa đọc</span>
            </div>
            <p className="text-xl font-[700] tracking-tight">{totalUnread}</p>
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={() => setShowCreateGroup(true)}
          className="w-full h-12 bg-gradient-to-r from-[#0a84ff] to-purple-500 text-white rounded-xl text-sm font-[600] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg shadow-[#0a84ff]/20"
        >
          <RiAddLine size={22} strokeWidth={2.5} />
          Tạo nhóm mới
        </button>
      </div>

      <GroupsTab
        groups={filteredGroups}
        pinned={pinned}
        onTogglePin={handleTogglePin}
        onCreateGroup={() => setShowCreateGroup(true)}
        loading={loading}
      />

      <CreateGroupModal
        open={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={(groupId) => {
          router.push(`/groups/${groupId}`);
          setShowCreateGroup(false);
        }}
      />
    </div>
  );
}