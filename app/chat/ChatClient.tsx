"use client";
import GpsRequiredModal from "@/components/GpsRequiredModal";
import GroupsTab from "@/components/GroupsTab";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import CreateGroupModal from "@/components/CreateGroupModal";
import { useAuth } from "@/lib/AuthContext";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebaseDB } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";

import LeaderboardModal from "@/components/LeaderboardModal";
import { EventItem, CATEGORY_INFO } from "@/data/events";
import EventDetailModal from "@/components/EventDetailModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAppStore } from "@/store/app";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  arrayUnion,
  setDoc,
  
  limit,
  updateDoc,
  arrayRemove,
  Timestamp,
  Unsubscribe,
  QuerySnapshot,
  DocumentData,
  orderBy,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import {
  
  FiStar,
  FiUserPlus,
  FiUsers,
  FiTrendingUp,
  FiCheck,
  FiX,
  FiMic,
  
  FiHome,
  FiAward,
  FiMapPin,
  FiLoader,
  FiZap,
  FiBell,
  FiAtSign,
  FiInbox,
} from "react-icons/fi";
import { RiAddLine, RiPushpinFill } from "react-icons/ri";
import Link from "next/link";
import { toast } from "sonner";
import { Crown, Vote } from "lucide-react";

import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

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



type NotificationItem = {
  id: string;
  type: "friend_request" | "friend_accepted" | "group_invite" | "mention" | "message_request" | "system";
  fromUid: string;
  fromName: string;
  fromAvatar: string;
  title: string;
  message: string;
  chatId?: string;
  groupId?: string;
  read: boolean;
  createdAt: Timestamp;
  actionData?: any;
};

type RawChat = {
  id: string;
  c: DocumentData;
  other?: string;
  isGroup: boolean;
};
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const formatDistance = (km: number): string => {
  return km < 1? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
};
const PINNED_KEY = "pinned_chats";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;
const BATCH_SIZE = 10;

export default function ChatClient() {
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
  const primaryHover = isPlan? "hover:bg-green-600" : "hover:bg-[#007aff]";
  const primaryActive = isPlan? "active:bg-green-700" : "active:bg-[#0051d5]";
  const primaryText = isPlan? "text-green-600 dark:text-green-400" : "text-[#0a84ff]";
  const primaryRing = isPlan? "focus:ring-green-500/20" : "focus:ring-[#0a84ff]/20";
  const primaryBorder = isPlan? "focus:border-green-500" : "focus:border-[#0a84ff]";
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

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [debounced ] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  const [notifLoading, setNotifLoading] = useState<boolean>(false);

const [activeTab, setActiveTab] = useState<"all" | "unread" | "group" | "notifications">("all");
  const [pinned, setPinned] = useState<string[]>([]);




// State
const [showStranger, setShowStranger] = useState(false);
const [strangerInterests, setStrangerInterests] = useState<string[]>([]);
const [strangerAgeRange, setStrangerAgeRange] = useState<"18-22" | "23-27" | "28+">("18-22");
const [strangerGender, setStrangerGender] = useState<"all" | "male" | "female">("all");
const [voiceIntroBlob, setVoiceIntroBlob] = useState<Blob | null>(null);
const [isRecording, setIsRecording] = useState(false);
const [userKarma, setUserKarma] = useState(100);
const [findingStranger, setFindingStranger] = useState(false);

const INTEREST_TAGS = ["🎮 Game", "🎵 Nhạc", "📚 Học", "💼 Việc làm", "🎬 Phim", "✈️ Du lịch", "💪 Gym", "🍜 Ăn uống", "💕 Hẹn hò", "😂 Hài", "🎨 Vẽ", "📱 Tech"];

// Check karma
useEffect(() => {
  if (!user?.uid) return;
  onSnapshot(doc(db, "users", user.uid), (snap) => {
    setUserKarma(snap.data()?.karma || 100);
  });
}, [user?.uid]);

// Ghi âm
const mediaRecorderRef = useRef<MediaRecorder | null>(null);
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    setVoiceIntroBlob(new Blob(chunks, { type: 'audio/webm' }));
    setIsRecording(false);
    stream.getTracks().forEach(t => t.stop());
  };
  recorder.start();
  mediaRecorderRef.current = recorder;
  setIsRecording(true);
  setTimeout(() => recorder.state!== 'inactive' && recorder.stop(), 10000);
};

// Tìm người lạ
const handleFindStranger = async () => {
  if (!user?.uid || userKarma < 50) {
    toast.error("Karma dưới 50, không thể chat người lạ");
    return;
  }
  if (!voiceIntroBlob) return toast.error("Cần ghi âm lời chào 10s");
  if (strangerInterests.length < 3) return toast.error("Chọn ít nhất 3 sở thích");

  setFindingStranger(true);
  try {
    const storage = getStorage();
    const voiceRef = ref(storage, `voice_intro/${user.uid}_${Date.now()}.webm`);
    await uploadBytes(voiceRef, voiceIntroBlob);
    const voiceUrl = await getDownloadURL(voiceRef);

    const functions = getFunctions(getApp(), "asia-southeast1");
    const findFn = httpsCallable(functions, 'findStranger');

    const result = await findFn({
      interests: strangerInterests,
      ageRange: strangerAgeRange,
      wantGender: strangerGender,
      voiceUrl
    });

    const data = result.data as { chatId: string, matched: boolean };
    setShowStranger(false);

    if (data.matched) {
      router.push(`/stranger/${data.chatId}`);
    } else {
      toast.info("Đang tìm... Sẽ tự vào khi match");
  const unsub = onSnapshot(doc(db, "stranger_queue", user.uid), (snap) => {
  const data = snap.data();
  if (data?.matchedChatId) {
    router.push(`/stranger/${data.matchedChatId}`);
    unsub();
  }
});
    }
  } catch (e: any) {
    toast.error(e.message);
  } finally {
    setFindingStranger(false);
  }
};

  const [showPoll, setShowPoll] = useState<boolean>(false);
  const [showVip, setShowVip] = useState<boolean>(false);
const [userVip, setUserVip] = useState<{tier: 'free' | 'pro' | 'elite', expiresAt?: Timestamp} | null>(null);
const [purchasingVip, setPurchasingVip] = useState<boolean>(false);
const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [eventsData, setEventsData] = useState<EventItem[]>([]);
const [eventsLoading, setEventsLoading] = useState<boolean>(true);
// THÊM DÒNG NÀY
const [publicRooms, setPublicRooms] = useState<PublicRoomItem[]>([]);
const [groupItems, setGroupItems] = useState<ChatItem[]>([]);

// Query groups riêng
useEffect(() => {
  if (authLoading || !user?.uid) return;
  
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
  }, (err) => {
    console.error("Groups error:", err);
  });

  return () => unsub();
}, [user?.uid, authLoading, db]);
const [publicRoomsLoading, setPublicRoomsLoading] = useState(true);
const [showPublicRooms, setShowPublicRooms] = useState(false);

type PublicRoomItem = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  memberCount: number;
  onlineCount: number;
  lastMessage?: string;
  isJoined: boolean;
  isHot: boolean;
};

const PUBLIC_CITIES = [
  { id: "hcm", name: "SÀI GÒN", emoji: "🏙️", color: "from-blue-500 to-cyan-500" },
  { id: "hn", name: "HÀ NỘI", emoji: "🏛️", color: "from-orange-500 to-red-500" },
  { id: "dn", name: "ĐÀ NẴNG", emoji: "🌉", color: "from-teal-500 to-emerald-500" },
  { id: "ct", name: "CẦN THƠ", emoji: "🌾", color: "from-green-500 to-lime-500" },
  { id: "hp", name: "HẢI PHÒNG", emoji: "⚓", color: "from-purple-500 to-pink-500" },
  { id: "dl", name: "ĐÀ LẠT", emoji: "🌸", color: "from-pink-500 to-rose-500" },
  { id: "nt", name: "NHA TRANG", emoji: "🏖️", color: "from-sky-500 to-blue-500" },
  { id: "hue", name: "HUẾ", emoji: "🏯", color: "from-violet-500 to-purple-500" },
  { id: "vt", name: "VŨNG TÀU", emoji: "🌊", color: "from-cyan-500 to-blue-500" },
  { id: "pq", name: "PHÚ QUỐC", emoji: "🏝️", color: "from-emerald-500 to-teal-500" },
];
// Fetch events từ API thay vì Firestore trực tiếp
useEffect(() => {
  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/admin/events', { cache: 'no-store' });
      const data = await res.json();
      console.log('Events from API:', data.events); // Debug
      setEventsData(data.events || []);
    } catch (error) {
      console.error("Events fetch error:", error);
      setEventsData([]);
    } finally {
      setEventsLoading(false);
    }
  };

  fetchEvents();
}, []); // Bỏ dependency [db]
// THÊM DÒNG NÀY
useEffect(() => {
  // 1. Set data ảo ngay lập tức để có card hiển thị
  const defaultRooms = PUBLIC_CITIES.map((city) => ({
    id: `public_${city.id}`,
    name: city.name,
    emoji: city.emoji,
    color: city.color,
    memberCount: 0,
    onlineCount: 0,
    lastMessage: `Chào mừng đến ${city.name}!`,
    isJoined: false,
    isHot: false,
  }));
  setPublicRooms(defaultRooms);
  setPublicRoomsLoading(false);

  // 2. Nếu có user thì listen Firestore để update số thật
  if (!user?.uid) return;

  const unsubs: (() => void)[] = [];
  PUBLIC_CITIES.forEach((city) => {
    const roomId = `public_${city.id}`;
    // ĐỔI DÒNG NÀY: "public_rooms" -> "chats"
    const unsub = onSnapshot(doc(db, "chats", roomId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPublicRooms((prev) => {
          const filtered = prev.filter((r) => r.id !== roomId);
          const newRoom: PublicRoomItem = {
            id: roomId,
            name: city.name,
            emoji: city.emoji,
            color: city.color,
            memberCount: data.memberCount || data.members?.length || 0, // fallback thêm
            onlineCount: data.onlineCount || 0,
            lastMessage: data.lastMessage || `Chào mừng đến ${city.name}!`,
            isJoined: data.members?.includes(user.uid) || false,
            isHot: (data.onlineCount || 0) > 20,
          };
          return [...filtered, newRoom].sort((a, b) => b.onlineCount - a.onlineCount);
        });
      }
      // Nếu snap không tồn tại thì giữ nguyên default 0 ở trên
    }, (error) => {
      console.error("Public room error:", error);
    });
    unsubs.push(unsub);
  });

  return () => unsubs.forEach((u) => u());
}, [user?.uid, db]);
type VipTier = {
  id: 'pro' | 'elite';
  name: string;
  price: number;
  priceText: string;
  duration: string;
  features: string[];
  color: string;
  badge: string;
};

const VIP_TIERS: VipTier[] = [
  {
    id: 'pro',
    name: 'VIP Pro',
    price: 49000,
    priceText: '49K',
    duration: '/tháng',
    color: 'from-blue-500 to-cyan-500',
    badge: '🔥',
    features: [
      'Huy hiệu VIP xanh cạnh tên',
      'Tạo nhóm 200 thành viên',
      'Ghim 10 cuộc trò chuyện',
      'Theme độc quyền',
      'Tải file 100MB',
      'Không quảng cáo'
    ]
  },
  {
    id: 'elite',
    name: 'VIP Elite',
    price: 149000,
    priceText: '149K',
    duration: '/tháng',
    color: 'from-amber-400 via-orange-500 to-pink-500',
    badge: '👑',
    features: [
      'Huy hiệu VIP vàng + hiệu ứng',
      'Tạo nhóm 500 thành viên',
      'Ghim không giới hạn',
      'Tất cả theme + avatar động',
      'Tải file 500MB',
      'Xem ai đã đọc tin nhắn',
      'Thu hồi tin nhắn không giới hạn',
      'Ưu tiên hỗ trợ 24/7'
    ]
  }
];
const [pollQuestion, setPollQuestion] = useState<string>("");
const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
const [creatingPoll, setCreatingPoll] = useState<boolean>(false);







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

    setNotifLoading(true);
    const notifRef = collection(db, "notifications", user.uid, "items");
    const q = query(notifRef, orderBy("createdAt", "desc"), limit(50));

    const unsub = onSnapshot(q, (snapshot) => {
      const notifs: NotificationItem[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id,...doc.data() } as NotificationItem);
      });
      setNotifications(notifs);
      setNotifLoading(false);
    }, (error) => {
      console.error("Notifications error:", error);
      setNotifLoading(false);
    });

    return () => unsub();
  }, [user?.uid, db]);
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
      setLoading(true);
      try {
        const rawChats: RawChat[] = [];
        const userIdsToFetch = new Set<string>();
        snapshot.forEach((document) => {
          const chatData = document.data();

          // THÊM 3 DÒNG NÀY ĐỂ ẨN PHÒNG PUBLIC
          if (document.id.startsWith('public_') || chatData.isPublicRoom === true) {
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

          const visibleChats = chatList.filter(chat =>!chat.deletedFor?.includes(user.uid));
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
          if (isMounted) setLoading(false);
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
        setLoading(false);
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
  }, [user?.uid, authLoading, db, mode]); // đổi isPlan -> mode

  
  



const handleAcceptFriendRequest = useCallback(async (notif: NotificationItem) => {
  if (!user?.uid) return;

  try {
    const functions = getFunctions(getApp(), "asia-southeast1");
    const acceptFn = httpsCallable(functions, 'acceptFriendRequest');

    const result = await acceptFn({
      fromUid: notif.fromUid,
      notifId: notif.id
    });

    const data = result.data as { chatId: string };
    toast.success(`Đã kết bạn với ${notif.fromName}`);
    router.push(`/chat/${data.chatId}`);

  } catch (error: any) {
    console.error(error);
    if (error.code === 'functions/not-found') {
      toast.error("Lời mời đã hết hạn");
    } else if (error.code === 'functions/already-exists') {
      toast.error("Các bạn đã là bạn bè");
    } else {
      toast.error("Lỗi: " + error.message);
    }
  }
}, [user?.uid, router]);



const handleDeclineFriendRequest = useCallback(async (notif: NotificationItem) => {
  const auth = getAuth();
  await auth.authStateReady();
  const currentUser = auth.currentUser;
  if (!currentUser?.uid) return;

  try {
    const batch = writeBatch(db);
    batch.delete(doc(db, "notifications", currentUser.uid, "items", notif.id));
    const requestId = `${notif.fromUid}_${currentUser.uid}`;
    batch.delete(doc(db, "friendRequests", requestId));
    await batch.commit();
    toast.success("Đã từ chối lời mời");
  } catch (error) {
    console.error("Decline error:", error);
    toast.error("Lỗi từ chối");
  }
}, [db]);

const handleMarkNotificationRead = useCallback(async (notifId: string) => {
  if (!user?.uid) return;
  try {
    await updateDoc(doc(db, "notifications", user.uid, "items", notifId), {
      read: true
    });
  } catch (error) {
    console.error("Mark read error:", error);
  }
}, [user?.uid, db]);

const handleMarkAllRead = useCallback(async () => {
  if (!user?.uid) return;
  try {
    const batch = writeBatch(db);
    notifications.filter(n =>!n.read).forEach(notif => {
      batch.update(doc(db, "notifications", user.uid, "items", notif.id), { read: true });
    });
    await batch.commit();
    toast.success("Đã đánh dấu tất cả");
  } catch (error) {
    console.error("Mark all read error:", error);
  }
}, [user?.uid, db, notifications]);

const handleClearAllNotifications = useCallback(async () => {
  if (!user?.uid) return;
  if (!confirm("Xóa tất cả thông báo?")) return;
  try {
    const batch = writeBatch(db);
    notifications.forEach(notif => {
      batch.delete(doc(db, "notifications", user.uid, "items", notif.id));
    });
    await batch.commit();
    toast.success("Đã xóa tất cả");
  } catch (error) {
    console.error("Clear all error:", error);
  }
}, [user?.uid, db, notifications]);



const handleCreatePoll = useCallback(async (targetChatId?: string): Promise<void> => {
  if (!user?.uid) return;
  const q = pollQuestion.trim();
  const opts = pollOptions.map(o => o.trim()).filter(o => o);
  
  if (!q) { toast.error("Nhập câu hỏi"); return; }
  if (opts.length < 2) { toast.error("Cần ít nhất 2 lựa chọn"); return; }

  setCreatingPoll(true);
  try {
    // Nếu đang trong chat thì gửi vào chat đó, không thì chọn chat đầu tiên
    const chatId = targetChatId || items.find(i => !i.isGroup)?.chatId;
    if (!chatId) throw new Error("Chọn cuộc trò chuyện để gửi bình chọn");

    const pollRef = doc(collection(db, "chats", chatId, "polls"));
    await setDoc(pollRef, {
      question: q,
      options: opts.map(text => ({ text, votes: [] })),
      createdBy: user.uid,
      createdByName: user.displayName || "Bạn",
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24h
      isActive: true,
    });

    // Gửi message báo có poll
    const msgRef = doc(collection(db, "chats", chatId, "messages"));
    await setDoc(msgRef, {
      type: "poll",
      pollId: pollRef.id,
      text: `📊 ${q}`,
      senderId: user.uid,
      createdAt: serverTimestamp(),
    });

    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: `📊 Bình chọn: ${q}`,
      lastSenderId: user.uid,
      updatedAt: serverTimestamp(),
    });

    toast.success("Đã tạo bình chọn");
    setShowPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    router.push(`/chat/${chatId}`);
  } catch (error: any) {
    toast.error(error.message || "Lỗi tạo bình chọn");
  } finally {
    setCreatingPoll(false);
  }
}, [user, pollQuestion, pollOptions, items, db, router]);
const handlePurchaseVip = useCallback(async (tierId: 'pro' | 'elite') => {
  if (!user?.uid) return;
  const tier = VIP_TIERS.find(t => t.id === tierId);
  if (!tier) return;

  setPurchasingVip(true);
  try {
    // TODO: Tích hợp cổng thanh toán thật. Tạm thời mock
    await new Promise(r => setTimeout(r, 1500));

    const expiresAt = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    await updateDoc(doc(db, "users", user.uid), {
      vip: {
        tier: tierId,
        purchasedAt: serverTimestamp(),
        expiresAt: expiresAt,
        price: tier.price
      }
    });

    toast.success(`Đã nâng cấp ${tier.name}!`);
    setShowVip(false);
    if ("vibrate" in navigator) navigator.vibrate([100, 50, 100]);
  } catch (error: any) {
    toast.error("Lỗi thanh toán: " + error.message);
  } finally {
    setPurchasingVip(false);
  }
}, [user, db]);
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


const formatNotifTime = useCallback((timestamp?: Timestamp): string => {
  if (!timestamp?.toDate) return "";
  return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: vi });
}, []);

const filteredChats = useMemo(() => {
  const query = debounced.toLowerCase().trim();
  let filtered = items;

  // TÁCH CHAT 1-1 RA KHỎI TAB ALL
  if (activeTab === "all") {
    filtered = filtered.filter(item => item.isGroup); // Chỉ lấy group + public room
  } else if (activeTab === "group") {
    filtered = filtered.filter(item => item.isGroup);
  }

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
}, [items, debounced, activeTab, user?.uid]);

const { pinnedChats, normalChats } = useMemo(() => {
  const pinnedList = filteredChats.filter((chat) => pinned.includes(chat.chatId));
  const normalList = filteredChats.filter((chat) =>!pinned.includes(chat.chatId));
  return { pinnedChats: pinnedList, normalChats: normalList };
}, [filteredChats, pinned]);



const unreadNotifications = useMemo(() => notifications.filter(n =>!n.read).length, [notifications]);

const groupedNotifications = useMemo(() => {
  const today: NotificationItem[] = [];
  const earlier: NotificationItem[] = [];

  notifications.forEach(notif => {
    if (notif.createdAt?.toDate && isToday(notif.createdAt.toDate())) {
      today.push(notif);
    } else {
      earlier.push(notif);
    }
  });

  return { today, earlier };
}, [notifications]);
const getNotificationIcon = (type: string) => {
  switch (type) {
    case "friend_request": return <FiUserPlus className="text-[#0a84ff]" size={18} />;
    case "friend_accepted": return <FiCheck className="text-[#30d158]" size={18} />;
    case "group_invite": return <FiUsers className="text-[#ff9500]" size={18} />;
    case "mention": return <FiAtSign className="text-[#af52de]" size={18} />;
    case "message_request": return <FiInbox className="text-[#ff3b30]" size={18} />;
    default: return <FiBell className="text-gray-500" size={18} />;
  }
};



const handleJoinPublicRoom = async (room: PublicRoomItem) => {
  if (!user?.uid) return toast.error("Vui lòng đăng nhập");
  if (room.isJoined) return router.push(`/rooms/${room.id}`);

  try {
    const roomRef = doc(db, "chats", room.id);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      // Tạo phòng mới nếu chưa có - đúng format collection chats
      await setDoc(roomRef, {
        isGroup: true,
        isPublicRoom: true,
        groupName: room.name,
        emoji: room.emoji,
        color: room.color,
        groupAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(room.emoji)}&background=random&color=fff&bold=true&size=128`,
        members: [user.uid],
        memberCount: 1,
        onlineCount: 1,
        lastMessage: `Chào mừng đến ${room.name}!`,
        lastSenderId: "system",
        lastSenderName: "Hệ thống",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        blockedUsers: [],
      });
    } else {
      // Join phòng đã có - chỉ cần add vào members
      await updateDoc(roomRef, {
        members: arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
      });
    }

    if ("vibrate" in navigator) navigator.vibrate(10);
    toast.success(`Đã vào ${room.name}`, { icon: room.emoji });
    router.push(`/rooms/${room.id}`);
  } catch (e: any) {
    console.error(e);
    toast.error("Lỗi vào phòng: " + e.message);
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
  <div className="grid grid-cols-5 gap-2">
    {[
      { label: "Trang chủ", icon: FiHome, color: "bg-gradient-to-br from-[#0a84ff] to-purple-500", onClick: () => setActiveTab("all") },
{ label: "Mời bạn", icon: FiUserPlus, color: "bg-blue-500", onClick: () => router.push('/friends/add') },
{ label: "Bạn bè", icon: FiUsers, color: "bg-sky-500", onClick: () => router.push('/friends') },
      { label: "Nhóm", icon: FiUsers, color: "bg-purple-500", onClick: () => setActiveTab("group") },
      { label: "Thông báo", icon: FiBell, color: "bg-red-500", onClick: () => setActiveTab("notifications") },
    ].map((item) => (
      <button
        key={item.label}
        onClick={item.onClick}
        className="flex flex-col items-center gap-1 active:scale-95 transition-transform duration-150"
      >
        <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center relative`}>
          <item.icon className="text-white" size={20} strokeWidth={2.5} />
          {item.label === "Thông báo" && unreadNotifications > 0 && (
            <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
              <span className="text-[10px] font-[700] text-white">{unreadNotifications > 9? '9+' : unreadNotifications}</span>
            </div>
          )}
        </div>
        <span className="text-[10px] leading-3 font-[550] text-zinc-700 dark:text-zinc-300 text-center">
          {item.label}
        </span>
      </button>
    ))}
  </div>
</div>

    {/* Hàng 2: 4 nút - 1 khung riêng */}
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-md shadow-black/[0.04] dark:shadow-black/20 border border-zinc-200/60 dark:border-zinc-800/60 px-4 py-3.5">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Bình chọn", icon: Vote, color: "bg-gradient-to-br from-indigo-500 to-purple-500", onClick: () => setShowPoll(true) },
          { label: "VIP", icon: Crown, color: "bg-gradient-to-br from-amber-400 to-orange-500", onClick: () => setShowVip(true) },
          { label: "Người lạ", icon: FiZap, color: "bg-gradient-to-br from-pink-500 to-rose-500", onClick: () => setShowStranger(true) },
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
    <div className="px-4 pt-4 space-y-3">
      {/* 1. Title Khám phá hôm nay */}
      <div className="flex items-center justify-between mb-3 px-1">
  <h3 className="text-sm font-[700] flex items-center gap-1.5">
    <span className="text-lg">🔥</span>
    Khám phá hôm nay
  </h3>
  <button
    onClick={() => router.push('/explore')}
    className="text-xs font-[600] text-[#0a84ff] active:opacity-60 transition-opacity"
  >
    Xem thêm
  </button>
</div>

      {/* 2. Filter Category */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-[600] whitespace-nowrap ${
         !selectedCategory
           ? `${primaryBg} text-white`
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
          }`}
        >
          Tất cả
        </button>
        {Object.entries(CATEGORY_INFO).map(([key, cat]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-[600] whitespace-nowrap flex items-center gap-1 ${
              selectedCategory === key
              ? `${primaryBg} text-white`
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

 {/* 3. List event */}
<div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4">
{eventsLoading? (
  <div className="flex-shrink-0 w-full snap-center h-64 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
) : (selectedCategory? eventsData.filter(e => e.category === selectedCategory) : eventsData)
   .map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedEvent(item)}
            className="flex-shrink-0 w-full snap-center bg-white dark:bg-zinc-900 rounded-2xl shadow-md shadow-black/[0.04] border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden active:scale-[0.98] transition-transform text-left"
          >
            <div className="relative h-32">
              <img src={item.image} className="w-full h-full object-cover" loading="lazy" alt={item.title} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0" />
              <div className={`absolute top-2 left-2 px-2 py-0.5 bg-gradient-to-r ${item.tagColor} rounded-md`}>
                <span className="text-[10px] font-[800] text-white">{item.tag}</span>
              </div>
          {(item.rating || 0) > 0 && (
  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/40 backdrop-blur-md rounded-md flex items-center gap-1">
    <FiStar className="text-amber-400" size={10} fill="currentColor" />
    <span className="text-xs font-[700] text-white">
      {item.rating}{(item.reviews || 0) > 0 && ` (${item.reviews})`}
    </span>
  </div>
)}
              <div className="absolute bottom-2 left-3 right-3">
                <div className="flex items-center gap-1.5 text-white">
                  <span className="text-lg">{item.icon}</span>
                  <h4 className="text-base font-[700] drop-shadow-lg">{item.title}</h4>
                </div>
              </div>
            </div>
         <div className="p-3">
  <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-2 line-clamp-2">{item.desc}</p>
  <div className="flex items-center justify-between text-xs text-[#8e8e93]">
    <span className="flex items-center gap-1">
      <FiUsers size={12} />
      {item.joined} người
    </span>
  <span className="flex items-center gap-1">
  <FiMapPin size={12} />
  {item.province} • {userLat && userLng && item.lat && item.lng
    ? formatDistance(getDistanceKm(userLat, userLng, item.lat, item.lng))
    : '?km'}
</span>
  </div>
</div>
          </button>
        ))}
</div>
    </div>


<div className="px-4 pt-6">
  <div className="flex items-center justify-between mb-3 px-1">
    <h3 className="text-sm font-[700] flex items-center gap-1.5">
      <span className="text-lg">💬</span>
      Phòng Chat Công Cộng
    </h3>
    <button
      onClick={() => setShowPublicRooms(true)}
      className="text-xs font-[600] text-[#0a84ff] active:opacity-60 transition-opacity"
    >
      Xem tất cả
    </button>
  </div>

<div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
  {publicRoomsLoading? (
    [1,2,3,4].map(i => (
      <div key={i} className="flex-shrink-0 w-36 h-36 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
    ))
  ) : publicRooms.slice(0, 8).map((room) => (
    <button
      key={room.id}
      onClick={() => handleJoinPublicRoom(room)}
      className="flex-shrink-0 w-36 bg-white dark:bg-zinc-900 rounded-2xl shadow-md shadow-black/[0.04] border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden active:scale-[0.98] transition-transform text-left"
    >
        <div className={`relative h-20 bg-gradient-to-br ${room.color} flex items-center justify-center`}>
          <span className="text-4xl drop-shadow-lg">{room.emoji}</span>
          {room.isHot && (
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-red-500 rounded-md flex items-center gap-0.5">
              <FiTrendingUp size={10} className="text-white" />
              <span className="text-sm font-[800] text-white">HOT</span>
            </div>
          )}
          {room.isJoined && (
            <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
              <FiCheck className="text-white" size={12} strokeWidth={3} />
            </div>
          )}
        </div>
        <div className="p-2.5">
          <h4 className="text-sm font-[700] mb-1 tracking-tight">{room.name}</h4>
        <div className="flex items-center justify-between text-sm text-[#8e8e93]">
  <span className="flex items-center gap-1">
    <FiUsers size={11} />
    <span className="font-[600]">{room.memberCount || 0}</span>
  </span>
  <span className="flex items-center gap-1">
    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
    <span className="font-[600]">{room.onlineCount || 0}</span>
  </span>
</div>
        </div>
      </button>
    ))}
  </div>
</div>
     </div> 
)} 

 {activeTab === "group" && ( 
  <div className="pt-3">
    <GroupsTab
      groups={groupItems} // Dùng groupItems thay vì items.filter
      pinned={pinned}
      onTogglePin={handleTogglePin}
      onCreateGroup={() => setShowCreateGroup(true)}
      loading={loading}
    />
  </div>
)}
  {activeTab === "notifications"? (
    notifLoading? (
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    ) : notifications.length === 0? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
                <div className="w-[72px] h-[72px] bg-[#f2f2f7] dark:bg-zinc-900 rounded-[20px] flex items-center justify-center mb-4">
                  <FiBell className="text-gray-400" size={30} strokeWidth={1.5} />
                </div>
                <h3 className="text-[20px] font-semibold mb-1.5">Chưa có thông báo</h3>
                <p className="text-[15px] text-[#8e8e93] dark:text-zinc-500 max-w-[280px] leading-[20px]">Thông báo về lời mời kết bạn, nhóm và tin nhắn sẽ hiện ở đây</p>
              </div>
            ) : (
              <div>
                <div className="sticky top-[104px] z-10 px-4 py-2.5 bg-gray-50/80 dark:bg-zinc-950/50 backdrop-blur-sm border-b border-gray-100 dark:border-zinc-900 flex items-center justify-between">
                  <p className="text-[12px] text-[#8e8e93] dark:text-zinc-500 font-medium">{unreadNotifications} chưa đọc</p>
                  <div className="flex items-center gap-3">
                    <button onClick={handleMarkAllRead} className={`text-[12px] ${primaryText} font-medium`}>Đọc tất cả</button>
                    <button onClick={handleClearAllNotifications} className="text-[12px] text-[#ff3b30] font-medium">Xóa tất cả</button>
                  </div>
                </div>
         {groupedNotifications.today.length > 0 && (
  <div>
    <div className="px-4 pt-3 pb-1"><p className="text-[12px] font-medium text-[#8e8e93] dark:text-zinc-500 uppercase tracking-wider">Hôm nay</p></div>
    <div className="divide-y divide-gray-100 dark:divide-zinc-900">
      {groupedNotifications.today.map((notif) => (
        <div key={notif.id} className={`px-4 py-3 flex items-start gap-3 ${!notif.read? "bg-[#0a84ff]/[0.04] dark:bg-[#0a84ff]/[0.08]" : ""} hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors`}>
          <div className="relative flex-shrink-0 mt-0.5">
            <img src={notif.fromAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.fromName)}&background=random`} alt={notif.fromName} className="w-12 h-12 rounded-full object-cover" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center border-2 border-white dark:border-black">
              {getNotificationIcon(notif.type)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] leading-[20px]"><span className="font-[550]">{notif.fromName}</span> <span className="text-[#3a3c] dark:text-zinc-300">{notif.message}</span></p>
            <p className="text-[13px] text-[#8e8e93] mt-0.5">{formatNotifTime(notif.createdAt)}</p>
            {notif.type === "friend_request" &&!notif.read && (
              <div className="flex items-center gap-2 mt-2.5">
                <button onClick={() => handleAcceptFriendRequest(notif)} className={`h-7 px-4 ${primaryBg} ${primaryHover} text-white rounded-full text-[13px] font-medium`}>Chấp nhận</button>
                <button onClick={() => handleDeclineFriendRequest(notif)} className="h-7 px-4 bg-[#f2f2f7] dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full text-[13px] font-medium">Từ chối</button>
              </div>
            )}
            {(notif.type === "group_invite" || notif.type === "mention") && notif.chatId && (
              <button onClick={() => { handleMarkNotificationRead(notif.id); router.push(`/chat/${notif.chatId}`); }} className={`mt-2.5 h-7 px-4 ${primaryBg} ${primaryHover} text-white rounded-full text-[13px] font-medium`}>Xem</button>
            )}
          </div>
          {!notif.read && <div className="w-2 h-2 bg-[#0a84ff] rounded-full flex-shrink-0 mt-2" />}
        </div>
      ))}
    </div>
  </div>
)}
{groupedNotifications.earlier.length > 0 && (
  <div>
    <div className="px-4 pt-4 pb-1"><p className="text-[12px] font-medium text-[#8e8e93] dark:text-zinc-500 uppercase tracking-wider">Trước đó</p></div>
    <div className="divide-y divide-gray-100 dark:divide-zinc-900">
      {groupedNotifications.earlier.map((notif) => (
        <div key={notif.id} className={`px-4 py-3 flex items-start gap-3 ${!notif.read? "bg-[#0a84ff]/[0.04] dark:bg-[#0a84ff]/[0.08]" : "opacity-70"} hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors`}>
          <div className="relative flex-shrink-0 mt-0.5">
            <img src={notif.fromAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.fromName)}&background=random`} alt={notif.fromName} className="w-12 h-12 rounded-full object-cover" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center border-2 border-white dark:border-black">
              {getNotificationIcon(notif.type)}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] leading-[20px]"><span className="font-[550]">{notif.fromName}</span> <span className="text-[#3a3a3c] dark:text-zinc-300">{notif.message}</span></p>
            <p className="text-[13px] text-[#8e8e93] mt-0.5">{formatNotifTime(notif.createdAt)}</p>
          </div>
          {!notif.read && <div className="w-2 h-2 bg-[#0a84ff] rounded-full flex-shrink-0 mt-2" />}
        </div>
      ))}
    </div>
  </div>
)}
              </div>
            )
 ) : loading? (
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
) : filteredChats.length === 0? null : (
  <div>
    {pinnedChats.length > 0 && <div className="px-4 pt-3 pb-1"><p className="text-xs font-medium text-[#8e8e93] dark:text-zinc-500 uppercase tracking-wider">Đã ghim</p></div>}
    <div className="bg-white dark:bg-black divide-y divide-gray-100 dark:divide-zinc-900">
      {[...pinnedChats,...normalChats].map((chat) => (
        <div key={chat.chatId} className="group relative">
          <Link
            href={chat.chatId.startsWith('public_') || chat.isGroup? `/rooms/${chat.chatId}` : `/chat/${chat.chatId}`}
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

    


{showPoll && (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl" onClick={() => setShowPoll(false)} />
    <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="w-9 h-1 bg-black/15 dark:bg-white/15 rounded-full mx-auto mt-2.5 sm:hidden" />
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-black/5 dark:border-white/5">
        <h2 className="text-xl font-semibold">Tạo bình chọn</h2>
        <button onClick={() => setShowPoll(false)} className="w-7 h-7 -mr-1 flex items-center justify-center text-[#8e8e93]">
          <FiX size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-[#8e8e93] mb-2 block">Câu hỏi</label>
          <input
            type="text"
            value={pollQuestion}
         onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Vd: Đi ăn ở đâu tối nay?"
            className={`w-full h-11 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm outline-none ${primaryBorder} focus:ring-4 ${primaryRing}`}
            maxLength={100}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-[#8e8e93] mb-2 block">Lựa chọn</label>
          <div className="space-y-2">
            {pollOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[idx] = e.target.value;
                    setPollOptions(newOpts);
                  }}
                  placeholder={`Lựa chọn ${idx + 1}`}
               
                  className="flex-1 h-11 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#0a84ff]/20"
                  maxLength={50}
                />
                {pollOptions.length > 2 && (
                  <button
                    onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                    className="w-9 h-9 flex items-center justify-center text-red-500"
                  >
                    <FiX size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {pollOptions.length < 6 && (
            <button
              onClick={() => setPollOptions([...pollOptions, ""])}
              className={`mt-2 text-sm ${primaryText} font-medium flex items-center gap-1`}
            >
              <RiAddLine size={18} /> Thêm lựa chọn
            </button>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-black/5 dark:border-white/5">
        <button
          onClick={() => handleCreatePoll()}
          disabled={creatingPoll || !pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
          className={`w-full h-11 ${primaryBg} ${primaryHover} ${primaryActive} disabled:opacity-40 text-white rounded-xl text-sm font-[550] transition-all active:scale-[0.98] flex items-center justify-center gap-2`}
        >
          {creatingPoll && <FiLoader className="animate-spin" size={18} />}
          {creatingPoll ? "Đang tạo..." : "Tạo bình chọn"}
        </button>
      </div>
    </div>
  </div>
)}
  {showStranger && (
  <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl" onClick={() => setShowStranger(false)} />
    <div className="relative w-full sm:max-w-[440px] bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col">
      <div className="p-5 space-y-5 overflow-auto">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-pink-500/50">
            <FiZap className="text-white" size={36} />
          </div>
          <h2 className="text-sm font-bold">Chat 1-1 Người Lạ</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            <FiStar className="text-amber-500" size={16} />
            <span className="text-sm font-[600]">{userKarma} Karma</span>
          </div>
        </div>

        {userKarma < 70 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">
            Karma thấp! Chat tử tế để không bị cấm
          </div>
        )}

        <div>
          <label className="text-sm font-[600] mb-2 block">Sở thích *</label>
          <div className="grid grid-cols-3 gap-2">
            {INTEREST_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setStrangerInterests(prev =>
                  prev.includes(tag)? prev.filter(t => t!== tag) : [...prev, tag].slice(0,5)
                )}
                className={`h-10 rounded-xl text-sm font-[550] ${
                  strangerInterests.includes(tag)
                 ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white shadow-lg'
                    : 'bg-zinc-100 dark:bg-zinc-800'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-[600] mb-2 block">Độ tuổi</label>
          <div className="grid grid-cols-3 gap-2">
            {["18-22", "23-27", "28+"].map(age => (
              <button key={age} onClick={() => setStrangerAgeRange(age as any)}
                className={`h-11 rounded-xl text-sm font-[550] ${strangerAgeRange === age? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                {age}
              </button>
            ))}
          </div>
        </div>
<div>
  <label className="text-sm font-[600] mb-2 block">Giới tính muốn chat</label>
  <div className="grid grid-cols-3 gap-2">
    {[
      { value: "all", label: "Tất cả" },
      { value: "male", label: "Nam" },
      { value: "female", label: "Nữ" }
    ].map(opt => (
      <button
        key={opt.value}
        onClick={() => setStrangerGender(opt.value as any)}
        className={`h-11 rounded-xl text-sm font-[550] ${
          strangerGender === opt.value
           ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white'
            : 'bg-zinc-100 dark:bg-zinc-800'
        }`}
      >
        {opt.label}
      </button>
    ))}
  </div>
</div>
        <div>
          <label className="text-sm font-[600] mb-2 block">Lời chào 10s *</label>
          {!voiceIntroBlob? (
            <button onTouchStart={startRecording} onTouchEnd={() => mediaRecorderRef.current?.stop()}
              onMouseDown={startRecording} onMouseUp={() => mediaRecorderRef.current?.stop()}
              className={`w-full h-14 rounded-xl border-2 border-dashed ${isRecording? 'border-red-500 bg-red-500/10' : 'border-zinc-300 dark:border-zinc-700'} flex items-center justify-center gap-2`}>
              {isRecording? <><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" /><span className="text-sm font-[600] text-red-500">Đang ghi...</span></> : <><FiMic size={20} /><span className="text-sm font-[600]">Nhấn giữ để ghi âm</span></>}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <audio src={URL.createObjectURL(voiceIntroBlob)} controls className="flex-1 h-10" />
              <button onClick={() => setVoiceIntroBlob(null)} className="w-10 h-10 bg-red-500/10 text-red-500 rounded-xl"><FiX size={18} className="mx-auto" /></button>
            </div>
          )}
        </div>

        <button onClick={handleFindStranger} disabled={findingStranger || strangerInterests.length < 3 ||!voiceIntroBlob || userKarma < 50}
          className="w-full h-14 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500 text-white rounded-xl text-sm font-[700] disabled:opacity-40 shadow-xl shadow-pink-500/30 flex items-center justify-center gap-2">
          {findingStranger && <FiLoader className="animate-spin" size={18} />}
          {findingStranger? "Đang tìm..." : "Tìm bạn ngay"}
        </button>
      </div>
    </div>
  </div>
)}
{showVip && (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-2xl" onClick={() => setShowVip(false)} />
    <div className="relative w-full sm:max-w-[520px] bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
      <div className="w-9 h-1 bg-black/15 dark:bg-white/15 rounded-full mx-auto mt-2.5 sm:hidden" />

      <div className="px-5 pt-4 pb-2 text-center">
        <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Crown className="text-white" size={32} strokeWidth={2.5} />
        </div>
        <h2 className="text-[22px] font-bold tracking-tight">Nâng cấp VIP</h2>
        <p className="text-[14px] text-[#8e8e93] mt-1">Mở khóa tính năng cao cấp</p>
      </div>

{userVip && userVip.tier!== 'free' && (
  <div className="mx-5 mb-3 px-4 py-2.5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl">
    <p className="text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
      Đang dùng: {VIP_TIERS.find(t => t.id === userVip?.tier)?.name}
      {userVip?.expiresAt && ` • Hết hạn ${format(userVip.expiresAt.toDate(), 'dd/MM/yyyy')}`}
    </p>
  </div>
)}

      <div className="flex-1 overflow-auto px-5 pb-4 space-y-3">
        {VIP_TIERS.map((tier) => {
          const isActive = userVip?.tier === tier.id;
          return (
            <div
              key={tier.id}
              className={`relative p-4 rounded-2xl border-2 transition-all ${
                isActive
                 ? 'border-emerald-500 bg-emerald-500/5'
                  : 'border-black/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-800/50'
              }`}
            >
              {tier.id === 'elite' && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full">
                  <span className="text-[10px] font-bold text-white">HOT</span>
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tier.badge}</span>
                    <h3 className="text-[18px] font-bold">{tier.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className={`text-[28px] font-black bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}>
                      {tier.priceText}
                    </span>
                    <span className="text-[13px] text-[#8e8e93]">{tier.duration}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                {tier.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <FiCheck className={`${tier.id === 'elite'? 'text-amber-500' : 'text-blue-500'}`} size={16} strokeWidth={3} />
                    <span className="text-[13px] text-zinc-700 dark:text-zinc-300">{feat}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handlePurchaseVip(tier.id)}
                disabled={purchasingVip || isActive}
                className={`w-full h-11 rounded-xl font-semibold text-[15px] transition-all active:scale-[0.98] disabled:opacity-40 ${
                  isActive
                   ? 'bg-emerald-500 text-white'
                    : `bg-gradient-to-r ${tier.color} text-white shadow-lg`
                }`}
              >
                {purchasingVip? <FiLoader className="animate-spin mx-auto" size={20} /> : isActive? 'Đang sử dụng' : 'Nâng cấp ngay'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="px-5 pb-5 pt-2">
        <p className="text-[11px] text-center text-[#8e8e93] leading-4">
          Tự động gia hạn. Hủy bất cứ lúc nào trong Cài đặt.
          <br />Bằng việc mua, bạn đồng ý với Điều khoản VIP.
        </p>
      </div>
    </div>
  </div>
)}
  </div>
</div>
      <style jsx global>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}body{overscroll-behavior-y:contain}`}</style>

{showPublicRooms && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40" onClick={() => setShowPublicRooms(false)} />
    <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-5 max-w-md w-full">
      <h3 className="text-lg font-bold mb-3">Tất cả phòng công cộng</h3>
      <div className="space-y-2 max-h-96 overflow-auto">
        {publicRooms.map(room => (
          <button key={room.id} onClick={() => handleJoinPublicRoom(room)} 
            className="w-full p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-left">
            {room.emoji} {room.name} - {room.onlineCount} online
          </button>
        ))}
      </div>
      <button onClick={() => setShowPublicRooms(false)} 
        className="mt-3 w-full h-10 bg-zinc-200 dark:bg-zinc-700 rounded-xl">Đóng</button>
    </div>
  </div>
)}
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