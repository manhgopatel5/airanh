"use client";
import GpsRequiredModal from "@/components/GpsRequiredModal";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import CreateGroupModal from "@/components/CreateGroupModal";
import { useAuth } from "@/lib/AuthContext";

import { getFirebaseDB } from "@/lib/firebase";



import dynamic from "next/dynamic";
import LeaderboardModal from "@/components/LeaderboardModal";
import { EventItem } from "@/data/events";
import EventDetailModal from "@/components/EventDetailModal";
import { type PublicRoomItem } from "@/lib/publicRooms";
import { joinPublicRoom } from "@/lib/joinPublicRoom";

const ExploreTodaySection = dynamic(() => import("@/components/inbox/ExploreTodaySection"), {
  loading: () => (
    <div className="mx-4 mt-4 h-40 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
  ),
});
const PublicRoomsSection = dynamic(() => import("@/components/inbox/PublicRoomsSection"), {
  loading: () => (
    <div className="mx-4 mt-6 h-44 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
  ),
});

import { useAppStore } from "@/store/app";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  arrayUnion,
  updateDoc,
  arrayRemove,
  Timestamp,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import {
  FiUsers,
  FiHome,
  FiAward,
  FiLoader,
  FiZap,
  FiBell,
} from "react-icons/fi";
import {  RiPushpinFill } from "react-icons/ri";
import Link from "next/link";
import { toast } from "sonner";
import { Crown } from "lucide-react";

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
  blockedUsers?: string[];
  deletedFor?: string[];
};





type RawChat = {
  id: string;
  c: DocumentData;
  other?: string;
  isGroup: boolean;
};
const PINNED_KEY = "pinned_chats";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;
const BATCH_SIZE = 10;

export default function ChatClient({ initialEvents = [] }: { initialEvents?: EventItem[] }) {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const unsubRef = useRef<Unsubscribe | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";
  const [showGpsModal, setShowGpsModal] = useState(false);
const [gpsLoading, setGpsLoading] = useState(false);
const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
const [showLeaderboard, setShowLeaderboard] = useState(false);
  useEffect(() => {
    const lat = localStorage.getItem('userLat');
    const lng = localStorage.getItem('userLng');
    if (lat && lng) {
      setUserLat(Number(lat));
      setUserLng(Number(lng));
    }
  }, []);

const requestGPS = useCallback(async () => {
  if (!navigator.geolocation) {
    toast.error("Trình duyệt không hỗ trợ GPS");
    return;
  }
  setGpsLoading(true);
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      localStorage.setItem('userLat', String(pos.coords.latitude));
      localStorage.setItem('userLng', String(pos.coords.longitude));
      setShowGpsModal(false);
      setGpsLoading(false);
    },
    (err) => {
      setGpsLoading(false);
      if (err.code === 1) toast.error("Bạn đã từ chối quyền vị trí");
      else toast.error("Không lấy được vị trí");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}, []);

// Check GPS khi vào trang
useEffect(() => {
  const hasLocation = localStorage.getItem('userLat') && localStorage.getItem('userLng');
  if (!hasLocation && user?.uid) {
    setShowGpsModal(true);
    requestGPS(); // Tự động bật popup xin quyền
  }
}, [user?.uid, requestGPS]);
  const primaryBg = isPlan? "bg-green-500" : "bg-[#0a84ff]";


  const primaryText = isPlan? "text-green-600 dark:text-green-400" : "text-[#0a84ff]";


  const primaryBgSolid = isPlan? "bg-green-500" : "bg-[#0a84ff]";
  const [longPressChatId, setLongPressChatId] = useState<string | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const handleLongPressStart = (chatId: string) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressChatId(chatId);
      if ("vibrate" in navigator) navigator.vibrate(15);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => {
    const handleClick = () => setLongPressChatId(null);
    if (longPressChatId) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [longPressChatId]);

  const [items, setItems] = useState<ChatItem[]>([]);



  const [debounced ] = useState<string>("");




const [activeTab, setActiveTab] = useState<"all" | "unread">("all"); // Bỏ "notifications"
  const [pinned, setPinned] = useState<string[]>([]);








const [userVip, setUserVip] = useState<{tier: 'free' | 'pro' | 'elite', expiresAt?: Timestamp} | null>(null);

const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);









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
      if (typeof navigator!== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    } catch (error) {
      console.error("Failed to save pinned chats:", error);
    }
  }, []);

  
useEffect(() => {
  if (!user?.uid) return;
  const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      setUserVip(data.vip || { tier: 'free' });
    }
  });
  return () => unsub();
}, [user?.uid, db]);
  

useEffect(() => {
  if (authLoading || !user?.uid) return;
  let retryCount = 0;
  let isMounted = true;

  const setupListener = (): Unsubscribe => {
    const chatsQuery = query(collection(db, "chats"), where("members", "array-contains", user.uid));
    const unsubscribe = onSnapshot(chatsQuery, async (snapshot: QuerySnapshot<DocumentData>) => {
      retryCount = 0;
      if (!isMounted) return;
      
      try {
        const rawChats: RawChat[] = [];
        const userIdsToFetch = new Set<string>();
    snapshot.forEach((document) => {
  const chatData = document.data();

  // ẨN PHÒNG PUBLIC + CHAT NGƯỜI LẠ + CHAT 1-1 KHÔNG CÓ TÊN USER
  if (
    document.id.startsWith('public_') || 
    chatData.isPublicRoom === true || 
    chatData.isStranger === true ||
    (!chatData.isGroup && chatData.members?.length === 2 && !chatData.groupName) // THÊM DÒNG NÀY
  ) {
    return; // Bỏ qua, không thêm vào list inbox
  }

  const isGroupChat = Boolean(chatData.isGroup);
  if (isGroupChat) {
    rawChats.push({ id: document.id, c: chatData, isGroup: true });
  } else {
    const otherUserId = chatData.members?.find((memberId: string) => memberId !== user.uid);
    if (otherUserId) userIdsToFetch.add(otherUserId);
    rawChats.push({ id: document.id, c: chatData, other: otherUserId, isGroup: false });
  }
});

        const usersMap: Record<string, any> = {};
        if (userIdsToFetch.size > 0) {
          const userIds = Array.from(userIdsToFetch);
          const chunks: string[][] = [];
          for (let i = 0; i < userIds.length; i += BATCH_SIZE) chunks.push(userIds.slice(i, i + BATCH_SIZE));
          await Promise.all(chunks.map(async (chunk) => {
            const userDocs = await Promise.all(chunk.map((userId) => getDoc(doc(db, "users", userId))));
            userDocs.forEach((userDoc) => { if (userDoc.exists()) usersMap[userDoc.id] = userDoc.data(); });
          }));
        }

        const chatList: ChatItem[] = rawChats.map((raw) => {
          const chatData = raw.c;
          if (raw.isGroup) {
            return {
              uid: raw.id, chatId: raw.id, name: chatData.groupName || "Nhóm", username: "",
              avatar: chatData.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatData.groupName || "N")}&background=${isPlan? "22c55e" : "0a84ff"}&color=fff&bold=true`,
              userId: "",
              lastMessage: typeof chatData.lastMessage === 'string'? chatData.lastMessage : chatData.lastMessage?.text || "",
              lastSenderId: chatData.lastSenderId || chatData.lastMessage?.senderId,
              lastSenderName: chatData.lastSenderName,
              updatedAt: chatData.updatedAt, unreadCount: chatData.unread?.[user.uid] || 0,
              isTyping: Object.entries(chatData.typing || {}).some(([userId, isTyping]) => userId!== user.uid && Boolean(isTyping)),
              isGroup: true, members: chatData.members || [], isOnline: false,
              blockedUsers: chatData.blockedUsers || [],
              deletedFor: chatData.deletedFor || [],
            };
          } else {
            const userData = usersMap[raw.other || ""] || {};
            return {
              uid: raw.other || "", chatId: raw.id, name: userData.name || "User", username: userData.username || "",
              avatar: userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || "U")}&background=random`,
              userId: userData.userId || "",
              lastMessage: typeof chatData.lastMessage === 'string'? chatData.lastMessage : chatData.lastMessage?.text || "",
              lastSenderId: chatData.lastSenderId || chatData.lastMessage?.senderId,
              lastSenderName: "",
              updatedAt: chatData.updatedAt, isOnline: Boolean(userData.isOnline), unreadCount: chatData.unread?.[user.uid] || 0,
              isTyping: Boolean(raw.other && chatData.typing?.[raw.other]), isGroup: false,
              blockedUsers: chatData.blockedUsers || [],
              deletedFor: chatData.deletedFor || [],
            };
          }
        });

        const visibleChats = chatList.filter(chat => 
  !chat.deletedFor?.includes(user.uid) &&
  !(chat as any).isStranger === true && // Ẩn chat có isStranger: true
  !(chat.name === "User" && !chat.isGroup && !chat.username) // Ẩn chat lạ cũ tên User, không có username
);

const pinnedChats = JSON.parse(localStorage.getItem(PINNED_KEY) || "[]");
visibleChats.sort((a, b) => {
  const aIsPinned = pinnedChats.includes(a.chatId)? 1 : 0;
  const bIsPinned = pinnedChats.includes(b.chatId)? 1 : 0;
  if (aIsPinned!== bIsPinned) return bIsPinned - aIsPinned;
  const aTime = a.updatedAt?.seconds || 0;
  const bTime = b.updatedAt?.seconds || 0;
  return bTime - aTime;
});

if (isMounted) setItems(visibleChats);
      } catch (error) {
        console.error("Error processing chats:", error);
        if (isMounted) toast.error("Lỗi tải danh sách chat");
      } finally {
        // Xóa dòng này: if (isMounted) setLoading(false);
      }
    }, (error) => {
      console.error("Realtime listener error:", error);
      if (!isMounted) return;
      if (retryCount < MAX_RETRIES && error.code!== "permission-denied") {
        retryCount++;
        const delay = RETRY_DELAY * retryCount;
        setTimeout(() => { if (isMounted) setupListener(); }, delay);
      } else if (error.code!== "permission-denied") {
        toast.error("Không thể kết nối realtime");
      }
      
    });

    unsubRef.current = unsubscribe;
    return unsubscribe;
  };

  const unsubscribe = setupListener();
  return () => { 
    isMounted = false; 
    if (unsubscribe) unsubscribe(); 
    if (unsubRef.current) unsubRef.current();
  };
}, [user?.uid, authLoading, db, mode]);

  
  















const handleTogglePin = useCallback((chatId: string): void => {
  const newPinned = pinned.includes(chatId)? pinned.filter((id) => id!== chatId) : [...pinned, chatId];
  savePinned(newPinned);
  toast.success(newPinned.includes(chatId)? "Đã ghim cuộc trò chuyện" : "Đã bỏ ghim");
}, [pinned, savePinned]);

const handleDeleteChat = useCallback(async (chat: ChatItem): Promise<void> => {
  if (!user?.uid) { toast.error("Chưa đăng nhập"); return; }
  const confirmMessage = chat.isGroup? `Bạn có chắc muốn rời nhóm "${chat.name}"?` : `Xóa cuộc trò chuyện với ${chat.name}?`;
  if (!window.confirm(confirmMessage)) return;
  try {
    if (chat.isGroup) {
      await updateDoc(doc(db, "chats", chat.chatId), { members: arrayRemove(user.uid), updatedAt: new Date() });
      toast.success("Đã rời nhóm");
    } else {
      await updateDoc(doc(db, "chats", chat.chatId), {
        deletedFor: arrayUnion(user.uid),
        updatedAt: new Date()
      });
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




const filteredChats = useMemo(() => {
  const query = debounced.toLowerCase().trim();
  let filtered = items;

  // Bỏ lọc group - inbox giờ chỉ có chat 1-1 và phòng public
  if (query) {
    filtered = filtered.filter((item) => {
      const nameMatch = item.name.toLowerCase().includes(query);
      const usernameMatch = item.username.toLowerCase().includes(query);
      const userIdMatch = item.userId.toLowerCase().includes(query);
      return nameMatch || usernameMatch || userIdMatch;
    });
  }
  if (activeTab === "unread") filtered = filtered.filter((item) => (item.unreadCount || 0) > 0);
  return filtered;
}, [items, debounced, activeTab]);

const { pinnedChats, normalChats } = useMemo(() => {
  const pinnedList = filteredChats.filter((chat) => pinned.includes(chat.chatId));
  const normalList = filteredChats.filter((chat) => !pinned.includes(chat.chatId));
  return { pinnedChats: pinnedList, normalChats: normalList };
}, [filteredChats, pinned]);









const handleJoinPublicRoom = async (room: PublicRoomItem) => {
  if (!user?.uid) return toast.error("Vui lòng đăng nhập");
  if (room.isJoined) return router.push(`/rooms/${room.id}`);

  try {
    await joinPublicRoom(room, user.uid);
    if ("vibrate" in navigator) navigator.vibrate(10);
    toast.success(`Đã vào ${room.name}`, { icon: room.emoji });
    router.push(`/rooms/${room.id}`);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Lỗi vào phòng";
    toast.error(message);
  }
};
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
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] text-zinc-950 dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A] dark:text-white">
      
      <div className="sticky top-0 z-40 pt-3 px-4">
        <div className="space-y-2.5">
{/* Hàng 1: 4 nút - 1 khung riêng */}
<div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md shadow-black/[0.04] dark:shadow-black/20 border border-zinc-200/60 dark:border-zinc-800/60 px-4 py-3.5">
<div className="grid grid-cols-4 gap-3">
  {[
    { label: "Trang chủ", icon: FiHome, color: "bg-gradient-to-br from-[#0a84ff] to-purple-500", onClick: () => setActiveTab("all") },
    { label: "Bạn bè", icon: FiUsers, color: "bg-sky-500", onClick: () => router.push('/friends') },
    { label: "Nhóm", icon: FiUsers, color: "bg-purple-500", onClick: () => router.push('/groups') },
    { label: "Thông báo", icon: FiBell, color: "bg-red-500", onClick: () => router.push('/notifications') },
  ].map((item) => (
    <button
      key={item.label}
      onClick={item.onClick}
      className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform duration-150"
    >
      <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center`}>
        <item.icon className="text-white" size={22} strokeWidth={2.5} />
      </div>
      <span className="text-xs leading-4 font-[550] text-zinc-700 dark:text-zinc-300 text-center">
        {item.label}
      </span>
    </button>
  ))}
</div>
</div>

{/* Hàng 2: 3 nút - 1 khung riêng */}
<div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md shadow-black/[0.04] dark:shadow-black/20 border border-zinc-200/60 dark:border-zinc-800/60 px-4 py-3.5">
  <div className="grid grid-cols-3 gap-3">
    {[
{ label: "VIP", icon: Crown, color: "bg-gradient-to-br from-amber-400 to-orange-500", onClick: () => router.push('/vip') },
{ label: "Người lạ", icon: FiZap, color: "bg-gradient-to-br from-pink-500 to-rose-500", onClick: () => router.push('/stranger') },
      { label: "Thành Tích", icon: FiAward, color: "bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500", onClick: () => setShowLeaderboard(true) },
    ].map((item) => (
      <button
        key={item.label}
        onClick={item.onClick}
        className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform duration-150"
      >
        <div className={`w-14 h-14 ${item.color} rounded-xl flex items-center justify-center`}>
          <item.icon className="text-white" size={22} strokeWidth={2.5} />
        </div>
        <span className="text-xs leading-4 font-[550] text-zinc-700 dark:text-zinc-300 text-center">
          {item.label}
        </span>
      </button>
    ))}
  </div>
</div>
  </div>
</div>

<div className="pt-2 pb-24">
  {activeTab === "all" && (
    <div>
      <ExploreTodaySection
        initialEvents={initialEvents}
        userLat={userLat}
        userLng={userLng}
        primaryBg={primaryBg}
        onSelectEvent={setSelectedEvent}
      />

      <PublicRoomsSection userId={user?.uid} onJoinRoom={handleJoinPublicRoom} />
    </div>
  )}

  {filteredChats.length === 0? null : (
    <div>
      {pinnedChats.length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-[#8e8e93] dark:text-zinc-500 uppercase tracking-wider">
            Đã ghim
          </p>
        </div>
      )}
      <div className="bg-white dark:bg-black divide-y divide-gray-100 dark:divide-zinc-900">
        {[...pinnedChats,...normalChats].map((chat) => (
          <div key={chat.chatId} className="group relative">
            <Link
              href={
                (chat as any).isStranger? `/friends` :
                chat.chatId.startsWith('public_') || chat.isGroup? `/rooms/${chat.chatId}` :
                `/chat/${chat.chatId}`
              }
              className="flex items-center gap-3 px-4 py-2.5 active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors duration-150 select-none"
              onPointerDown={() => handleLongPressStart(chat.chatId)}
              onPointerUp={handleLongPressEnd}
              onPointerLeave={handleLongPressEnd}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="relative flex-shrink-0">
                <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-zinc-800" loading="lazy" />
                {chat.isOnline &&!chat.isGroup && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#30d158] rounded-full border-[2.5px] border-white dark:border-black" />}
              </div>
              <div className="flex-1 min-w-0 py-1">
                <div className="flex items-baseline justify-between gap-2 mb-0.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-base leading-[22px] font-[550] text-black dark:text-white truncate">{chat.name}</p>
                    {userVip?.tier === 'pro' && <span className="text-sm">💎</span>}
                    {userVip?.tier === 'elite' && <span className="text-sm animate-pulse">👑</span>}
                    {pinned.includes(chat.chatId) && <RiPushpinFill size={12} className="text-[#8e8e93] dark:text-zinc-500 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {longPressChatId === chat.chatId? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleTogglePin(chat.chatId); setLongPressChatId(null); }} className="h-6 px-2.5 bg-white dark:bg-zinc-800 rounded-md text-xs font-medium text-[#0a84ff] shadow-sm ring-1 ring-black/5 dark:ring-white/10 active:scale-95 transition-all">
                          {pinned.includes(chat.chatId)? "Bỏ ghim" : "Ghim"}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteChat(chat); setLongPressChatId(null); }} className="h-6 px-2.5 bg-white dark:bg-zinc-800 rounded-md text-xs font-medium text-[#ff3b30] shadow-sm ring-1 ring-black/5 dark:ring-white/10 active:scale-95 transition-all">
                          Xóa
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm leading-[18px] text-[#8e8e93] dark:text-zinc-500 tabular-nums">{formatMessageTime(chat.updatedAt)}</span>
                        {chat.unreadCount? (
                          <span className={`min-w-5 h-5 px-1.5 ${primaryBgSolid} rounded-full flex items-center justify-center`}>
                            <span className="text-xs leading-none font-medium text-white">{chat.unreadCount > 99? "99+" : chat.unreadCount}</span>
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {chat.isTyping? (
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        <span className={`w-1 h-1 ${primaryBgSolid} rounded-full animate-bounce [animation-delay:-0.3s]`} />
                        <span className={`w-1 h-1 ${primaryBgSolid} rounded-full animate-bounce [animation-delay:-0.15s]`} />
                        <span className={`w-1 h-1 ${primaryBgSolid} rounded-full animate-bounce`} />
                      </div>
                      <span className={`text-sm leading-[19px] ${primaryText} italic`}>đang nhập</span>
                    </div>
                  ) : (
                    <p className="text-sm leading-[19px] text-[#8e8e93] dark:text-zinc-500 truncate">
                      {chat.isGroup && chat.lastSenderName && chat.lastSenderId!== user?.uid? `${chat.lastSenderName}: ` : ""}
                      {chat.lastSenderId === user?.uid? "Bạn: " : ""}
                      {chat.lastMessage || "Bắt đầu trò chuyện"}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )}

<CreateGroupModal
  open={showCreateGroup}
  onClose={() => setShowCreateGroup(false)}
  onCreated={(groupId) => {
    router.push(`/groups/${groupId}`);
    setShowCreateGroup(false);
  }}
/>

    



</div>
</div>
      <style jsx global>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}body{overscroll-behavior-y:contain}`}</style>
<EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />

<GpsRequiredModal 
  open={showGpsModal} 
  onClose={() => setShowGpsModal(false)} 
  onRetry={requestGPS}
  loading={gpsLoading}
  mode="task" 
/>
{showLeaderboard && user?.uid && <LeaderboardModal onClose={() => setShowLeaderboard(false)} currentUserId={user.uid} />}
    </>
  );
}