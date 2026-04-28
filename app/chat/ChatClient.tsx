"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  updateDoc,
  arrayRemove,
  deleteDoc,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { 
  FiSearch, 
  FiMessageSquare, 
  FiUserPlus, 
  FiUsers,
  FiCheck,
  FiX, 
  FiLoader,
  FiBellOff
} from "react-icons/fi";
import { RiAddLine, RiPushpinFill } from "react-icons/ri";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { format, isToday, isYesterday } from "date-fns";

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

const PINNED_KEY = "pinned_chats";
const MUTED_KEY = "muted_chats";

export default function ChatClient() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const unsubRef = useRef<Unsubscribe | null>(null);

  const [items, setItems] = useState<ChatItem[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "group">("all");
  const [pinned, setPinned] = useState<string[]>([]);
  const [muted, setMuted] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"friend" | "group">("friend");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load local
  useEffect(() => {
    try {
      setPinned(JSON.parse(localStorage.getItem(PINNED_KEY) || "[]"));
      setMuted(JSON.parse(localStorage.getItem(MUTED_KEY) || "[]"));
    } catch {}
  }, []);

  const savePinned = useCallback((v: string[]) => {
    setPinned(v);
    localStorage.setItem(PINNED_KEY, JSON.stringify(v));
    if (navigator.vibrate) navigator.vibrate(10);
  }, []);



  // REALTIME - UPGRADED
  useEffect(() => {
    if (authLoading ||!user?.uid) return;

    let retryCount = 0;
    const maxRetries = 3;

    const setupListener = () => {
      const q = query(collection(db, "chats"), where("members", "array-contains", user.uid));

      const unsub = onSnapshot(
        q,
        async (snap) => {
          retryCount = 0;
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

            const usersMap: Record<string, any> = {};
            if (needUsers.size > 0) {
              const ids = Array.from(needUsers);
              const chunks = Array.from({ length: Math.ceil(ids.length / 10) }, (_, i) =>
                ids.slice(i * 10, i * 10 + 10)
              );
              await Promise.all(
                chunks.map(async (chunk) => {
                  const docs = await Promise.all(chunk.map((id) => getDoc(doc(db, "users", id))));
                  docs.forEach((d) => d.exists() && (usersMap[d.id] = d.data()));
                })
              );
            }

            const list: ChatItem[] = raws.map((r) => {
              if (r.type === "group") {
                const c = r.c;
                return {
                  uid: r.id,
                  chatId: r.id,
                  name: c.groupName || "Nhóm",
                  username: "",
                  avatar: c.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.groupName || "N")}&background=0a84ff&color=fff&bold=true`,
                  userId: "",
                  lastMessage: c.lastMessage,
                  lastSenderId: c.lastSenderId,
                  lastSenderName: c.lastSenderName,
                  updatedAt: c.updatedAt,
                  unreadCount: c.unread?.[user.uid] || 0,
                  isTyping: Object.entries(c.typing || {}).some(([k, v]) => k!== user.uid && v),
                  isGroup: true,
                  members: c.members,
                  isOnline: false,
                };
              }
              const u = usersMap[r.other] || {};
              const c = r.c;
              return {
                uid: r.other,
                chatId: r.id,
                name: u.name || "User",
                username: u.username || "",
                avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "U")}&background=random`,
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
            });

            const pins = JSON.parse(localStorage.getItem(PINNED_KEY) || "[]");
            list.sort((a, b) => {
              const ap = pins.includes(a.chatId)? 1 : 0;
              const bp = pins.includes(b.chatId)? 1 : 0;
              if (ap!== bp) return bp - ap;
              return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
            });

            setItems(list);
          } catch (e) {
            console.error(e);
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.error("Realtime:", err);
          if (retryCount < maxRetries && err.code!== "permission-denied") {
            retryCount++;
            setTimeout(setupListener, 2000 * retryCount);
          } else if (err.code!== "permission-denied") {
            toast.error("Mất kết nối, đang thử lại...");
          }
          setLoading(false);
        }
      );

      unsubRef.current = unsub;
      return unsub;
    };

    const unsub = setupListener();
    return () => unsub?.();
  }, [user?.uid, authLoading, db]);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const auth = getAuth();
    await auth.authStateReady();
    const me = auth.currentUser;
    if (!me?.uid) return;
    const kw = search.trim();
    if (!kw) return;
    setAdding(true);
    try {
      let target: string | null = null;
      const up = kw.toUpperCase();
      const low = kw.toLowerCase();

      const [a, b] = await Promise.all([
        getDoc(doc(db, "userIds", up)),
        getDoc(doc(db, "usernames", low)),
      ]);
      if (a.exists()) target = a.data().uid;
      else if (b.exists()) target = b.data().uid;
      else {
        const s = await getDocs(query(collection(db, "users"), where("searchKeywords", "array-contains", low), limit(1)));
        if (!s.empty && s.docs[0]) target = s.docs[0].id;
      }
      if (!target || target === me.uid) {
        toast.error(target? "Không thể thêm chính mình" : "Không tìm thấy");
        return;
      }

      const chatId = [me.uid, target].sort().join("_");
      await setDoc(doc(db, "chats", chatId), { members: [me.uid, target], isGroup: false, updatedAt: new Date() }, { merge: true });
      toast.success("Đã tạo trò chuyện");
      router.push(`/chat/${chatId}`);
      setShowAdd(false);
      setSearch("");
    } catch (e: any) {
      toast.error("Lỗi: " + (e.message || "Không thể thêm"));
    } finally {
      setAdding(false);
    }
  };

  const createGroup = async () => {
    if (!user ||!groupName.trim() || selected.length < 1) {
      toast.error(selected.length < 1? "Chọn ít nhất 1 bạn" : "Nhập tên nhóm");
      return;
    }
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
      });
      toast.success("Đã tạo nhóm");
      router.push(`/chat/${ref.id}`);
      setShowAdd(false);
      setGroupName("");
      setSelected([]);
    } catch {
      toast.error("Lỗi tạo nhóm");
    } finally {
      setAdding(false);
    }
  };

  const togglePin = useCallback((id: string) => {
    const v = pinned.includes(id)? pinned.filter((x) => x!== id) : [...pinned, id];
    savePinned(v);
    toast.success(v.includes(id)? "Đã ghim" : "Bỏ ghim");
  }, [pinned, savePinned]);

  const handleDelete = async (chat: ChatItem) => {
    if (!user) return;
    if (!confirm(chat.isGroup? `Rời "${chat.name}"?` : `Xóa chat với ${chat.name}?`)) return;
    try {
      if (chat.isGroup) {
        await updateDoc(doc(db, "chats", chat.chatId), { members: arrayRemove(user.uid) });
      } else {
        await deleteDoc(doc(db, "chats", chat.chatId));
      }
      toast.success("Đã xóa");
    } catch {
      toast.error("Lỗi");
    }
  };

  const formatTime = useCallback((t?: Timestamp) => {
    if (!t?.toDate) return "";
    const d = t.toDate();
    if (isToday(d)) return format(d, "HH:mm");
    if (isYesterday(d)) return "Hôm qua";
    return format(d, "dd/MM");
  }, []);

  const filtered = useMemo(() => {
    const q = debounced.toLowerCase();
    let list = items.filter((f) =>!q || f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q));
    if (activeTab === "unread") list = list.filter((f) => (f.unreadCount || 0) > 0);
    if (activeTab === "group") list = list.filter((f) => f.isGroup);
    return list;
  }, [items, debounced, activeTab]);

  const pinnedItems = useMemo(() => filtered.filter((f) => pinned.includes(f.chatId)), [filtered, pinned]);
  const normalItems = useMemo(() => filtered.filter((f) =>!pinned.includes(f.chatId)), [filtered, pinned]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <FiLoader className="animate-spin text-[#0a84ff]" size={28} />
          <p className="text- text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" toastOptions={{ duration: 2000 }} />
      <div className="min-h-screen bg-[#f5f7] dark:bg-black select-none">
        {/* HEADER */}
        <div className="sticky top-0 z-20 bg-[#f5f5f7]/80 dark:bg-black/80 backdrop-blur-2xl">
          <div className="px-4 pt-3 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm"
                  className="w-full h- pl- pr-4 bg-white dark:bg-zinc-900 rounded- text- outline-none border-transparent focus:border-[#0a84ff]/30 focus:bg-white dark:focus:bg-zinc-900 transition-all placeholder:text-gray-400"
                />
              </div>
              <button
                onClick={() => setShowAdd(true)}
                className="w- h- rounded- bg-[#0a84ff] active:bg-[#0066cc] flex items-center justify-center shadow-sm active:scale-95 transition-all"
                aria-label="Tạo mới"
              >
                <RiAddLine className="text-white" size={22} strokeWidth={2} />
              </button>
            </div>

            <div className="flex items-center gap-5 mt-3.5 px-1 overflow-x-auto scrollbar-hide">
              {[
                { k: "all", l: "Tất cả" },
                { k: "unread", l: "Chưa đọc" },
                { k: "group", l: "Nhóm" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => setActiveTab(t.k as any)}
                  className={`relative py-2 text- font-[550] whitespace-nowrap transition-colors ${
                    activeTab === t.k? "text-black dark:text-white" : "text-[#8e8e93] dark:text-zinc-500"
                  }`}
                >
                  {t.l}
                  {activeTab === t.k && <div className="absolute -bottom- left-0 right-0 h-[2.5px] bg-black dark:bg-white rounded-full" />}
                </button>
              ))}
              {!isOnline && <span className="ml-auto text- text-orange-500 font-medium">Offline</span>}
            </div>
          </div>
          <div className="h-[0.5px] bg-black/5 dark:bg-white/5" />
        </div>

        {/* LIST */}
        <div className="pb-24">
          {loading? (
            <div className="px-4 pt-4 space-y-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                  <div className="w- h- bg-gray-200 dark:bg-zinc-800 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h- bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                    <div className="h- bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0? (
            <div className="flex flex-col items-center justify-center min-h- px-8 text-center">
              <div className="w- h- bg-white dark:bg-zinc-900 rounded- flex items-center justify-center mb-4 shadow-sm">
                <FiMessageSquare className="text-[#8e93]" size={30} strokeWidth={1.5} />
              </div>
              <h3 className="text- font-semibold tracking-tight mb-1.5">
                {activeTab === "unread"? "Không có tin chưa đọc" : activeTab === "group"? "Chưa có nhóm" : "Chưa có tin nhắn"}
              </h3>
              <p className="text- leading- text-[#8e8e93] dark:text-zinc-500 max-w-">
                {activeTab === "all"? "Nhấn + để bắt đầu trò chuyện" : "Các cuộc trò chuyện sẽ hiện ở đây"}
              </p>
              {activeTab === "all" && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-6 px-5 h- bg-[#0a84ff] text-white rounded-full text- font-medium active:scale-95 transition-transform"
                >
                  Tạo mới
                </button>
              )}
            </div>
          ) : (
            <div>
              {pinnedItems.length > 0 && (
                <div className="px-4 pt-3 pb-1">
                  <p className="text- font-medium text-[#8e8e93] uppercase tracking-wider">Đã ghim</p>
                </div>
              )}
              <div className="bg-white dark:bg-zinc-950">
                {[...pinnedItems,...normalItems].map((f, idx) => (
                  <div key={f.chatId}>
                    <Link
                      href={`/chat/${f.chatId}`}
                      className="group flex items-center gap-3 px-4 py- active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors"
                    >
                      <div className="relative shrink-0">
                        <img src={f.avatar} alt="" className="w- h- rounded-full object-cover bg-gray-100" />
                        {f.isOnline &&!f.isGroup && (
                          <div className="absolute bottom-0 right-0 w- h- bg-[#30d158] rounded-full border-[2.5px] border-white dark:border-zinc-950" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 border-b border-black/[0.06] dark:border-white/[0.08] py- pr-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text- leading- truncate font-[550] text-black dark:text-white">
                              {f.name}
                            </p>
                            {pinned.includes(f.chatId) && <RiPushpinFill size={12} className="text-[#8e8e93] shrink-0" />}
                            {muted.includes(f.chatId) && <FiBellOff size={12} className="text-[#8e8e93] shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text- leading- text-[#8e8e93] tabular-nums">
                              {formatTime(f.updatedAt)}
                            </span>
                            {f.unreadCount? (
                              <span className="min-w- h- px-1.5 bg-[#0a84ff] rounded-full flex items-center justify-center">
                                <span className="text- leading-none font-medium text-white">{f.unreadCount > 99? "99+" : f.unreadCount}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mt-">
                          {f.isTyping? (
                            <div className="flex items-center gap-1">
                              <div className="flex gap-0.5">
                                <span className="w-1 h-1 bg-[#0a84ff] rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1 h-1 bg-[#0a84ff] rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1 h-1 bg-[#0a84ff] rounded-full animate-bounce" />
                              </div>
                              <span className="text- leading- text-[#0a84ff]">đang nhập</span>
                            </div>
                          ) : (
                            <p className="text- leading- text-[#8e8e93] dark:text-zinc-500 truncate">
                              {f.isGroup && f.lastSenderName && f.lastSenderId!== user?.uid? `${f.lastSenderName}: ` : ""}
                              {f.lastSenderId === user?.uid? "Bạn: " : ""}
                              {f.lastMessage || "Bắt đầu trò chuyện"}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                    {/* Swipe actions - mobile */}
                    <div className="md:hidden flex justify-end gap-2 px-4 -mt-1 pb-2">
                      <button onClick={() => togglePin(f.chatId)} className="text- text-[#0a84ff] font-medium px-2 py-1 active:opacity-60">
                        {pinned.includes(f.chatId)? "Bỏ ghim" : "Ghim"}
                      </button>
                      <button onClick={() => handleDelete(f)} className="text- text-[#ff3b30] font-medium px-2 py-1 active:opacity-60">
                        Xóa
                      </button>
                    </div>
                    {idx < filtered.length - 1 && <div className="h-[0.5px] bg-black/[0.06] dark:bg-white/[0.08] ml-" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* MODAL */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setShowAdd(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl" />
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative w-full sm:max-w- bg-[#f5f5f7] dark:bg-zinc-900 sm:rounded- rounded-t- shadow-2xl animate-in slide-in-from-bottom duration-300"
            >
              <div className="w- h- bg-black/15 dark:bg-white/15 rounded-full mx-auto mt-2.5 sm:hidden" />
              <div className="px-5 pt-4 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text- font-semibold tracking-tight">Tin nhắn mới</h2>
                  <button onClick={() => setShowAdd(false)} className="w-7 h-7 -mr-1 flex items-center justify-center text-[#8e8e93] active:opacity-60">
                    <FiX size={22} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded- mb-4">
                  {[
                    { id: "friend", label: "Thêm bạn", icon: FiUserPlus },
                    { id: "group", label: "Tạo nhóm", icon: FiUsers },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAddMode(t.id as any)}
                      className={`h- rounded- text- font-[550] flex items-center justify-center gap-1.5 transition-all ${
                        addMode === t.id? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white" : "text-[#8e8e93]"
                      }`}
                    >
                      <t.icon size={16} /> {t.label}
                    </button>
                  ))}
                </div>

                {addMode === "friend"? (
                  <form onSubmit={handleSearch} className="space-y-3">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="ID hoặc @username"
                        className="w-full h- pl-10 pr-3 bg-white dark:bg-zinc-800 border-black/10 dark:border-white/10 rounded- text- outline-none focus:border-[#0a84ff] focus:ring-4 focus:ring-[#0a84ff]/10 transition-all"
                        autoFocus
                      />
                    </div>
                    <button
                      disabled={adding ||!search.trim()}
                      type="submit"
                      className="w-full h- bg-[#0a84ff] active:bg-[#0066cc] disabled:opacity-40 text-white rounded- text- font-[550] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {adding && <FiLoader className="animate-spin" size={18} />}
                      {adding? "Đang tìm" : "Tiếp tục"}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Tên nhóm"
                      className="w-full h- px-3 bg-white dark:bg-zinc-800 border-black/10 dark:border-white/10 rounded- text- outline-none focus:border-[#0a84ff] focus:ring-4 focus:ring-[#0a84ff]/10"
                      maxLength={30}
                    />
                    <div className="bg-white dark:bg-zinc-800 rounded- border border-black/10 dark:border-white/10 max-h- overflow-auto">
                      <div className="sticky top-0 px-3 py-2 bg-white/80 dark:bg-zinc-800/80 backdrop-blur border-b border-black/5 dark:border-white/5">
                        <p className="text- font-medium text-[#8e93]">Đã chọn {selected.length}</p>
                      </div>
                      {items.filter((i) =>!i.isGroup).length === 0? (
                        <p className="p-4 text-center text- text-[#8e93]">Chưa có bạn bè</p>
                      ) : (
                        items
                         .filter((i) =>!i.isGroup)
                         .map((p) => (
                            <label key={p.uid} className="flex items-center gap-3 px-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer active:bg-black/[0.04]">
                              <input
                                type="checkbox"
                                checked={selected.includes(p.uid)}
                                onChange={(e) => setSelected((s) => (e.target.checked? [...s, p.uid] : s.filter((x) => x!== p.uid)))}
                                className="w- h- rounded- border-2 border-[#c7c7cc] dark:border-zinc-600 checked:bg-[#0a84ff] checked:border-[#0a84ff] transition-colors"
                              />
                              <img src={p.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                              <div className="flex-1 min-w-0">
                                <p className="text- leading-5 truncate">{p.name}</p>
                                <p className="text- text-[#8e93]">@{p.username || p.userId}</p>
                              </div>
                              {selected.includes(p.uid) && <FiCheck className="text-[#0a84ff]" size={20} />}
                            </label>
                          ))
                      )}
                    </div>
                    <button
                      onClick={createGroup}
                      disabled={adding ||!groupName.trim() || selected.length < 1}
                      className="w-full h- bg-[#0a84ff] active:bg-[#0066cc] disabled:opacity-40 text-white rounded- text- font-[550] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {adding && <FiLoader className="animate-spin" size={18} />}
                      Tạo nhóm ({selected.length + 1})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
       .scrollbar-hide::-webkit-scrollbar { display: none; }
       .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </>
  );
}