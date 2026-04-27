"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  getDocs,
  limit,
  orderBy,
  updateDoc,
  arrayRemove,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import {
  FiSearch,
  FiMessageSquare,
  FiUserPlus,
  FiX,
  FiLoader,
  FiUsers,
  FiBellOff,
  FiTrash2,
} from "react-icons/fi";
import { IoSparkles } from "react-icons/io5";
import { RiAddLine, RiPushpinLine, RiPushpinFill } from "react-icons/ri";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";

// Kiểu dữ liệu cho 1 item trong list (1-1 hoặc nhóm)
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
  updatedAt?: Timestamp;
  isOnline?: boolean;
  unreadCount?: number;
  isTyping?: boolean;
  isGroup: boolean;
  members?: string[];
};

export default function ChatClient() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();

  // State chính
  const [items, setItems] = useState<ChatItem[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "group">("all");

  // Ghim / tắt thông báo (lưu local)
  const [pinned, setPinned] = useState<string[]>([]);
  const [muted, setMuted] = useState<string[]>([]);

  // Modal tạo mới
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"friend" | "group">("friend");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Load pinned/muted
  useEffect(() => {
    setPinned(JSON.parse(localStorage.getItem("pinned_chats") || "[]"));
    setMuted(JSON.parse(localStorage.getItem("muted_chats") || "[]"));
  }, []);

  const savePinned = (v: string[]) => {
    setPinned(v);
    localStorage.setItem("pinned_chats", JSON.stringify(v));
  };

  const saveMuted = (v: string[]) => {
    setMuted(v);
    localStorage.setItem("muted_chats", JSON.stringify(v));
  };

  // REALTIME: nghe tất cả chats (1-1 và nhóm)
  useEffect(() => {
    if (authLoading ||!user?.uid) return;

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      setLoading(true);
      try {
        const raws: any[] = [];
        const needUsers = new Set<string>();

        snap.forEach((d) => {
          const c = d.data();
          if (c.isGroup) {
            raws.push({ type: "group", id: d.id, c });
          } else {
            const other = c.members.find((m: string) => m!== user.uid);
            if (other) needUsers.add(other);
            raws.push({ type: "1-1", id: d.id, other, c });
          }
        });

        // Lấy thông tin user cho chat 1-1
        const usersMap: Record<string, any> = {};
        if (needUsers.size > 0) {
          const ids = Array.from(needUsers);
          const chunks: string[][] = [];
          for (let i = 0; i < ids.length; i += 10) {
            chunks.push(ids.slice(i, i + 10));
          }
          const results = await Promise.all(
            chunks.map((ch) =>
              Promise.all(ch.map((id) => getDoc(doc(db, "users", id))))
            )
          );
          results.flat().forEach((s) => {
            if (s.exists()) usersMap[s.id] = s.data();
          });
        }

        const list: ChatItem[] = raws.map((r) => {
          if (r.type === "group") {
            const c = r.c;
            return {
              uid: r.id,
              chatId: r.id,
              name: c.groupName || "Nhóm",
              username: "",
              avatar:
                c.groupAvatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  c.groupName || "N"
                )}&background=6366f1&color=fff`,
              userId: "",
              lastMessage: c.lastMessage,
              lastSenderId: c.lastSenderId,
              lastSenderName: c.lastSenderName,
              updatedAt: c.updatedAt,
              unreadCount: c.unread?.[user.uid] || 0,
              isTyping: Object.entries(c.typing || {}).some(
                ([k, v]) => k!== user.uid && v
              ),
              isGroup: true,
              members: c.members,
              isOnline: false,
            };
          } else {
            const u = usersMap[r.other] || {};
            const c = r.c;
            return {
              uid: r.other,
              chatId: r.id,
              name: u.name || "User",
              username: u.username || "",
              avatar:
                u.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  u.name || "User"
                )}&background=random`,
              userId: u.userId || "",
              lastMessage: c.lastMessage,
              lastSenderId: c.lastSenderId,
              lastSenderName: "",
              updatedAt: c.updatedAt,
              isOnline: u.isOnline || false,
              unreadCount: c.unread?.[user.uid] || 0,
              isTyping: c.typing?.[r.other] || false,
              isGroup: false,
            };
          }
        });

        // Sắp xếp: ghim lên đầu
        const pins = JSON.parse(localStorage.getItem("pinned_chats") || "[]");
        list.sort((a, b) => {
          const ap = pins.includes(a.chatId)? 1 : 0;
          const bp = pins.includes(b.chatId)? 1 : 0;
          if (ap!== bp) return bp - ap;
          return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
        });

        setItems(list);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [user?.uid, authLoading, db]);

  // Thêm bạn bè (giữ nguyên logic cũ của bạn)
  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const auth = getAuth();
    await auth.authStateReady();
    const me = auth.currentUser;
    if (!me?.uid) return toast.error("Chưa đăng nhập");

    const kw = search.trim();
    if (!kw) return;
    setAdding(true);

    try {
      let target: string | null = null;
      const up = kw.toUpperCase();
      const low = kw.toLowerCase();

      const a = await getDoc(doc(db, "userIds", up));
      if (a.exists()) target = a.data().uid;

      if (!target) {
        const b = await getDoc(doc(db, "usernames", low));
        if (b.exists()) target = b.data().uid;
      }

      if (!target) {
        const s = await getDocs(
          query(
            collection(db, "users"),
            where("searchKeywords", "array-contains", low),
            limit(1)
          )
        );
        if (!s.empty) target = s.docs[0].id;
      }

      if (!target) return toast.error(`Không tìm thấy: ${kw}`);
      if (target === me.uid) return toast.error("Không thể thêm chính mình");

      const chatId = [me.uid, target].sort().join("_");
      const fr = doc(db, "friends", `${me.uid}_${target}`);

      if (!(await getDoc(fr)).exists()) {
        await setDoc(fr, {
          userId: me.uid,
          friendId: target,
          createdAt: new Date(),
        });
        await setDoc(
          doc(db, "chats", chatId),
          {
            members: [me.uid, target],
            isGroup: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          { merge: true }
        );
        toast.success("Đã thêm bạn bè");
      }

      router.push(`/chat/${chatId}`);
      setSearch("");
      setShowAdd(false);
    } catch (e: any) {
      toast.error(`Lỗi: ${e.code || e.message}`);
    } finally {
      setAdding(false);
    }
  };

  // Tạo nhóm mới
  const createGroup = async () => {
    if (!user) return;
    if (!groupName.trim()) return toast.error("Nhập tên nhóm");
    if (selected.length < 2) return toast.error("Chọn ít nhất 2 bạn");

    setAdding(true);
    try {
      const ref = doc(collection(db, "chats"));
      await setDoc(ref, {
        members: [user.uid,...selected],
        isGroup: true,
        groupName: groupName.trim(),
        admins: [user.uid],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: `${user.displayName || "Bạn"} đã tạo nhóm`,
        lastSenderName: "Hệ thống",
      });
      toast.success("Đã tạo nhóm");
      router.push(`/chat/${ref.id}`);
      setShowAdd(false);
      setGroupName("");
      setSelected([]);
    } finally {
      setAdding(false);
    }
  };

  const togglePin = (id: string) => {
    const v = pinned.includes(id)? pinned.filter((x) => x!== id) : [...pinned, id];
    savePinned(v);
  };

  const toggleMute = (id: string) => {
    const v = muted.includes(id)? muted.filter((x) => x!== id) : [...muted, id];
    saveMuted(v);
  };

  const handleDelete = async (c: ChatItem) => {
    if (!user) return;
    if (c.isGroup) {
      if (!confirm(`Rời nhóm "${c.name}"?`)) return;
      await updateDoc(doc(db, "chats", c.chatId), {
        members: arrayRemove(user.uid),
      });
    } else {
      await deleteDoc(doc(db, "friends", `${user.uid}_${c.uid}`));
    }
    toast.success("Đã xoá");
  };

  const formatTime = (t?: Timestamp) => {
    if (!t?.toDate) return "";
    const d = t.toDate();
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Hôm qua";
    return formatDistanceToNow(d, { addSuffix: true, locale: vi }).replace(
      "khoảng ",
      ""
    );
  };

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase();
    return items.filter((f) => {
      const match =
       !q ||
        f.name.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q) ||
        f.userId.toLowerCase().includes(q);
      if (!match) return false;
      if (activeTab === "unread") return (f.unreadCount || 0) > 0;
      if (activeTab === "group") return f.isGroup;
      return true;
    });
  }, [items, debounced, activeTab]);

  const friendsForPicker = useMemo(
    () => items.filter((i) =>!i.isGroup),
    [items]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white dark:from-black dark:to-zinc-950">
        <FiLoader className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-black dark:via-zinc-950 dark:to-blue-950/10">
        {/* Header giữ nguyên style gốc */}
        <div className="sticky top-0 z-30 backdrop-blur-3xl bg-white/80 dark:bg-zinc-950/80 border-b border-gray-200/30 dark:border-zinc-800/30 shadow-sm shadow-gray-900/5">
          <div className="px-5 pt-8 pb-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text- font-black tracking-tight bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
                  Tin nhắn
                </h1>
                <p className="text-sm font-medium text-gray-500 dark:text-zinc-500 mt-0.5">
                  {items.length} cuộc trò chuyện
                </p>
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/40 active:scale-90 transition-all"
              >
                <RiAddLine className="text-white" size={24} />
              </button>
            </div>

            <form onSubmit={handleSearch} className="relative group">
              <div
                className={`absolute -inset- bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl blur-lg transition-opacity duration-500 ${
                  focused? "opacity-40" : "opacity-0"
                }`}
              />
              <div className="relative flex items-center h-14 bg-gray-100/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl border-[2.5px] border-transparent focus-within:border-blue-500/40 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all duration-300 shadow-lg shadow-gray-900/5">
                <FiSearch
                  className={`ml-5 transition-all ${
                    focused
                     ? "text-blue-500 scale-110"
                      : "text-gray-400 dark:text-zinc-500"
                  }`}
                  size={22}
                />
                <input
                  type="text"
                  placeholder="Tìm tên, @username, ID hoặc nhóm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="w-full h-full px-4 bg-transparent text- font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mr-4 w-7 h-7 rounded-full bg-gray-300/80 dark:bg-zinc-700/80 flex items-center justify-center"
                  >
                    <FiX className="text-gray-600 dark:text-zinc-300" size={16} />
                  </button>
                )}
              </div>
            </form>

            <div className="flex gap-2 mt-4">
              {[
                { k: "all", l: "Tất cả" },
                { k: "unread", l: "Chưa đọc" },
                { k: "group", l: "Nhóm" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setActiveTab(t.k as any)}
                  className={`px-4 h-8 rounded-2xl text- font-semibold transition ${
                    activeTab === t.k
                     ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-gray-100/80 dark:bg-zinc-800/60 text-gray-600 dark:text-zinc-400"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        <div className="px-4 py-3">
          {loading? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-900 rounded-3xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded-lg w-1/3" />
                    <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded-lg w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0? (
            <div className="flex flex-col items-center justify-center py-28 px-6 text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-3xl blur-3xl" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-900 dark:to-zinc-800 rounded-3xl flex items-center justify-center shadow-2xl">
                  <FiMessageSquare className="text-gray-400 dark:text-zinc-600" size={36} />
                </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                Chưa có tin nhắn
              </h3>
              <p className="text-gray-500 dark:text-zinc-400 font-medium max-w-">
                Tạo nhóm hoặc thêm bạn bằng ID
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((f) => (
                <div key={f.chatId} className="group relative">
                  <Link
                    href={`/chat/${f.chatId}`}
                    className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white dark:hover:bg-zinc-900/70 active:scale-[0.98] transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/5"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-3xl ring- ring-white dark:ring-zinc-950 shadow-xl overflow-hidden group-hover:ring-blue-500/20 transition-all">
                        {f.isGroup? (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                            <FiUsers className="text-white" size={28} />
                          </div>
                        ) : (
                          <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                        )}
                      </div>
                      {!f.isGroup && f.isOnline && (
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full ring- ring-white dark:ring-zinc-950 shadow-lg">
                          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-bold text- text-gray-900 dark:text-white truncate">
                            {f.name}
                          </p>
                          {pinned.includes(f.chatId) && (
                            <RiPushpinFill className="text-blue-500" size={14} />
                          )}
                          {f.isGroup && (
                            <span className="text- px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 font-medium">
                              {f.members?.length}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
                            {formatTime(f.updatedAt)}
                          </p>
                          {f.unreadCount? (
                            <div className="min-w- h-5 px-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text- font-bold text-white">
                                {f.unreadCount}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <p className="text- text-gray-500 dark:text-zinc-400 font-medium truncate">
                        {f.isTyping
                         ? <span className="text-blue-500 italic">đang nhập...</span>
                          : f.lastMessage
                         ? f.isGroup
                           ? `${f.lastSenderName || ""}: ${f.lastMessage}`
                            : f.lastSenderId === user?.uid
                           ? `Bạn: ${f.lastMessage}`
                            : f.lastMessage
                          : f.isGroup
                         ? "Nhóm mới tạo"
                          : `@${f.username || f.userId}`}
                      </p>
                    </div>
                  </Link>

                  <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1.5">
                    <button onClick={() => togglePin(f.chatId)} className="w-8 h-8 rounded-xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur flex items-center justify-center shadow">
                      {pinned.includes(f.chatId)? <RiPushpinFill size={16} className="text-blue-500" /> : <RiPushpinLine size={16} />}
                    </button>
                    <button onClick={() => toggleMute(f.chatId)} className="w-8 h-8 rounded-xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur flex items-center justify-center shadow">
                      <FiBellOff size={15} />
                    </button>
                    <button onClick={() => handleDelete(f)} className="w-8 h-8 rounded-xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur flex items-center justify-center shadow text-red-500">
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal tạo mới */}
        {showAdd && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center p-4" onClick={() => setShowAdd(false)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w- bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded- p-6 shadow-2xl border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text- font-bold">Tạo mới</h3>
                <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center"><FiX /></button>
              </div>
              <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-2xl p-1 mb-4">
                <button onClick={() => setAddMode("friend")} className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text- font-semibold ${addMode==="friend"?"bg-white dark:bg-zinc-700 shadow":"text-gray-600 dark:text-zinc-400"}`}><FiUserPlus/>Thêm bạn</button>
                <button onClick={() => setAddMode("group")} className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text- font-semibold ${addMode==="group"?"bg-white dark:bg-zinc-700 shadow":"text-gray-600 dark:text-zinc-400"}`}><FiUsers/>Tạo nhóm</button>
              </div>
              {addMode==="friend"? (
                <form onSubmit={handleSearch}>
                  <div className="h-12 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center px-3">
                    <FiSearch className="text-gray-400" />
                    <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Nhập ID hoặc @username" className="flex-1 bg-transparent outline-none px-2 text-" />
                  </div>
                  <button disabled={adding||!search} type="submit" className="w-full mt-4 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl font-bold disabled:opacity-50">
                    {adding? "Đang tìm..." : "Thêm bạn"}
                  </button>
                </form>
              ) : (
                <div>
                  <input value={groupName} onChange={(e)=>setGroupName(e.target.value)} placeholder="Tên nhóm" className="w-full h-12 bg-gray-100 dark:bg-zinc-800 rounded-2xl px-3 outline-none text- mb-3" />
                  <p className="text-xs text-gray-500 mb-2">Chọn thành viên ({selected.length})</p>
                  <div className="max-h- overflow-auto space-y-1.5 pr-1">
                    {friendsForPicker.map((p) => (
                      <label key={p.uid} className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer">
                        <input type="checkbox" checked={selected.includes(p.uid)} onChange={(e)=>setSelected(s=>e.target.checked?[...s,p.uid]:s.filter(x=>x!==p.uid))} className="w-4 h-4 accent-blue-500" />
                        <img src={p.avatar} className="w-9 h-9 rounded-xl object-cover" />
                        <span className="text- font-medium">{p.name}</span>
                      </label>
                    ))}
                  </div>
                  <button disabled={adding||!groupName||selected.length<2} onClick={createGroup} className="w-full mt-4 h-12 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-2xl font-bold disabled:opacity-50">
                    {adding? "Đang tạo..." : "Tạo nhóm"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}