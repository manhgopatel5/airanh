"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import GroupsTab from "@/components/GroupsTab";
import CreateGroupModal from "@/components/CreateGroupModal";
import { FiUsers, FiSearch, FiHash, FiArrowLeft, FiLock } from "react-icons/fi";
import { RiAddLine, RiPushpinFill } from "react-icons/ri";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { toast } from "sonner";
import { joinGroupByCode } from "@/lib/joinGroup";

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
  const [joinPassword, setJoinPassword] = useState("");
  const [showJoinPassword, setShowJoinPassword] = useState(false);
  const [pendingGroupCode, setPendingGroupCode] = useState("");
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const pinnedData = localStorage.getItem(PINNED_KEY);
      if (pinnedData) setPinned(JSON.parse(pinnedData));
    } catch {}
  }, []);

  const savePinned = (values: string[]) => {
    setPinned(values);
    localStorage.setItem(PINNED_KEY, JSON.stringify(values));
    if ("vibrate" in navigator) navigator.vibrate(10);
  };

  const handleTogglePin = (chatId: string) => {
    const newPinned = pinned.includes(chatId)
      ? pinned.filter((id) => id !== chatId)
      : [...pinned, chatId];
    savePinned(newPinned);
    toast.success(newPinned.includes(chatId) ? "Đã ghim nhóm" : "Đã bỏ ghim");
  };

  useEffect(() => {
    if (authLoading || !user?.uid) return;

    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ChatItem[] = snap.docs.map((d) => {
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

        list.sort((a, b) => {
          const timeA = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
          const timeB = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });

        setGroupItems(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Groups error:", err);
        setError("Không thể tải danh sách nhóm");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid, authLoading, db]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return groupItems;
    return groupItems.filter(
      (g) => g.name.toLowerCase().includes(q) || g.groupCode?.includes(q)
    );
  }, [groupItems, search]);

  const attemptJoin = async (code: string, password = "") => {
    if (!user?.uid) {
      toast.error("Vui lòng đăng nhập");
      router.push("/login");
      return;
    }

    setFinding(true);
    try {
      const result = await joinGroupByCode(code, password, user.uid);
      toast.success(`Đã tham gia ${result.groupName}`);
      setSearchCode("");
      setJoinPassword("");
      setShowJoinPassword(false);
      setPendingGroupCode("");
      router.push(`/groups/${result.groupId}`);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Không thể tham gia nhóm";
      if (message.includes("mật khẩu")) {
        setPendingGroupCode(code);
        setShowJoinPassword(true);
        return;
      }
      toast.error(message);
    } finally {
      setFinding(false);
    }
  };

  const handleFindByCode = async () => {
    if (searchCode.length !== 6) return toast.error("Mã nhóm phải 6 số");

    setFinding(true);
    try {
      const q = query(collection(db, "groups"), where("groupCode", "==", searchCode));
      const snap = await getDocs(q);

      if (snap.empty) {
        toast.error("Không tìm thấy nhóm");
        return;
      }

      const groupId = snap.docs[0]?.id;
      const groupData = snap.docs[0]?.data();
      if (!groupId || !groupData) return;

      if (groupData.members?.includes(user?.uid)) {
        router.push(`/groups/${groupId}`);
        setSearchCode("");
        return;
      }

      if (groupData.hasPassword) {
        setPendingGroupCode(searchCode);
        setShowJoinPassword(true);
        return;
      }

      await attemptJoin(searchCode);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Lỗi";
      toast.error(message);
    } finally {
      setFinding(false);
    }
  };

  const totalUnread = useMemo(
    () => groupItems.reduce((sum, g) => sum + (g.unreadCount || 0), 0),
    [groupItems]
  );

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB]">
      <div className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-3 px-4">
          <button type="button" onClick={() => router.back()} className="-ml-2 flex h-8 w-8 items-center justify-center active:opacity-60">
            <FiArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold">Nhóm của tôi</h1>
            <p className="text-xs text-zinc-500">{groupItems.length} nhóm · {totalUnread} chưa đọc</p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="inline-flex h-9 items-center gap-1 rounded-full bg-[#0a84ff] px-3 text-sm font-semibold text-white active:scale-95"
          >
            <RiAddLine size={18} />
            Tạo
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 pb-3 space-y-3">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">!</span>
            </div>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="relative">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhóm theo tên hoặc mã..."
            className="w-full h-11 pl-10 pr-3.5 bg-white border border-zinc-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-[#0a84ff]/15 focus:border-[#0a84ff]"
          />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">Tham gia bằng mã</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FiHash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                type="text"
                inputMode="numeric"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => e.key === "Enter" && handleFindByCode()}
                placeholder="Nhập mã 6 số"
                className="w-full h-11 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none focus:border-[#0a84ff]"
                maxLength={6}
              />
            </div>
            <button
              onClick={handleFindByCode}
              disabled={finding || searchCode.length !== 6}
              className="h-11 px-5 bg-[#0a84ff] text-white text-sm font-semibold rounded-xl disabled:opacity-50 active:scale-[0.98]"
            >
              {finding ? "..." : "Vào"}
            </button>
          </div>

          {showJoinPassword && (
            <div className="flex gap-2 pt-1">
              <div className="relative flex-1">
                <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="password"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                  placeholder="Mật khẩu nhóm"
                  className="w-full h-11 pl-10 pr-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm outline-none"
                />
              </div>
              <button
                onClick={() => attemptJoin(pendingGroupCode || searchCode, joinPassword)}
                disabled={finding || !joinPassword}
                className="h-11 px-4 bg-zinc-900 text-white text-sm font-semibold rounded-xl disabled:opacity-50"
              >
                Xác nhận
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <FiUsers className="text-[#0a84ff]" size={16} />
              <span className="text-sm text-zinc-500">Nhóm</span>
            </div>
            <p className="text-xl font-bold tracking-tight">{groupItems.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <RiPushpinFill className="text-purple-500" size={16} />
              <span className="text-sm text-zinc-500">Chưa đọc</span>
            </div>
            <p className="text-xl font-bold tracking-tight">{totalUnread}</p>
          </div>
        </div>
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
