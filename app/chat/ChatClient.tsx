"use client";

/**
 * ChatClient.tsx
 * ------------------------------------------------------------------
 * Trang danh sách tin nhắn - Phiên bản Production Full
 *
 * Tính năng:
 * - Realtime Firestore với retry logic
 * - Tìm kiếm debounce 200ms
 * - Ghim chat (localStorage)
 * - Tạo nhóm, thêm bạn bằng ID/username
 * - Online/offline detection
 * - UI đồng bộ với Task page (ảnh 2)
 * - Đổi màu theo mode (Plan/Task)
 *
 * @version 2.1.0
 * @author AirAnh Team
 */

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { useAppStore } from "@/store/app";
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
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import {
  FiSearch,
  FiMessageSquare,
  FiUserPlus,
  FiUsers,
  FiCheck,
  FiX,
  FiLoader,
} from "react-icons/fi";
import { RiAddLine, RiPushpinFill } from "react-icons/ri";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import { format, isToday, isYesterday } from "date-fns";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

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

type RawChat = {
  id: string;
  c: DocumentData;
  other?: string;
  isGroup: boolean;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const PINNED_KEY = "pinned_chats";
const DEBOUNCE_DELAY = 200;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;
const BATCH_SIZE = 10;

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ChatClient() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const unsubRef = useRef<Unsubscribe | null>(null);
  
  // Mode colors
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";
  
  const primaryBg = isPlan ? "bg-green-500" : "bg-[#0a84ff]";
  const primaryHover = isPlan ? "hover:bg-green-600" : "hover:bg-[#007aff]";
  const primaryActive = isPlan ? "active:bg-green-700" : "active:bg-[#0051d5]";
  const primaryText = isPlan ? "text-green-600 dark:text-green-400" : "text-[#0a84ff]";
  const primaryRing = isPlan ? "focus:ring-green-500/20" : "focus:ring-[#0a84ff]/20";
  const primaryBorder = isPlan ? "focus:border-green-500" : "focus:border-[#0a84ff]";
  const primaryBgSolid = isPlan ? "bg-green-500" : "bg-[#0a84ff]";

  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------

  const [items, setItems] = useState<ChatItem[]>([]);
  const [search, setSearch] = useState<string>("");
  const [debounced, setDebounced] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [adding, setAdding] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "group">("all");
  const [pinned, setPinned] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<"friend" | "group">("friend");
  const [groupName, setGroupName] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // --------------------------------------------------------------------------
  // EFFECTS
  // --------------------------------------------------------------------------

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handleOnline = (): void => {
      setIsOnline(true);
      toast.success("Đã kết nối lại");
    };
    const handleOffline = (): void => {
      setIsOnline(false);
      toast.error("Mất kết nối mạng");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      const pinnedData = localStorage.getItem(PINNED_KEY);
      if (pinnedData) {
        const parsed = JSON.parse(pinnedData);
        if (Array.isArray(parsed)) setPinned(parsed);
      }
    } catch (error) {
      console.error("Failed to load pinned chats:", error);
      localStorage.removeItem(PINNED_KEY);
    }
  }, []);

  const savePinned = useCallback((values: string[]): void => {
    try {
      setPinned(values);
      localStorage.setItem(PINNED_KEY, JSON.stringify(values));
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
    } catch (error) {
      console.error("Failed to save pinned chats:", error);
    }
  }, []);

  // --------------------------------------------------------------------------
  // REALTIME LISTENER
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (authLoading || !user?.uid) return;

    let retryCount = 0;
    let isMounted = true;

    const setupListener = (): Unsubscribe => {
      const chatsQuery = query(
        collection(db, "chats"),
        where("members", "array-contains", user.uid)
      );

      const unsubscribe = onSnapshot(
        chatsQuery,
        async (snapshot: QuerySnapshot<DocumentData>) => {
          retryCount = 0;
          if (!isMounted) return;
          setLoading(true);

          try {
            const rawChats: RawChat[] = [];
            const userIdsToFetch = new Set<string>();

            snapshot.forEach((document) => {
              const chatData = document.data();
              const isGroupChat = Boolean(chatData.isGroup);
              if (isGroupChat) {
                rawChats.push({ id: document.id, c: chatData, isGroup: true });
              } else {
                const otherUserId = chatData.members?.find(
                  (memberId: string) => memberId !== user.uid
                );
                if (otherUserId) userIdsToFetch.add(otherUserId);
                rawChats.push({
                  id: document.id,
                  c: chatData,
                  other: otherUserId,
                  isGroup: false,
                });
              }
            });

            const usersMap: Record<string, any> = {};
            if (userIdsToFetch.size > 0) {
              const userIds = Array.from(userIdsToFetch);
              const chunks: string[][] = [];
              for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
                chunks.push(userIds.slice(i, i + BATCH_SIZE));
              }
              await Promise.all(
                chunks.map(async (chunk) => {
                  const userDocs = await Promise.all(
                    chunk.map((userId) => getDoc(doc(db, "users", userId)))
                  );
                  userDocs.forEach((userDoc) => {
                    if (userDoc.exists()) usersMap[userDoc.id] = userDoc.data();
                  });
                })
              );
            }

            const chatList: ChatItem[] = rawChats.map((raw) => {
              const chatData = raw.c;
              if (raw.isGroup) {
                return {
                  uid: raw.id,
                  chatId: raw.id,
                  name: chatData.groupName || "Nhóm",
                  username: "",
                  avatar: chatData.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatData.groupName || "N")}&background=${isPlan ? "22c55e" : "0a84ff"}&color=fff&bold=true`,
                  userId: "",
                  lastMessage: chatData.lastMessage,
                  lastSenderId: chatData.lastSenderId,
                  lastSenderName: chatData.lastSenderName,
                  updatedAt: chatData.updatedAt,
                  unreadCount: chatData.unread?.[user.uid] || 0,
                  isTyping: Object.entries(chatData.typing || {}).some(
                    ([userId, isTyping]) => userId !== user.uid && Boolean(isTyping)
                  ),
                  isGroup: true,
                  members: chatData.members || [],
                  isOnline: false,
                };
              } else {
                const userData = usersMap[raw.other || ""] || {};
                return {
                  uid: raw.other || "",
                  chatId: raw.id,
                  name: userData.name || "User",
                  username: userData.username || "",
                  avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || "U")}&background=random`,
                  userId: userData.userId || "",
                  lastMessage: chatData.lastMessage,
                  lastSenderId: chatData.lastSenderId,
                  lastSenderName: "",
                  updatedAt: chatData.updatedAt,
                  isOnline: Boolean(userData.isOnline),
                  unreadCount: chatData.unread?.[user.uid] || 0,
                  isTyping: Boolean(raw.other && chatData.typing?.[raw.other]),
                  isGroup: false,
                };
              }
            });

            const pinnedChats = JSON.parse(localStorage.getItem(PINNED_KEY) || "[]");
            chatList.sort((a, b) => {
              const aIsPinned = pinnedChats.includes(a.chatId) ? 1 : 0;
              const bIsPinned = pinnedChats.includes(b.chatId) ? 1 : 0;
              if (aIsPinned !== bIsPinned) return bIsPinned - aIsPinned;
              const aTime = a.updatedAt?.seconds || 0;
              const bTime = b.updatedAt?.seconds || 0;
              return bTime - aTime;
            });

            if (isMounted) setItems(chatList);
          } catch (error) {
            console.error("Error processing chats:", error);
            if (isMounted) toast.error("Lỗi tải danh sách chat");
          } finally {
            if (isMounted) setLoading(false);
          }
        },
        (error) => {
          console.error("Realtime listener error:", error);
          if (!isMounted) return;
          if (retryCount < MAX_RETRIES && error.code !== "permission-denied") {
            retryCount++;
            const delay = RETRY_DELAY * retryCount;
            setTimeout(() => { if (isMounted) setupListener(); }, delay);
          } else if (error.code !== "permission-denied") {
            toast.error("Không thể kết nối realtime");
          }
          setLoading(false);
        }
      );

      unsubRef.current = unsubscribe;
      return unsubscribe;
    };

    const unsubscribe = setupListener();
    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid, authLoading, db, isPlan]);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  const handleAddFriend = useCallback(async (event?: React.FormEvent): Promise<void> => {
    event?.preventDefault();
    const auth = getAuth();
    await auth.authStateReady();
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) { toast.error("Chưa đăng nhập"); return; }
    const keyword = search.trim();
    if (!keyword) { toast.error("Vui lòng nhập ID hoặc username"); return; }
    setAdding(true);
    try {
      let targetUserId: string | null = null;
      const upperKeyword = keyword.toUpperCase();
      const lowerKeyword = keyword.toLowerCase();
      const userIdDoc = await getDoc(doc(db, "userIds", upperKeyword));
      if (userIdDoc.exists()) targetUserId = userIdDoc.data().uid;
      if (!targetUserId) {
        const usernameDoc = await getDoc(doc(db, "usernames", lowerKeyword));
        if (usernameDoc.exists()) targetUserId = usernameDoc.data().uid;
      }
      if (!targetUserId) {
        const searchQuery = query(collection(db, "users"), where("searchKeywords", "array-contains", lowerKeyword), limit(1));
        const searchSnapshot = await getDocs(searchQuery);
        if (!searchSnapshot.empty && searchSnapshot.docs[0]) targetUserId = searchSnapshot.docs[0].id;
      }
      if (!targetUserId) { toast.error(`Không tìm thấy: ${keyword}`); return; }
      if (targetUserId === currentUser.uid) { toast.error("Không thể thêm chính mình"); return; }
      const chatId = [currentUser.uid, targetUserId].sort().join("_");
      await setDoc(doc(db, "chats", chatId), { members: [currentUser.uid, targetUserId], isGroup: false, createdAt: new Date(), updatedAt: new Date() }, { merge: true });
      toast.success("Đã tạo cuộc trò chuyện");
      router.push(`/chat/${chatId}`);
      setShowAdd(false);
      setSearch("");
    } catch (error: any) {
      console.error("Add friend error:", error);
      toast.error(`Lỗi: ${error.message || "Không thể thêm bạn"}`);
    } finally {
      setAdding(false);
    }
  }, [search, db, router]);

  const handleCreateGroup = useCallback(async (): Promise<void> => {
    if (!user) { toast.error("Chưa đăng nhập"); return; }
    const trimmedName = groupName.trim();
    if (!trimmedName) { toast.error("Vui lòng nhập tên nhóm"); return; }
    if (selected.length < 1) { toast.error("Vui lòng chọn ít nhất 1 thành viên"); return; }
    if (trimmedName.length > 50) { toast.error("Tên nhóm tối đa 50 ký tự"); return; }
    setAdding(true);
    try {
      const groupRef = doc(collection(db, "chats"));
      const groupData = {
        members: [user.uid, ...selected],
        isGroup: true,
        groupName: trimmedName,
        admins: [user.uid],
        createdAt: new Date(),
        updatedAt: new Date(),
        lastMessage: `${user.displayName || "Bạn"} đã tạo nhóm`,
        lastSenderName: "Hệ thống",
      };
      await setDoc(groupRef, groupData);
      toast.success("Đã tạo nhóm thành công");
      router.push(`/chat/${groupRef.id}`);
      setShowAdd(false);
      setGroupName("");
      setSelected([]);
    } catch (error: any) {
      console.error("Create group error:", error);
      toast.error(`Lỗi tạo nhóm: ${error.message || "Vui lòng thử lại"}`);
    } finally {
      setAdding(false);
    }
  }, [user, groupName, selected, db, router]);

  const handleTogglePin = useCallback((chatId: string): void => {
    const newPinned = pinned.includes(chatId) ? pinned.filter((id) => id !== chatId) : [...pinned, chatId];
    savePinned(newPinned);
    toast.success(newPinned.includes(chatId) ? "Đã ghim cuộc trò chuyện" : "Đã bỏ ghim");
  }, [pinned, savePinned]);

  const handleDeleteChat = useCallback(async (chat: ChatItem): Promise<void> => {
    if (!user?.uid) { toast.error("Chưa đăng nhập"); return; }
    const confirmMessage = chat.isGroup ? `Bạn có chắc muốn rời nhóm "${chat.name}"?` : `Xóa cuộc trò chuyện với ${chat.name}?`;
    if (!window.confirm(confirmMessage)) return;
    try {
      if (chat.isGroup) {
        await updateDoc(doc(db, "chats", chat.chatId), { members: arrayRemove(user.uid), updatedAt: new Date() });
        toast.success("Đã rời nhóm");
      } else {
        await deleteDoc(doc(db, "chats", chat.chatId));
        toast.success("Đã xóa cuộc trò chuyện");
      }
    } catch (error: any) {
      console.error("Delete chat error:", error);
      toast.error(`Lỗi: ${error.message || "Không thể xóa"}`);
    }
  }, [user?.uid, db]);

  const formatMessageTime = useCallback((timestamp?: Timestamp): string => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Hôm qua";
    return format(date, "dd/MM");
  }, []);

  // --------------------------------------------------------------------------
  // COMPUTED VALUES
  // --------------------------------------------------------------------------

  const filteredChats = useMemo(() => {
    const query = debounced.toLowerCase().trim();
    let filtered = items;
    if (query) {
      filtered = filtered.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(query);
        const usernameMatch = item.username.toLowerCase().includes(query);
        const userIdMatch = item.userId.toLowerCase().includes(query);
        return nameMatch || usernameMatch || userIdMatch;
      });
    }
    if (activeTab === "unread") filtered = filtered.filter((item) => (item.unreadCount || 0) > 0);
    else if (activeTab === "group") filtered = filtered.filter((item) => item.isGroup);
    return filtered;
  }, [items, debounced, activeTab]);

  const { pinnedChats, normalChats } = useMemo(() => {
    const pinnedList = filteredChats.filter((chat) => pinned.includes(chat.chatId));
    const normalList = filteredChats.filter((chat) => !pinned.includes(chat.chatId));
    return { pinnedChats: pinnedList, normalChats: normalList };
  }, [filteredChats, pinned]);

  const friendsForGroup = useMemo(() => items.filter((item) => !item.isGroup), [items]);

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-3">
          <FiLoader className={`animate-spin ${primaryText}`} size={32} />
          <p className="text-[14px] text-gray-500">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster richColors position="top-center" toastOptions={{ duration: 2000, style: { fontSize: "14px" } }} />
      <div className="min-h-screen bg-white dark:bg-black select-none">
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-black/95 backdrop-blur-2xl border-b border-gray-100 dark:border-zinc-900">
          <div className="px-4 pt-3 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm"
                  className={`w-full h-[38px] pl-[34px] pr-3.5 bg-[#f2f2f7] dark:bg-zinc-900 rounded-[10px] text-[15px] font-normal outline-none border-0 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 ${primaryRing} transition-all placeholder:text-gray-400`}
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
              <button onClick={() => setShowAdd(true)} className={`w-[38px] h-[38px] ${primaryBg} ${primaryHover} ${primaryActive} rounded-[10px] flex items-center justify-center shadow-sm active:scale-95 transition-all duration-150`} aria-label="Tạo mới">
                <RiAddLine className="text-white" size={22} strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex items-center gap-5 mt-3.5 px-0.5 overflow-x-auto scrollbar-hide">
              {[{ key: "all", label: "Tất cả" }, { key: "unread", label: "Chưa đọc" }, { key: "group", label: "Nhóm" }].map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`relative py-2 text-[15px] whitespace-nowrap transition-colors duration-200 ${activeTab === tab.key ? "text-black dark:text-white font-semibold" : "text-[#8e8e93] dark:text-zinc-500 font-normal hover:text-gray-700 dark:hover:text-zinc-400"}`}>
                  {tab.label}
                  {activeTab === tab.key && <div className="absolute -bottom-[1px] left-0 right-0 h-[2.5px] bg-black dark:bg-white rounded-full" />}
                </button>
              ))}
              {!isOnline && <span className="ml-auto text-[12px] text-orange-500 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />Offline</span>}
            </div>
          </div>
        </div>

        <div className="pb-24">
          {loading ? (
            <div className="px-4 pt-4 space-y-0">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 py-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-[15px] bg-gray-200 dark:bg-zinc-800 rounded w-2/5" />
                    <div className="h-[13px] bg-gray-200 dark:bg-zinc-800 rounded w-3/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
              <div className="w-[72px] h-[72px] bg-[#f2f2f7] dark:bg-zinc-900 rounded-[20px] flex items-center justify-center mb-4 shadow-sm">
                <FiMessageSquare className="text-gray-400" size={30} strokeWidth={1.5} />
              </div>
              <h3 className="text-[20px] font-semibold tracking-tight text-gray-900 dark:text-white mb-1.5">
                {activeTab === "unread" ? "Không có tin chưa đọc" : activeTab === "group" ? "Chưa có nhóm" : "Chưa có tin nhắn"}
              </h3>
              <p className="text-[15px] leading-[20px] text-[#8e8e93] dark:text-zinc-500 max-w-[280px]">
                {activeTab === "all" ? "Nhấn + để bắt đầu trò chuyện" : "Các cuộc trò chuyện sẽ hiện ở đây"}
              </p>
              {activeTab === "all" && <button onClick={() => setShowAdd(true)} className={`mt-6 px-5 h-[36px] ${primaryBg} ${primaryHover} ${primaryActive} text-white rounded-full text-[14px] font-medium shadow-sm active:scale-95 transition-all duration-150`}>Tạo mới</button>}
            </div>
          ) : (
            <div>
              {pinnedChats.length > 0 && <div className="px-4 pt-3 pb-1"><p className="text-[12px] font-medium text-[#8e8e93] dark:text-zinc-500 uppercase tracking-wider">Đã ghim</p></div>}
              <div className="bg-white dark:bg-black divide-y divide-gray-100 dark:divide-zinc-900">
                {[...pinnedChats, ...normalChats].map((chat) => (
                  <div key={chat.chatId} className="group relative">
                    <Link href={`/chat/${chat.chatId}`} className="flex items-center gap-3 px-4 py-[10px] active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors duration-150">
                      <div className="relative flex-shrink-0">
                        <img src={chat.avatar} alt={chat.name} className="w-[52px] h-[52px] rounded-full object-cover bg-gray-100 dark:bg-zinc-800" loading="lazy" />
                        {chat.isOnline && !chat.isGroup && <div className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-[#30d158] rounded-full border-[2.5px] border-white dark:border-black" />}
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <p className="text-[16px] leading-[22px] font-[550] text-black dark:text-white truncate">{chat.name}</p>
                            {pinned.includes(chat.chatId) && <RiPushpinFill size={12} className="text-[#8e8e93] dark:text-zinc-500 flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-[13px] leading-[18px] text-[#8e8e93] dark:text-zinc-500 tabular-nums">{formatMessageTime(chat.updatedAt)}</span>
                            {chat.unreadCount ? <span className={`min-w-[20px] h-5 px-1.5 ${primaryBgSolid} rounded-full flex items-center justify-center`}><span className="text-[12px] leading-none font-medium text-white">{chat.unreadCount > 99 ? "99+" : chat.unreadCount}</span></span> : null}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {chat.isTyping ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex gap-0.5">
                                <span className={`w-1 h-1 ${primaryBgSolid} rounded-full animate-bounce [animation-delay:-0.3s]`} />
                                <span className={`w-1 h-1 ${primaryBgSolid} rounded-full animate-bounce [animation-delay:-0.15s]`} />
                                <span className={`w-1 h-1 ${primaryBgSolid} rounded-full animate-bounce`} />
                              </div>
                              <span className={`text-[14px] leading-[19px] ${primaryText} italic`}>đang nhập</span>
                            </div>
                          ) : (
                            <p className="text-[14px] leading-[19px] text-[#8e8e93] dark:text-zinc-500 truncate">
                              {chat.isGroup && chat.lastSenderName && chat.lastSenderId !== user?.uid ? `${chat.lastSenderName}: ` : ""}
                              {chat.lastSenderId === user?.uid ? "Bạn: " : ""}
                              {chat.lastMessage || "Bắt đầu trò chuyện"}
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="md:hidden flex items-center justify-end gap-4 px-4 pb-2 -mt-1">
                      <button onClick={() => handleTogglePin(chat.chatId)} className={`text-[13px] ${primaryText} font-medium py-1 px-2 active:opacity-60 transition-opacity`}>{pinned.includes(chat.chatId) ? "Bỏ ghim" : "Ghim"}</button>
                      <button onClick={() => handleDeleteChat(chat)} className="text-[13px] text-[#ff3b30] font-medium py-1 px-2 active:opacity-60 transition-opacity">Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl" onClick={() => setShowAdd(false)} />
            <div className="relative w-full sm:max-w-[380px] bg-[#f5f5f7] dark:bg-zinc-900 sm:rounded-[20px] rounded-[20px] shadow-2xl max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
              <div className="w-[36px] h-[5px] bg-black/15 dark:bg-white/15 rounded-full mx-auto mt-2.5 sm:hidden flex-shrink-0" />
              <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
                <h2 className="text-[20px] font-semibold tracking-tight">Tin nhắn mới</h2>
                <button onClick={() => setShowAdd(false)} className="w-7 h-7 -mr-1 flex items-center justify-center text-[#8e8e93] active:opacity-60 transition-opacity" aria-label="Đóng"><FiX size={22} /></button>
              </div>
              <div className="px-4 pb-3 flex-shrink-0">
                <div className="grid grid-cols-2 gap-1 p-1 bg-black/[0.04] dark:bg-white/[0.06] rounded-[10px]">
                  {[{ id: "friend", label: "Thêm bạn", icon: FiUserPlus }, { id: "group", label: "Tạo nhóm", icon: FiUsers }].map((tab) => (
                    <button key={tab.id} onClick={() => setAddMode(tab.id as any)} className={`h-[30px] rounded-[7px] text-[14px] font-[550] flex items-center justify-center gap-1.5 transition-all duration-200 ${addMode === tab.id ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white" : "text-[#8e8e93] dark:text-zinc-500"}`}>
                      <tab.icon size={15} />{tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-5 pb-5">
                {addMode === "friend" ? (
                  <form onSubmit={handleAddFriend} className="space-y-3">
                    <div className="relative">
                      <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93] pointer-events-none" size={18} />
                      <input type="search" inputMode="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ID hoặc @username" className={`w-full h-[44px] pl-10 pr-3.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-[12px] text-[16px] outline-none ${primaryBorder} focus:ring-4 ${primaryRing} transition-all`} autoFocus autoComplete="off" autoCorrect="off" spellCheck={false} name="search-user-not-login" />
                    </div>
                    <button type="submit" disabled={adding || !search.trim()} className={`w-full h-[44px] ${primaryBg} ${primaryHover} ${primaryActive} disabled:opacity-40 text-white rounded-[12px] text-[16px] font-[550] transition-all active:scale-[0.98] flex items-center justify-center gap-2`}>
                      {adding && <FiLoader className="animate-spin" size={18} />}{adding ? "Đang tìm" : "Tiếp tục"}
                    </button>
                  </form>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 space-y-3">
                    <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Tên nhóm" className={`w-full h-[44px] px-3.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-[12px] text-[16px] outline-none ${primaryBorder} focus:ring-4 ${primaryRing} transition-all`} maxLength={30} />
                    <div className="flex-1 bg-white dark:bg-zinc-800 rounded-[12px] border border-black/10 dark:border-white/10 overflow-hidden flex flex-col min-h-0">
                      <div className="px-3 py-2.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur border-b border-black/5 dark:border-white/5 flex-shrink-0">
                        <p className="text-[13px] font-medium text-[#8e8e93] dark:text-zinc-500">Đã chọn {selected.length} người</p>
                      </div>
                      <div className="flex-1 overflow-auto">
                        {friendsForGroup.length === 0 ? (
                          <div className="p-8 text-center"><p className="text-[14px] text-[#8e8e93] dark:text-zinc-500">Chưa có bạn bè</p></div>
                        ) : (
                          <div className="divide-y divide-black/5 dark:divide-white/5">
                            {friendsForGroup.map((person) => (
                              <label key={person.uid} className="flex items-center gap-3 px-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors">
                                <input type="checkbox" checked={selected.includes(person.uid)} onChange={(e) => setSelected((current) => e.target.checked ? [...current, person.uid] : current.filter((id) => id !== person.uid))} className={`w-[20px] h-[20px] rounded-[6px] border-2 border-[#c7c7cc] dark:border-zinc-600 ${primaryText} focus:ring-0 focus:ring-offset-0 checked:${primaryBgSolid} checked:border-transparent transition-colors`} />
                                <img src={person.avatar} alt={person.name} className="w-9 h-9 rounded-full object-cover bg-gray-100 dark:bg-zinc-800 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[15px] leading-5 font-normal truncate">{person.name}</p>
                                  <p className="text-[13px] leading-4 text-[#8e8e93] dark:text-zinc-500">@{person.username || person.userId}</p>
                                </div>
                                {selected.includes(person.uid) && <div className={`w-5 h-5 ${primaryBgSolid} rounded-full flex items-center justify-center flex-shrink-0`}><FiCheck className="text-white" size={12} strokeWidth={3} /></div>}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={handleCreateGroup} disabled={adding || !groupName.trim() || selected.length < 1} className={`w-full h-[44px] ${primaryBg} ${primaryHover} ${primaryActive} disabled:opacity-40 text-white rounded-[12px] text-[16px] font-[550] transition-all active:scale-[0.98] flex items-center justify-center gap-2 flex-shrink-0`}>
                      {adding && <FiLoader className="animate-spin" size={18} />}Tạo nhóm ({selected.length + 1})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}body{overscroll-behavior-y:contain}`}</style>
    </>
  );
}