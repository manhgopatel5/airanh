"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import GroupsTab from "@/components/GroupsTab";
import CreateGroupModal from "@/components/CreateGroupModal";
import { FiUsers, FiSearch } from "react-icons/fi";
import { RiAddLine } from "react-icons/ri";
import { collection, query, where, onSnapshot } from "firebase/firestore";
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
        };
      });
      setGroupItems(list);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid, authLoading, db]);

  const filteredGroups = groupItems.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-[100dvh] bg-[#F7F8FA] dark:bg-[#0A0B] font-serif">
      <div className="px-5 pt-4 pb-3">
        <div className="relative mb-4">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={20} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhóm..."
            className="w-full h-11 pl-12 pr-4 bg-[#F2F7] dark:bg-zinc-800 rounded-xl text-base outline-none border-black/[0.04] dark:border-white/[0.06] focus:ring-2 focus:ring-[#007AFF]/20"
          />
        </div>

        <button
          onClick={() => setShowCreateGroup(true)}
          className="w-full h-12 bg-gradient-to-r from-[#0a84ff] to-purple-500 text-white rounded-xl text-base font-[600] flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <RiAddLine size={22} /> Tạo nhóm mới
        </button>
      </div>

      <div className="px-5 pt-2 pb-24">
        <GroupsTab
          groups={filteredGroups}
          pinned={pinned}
          onTogglePin={handleTogglePin}
          onCreateGroup={() => setShowCreateGroup(true)}
          loading={loading}
        />
      </div>

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