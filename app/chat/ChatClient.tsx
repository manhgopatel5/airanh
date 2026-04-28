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
import { RiAddLine, RiPushpinLine, RiPushpinFill } from "react-icons/ri";
import Link from "next/link";
import { toast, Toaster } from "sonner";
import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
} from "date-fns";
import { vi } from "date-fns/locale";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Kiểu dữ liệu cho 1 item trong danh sách chat
 * Hỗ trợ cả chat 1-1 và nhóm
 */
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

// ============================================================================
// CONSTANTS
// ============================================================================

const PINNED_KEY = "pinned_chats";
const MUTED_KEY = "muted_chats";
const DEBOUNCE_DELAY = 250;

// ============================================================================
// COMPONENT
// ============================================================================

export default function ChatClient() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();

  // ------------------------------------------------------------------------
  // STATE
  // ------------------------------------------------------------------------
  const [items, setItems] = useState<ChatItem[]>([]);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(true);
  const [focused, setFocused] = useState(false);
  const [adding, setAdding] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "group">("all");

  const [pinned, setPinned] = useState<string[]>([]);
  const [muted, setMuted] = useState<string[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"friend" | "group">("friend");
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  // ------------------------------------------------------------------------
  // EFFECTS
  // ------------------------------------------------------------------------

  // Debounce search để tránh query liên tục
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(timer);
    };
  }, [search]);

  // Load pinned và muted từ localStorage
  useEffect(() => {
    try {
      const pinnedData = localStorage.getItem(PINNED_KEY);
      const mutedData = localStorage.getItem(MUTED_KEY);

      if (pinnedData) {
        setPinned(JSON.parse(pinnedData));
      }
      if (mutedData) {
        setMuted(JSON.parse(mutedData));
      }
    } catch (error) {
      console.error("Failed to load local storage:", error);
    }
  }, []);

  // Lưu pinned vào localStorage
  const savePinned = (values: string[]) => {
    setPinned(values);
    localStorage.setItem(PINNED_KEY, JSON.stringify(values));
  };

  // Lưu muted vào localStorage
  const saveMuted = (values: string[]) => {
    setMuted(values);
    localStorage.setItem(MUTED_KEY, JSON.stringify(values));
  };

  // ------------------------------------------------------------------------
  // REALTIME LISTENER - Lắng nghe tất cả chats
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (authLoading ||!user?.uid) {
      return;
    }

    // Query tất cả chats mà user tham gia, sắp xếp theo updatedAt
    const chatsQuery = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      async (snapshot) => {
        setLoading(true);

        try {
          const rawChats: any[] = [];
          const userIdsToFetch = new Set<string>();

          // Phân loại chat 1-1 và nhóm
          snapshot.forEach((document) => {
            const chatData = document.data();

            if (chatData.isGroup) {
              // Chat nhóm
              rawChats.push({
                type: "group",
                id: document.id,
                data: chatData,
              });
            } else {
              // Chat 1-1, cần lấy thông tin user kia
              const otherUserId = chatData.members.find(
                (memberId: string) => memberId!== user.uid
              );

              if (otherUserId) {
                userIdsToFetch.add(otherUserId);
              }

              rawChats.push({
                type: "1-1",
                id: document.id,
                otherUserId,
                data: chatData,
              });
            }
          });

          // Fetch thông tin users cho chat 1-1
          const usersMap: Record<string, any> = {};

          if (userIdsToFetch.size > 0) {
            const userIds = Array.from(userIdsToFetch);
            const chunks: string[][] = [];

            // Chia thành chunks 10 để tránh limit Firestore
            for (let i = 0; i < userIds.length; i += 10) {
              chunks.push(userIds.slice(i, i + 10));
            }

            const userDocs = await Promise.all(
              chunks.map((chunk) =>
                Promise.all(
                  chunk.map((userId) => getDoc(doc(db, "users", userId)))
                )
              )
            );

            userDocs.flat().forEach((userDoc) => {
              if (userDoc.exists()) {
                usersMap[userDoc.id] = userDoc.data();
              }
            });
          }

          // Build danh sách ChatItem
          const chatList: ChatItem[] = rawChats.map((raw) => {
            if (raw.type === "group") {
              const chat = raw.data;
              return {
                uid: raw.id,
                chatId: raw.id,
                name: chat.groupName || "Nhóm",
                username: "",
                avatar:
                  chat.groupAvatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    chat.groupName || "N"
                  )}&background=6366f1&color=fff`,
                userId: "",
                lastMessage: chat.lastMessage,
                lastSenderId: chat.lastSenderId,
                lastSenderName: chat.lastSenderName,
                updatedAt: chat.updatedAt,
                unreadCount: chat.unread?.[user.uid] || 0,
                isTyping: Object.entries(chat.typing || {}).some(
                  ([userId, isTyping]) => userId!== user.uid && isTyping
                ),
                isGroup: true,
                members: chat.members,
                isOnline: false,
              };
            } else {
              const userData = usersMap[raw.otherUserId] || {};
              const chat = raw.data;

              return {
                uid: raw.otherUserId,
                chatId: raw.id,
                name: userData.name || "User",
                username: userData.username || "",
                avatar:
                  userData.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    userData.name || "User"
                  )}&background=random`,
                userId: userData.userId || "",
                lastMessage: chat.lastMessage,
                lastSenderId: chat.lastSenderId,
                lastSenderName: "",
                updatedAt: chat.updatedAt,
                isOnline: userData.isOnline || false,
                unreadCount: chat.unread?.[user.uid] || 0,
                isTyping: chat.typing?.[raw.otherUserId] || false,
                isGroup: false,
              };
            }
          });

          // Sắp xếp: ghim lên đầu, sau đó theo thời gian
          const pinnedChats = JSON.parse(
            localStorage.getItem(PINNED_KEY) || "[]"
          );

          chatList.sort((a, b) => {
            const aIsPinned = pinnedChats.includes(a.chatId)? 1 : 0;
            const bIsPinned = pinnedChats.includes(b.chatId)? 1 : 0;

            if (aIsPinned!== bIsPinned) {
              return bIsPinned - aIsPinned;
            }

            const aTime = a.updatedAt?.seconds || 0;
            const bTime = b.updatedAt?.seconds || 0;
            return bTime - aTime;
          });

          setItems(chatList);
        } catch (error) {
          console.error("Error loading chats:", error);
          toast.error("Lỗi tải danh sách chat");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Snapshot error:", error);
        toast.error("Lỗi kết nối realtime");
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid, authLoading, db]);

  // ------------------------------------------------------------------------
  // HANDLERS
  // ------------------------------------------------------------------------

  /**
   * Thêm bạn bè bằng ID hoặc username
   */
  const handleSearch = async (event?: React.FormEvent) => {
    event?.preventDefault();

    const auth = getAuth();
    await auth.authStateReady();
    const currentUser = auth.currentUser;

    if (!currentUser?.uid) {
      toast.error("Chưa đăng nhập");
      return;
    }

    const keyword = search.trim();
    if (!keyword) {
      return;
    }

    setAdding(true);

    try {
      let targetUserId: string | null = null;
      const upperKeyword = keyword.toUpperCase();
      const lowerKeyword = keyword.toLowerCase();

      // Thử tìm bằng userId
      const userIdDoc = await getDoc(doc(db, "userIds", upperKeyword));
      if (userIdDoc.exists()) {
        targetUserId = userIdDoc.data().uid;
      }

      // Thử tìm bằng username
      if (!targetUserId) {
        const usernameDoc = await getDoc(doc(db, "usernames", lowerKeyword));
        if (usernameDoc.exists()) {
          targetUserId = usernameDoc.data().uid;
        }
      }

      // Thử tìm bằng searchKeywords
      if (!targetUserId) {
        const searchQuery = query(
          collection(db, "users"),
          where("searchKeywords", "array-contains", lowerKeyword),
          limit(1)
        );
        const searchSnapshot = await getDocs(searchQuery);
if (!searchSnapshot.empty) {
  const firstDoc = searchSnapshot.docs[0];
  if (firstDoc) {
    targetUserId = firstDoc.id;
  }
}
      }

      if (!targetUserId) {
        toast.error(`Không tìm thấy: ${keyword}`);
        return;
      }

      if (targetUserId === currentUser.uid) {
        toast.error("Không thể thêm chính mình");
        return;
      }

      const chatId = [currentUser.uid, targetUserId].sort().join("_");
      const friendRef = doc(db, "friends", `${currentUser.uid}_${targetUserId}`);

      const friendExists = await getDoc(friendRef);
      if (!friendExists.exists()) {
        await setDoc(friendRef, {
          userId: currentUser.uid,
          friendId: targetUserId,
          createdAt: new Date(),
        });

        await setDoc(
          doc(db, "chats", chatId),
          {
            members: [currentUser.uid, targetUserId],
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
    } catch (error: any) {
      console.error("Add friend error:", error);
      toast.error(`Lỗi: ${error.code || error.message}`);
    } finally {
      setAdding(false);
    }
  };

  /**
   * Tạo nhóm mới
   */
  const createGroup = async () => {
    if (!user) {
      return;
    }

    if (!groupName.trim()) {
      toast.error("Nhập tên nhóm");
      return;
    }

    if (selected.length < 2) {
      toast.error("Chọn ít nhất 2 bạn");
      return;
    }

    setAdding(true);

    try {
      const groupRef = doc(collection(db, "chats"));

      await setDoc(groupRef, {
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
      router.push(`/chat/${groupRef.id}`);

      setShowAdd(false);
      setGroupName("");
      setSelected([]);
    } catch (error) {
      console.error("Create group error:", error);
      toast.error("Lỗi tạo nhóm");
    } finally {
      setAdding(false);
    }
  };

  /**
   * Ghim / bỏ ghim chat
   */
  const togglePin = (chatId: string) => {
    const newPinned = pinned.includes(chatId)
     ? pinned.filter((id) => id!== chatId)
      : [...pinned, chatId];

    savePinned(newPinned);
    toast.success(newPinned.includes(chatId)? "Đã ghim" : "Đã bỏ ghim");
  };

  /**
   * Tắt / bật thông báo
   */
  const toggleMute = (chatId: string) => {
    const newMuted = muted.includes(chatId)
     ? muted.filter((id) => id!== chatId)
      : [...muted, chatId];

    saveMuted(newMuted);
    toast.success(newMuted.includes(chatId)? "Đã tắt thông báo" : "Đã bật thông báo");
  };

  /**
   * Xóa chat hoặc rời nhóm
   */
  const handleDelete = async (chat: ChatItem) => {
    if (!user) {
      return;
    }

    if (chat.isGroup) {
      const confirmed = confirm(`Rời nhóm "${chat.name}"?`);
      if (!confirmed) {
        return;
      }

      try {
        await updateDoc(doc(db, "chats", chat.chatId), {
          members: arrayRemove(user.uid),
        });
        toast.success("Đã rời nhóm");
      } catch (error) {
        toast.error("Lỗi rời nhóm");
      }
    } else {
      const confirmed = confirm(`Xóa trò chuyện với ${chat.name}?`);
      if (!confirmed) {
        return;
      }

      try {
        await deleteDoc(doc(db, "friends", `${user.uid}_${chat.uid}`));
        toast.success("Đã xóa");
      } catch (error) {
        toast.error("Lỗi xóa");
      }
    }
  };

  /**
   * Format thời gian hiển thị
   */
  const formatTime = (timestamp?: Timestamp) => {
    if (!timestamp?.toDate) {
      return "";
    }

    const date = timestamp.toDate();

    if (isToday(date)) {
      return format(date, "HH:mm");
    }

    if (isYesterday(date)) {
      return "Hôm qua";
    }

    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: vi,
    }).replace("khoảng ", "");
  };

  // ------------------------------------------------------------------------
  // COMPUTED VALUES
  // ------------------------------------------------------------------------

  const filtered = useMemo(() => {
    const query = debounced.toLowerCase().trim();

    return items.filter((item) => {
      // Filter theo search
      if (query) {
        const matchesSearch =
          item.name.toLowerCase().includes(query) ||
          item.username.toLowerCase().includes(query) ||
          item.userId.toLowerCase().includes(query);

        if (!matchesSearch) {
          return false;
        }
      }

      // Filter theo tab
      if (activeTab === "unread") {
        return (item.unreadCount || 0) > 0;
      }

      if (activeTab === "group") {
        return item.isGroup;
      }

      return true;
    });
  }, [items, debounced, activeTab]);

  const friendsForPicker = useMemo(() => {
    return items.filter((item) =>!item.isGroup);
  }, [items]);

  // ------------------------------------------------------------------------
  // RENDER
  // ------------------------------------------------------------------------

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
        {/* Header */}
        <div className="sticky top-0 z-30 backdrop-blur-3xl bg-white/80 dark:bg-zinc-950/80 border-b border-gray-200/30 dark:border-zinc-800/30 shadow-sm shadow-gray-900/5">
          <div className="px-5 pt-8 pb-5">
            {/* Title và nút thêm */}
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
                className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/40 active:scale-90 transition-all duration-200"
                aria-label="Tạo mới"
              >
                <RiAddLine className="text-white" size={24} />
              </button>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="relative group">
              <div
                className={`absolute -inset- bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-3xl blur-lg transition-opacity duration-500 ${
                  focused? "opacity-40" : "opacity-0"
                }`}
              />
              <div className="relative flex items-center h-14 bg-gray-100/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl border-[2.5px] border-transparent focus-within:border-blue-500/40 focus-within:bg-white dark:focus-within:bg-zinc-900 transition-all duration-300 shadow-lg shadow-gray-900/5">
                <FiSearch
                  className={`ml-5 transition-all duration-300 ${
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
                    className="mr-4 w-7 h-7 rounded-full bg-gray-300/80 dark:bg-zinc-700/80 hover:bg-gray-400 dark:hover:bg-zinc-600 flex items-center justify-center active:scale-90 transition-all"
                  >
                    <FiX className="text-gray-600 dark:text-zinc-300" size={16} />
                  </button>
                )}
              </div>
            </form>

            {/* Tabs */}
            <div className="flex gap-2 mt-4">
              {[
                { key: "all", label: "Tất cả" },
                { key: "unread", label: "Chưa đọc" },
                { key: "group", label: "Nhóm" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`px-4 h-8 rounded-2xl text- font-semibold transition-all duration-200 ${
                    activeTab === tab.key
                     ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                      : "bg-gray-100/80 dark:bg-zinc-800/60 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Danh sách chat */}
        <div className="px-4 py-3 pb-24">
          {loading? (
            // Loading skeleton
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 animate-pulse"
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-900 rounded-3xl" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-900 rounded-lg w-1/3" />
                    <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-900 rounded-lg w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-28 px-6 text-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/30 to-indigo-500/30 rounded-3xl blur-3xl" />
                <div className="relative w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-900 dark:to-zinc-800 rounded-3xl flex items-center justify-center shadow-2xl shadow-gray-900/10">
                  <FiMessageSquare
                    className="text-gray-400 dark:text-zinc-600"
                    size={36}
                  />
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                Chưa có tin nhắn
              </h3>
              <p className="text- text-gray-500 dark:text-zinc-400 font-medium max-w- leading-relaxed">
                Tạo nhóm hoặc thêm bạn bằng ID để bắt đầu trò chuyện
              </p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-8 px-6 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-bold text- rounded-2xl shadow-xl shadow-blue-500/30 active:scale-95 transition-all"
              >
                Bắt đầu ngay
              </button>
            </div>
          ) : (
            // Danh sách chat
            <div className="space-y-2">
              {filtered.map((chat) => (
                <div key={chat.chatId} className="group relative">
                  <Link
                    href={`/chat/${chat.chatId}`}
                    className="flex items-center gap-4 p-4 rounded-3xl hover:bg-white dark:hover:bg-zinc-900/70 active:scale-[0.98] transition-all duration-300 hover:shadow-xl hover:shadow-gray-900/5"
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-16 h-16 rounded-3xl ring- ring-white dark:ring-zinc-950 shadow-xl shadow-gray-900/10 overflow-hidden group-hover:ring-blue-500/20 transition-all duration-300">
                        {chat.isGroup? (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                            <FiUsers className="text-white" size={28} />
                          </div>
                        ) : (
                          <img
                            src={chat.avatar}
                            alt={chat.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      {/* Online indicator */}
                      {!chat.isGroup && chat.isOnline && (
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full ring- ring-white dark:ring-zinc-950 shadow-lg shadow-emerald-500/50">
                          <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                        </div>
                      )}
                    </div>

                    {/* Nội dung */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-bold text- text-gray-900 dark:text-white truncate">
                            {chat.name}
                          </p>

                          {pinned.includes(chat.chatId) && (
                            <RiPushpinFill
                              className="text-blue-500 flex-shrink-0"
                              size={14}
                            />
                          )}

                          {muted.includes(chat.chatId) && (
                            <FiBellOff
                              className="text-gray-400 flex-shrink-0"
                              size={14}
                            />
                          )}

                          {chat.isGroup && (
                            <span className="text- px-1.5 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium flex-shrink-0">
                              {chat.members?.length}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">
                            {formatTime(chat.updatedAt)}
                          </p>

                          {chat.unreadCount? (
                            <div className="min-w- h-5 px-1.5 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40">
                              <span className="text- font-black text-white">
                                {chat.unreadCount}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <p className="text- text-gray-500 dark:text-zinc-400 font-medium truncate">
                        {chat.isTyping? (
                          <span className="text-blue-500 italic">đang nhập...</span>
                        ) : chat.lastMessage? (
                          chat.isGroup? (
                            `${chat.lastSenderName || ""}: ${chat.lastMessage}`
                          ) : chat.lastSenderId === user?.uid? (
                            `Bạn: ${chat.lastMessage}`
                          ) : (
                            chat.lastMessage
                          )
                        ) : chat.isGroup? (
                          "Nhóm mới tạo"
                        ) : (
                          `@${chat.username || chat.userId}`
                        )}
                      </p>
                    </div>
                  </Link>

                  {/* Action buttons (hiện khi hover) */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden group-hover:flex gap-1.5">
                    <button
                      onClick={() => togglePin(chat.chatId)}
                      className="w-8 h-8 rounded-xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all"
                      title={pinned.includes(chat.chatId)? "Bỏ ghim" : "Ghim"}
                    >
                      {pinned.includes(chat.chatId)? (
                        <RiPushpinFill size={16} className="text-blue-500" />
                      ) : (
                        <RiPushpinLine size={16} className="text-gray-600 dark:text-zinc-400" />
                      )}
                    </button>

                    <button
                      onClick={() => toggleMute(chat.chatId)}
                      className="w-8 h-8 rounded-xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all"
                      title={muted.includes(chat.chatId)? "Bật thông báo" : "Tắt thông báo"}
                    >
                      <FiBellOff size={15} className={muted.includes(chat.chatId)? "text-amber-500" : "text-gray-600 dark:text-zinc-400"} />
                    </button>

                    <button
                      onClick={() => handleDelete(chat)}
                      className="w-8 h-8 rounded-xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50"
                      title={chat.isGroup? "Rời nhóm" : "Xóa"}
                    >
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
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowAdd(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w- bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl rounded- p-6 shadow-2xl border-white/20 dark:border-zinc-800/50"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text- font-bold text-gray-900 dark:text-white">
                  Tạo mới
                </h3>
                <button
                  onClick={() => setShowAdd(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors"
                >
                  <FiX className="text-gray-600 dark:text-zinc-400" size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex bg-gray-100 dark:bg-zinc-800 rounded-2xl p-1 mb-4">
                <button
                  onClick={() => setAddMode("friend")}
                  className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text- font-semibold transition-all ${
                    addMode === "friend"
                     ? "bg-white dark:bg-zinc-700 shadow-md text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-zinc-400"
                  }`}
                >
                  <FiUserPlus size={16} />
                  Thêm bạn
                </button>
                <button
                  onClick={() => setAddMode("group")}
                  className={`flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text- font-semibold transition-all ${
                    addMode === "group"
                     ? "bg-white dark:bg-zinc-700 shadow-md text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-zinc-400"
                  }`}
                >
                  <FiUsers size={16} />
                  Tạo nhóm
                </button>
              </div>

              {addMode === "friend"? (
                <form onSubmit={handleSearch}>
                  <div className="h-12 bg-gray-100 dark:bg-zinc-800 rounded-2xl flex items-center px-3 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
                    <FiSearch className="text-gray-400 dark:text-zinc-500" size={18} />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Nhập ID hoặc @username"
                      className="flex-1 bg-transparent outline-none px-2 text- text-gray-900 dark:text-white placeholder:text-gray-400"
                      autoFocus
                    />
                  </div>
                  <button
                    disabled={adding ||!search}
                    type="submit"
                    className="w-full mt-4 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold text- disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-all"
                  >
                    {adding? (
                      <span className="flex items-center justify-center gap-2">
                        <FiLoader className="animate-spin" size={18} />
                        Đang tìm...
                      </span>
                    ) : (
                      "Thêm bạn"
                    )}
                  </button>
                </form>
              ) : (
                <div>
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Tên nhóm"
                    className="w-full h-12 bg-gray-100 dark:bg-zinc-800 rounded-2xl px-3 outline-none text- text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-violet-500/30 transition-all mb-3"
                  />
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mb-2 font-medium">
                    Chọn thành viên ({selected.length})
                  </p>
                  <div className="max-h- overflow-auto space-y-1.5 pr-1 -mr-1">
                    {friendsForPicker.length === 0? (
                      <p className="text-center text-gray-400 py-8 text-">
                        Chưa có bạn bè để thêm
                      </p>
                    ) : (
                      friendsForPicker.map((person) => (
                        <label
                          key={person.uid}
                          className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(person.uid)}
                            onChange={(e) =>
                              setSelected((current) =>
                                e.target.checked
                                 ? [...current, person.uid]
                                  : current.filter((id) => id!== person.uid)
                              )
                            }
                            className="w-4 h-4 accent-violet-500 rounded"
                          />
                          <img
                            src={person.avatar}
                            alt={person.name}
                            className="w-9 h-9 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-zinc-700"
                          />
                          <span className="text- font-medium text-gray-900 dark:text-white">
                            {person.name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  <button
                    disabled={adding ||!groupName || selected.length < 2}
                    onClick={createGroup}
                    className="w-full mt-4 h-12 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-2xl font-bold text- disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 active:scale-[0.98] transition-all"
                  >
                    {adding? (
                      <span className="flex items-center justify-center gap-2">
                        <FiLoader className="animate-spin" size={18} />
                        Đang tạo...
                      </span>
                    ) : (
                      "Tạo nhóm"
                    )}
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