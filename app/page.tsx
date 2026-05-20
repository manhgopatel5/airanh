"use client";
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB, getFirebaseAuth, getFirebaseStorage } from "@/lib/firebase";
import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAppStore } from "@/store/app";
import {
  collection, query, where, onSnapshot, doc, getDoc, arrayUnion, setDoc, limit,
  updateDoc, arrayRemove, QueryDocumentSnapshot, deleteDoc, Timestamp, Unsubscribe, QuerySnapshot, DocumentData,
  orderBy, writeBatch, serverTimestamp, getDocs, startAfter
} from "firebase/firestore";
import { signOut, deleteUser } from "firebase/auth";
import { ref, uploadBytesResumable, getDownloadURL, UploadTask } from "firebase/storage";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { nanoid } from "nanoid";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { toast, Toaster } from "sonner";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import Link from "next/link";

import TaskFeed from "@/components/TaskFeed";
import ShareTaskModal from "@/components/ShareTaskModal";
import { Task, TaskItem, PlanItem, isTask, isPlan } from "@/types/task";

// Icons
import { FiSearch, FiMessageSquare, FiUserPlus, FiUsers, FiCheck, FiX, FiUpload, FiLoader, FiUserX, FiBell, FiAtSign, FiInbox, FiMapPin } from "react-icons/fi";
import { RiAddLine, RiPushpinFill } from "react-icons/ri";
import { HiFire, HiSparkles, HiUsers } from "react-icons/hi";
import {
  Home as HomeIcon, MessageSquare, ClipboardList, User, Plus, Sparkles as SparklesIcon,
  CalendarRange, HelpCircle, LogOut, Trash2, Shield, Lock, Camera, Check, QrCode,
  Share2, ChevronRight, Settings, Circle, Zap, Star, ScanLine, X
} from "lucide-react";

const PAGE_SIZE = 20;
type TabId = "hot" | "near" | "friends" | "new";
type MainTab = "home" | "messages" | "tasks" | "profile";

type ChatItem = {
  uid: string; chatId: string; name: string; username: string; avatar: string; userId: string;
  lastMessage?: string; lastSenderId?: string; lastSenderName?: string; updatedAt?: Timestamp;
  isOnline?: boolean; unreadCount?: number; isTyping?: boolean; isGroup: boolean;
  members?: string[]; blockedUsers?: string[]; deletedFor?: string[];
};

type FriendItem = {
  uid: string; name: string; username: string; avatar: string; userId: string;
  isOnline: boolean; lastSeen?: Timestamp; mutualFriends?: number; isDeletedByThem?: boolean;
};

type NotificationItem = {
  id: string; type: "friend_request" | "friend_accepted" | "group_invite" | "mention" | "message_request" | "system";
  fromUid: string; fromName: string; fromAvatar: string; title: string; message: string;
  chatId?: string; groupId?: string; read: boolean; createdAt: Timestamp; actionData?: any;
};

type RawChat = { id: string; c: DocumentData; other?: string; isGroup: boolean; };

type UserData = {
  uid: string; name: string; email: string; phone?: string; userId: string; avatar: string;
  bio?: string; online?: boolean; lastSeen?: Timestamp; createdAt?: Timestamp;
  emailVerified?: boolean; hidePhone?: boolean;
  stats?: { tasks: number; plans: number; completed: number; rating: number };
};

const PINNED_KEY = "pinned_chats";
const DEBOUNCE_DELAY = 200;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;
const BATCH_SIZE = 10;

function SkeletonList() {
  return (
    <div className="space-y-3 px-4 animate-in fade-in duration-300">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-4 border border-gray-100 dark:border-zinc-800">
          <div className="flex gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-1/3 animate-pulse" />
              <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-1/4 animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded w-3/4 animate-pulse" />
            <div className="h-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-zinc-800 dark:to-zinc-700 rounded-2xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Đổi tên thành function thường, không export
function ChatClient() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const unsubRef = useRef<Unsubscribe | null>(null);

  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";

  const primaryBg = isPlan? "bg-green-500" : "bg-[#0a84ff]";
  const primaryHover = isPlan? "hover:bg-green-600" : "hover:bg-[#007aff]";
  const primaryActive = isPlan? "active:bg-green-700" : "active:bg-[#0051d5]";
  const primaryText = isPlan? "text-green-600 dark:text-green-400" : "text-[#0a84ff]";
  const primaryRing = isPlan? "focus:ring-green-500/20" : "focus:ring-[#0a84ff]/20";
  const primaryBorder = isPlan? "focus:border-green-500" : "focus:border-[#0a84ff]";
  const primaryBgSolid = isPlan? "bg-green-500" : "bg-[#0a84ff]";

  const [items, setItems] = useState<ChatItem[]>([]);
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [search, setSearch] = useState<string>("");
  const [debounced, setDebounced] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [friendsLoading, setFriendsLoading] = useState<boolean>(false);
  const [notifLoading, setNotifLoading] = useState<boolean>(false);
  const [adding, setAdding] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "group" | "friends" | "notifications">("all");
  const [pinned, setPinned] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState<boolean>(false);
  const [addMode, setAddMode] = useState<"friend" | "group">("friend");
  const [groupName, setGroupName] = useState<string>("");
  const [selected, setSelected] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showScanQR, setShowScanQR] = useState<boolean>(false);
  const [scanMode, setScanMode] = useState<"camera" | "upload">("camera");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); toast.success("Đã kết nối lại"); };
    const handleOffline = () => { setIsOnline(false); toast.error("Mất kết nối mạng"); };
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
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(10);
    } catch (error) {
      console.error("Failed to save pinned chats:", error);
    }
  }, []);

  // Load notifications
  useEffect(() => {
    if (!user?.uid) return;
    
    setNotifLoading(true);
    const notifRef = collection(db, "notifications", user.uid, "items");
    const q = query(notifRef, orderBy("createdAt", "desc"), limit(50));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const notifs: NotificationItem[] = [];
      snapshot.forEach((doc) => {
        notifs.push({ id: doc.id, ...doc.data() } as NotificationItem);
      });
      setNotifications(notifs);
      setNotifLoading(false);
    }, (error) => {
      console.error("Notifications error:", error);
      setNotifLoading(false);
    });

    return () => unsub();
  }, [user?.uid, db]);

  // Load friends
useEffect(() => {
  if (!user?.uid || activeTab !== "friends") return;

  setFriendsLoading(true);

  const timeout = setTimeout(() => {
    setFriendsLoading(false);
  }, 800);

  const friendsRef = collection(db, "users", user.uid, "friends");
  const q = query(friendsRef);

  const unsub = onSnapshot(
    q,
    async (snapshot) => {
      clearTimeout(timeout);
      try {
const activeFriendIds = snapshot.docs
  .filter(d => d.data()?.status !== "removed")
  .map(d => d.id);

const friendsData: FriendItem[] = [];







const allIds = [...new Set([
  ...activeFriendIds
])];

if (allIds.length === 0) {
  setFriends([]);
  setFriendsLoading(false);
  return;
}

const chunks: string[][] = [];

for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
  chunks.push(allIds.slice(i, i + BATCH_SIZE));
}


        await Promise.all(
          chunks.map(async (chunk) => {
            const userDocs = await Promise.all(chunk.map(id => getDoc(doc(db, "users", id))));
            // ĐÃ XÓA getDoc chats ở đây

            userDocs.forEach((userDoc) => {
              if (userDoc.exists()) {
                const data = userDoc.data();
                friendsData.push({
                  uid: userDoc.id,
                  name: data.name || "User",
                  username: data.username || "",
                  avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "U")}&background=random`,
                  userId: data.userId || "",
                  isOnline: Boolean(data.isOnline),
                  lastSeen: data.lastSeen,
                  mutualFriends: data.mutualFriends || 0,
                  isDeletedByThem: Boolean(
  snapshot.docs.find(d => d.id === userDoc.id)?.data()?.removedBy
),
                });
              }
            });
          })
        );

        friendsData.sort((a, b) => {
          if (a.isOnline !== b.isOnline) return b.isOnline ? 1 : -1;
          return a.name.localeCompare(b.name);
        });

        setFriends(friendsData);
      } catch (error) {
        console.error("Error loading friends:", error);
        setFriends([]);
      } finally {
        setFriendsLoading(false);
      }
    },
    (error) => {
      clearTimeout(timeout);
      console.error("Friends listener error:", error);
      setFriends([]);
      setFriendsLoading(false);
    }
  );

  return () => {
    clearTimeout(timeout);
    unsub();
  };
}, [user?.uid, activeTab, db]);

  // Load chats
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
      avatar: chatData.groupAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatData.groupName || "N")}&background=${isPlan ? "22c55e" : "0a84ff"}&color=fff&bold=true`,
      userId: "", 
      lastMessage: typeof chatData.lastMessage === 'string' 
        ? chatData.lastMessage 
        : chatData.lastMessage?.text || "", // ← Fix: handle object cũ
      lastSenderId: chatData.lastSenderId || chatData.lastMessage?.senderId, 
      lastSenderName: chatData.lastSenderName,
      updatedAt: chatData.updatedAt, unreadCount: chatData.unread?.[user.uid] || 0,
      isTyping: Object.entries(chatData.typing || {}).some(([userId, isTyping]) => userId !== user.uid && Boolean(isTyping)),
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
      lastMessage: typeof chatData.lastMessage === 'string' 
        ? chatData.lastMessage 
        : chatData.lastMessage?.text || "", // ← Fix: handle object cũ
      lastSenderId: chatData.lastSenderId || chatData.lastMessage?.senderId, 
      lastSenderName: "",
      updatedAt: chatData.updatedAt, isOnline: Boolean(userData.isOnline), unreadCount: chatData.unread?.[user.uid] || 0,
      isTyping: Boolean(raw.other && chatData.typing?.[raw.other]), isGroup: false,
      blockedUsers: chatData.blockedUsers || [],
      deletedFor: chatData.deletedFor || [],
    };
  }
});

// Lọc chat đã bị user xóa
const visibleChats = chatList.filter(chat => 
  !chat.deletedFor?.includes(user.uid)
);

const pinnedChats = JSON.parse(localStorage.getItem(PINNED_KEY) || "[]");
visibleChats.sort((a, b) => {
  const aIsPinned = pinnedChats.includes(a.chatId) ? 1 : 0;
  const bIsPinned = pinnedChats.includes(b.chatId) ? 1 : 0;
  if (aIsPinned !== bIsPinned) return bIsPinned - aIsPinned;
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
  if (retryCount < MAX_RETRIES && error.code !== "permission-denied") {
    retryCount++;
    const delay = RETRY_DELAY * retryCount;
    setTimeout(() => { if (isMounted) setupListener(); }, delay);
  } else if (error.code !== "permission-denied") {
    toast.error("Không thể kết nối realtime");
  }
  setLoading(false);
});

unsubRef.current = unsubscribe;
return unsubscribe;
};

const unsubscribe = setupListener();
return () => { isMounted = false; if (unsubscribe) unsubscribe(); };
}, [user?.uid, authLoading, db, isPlan]);

  const createNotification = useCallback(async (targetUid: string, notif: Omit<NotificationItem, "id" | "createdAt" | "read">) => {
    try {
      const notifRef = doc(collection(db, "notifications", targetUid, "items"));
      await setDoc(notifRef, {
        ...notif,
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Create notification error:", error);
    }
  }, [db]);

const stopScan = async (closeModal = true) => {
  try {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
      await scannerRef.current.clear();
      scannerRef.current = null;
    }
  } catch {}

  if (closeModal) {
    setShowScanQR(false);
  }
};

const handleScanFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  let qrReader = document.getElementById("qr-reader-file");
  if (!qrReader) {
    qrReader = document.createElement("div");
    qrReader.id = "qr-reader-file";
    qrReader.style.display = "none";
    document.body.appendChild(qrReader);
  }

  const html5QrCode = new Html5Qrcode("qr-reader-file");
  try {
    const result = await html5QrCode.scanFile(file, false);
    let userId = "";

    if (result.includes("/u/")) {
      userId = result.split("/u/")[1] || "";
    } else if (result.startsWith("@")) {
      userId = result.slice(1);
    } else {
      userId = result.trim();
    }

    if (userId) {
      setSearch(userId);
      setAddMode("friend");
      setShowAdd(true);
      toast.success("Đã quét QR thành công");
    } else {
      toast.error("Mã QR không hợp lệ");
    }
  } catch {
    toast.error("Không đọc được QR từ ảnh");
  } finally {
    await html5QrCode.clear();
    e.target.value = "";
  }
};

useEffect(() => {
  if (!showScanQR || scanMode!== "camera") return;

  const startScan = async () => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    scannerRef.current = html5QrCode;

    try {
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
(decodedText) => {
  if ("vibrate" in navigator) navigator.vibrate(10);
  let userId = "";

  if (decodedText.includes("/u/")) {
    userId = decodedText.split("/u/")[1] || "";
  } else if (decodedText.startsWith("@")) {
    userId = decodedText.slice(1);
  } else {
    userId = decodedText.trim();
  }

  if (userId) {
    setSearch(userId);
    setAddMode("friend");
    setShowAdd(true);
    stopScan();
    toast.success("Đã quét QR");
  } else {
    toast.error("Mã QR không hợp lệ");
  }
},
        () => {}
      );
    } catch {
      toast.error("Không mở được camera");
      setShowScanQR(false);
    }
  };

  startScan();
return () => {
  stopScan(false);
};
}, [showScanQR, scanMode]);
const handleAddFriend = useCallback(async (event?: React.FormEvent): Promise<void> => {
  event?.preventDefault();
  setAdding(true);

  try {
    const auth = getAuth();
    await auth.authStateReady();
    const currentUser = auth.currentUser;
    if (!currentUser?.uid) {
      toast.error("Chưa đăng nhập. F5 lại trang.");
      return;
    }

    const keyword = search.trim().replace("@", "");
    if (!keyword) {
      toast.error("Vui lòng nhập username");
      return;
    }

    let targetUserId: string | null = null;
    const lowerKeyword = keyword.toLowerCase();

    const usernameDoc = await getDoc(doc(db, "usernames", lowerKeyword));
    if (usernameDoc.exists()) targetUserId = usernameDoc.data().uid;

    if (!targetUserId) {
      toast.error(`Không tìm thấy @${keyword}`);
      return;
    }

    if (targetUserId === currentUser.uid) {
      toast.error("Không thể thêm chính mình");
      return;
    }

    const requestId = `${currentUser.uid}_${targetUserId}`;

    // BỎ HẾT getDoc check, cứ setDoc thẳng. Rules sẽ chặn nếu trùng
    await setDoc(doc(db, "friendRequests", requestId), {
      from: currentUser.uid,
      to: targetUserId,
      status: "pending",
      createdAt: serverTimestamp()
    });

    toast.success("Đã gửi lời mời kết bạn");
    setShowAdd(false);
    setSearch("");
  } catch (error: any) {
    console.error("Add friend error:", error.code, error.message);
    if (error.code === 'permission-denied') {
      toast.error("Đã gửi lời mời hoặc các bạn đã là bạn bè");
    } else {
      toast.error(`Lỗi: ${error.message || "Không thể gửi lời mời"}`);
    }
  } finally {
    setAdding(false);
  }
}, [search, db]);


const handleAcceptFriendRequest = useCallback(async (notif: NotificationItem) => {
  if (!user?.uid) return;
  setAdding(true);

  try {
    const functions = getFunctions(getApp(), "asia-southeast1"); // THÊM asia-southeast1
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
  } finally {
    setAdding(false);
  }
}, [user?.uid, router]);

const handleDeclineFriendRequest = useCallback(async (notif: NotificationItem) => {
  const auth = getAuth();
  await auth.authStateReady();
  const currentUser = auth.currentUser;
  if (!currentUser?.uid) return;

  try {
    const batch = writeBatch(db);

    // 1. Xóa notification
    batch.delete(doc(db, "notifications", currentUser.uid, "items", notif.id));

    // 2. Xóa friendRequest
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
      notifications.filter(n => !n.read).forEach(notif => {
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

const handleStartChatWithFriend = useCallback(async (friendId: string) => {
  const auth = getAuth();
  await auth.authStateReady();
  const currentUser = auth.currentUser;
  if (!currentUser?.uid) return;

  const chatId = [currentUser.uid, friendId].sort().join("_");

  // XÓA getDoc check blockedUsers

  const [currentUserDoc, friendDoc] = await Promise.all([
    getDoc(doc(db, "users", currentUser.uid)),
    getDoc(doc(db, "users", friendId))
  ]);

  const currentData = currentUserDoc.data();
  const friendData = friendDoc.data();

  // setDoc merge sẽ tạo nếu chưa có, update nếu có rồi
  await setDoc(doc(db, "chats", chatId), {
    members: [currentUser.uid, friendId],
    isGroup: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    membersInfo: {
      [currentUser.uid]: {
        name: currentData?.name || "User",
        avatar: currentData?.avatar || "",
        username: currentData?.username || ""
      },
      [friendId]: {
        name: friendData?.name || "User",
        avatar: friendData?.avatar || "",
        username: friendData?.username || ""
      }
    }
  }, { merge: true });

  router.push(`/chat/${chatId}`);
}, [db, router]);

const handleRemoveFriend = useCallback(async (friendId: string, friendName: string) => {
  if (!user?.uid) return;
  if (!window.confirm(`Xóa ${friendName} khỏi danh sách bạn bè?`)) return;

  setAdding(true);
  try {
    const functions = getFunctions(getApp(), "asia-southeast1");
    const unfriend = httpsCallable(functions, 'unfriend');
    
    await unfriend({ friendUid: friendId });
    toast.success("Đã hủy kết bạn");
    
  } catch (error: any) {
    console.error("Remove friend error:", error);
    toast.error(`Lỗi: ${error.message || "Không thể xóa"}`);
  } finally {
    setAdding(false);
  }
}, [user?.uid]);

  const handleCreateGroup = useCallback(async (): Promise<void> => {
    if (!user) { toast.error("Chưa đăng nhập"); return; }
    const trimmedName = groupName.trim();
    if (!trimmedName) { toast.error("Vui lòng nhập tên nhóm"); return; }
    if (selected.length < 1) { toast.error("Vui lòng chọn ít nhất 1 thành viên"); return; }
    if (trimmedName.length > 50) { toast.error("Tên nhóm tối đa 50 ký tự"); return; }
    setAdding(true);
    try {
      const groupRef = doc(collection(db, "chats"));
      const groupData = { members: [user.uid, ...selected], isGroup: true, groupName: trimmedName, admins: [user.uid], createdAt: serverTimestamp(),
updatedAt: serverTimestamp(), lastMessage: `${user.displayName || "Bạn"} đã tạo nhóm`, lastSenderName: "Hệ thống" };
      await setDoc(groupRef, groupData);
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();
      await Promise.all(selected.map(memberId => 
        createNotification(memberId, {
          type: "group_invite",
          fromUid: user.uid,
          fromName: userData?.name || "Người dùng",
          fromAvatar: userData?.avatar || "",
          title: "Mời vào nhóm",
          message: `đã thêm bạn vào nhóm "${trimmedName}"`,
          groupId: groupRef.id,
          chatId: groupRef.id,
        })
      ));
      
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
  }, [user, groupName, selected, db, router, createNotification]);

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
      await updateDoc(doc(db, "chats", chat.chatId), { 
        deletedFor: arrayUnion(user.uid),
        updatedAt: new Date() 
      }); // SỬA: updateDoc thay vì deleteDoc
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

  const formatLastSeen = useCallback((timestamp?: Timestamp): string => {
    if (!timestamp?.toDate) return "Lâu rồi";
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return format(date, "dd/MM/yyyy");
  }, []);

  const formatNotifTime = useCallback((timestamp?: Timestamp): string => {
    if (!timestamp?.toDate) return "";
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: vi });
  }, []);

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
}, [items, debounced, activeTab, user?.uid]);

  const filteredFriends = useMemo(() => {
    const query = debounced.toLowerCase().trim();
    if (!query) return friends;
    return friends.filter(f => 
      f.name.toLowerCase().includes(query) || 
      f.username.toLowerCase().includes(query) ||
      f.userId.toLowerCase().includes(query)
    );
  }, [friends, debounced]);

  const { pinnedChats, normalChats } = useMemo(() => {
    const pinnedList = filteredChats.filter((chat) => pinned.includes(chat.chatId));
    const normalList = filteredChats.filter((chat) => !pinned.includes(chat.chatId));
    return { pinnedChats: pinnedList, normalChats: normalList };
  }, [filteredChats, pinned]);

  const friendsForGroup = useMemo(() => items.filter((item) => !item.isGroup), [items]);
  
  const unreadNotifications = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

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
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={activeTab === "friends" ? "Tìm bạn bè" : activeTab === "notifications" ? "Tìm thông báo" : "Tìm kiếm"} className={`w-full h-[38px] pl-[34px] pr-3.5 bg-[#f2f2f7] dark:bg-zinc-900 rounded-[10px] text-[15px] font-normal outline-none border-0 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 ${primaryRing} transition-all placeholder:text-gray-400`} autoComplete="off" autoCorrect="off" />
              </div>
              <button onClick={() => setShowAdd(true)} className={`w-[38px] h-[38px] ${primaryBg} ${primaryHover} ${primaryActive} rounded-[10px] flex items-center justify-center shadow-sm active:scale-95 transition-all duration-150`} aria-label="Tạo mới">
                <RiAddLine className="text-white" size={22} strokeWidth={2.5} />
              </button>
            </div>
            <div className="grid grid-cols-5 mt-3.5 px-0.5">
              {[
            { key: "all", label: "Tất cả" },
  { key: "friends", label: "Bạn bè" },
  { key: "notifications", label: "Thông báo", badge: unreadNotifications },
  { key: "unread", label: "Chưa đọc" },
  { key: "group", label: "Nhóm" }
              ].map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`relative py-2 text-[15px] whitespace-nowrap transition-colors duration-200 flex items-center justify-center gap-1.5 ${activeTab === tab.key ? "text-black dark:text-white font-semibold" : "text-[#8e8e93] dark:text-zinc-500 font-normal hover:text-gray-700 dark:hover:text-zinc-400"}`}>
                  {tab.label}
                  {tab.badge ? <span className="min-w-[18px] h-[18px] px-1 bg-[#ff3b30] rounded-full flex items-center justify-center"><span className="text-[11px] leading-none font-medium text-white">{tab.badge > 99 ? "99+" : tab.badge}</span></span> : null}
                  {activeTab === tab.key && <div className="absolute -bottom-[1px] left-0 right-0 h-[2.5px] bg-black dark:bg-white rounded-full" />}
                </button>
              ))}
              {!isOnline && <span className="ml-auto text-[12px] text-orange-500 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />Offline</span>}
            </div>
          </div>
        </div>

        <div className="pb-24">
          {activeTab === "notifications" ? (
            notifLoading ? (
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
            ) : notifications.length === 0 ? (
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
                        <div key={notif.id} className={`px-4 py-3 flex items-start gap-3 ${!notif.read ? "bg-[#0a84ff]/[0.04] dark:bg-[#0a84ff]/[0.08]" : ""} hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors`}>
                          <div className="relative flex-shrink-0 mt-0.5">
                            <img src={notif.fromAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(notif.fromName)}&background=random`} alt={notif.fromName} className="w-12 h-12 rounded-full object-cover" />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-black rounded-full flex items-center justify-center border-2 border-white dark:border-black">
                              {getNotificationIcon(notif.type)}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[15px] leading-[20px]"><span className="font-[550]">{notif.fromName}</span> <span className="text-[#3a3a3c] dark:text-zinc-300">{notif.message}</span></p>
                            <p className="text-[13px] text-[#8e8e93] mt-0.5">{formatNotifTime(notif.createdAt)}</p>
                            {notif.type === "friend_request" && !notif.read && (
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
                        <div key={notif.id} className={`px-4 py-3 flex items-start gap-3 ${!notif.read ? "bg-[#0a84ff]/[0.04] dark:bg-[#0a84ff]/[0.08]" : "opacity-70"} hover:bg-gray-50 dark:hover:bg-zinc-900/50 transition-colors`}>
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
          ) : activeTab === "friends" ? (
            friendsLoading ? (
              <div className="px-4 pt-4 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
                    <div className="w-[52px] h-[52px] bg-gray-200 dark:bg-zinc-800 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-[16px] bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                      <div className="h-[13px] bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-8 text-center">
                <div className="w-[72px] h-[72px] bg-[#f2f2f7] dark:bg-zinc-900 rounded-[20px] flex items-center justify-center mb-4">
                  <FiUsers className="text-gray-400" size={30} strokeWidth={1.5} />
                </div>
               <h3 className="text-[20px] font-semibold mb-1.5">{search ? "Không tìm thấy" : "Chưa có bạn"}</h3>
<p className="text-[15px] text-[#8e8e93] dark:text-zinc-500 max-w-[280px] leading-[20px]">{search ? "Thử tìm với từ khóa khác" : "Mời kết bạn để bắt đầu trò chuyện cùng nhau"}</p>
{!search && (
  <button onClick={() => setShowAdd(true)} className={`mt-6 px-6 h-[40px] ${primaryBg} ${primaryHover} ${primaryActive} text-white rounded-full text-[15px] font-medium shadow-sm active:scale-95 transition-all flex items-center gap-2`}>
    <FiUserPlus size={18} />
    Kết bạn ngay
  </button>
)}
</div>
) : (
<div className="divide-y divide-gray-100 dark:divide-zinc-900">
  <div className="px-4 py-2.5 bg-gray-50/80 dark:bg-zinc-950/50 backdrop-blur-sm sticky top-[104px] z-10">
    <p className="text-[12px] text-[#8e8e93] dark:text-zinc-500 font-medium">
      <span className="inline-flex items-center gap-1">
        <span className="w-2 h-2 bg-[#30d158] rounded-full animate-pulse" />
        {filteredFriends.filter(f => f.isOnline).length} đang hoạt động
      </span>
      <span className="mx-1.5">•</span>
      {filteredFriends.length} bạn bè
    </p>
  </div>
{filteredFriends.map((friend) => {
  return (
    <div
  key={friend.uid}
  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900/50 active:bg-gray-100 dark:active:bg-zinc-800 transition-colors"
>
      <div className="relative flex-shrink-0">
        <img src={friend.avatar} alt={friend.name} className="w-[52px] h-[52px] rounded-full object-cover" />
        {friend.isOnline && <div className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-[#30d158] rounded-full border-[2.5px] border-white dark:border-black" />}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-baseline gap-2">
          <p className="text-[16px] font-[550] truncate">{friend.name}</p>
          {friend.isDeletedByThem && (
            <span className="text-[12px] text-red-500 font-medium flex-shrink-0">• Đã xóa</span>
          )}
          {friend.isOnline && <span className="text-[11px] text-[#30d158] font-medium">• Online</span>}
        </div>
        <p className="text-[13px] text-[#8e8e93] truncate">@{friend.username || friend.userId} • {friend.isOnline? "Đang hoạt động" : formatLastSeen(friend.lastSeen)}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handleStartChatWithFriend(friend.uid)}
          className={`w-8 h-8 ${primaryBg} ${primaryHover} rounded-full flex items-center justify-center active:scale-90 transition-all`}
          title="Nhắn tin"
        >
          <FiMessageSquare className="text-white" size={14} />
        </button>
        <button
          onClick={() => handleRemoveFriend(friend.uid, friend.name)}
          className="w-8 h-8 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center active:scale-90 transition-all"
          title="Xóa bạn"
        >
          <FiUserX className="text-white" size={14} />
        </button>
      </div>
    </div>
  );
})}
              </div>
            )
          ) : loading ? (
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
              <h3 className="text-[20px] font-semibold tracking-tight text-gray-900 dark:text-white mb-1.5">{activeTab === "unread" ? "Không có tin chưa đọc" : activeTab === "group" ? "Chưa có nhóm" : "Chưa có tin nhắn"}</h3>
              <p className="text-[15px] leading-[20px] text-[#8e8e93] dark:text-zinc-500 max-w-[280px]">{activeTab === "all" ? "Nhấn + để bắt đầu trò chuyện" : "Các cuộc trò chuyện sẽ hiện ở đây"}</p>
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
                {addMode === "friend"? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowScanQR(true); setScanMode("camera"); }}
                        className="h-[44px] bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-[12px] text-[14px] font-[550] flex items-center justify-center gap-1.5 active:scale-95 transition"
                      >
                        <ScanLine size={18} /> Quét
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-[44px] bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-[12px] text-[14px] font-[550] flex items-center justify-center gap-1.5 active:scale-95 transition"
                      >
                        <FiUpload size={18} /> Ảnh QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddMode("friend")}
                        className="h-[44px] bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-[12px] text-[14px] font-[550] flex items-center justify-center gap-1.5 active:scale-95 transition"
                      >
                        <FiUserPlus size={18} /> Thủ công
                      </button>
                    </div>

                    <form onSubmit={handleAddFriend} className="space-y-3">
                      <div className="relative">
                        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93] pointer-events-none" size={18} />
                        <input type="search" inputMode="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ID hoặc @username" className={`w-full h-[44px] pl-10 pr-3.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-[12px] text-[16px] outline-none ${primaryBorder} focus:ring-4 ${primaryRing} transition-all`} autoFocus autoComplete="off" autoCorrect="off" spellCheck={false} name="search-user-not-login" />
                      </div>
                      <button type="submit" disabled={adding ||!search.trim()} className={`w-full h-[44px] ${primaryBg} ${primaryHover} ${primaryActive} disabled:opacity-40 text-white rounded-[12px] text-[16px] font-[550] transition-all active:scale-[0.98] flex items-center justify-center gap-2`}>
                        {adding && <FiLoader className="animate-spin" size={18} />}{adding? "Đang tìm" : "Tiếp tục"}
                      </button>
                    </form>

                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleScanFromFile} />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 space-y-3">
                    <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Tên nhóm" className={`w-full h-[44px] px-3.5 bg-white dark:bg-zinc-800 border border-black/10 dark:border-white/10 rounded-[12px] text-[16px] outline-none ${primaryBorder} focus:ring-4 ${primaryRing} transition-all`} maxLength={30} />
                    <div className="flex-1 bg-white dark:bg-zinc-800 rounded-[12px] border border-black/10 dark:border-white/10 overflow-hidden flex flex-col min-h-0">
                      <div className="px-3 py-2.5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur border-b border-black/5 dark:border-white/5 flex-shrink-0">
                        <p className="text-[13px] font-medium text-[#8e8e93] dark:text-zinc-500">Đã chọn {selected.length} người</p>
                      </div>
                      <div className="flex-1 overflow-auto">
                        {friendsForGroup.length === 0? (
                          <div className="p-8 text-center"><p className="text-[14px] text-[#8e8e93] dark:text-zinc-500">Chưa có bạn bè</p></div>
                        ) : (
                          <div className="divide-y divide-black/5 dark:divide-white/5">
                            {friendsForGroup.map((person) => (
                              <label key={person.uid} className="flex items-center gap-3 px-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] cursor-pointer active:bg-black/[0.04] dark:active:bg-white/[0.06] transition-colors">
                                <input type="checkbox" checked={selected.includes(person.uid)} onChange={(e) => setSelected((current) => e.target.checked? [...current, person.uid] : current.filter((id) => id!== person.uid))} className={`w-[20px] h-[20px] rounded-[6px] border-2 border-[#c7c7cc] dark:border-zinc-600 ${primaryText} focus:ring-0 focus:ring-offset-0 checked:${primaryBgSolid} checked:border-transparent transition-colors`} />
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
                    <button onClick={handleCreateGroup} disabled={adding ||!groupName.trim() || selected.length < 1} className={`w-full h-[44px] ${primaryBg} ${primaryHover} ${primaryActive} disabled:opacity-40 text-white rounded-[12px] text-[16px] font-[550] transition-all active:scale-[0.98] flex items-center justify-center gap-2 flex-shrink-0`}>
                      {adding && <FiLoader className="animate-spin" size={18} />}Tạo nhóm ({selected.length + 1})
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

{showScanQR && (
  <div className="fixed inset-0 bg-black z-[60]">
    <div id="qr-reader" className={scanMode === "camera"? "w-full h-full" : "hidden"} />
    <div id="qr-reader-file" className="hidden" />
    <button
      onClick={() => stopScan()}
      className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center"
    >
      <FiX className="w-5 h-5 text-white" />
    </button>
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center">
      <p className="font-bold">Đưa mã QR vào khung</p>
      <p className="text-sm opacity-70 mt-1">Tự động quét khi phát hiện</p>
    </div>
  </div>
)}
      </div>
      <style jsx global>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}body{overscroll-behavior-y:contain}`}</style>
    </>
  );
}
export default function AppContainer() {
  
  const [db, setDb] = useState<any>(null);
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  
  const [currentMainTab, setCurrentMainTab] = useState<MainTab>("home");
  const [activeTab, setActiveTab] = useState<TabId>("hot");
  
  const [allItems, setAllItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareTask, setShareTask] = useState<Task | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (db) return;
    try {
      const _db = getFirebaseDB();
      setDb(_db);
    } catch (err) {
      console.error("Firebase init error:", err);
      setError("Không thể kết nối database");
      setLoading(false);
    }
  }, [db]);

  const buildQuery = useCallback(
    (startAfterDoc?: QueryDocumentSnapshot<DocumentData>) => {
      if (!db) return null;
      const now = Timestamp.now();
      const constraints: any[] = [
        where("type", "==", mode),
        where("visibility", "==", "public"),
        where("status", "in", ["open", "full", "doing"]),
        where("deadline", ">", now),
        orderBy("deadline", "asc"),
        limit(PAGE_SIZE),
      ];
      if (startAfterDoc) {
        constraints.push(startAfter(startAfterDoc));
      }
      return query(collection(db, "tasks"), ...constraints);
    },
    [db, mode]
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!db) return;
      
      if (allItems.length > 0) {
        setRefreshing(true);
      } else {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
      }

      const q = buildQuery();
      if (!q) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        const snap = await getDocs(q);
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        
        setAllItems(data);
        setLastDoc(snap.docs[snap.docs.length - 1] || null);
        setHasMore(snap.docs.length === PAGE_SIZE);
      } catch (err: any) {
        console.error("Firestore error:", err.code, err.message);
        if (err.code === "permission-denied") {
          setAllItems([]);
          setHasMore(false);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [db, buildQuery, allItems.length]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMore = useCallback(async () => {
    if (!db || !lastDoc || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const q = buildQuery(lastDoc);
      if (!q) return;
      const snap = await getDocs(q);
      const newItems = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
      setAllItems((prev) => [...prev, ...newItems]);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Load more error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [db, lastDoc, loadingMore, hasMore, buildQuery]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );
    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const filteredItems = useMemo(() => {
    let result = [...allItems];
    if (mode === "task") {
      result = result.filter((t) => isTask(t)) as TaskItem[];
    } else {
      result = result.filter((t) => isPlan(t)) as PlanItem[];
    }
    result = result.filter((t) => t.banned !== true && t.hidden !== true);
    if (activeTab === "hot") {
      result.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }
    return result as Task[];
  }, [allItems, mode, activeTab]);

  const mainNavItems = [
    { id: "home" as MainTab, label: "Home", Icon: HomeIcon },
    { id: "messages" as MainTab, label: "Messages", Icon: MessageSquare },
    { id: "tasks" as MainTab, label: "Tasks", Icon: ClipboardList },
    { id: "profile" as MainTab, label: "Profile", Icon: User },
  ];

  const subTabs = [
    { id: "hot" as TabId, label: "Hot", icon: HiFire, color: "orange" },
    { id: "near" as TabId, label: "Gần bạn", icon: FiMapPin, color: "emerald" },
    { id: "friends" as TabId, label: "Bạn bè", icon: HiUsers, color: "blue" },
    { id: "new" as TabId, label: "Mới", icon: HiSparkles, color: "purple" },
  ];

  const activeColorClass = mode === "plan" ? "text-emerald-500" : "text-blue-600";
  const activeBgClass = mode === "plan" ? "bg-emerald-500" : "bg-blue-600";
  const dynamicGlow = mode === "plan" ? "shadow-emerald-500/20" : "shadow-blue-600/20";

  const renderTabContent = () => {
    switch (currentMainTab) {
case "messages":
  return <ChatClient />;
      case "tasks":
        return (
          <div className="flex flex-col items-center justify-center pt-32 text-zinc-400 animate-in fade-in duration-300">
            <ClipboardList size={48} className="mb-2 opacity-40" />
            <p className="font-medium text-sm">Trang Quản Lý Nhiệm Vụ</p>
          </div>
        );
      case "profile":
        return <ProfileTabContent onNavigateTab={(tab) => setCurrentMainTab(tab)} />;
      default:
        return (
          <>
            {/* THANH CHỌN MODE CHỈ HIỆN TRÊN TRANG CHỦ */}
            <div className="sticky top-0 z-50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md pt-3 pb-2 px-4 border-b border-gray-100 dark:border-zinc-900">
              <div className="max-w-md mx-auto bg-gray-100 dark:bg-zinc-900 rounded-2xl p-1 flex relative">
                <button
                  onClick={() => { setMode("task"); if ("vibrate" in navigator) navigator.vibrate(5); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all relative z-10 ${
                    mode === "task" ? "text-white shadow" : "text-gray-500 dark:text-zinc-400"
                  }`}
                >
                  <SparklesIcon size={16} /> Task
                  {mode === "task" && (
                    <motion.div layoutId="modeSwitchBg" className="absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl -z-10" />
                  )}
                </button>
                <button
                  onClick={() => { setMode("plan"); if ("vibrate" in navigator) navigator.vibrate(5); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all relative z-10 ${
                    mode === "plan" ? "text-white shadow" : "text-gray-500 dark:text-zinc-400"
                  }`}
                >
                  <CalendarRange size={16} /> Plan
                  {mode === "plan" && (
                    <motion.div layoutId="modeSwitchBg" className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl -z-10" />
                  )}
                </button>
              </div>
            </div>

            {/* THANH SUB-TABS (HOT, GẦN BẠN...) CHỈ HIỆN TRÊN TRANG CHỦ */}
            <div className="sticky top-[64px] z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800">
              <div className="max-w-2xl mx-auto px-4">
                <div className="flex justify-around">
                  {subTabs.map((tab) => {
                    const Icon = tab.icon;
                    const active = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          if ("vibrate" in navigator) navigator.vibrate(5);
                        }}
                        className={`flex flex-col items-center py-3 px-2 flex-1 transition-all active:scale-95 ${
                          active ? `text-${tab.color}-600 dark:text-${tab.color}-400` : "text-gray-400 dark:text-zinc-500"
                        }`}
                      >
                        <Icon size={20} className={active ? "scale-110" : ""} />
                        <span className="text-xs font-bold mt-1">{tab.label}</span>
                        <div className={`mt-1 h-0.5 rounded-full transition-all duration-300 ${active ? `w-6 bg-${tab.color}-500` : "w-0"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* FEED CHÍNH */}
            <div className="pt-4">
              {loading ? (
                <SkeletonList />
              ) : (
                <div className={`transition-all duration-200 ${refreshing ? "opacity-50 scale-[0.99]" : "opacity-100"}`}>
                  <TaskFeed
                    tasks={filteredItems}
                    mode={mode}
                    activeTab={activeTab}
                    onShare={(t) => { setShareTask(t); setShowShareModal(true); }}
                    onTaskUpdate={(id, up) => setAllItems(prev => prev.map(t => t.id === id ? { ...t, ...up } as Task : t))}
                  />
                </div>
              )}
              
              {!loading && hasMore && allItems.length > 0 && (
                <div ref={loadMoreRef} className="px-4 py-6 flex justify-center">
                  {loadingMore && (
                    <div className="w-6 h-6 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <LayoutGroup id="app-global-navigation-flow">
      <div className="min-h-screen pb-28 font-sans bg-white dark:bg-zinc-950 select-none relative">
        <Toaster richColors position="top-center" />

        {refreshing && (
          <div className="fixed top-0 inset-x-0 h-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 animate-pulse z-50" />
        )}

        <div className="w-full max-w-2xl mx-auto">
          {renderTabContent()}
        </div>

        {/* BOTTOM NAVIGATION CHẠY BẰNG STATE */}
        <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none flex flex-col items-center justify-end">
          <div className="w-full max-w-[480px] px-4 pb-[max(12px,env(safe-area-inset-bottom))] flex flex-col items-center gap-3">
            
            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="w-full bg-white/90 backdrop-blur-2xl rounded-[28px] p-2.5 border border-zinc-200/40 shadow-xl pointer-events-auto flex flex-col gap-1"
                >
                  <button onClick={() => setIsMenuOpen(false)} className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-zinc-50 text-left">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><SparklesIcon size={18} /></div>
                    <div><h4 className="font-bold text-sm text-zinc-900">Nhiệm vụ mới</h4><p className="text-xs text-zinc-400">Xử lý ngay đầu việc nhỏ</p></div>
                  </button>
                  <button onClick={() => setIsMenuOpen(false)} className="w-full flex items-center gap-4 p-2.5 rounded-2xl hover:bg-zinc-50 text-left">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CalendarRange size={18} /></div>
                    <div><h4 className="font-bold text-sm text-zinc-900">Kế hoạch dài hạn</h4><p className="text-xs text-zinc-400">Lên kế hoạch tuần, tháng chỉn chu</p></div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-full pointer-events-auto relative rounded-[26px] border border-zinc-200/50 bg-white/80 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center justify-between h-[64px] px-2 relative">
                
                <div className="flex-1 grid grid-cols-2 h-full">
                  {mainNavItems.slice(0, 2).map((item) => {
                    const active = currentMainTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setCurrentMainTab(item.id); if ("vibrate" in navigator) navigator.vibrate(10); }}
                        className="flex-1 flex flex-col items-center justify-center relative h-full pt-1 pb-3.5 outline-none"
                      >
                        <item.Icon className={`w-[21px] h-[21px] transition-all ${active ? `${activeColorClass} scale-105` : "text-zinc-400"}`} />
                        <span className={`text-[10px] font-semibold mt-1 ${active ? activeColorClass : "text-zinc-400"}`}>{item.label}</span>
                        {active && (
                          <motion.div layoutId="activeIndicatorDot" className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${activeBgClass}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="w-[64px] flex justify-center h-full items-center relative">
                  <button onClick={() => { setIsMenuOpen(!isMenuOpen); if ("vibrate" in navigator) navigator.vibrate(8); }} className="outline-none z-10 p-2">
                    <motion.div
                      animate={{ rotate: isMenuOpen ? 135 : 0 }}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md ${isMenuOpen ? "bg-zinc-900" : activeBgClass} ${dynamicGlow}`}
                    >
                      <Plus className="w-4 h-4" strokeWidth={3} />
                    </motion.div>
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-2 h-full">
                  {mainNavItems.slice(2, 4).map((item) => {
                    const active = currentMainTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setCurrentMainTab(item.id); if ("vibrate" in navigator) navigator.vibrate(10); }}
                        className="flex-1 flex flex-col items-center justify-center relative h-full pt-1 pb-3.5 outline-none"
                      >
                        <item.Icon className={`w-[21px] h-[21px] transition-all ${active ? `${activeColorClass} scale-105` : "text-zinc-400"}`} />
                        <span className={`text-[10px] font-semibold mt-1 ${active ? activeColorClass : "text-zinc-400"}`}>{item.label}</span>
                        {active && (
                          <motion.div layoutId="activeIndicatorDot" className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${activeBgClass}`} />
                        )}
                      </button>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        </div>

      </div>

      {showShareModal && shareTask && (
        <ShareTaskModal task={shareTask} onClose={() => setShowShareModal(false)} />
      )}

      {error && <span className="hidden">{error}</span>}
    </LayoutGroup>
  );
}

// ─── COMPONENT HỒ SƠ CÁ NHÂN (TÍCH HỢP TỪ PROFILE) ───────────────────
function ProfileTabContent({ onNavigateTab }: { onNavigateTab: (tab: MainTab) => void }) {
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();
  const storage = getFirebaseStorage();
  const { user } = useAuth();
  const mode = useAppStore((s) => s.mode);
  const isPlan = mode === "plan";

  const [userData, setUserData] = useState<UserData | null>(null);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const verifiedRef = useRef(false);

  const hasCheckedId = useRef(false);
  const uploadTaskRef = useRef<UploadTask | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const accentGradient = isPlan ? "from-green-500 to-emerald-500" : "from-sky-500 to-blue-600";

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = { uid: snap.id, ...snap.data() } as UserData;
        setUserData(data);
        setName(data.name || "");
        if (user && !user.emailVerified && !data.emailVerified && !verifiedRef.current) {
          verifiedRef.current = true;
          window.location.href = "/verify-email";
        }
      }
    });
    return () => unsub();
  }, [user?.uid, db, user]);

  useEffect(() => {
    if (!user || !userData || hasCheckedId.current) return;
    if (userData.userId) {
      hasCheckedId.current = true;
      return;
    }
    const createId = async () => {
      hasCheckedId.current = true;
      let newId = `AIR${nanoid(6).toUpperCase()}`;
      let attempts = 0;
      while (attempts < 3) {
        const snap = await getDoc(doc(db, "usernames", newId));
        if (!snap.exists()) break;
        newId = `AIR${nanoid(6).toUpperCase()}`;
        attempts++;
      }
      await Promise.all([
        updateDoc(doc(db, "users", user.uid), { userId: newId }),
        setDoc(doc(db, "usernames", newId), { uid: user.uid }),
      ]);
    };
    createId().catch(() => {});
  }, [user, userData, db]);

  const handleUpdateName = async () => {
    if (!user || !name.trim() || name.length < 2) {
      toast.error("Tên tối thiểu 2 ký tự");
      return;
    }
    if (name === userData?.name) {
      setEditingName(false);
      return;
    }
    const oldName = userData?.name;
    setEditingName(false);
    setUserData((prev) => prev ? { ...prev, name: name.trim() } : null);
    try {
      await updateDoc(doc(db, "users", user.uid), { name: name.trim() });
      toast.success("Cập nhật tên thành công");
      if ("vibrate" in navigator) navigator.vibrate(8);
    } catch {
      toast.error("Cập nhật thất bại");
      setUserData((prev) => prev ? { ...prev, name: oldName || "" } : null);
      setName(oldName || "");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast.error("Chỉ chấp nhận file ảnh");
    if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh không được vượt quá 5MB");
    setUploading(true);
    setUploadProgress(0);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      uploadTaskRef.current = uploadBytesResumable(storageRef, file);
      uploadTaskRef.current.on(
        "state_changed",
        (snapshot) => {
          const prog = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(prog));
        },
        (err) => {
          if (err.code !== "storage/canceled") toast.error("Upload thất bại");
        },
        async () => {
          const task = uploadTaskRef.current;
          if (!task) return;
          const url = await getDownloadURL(task.snapshot.ref);
          await updateDoc(doc(db, "users", user.uid), { avatar: url });
          toast.success("Cập nhật avatar thành công");
          if ("vibrate" in navigator) navigator.vibrate(8);
          setUploading(false);
        }
      );
    } catch {
      toast.error("Upload lỗi");
      setUploading(false);
    } finally {
      e.target.value = "";
    }
  };

  const handleShare = async () => {
    if (!userData) return;
    const url = `https://airanh.vercel.app/u/${userData.userId}`;
    if (navigator.share) {
      await navigator.share({ title: userData.name || "Người dùng AIR", text: `Kết nối với tôi`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Đã copy link hồ sơ");
    }
    if ("vibrate" in navigator) navigator.vibrate(8);
  };

  const handleLogout = async () => {
    if (!user) return;
    setShowLogoutModal(false);
    updateDoc(doc(db, "users", user.uid), { online: false, lastSeen: serverTimestamp() }).catch(() => {});
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch {
      toast.error("Đăng xuất thất bại");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setShowDeleteModal(false);
    try {
      await Promise.all([
        deleteDoc(doc(db, "users", user.uid)),
        deleteDoc(doc(db, "usernames", userData?.userId || "")),
      ]);
      await deleteUser(user);
      toast.success("Đã xóa tài khoản");
      window.location.href = "/register";
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === "auth/requires-recent-login") {
        toast.error("Vui lòng đăng nhập lại để xóa tài khoản");
        await signOut(auth);
        window.location.href = "/login";
      } else {
        toast.error("Xóa thất bại");
      }
    }
  };

  const stopScan = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(() => {});
    }
    setShowScanQR(false);
  };

  useEffect(() => {
    if (!showScanQR) return;
    const startScan = async () => {
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if ("vibrate" in navigator) navigator.vibrate(10);
            stopScan();
            if (decodedText.includes("/u/")) {
              const targetUserId = decodedText.split("/u/")[1];
              if (targetUserId === userData?.userId) {
                toast.error("Đây là mã của bạn");
                return;
              }
              window.location.href = `/u/${targetUserId}`;
            } else {
              toast.error("Mã QR không hợp lệ");
            }
          },
          () => {}
        );
      } catch {
        toast.error("Không mở được camera");
        setShowScanQR(false);
      }
    };
    startScan();
    return () => stopScan();
  }, [showScanQR, userData?.userId]);

  if (!userData) return null;

  return (
    <div className="pt-6 pb-12 animate-in fade-in duration-300 bg-white dark:bg-zinc-950">
      {/* Avatar + name + status */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-4">
          <label className="relative cursor-pointer group flex-shrink-0">
            <img
              src={userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name)}&size=176&background=8B5E3C&color=fff`}
              className="w-16 h-16 rounded-full object-cover"
              alt="Avatar"
            />
            {userData.emailVerified && (
              <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br ${accentGradient} flex items-center justify-center border-2 border-white dark:border-zinc-950`}>
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            {uploading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
                <span className="text-white text-xs font-bold">{uploadProgress}%</span>
              </div>
            )}
          </label>

          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={handleUpdateName}
                  onKeyDown={(e) => e.key === "Enter" && handleUpdateName()}
                  autoFocus
                  className="text-2xl font-extrabold border-b-2 border-gray-300 dark:border-zinc-700 outline-none bg-transparent text-gray-900 dark:text-white flex-1 tracking-tight"
                />
                <button onClick={handleUpdateName} className={`p-1.5 bg-gradient-to-br ${accentGradient} rounded-full`}>
                  <Check size={14} className="text-white" />
                </button>
              </div>
            ) : (
              <h1 onClick={() => setEditingName(true)} className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight cursor-pointer leading-tight">
                {userData.name}
              </h1>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Circle className={`w-2 h-2 fill-current ${userData.online ? "text-green-500" : "text-gray-400"}`} />
              <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium">
                {userData.online ? "Đang hoạt động" : "Ngoại tuyến"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-2 mt-5">
          <button onClick={() => onNavigateTab("tasks")} className="flex-1 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center gap-2 active:scale-95 transition">
            <ClipboardList className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{userData.stats?.tasks ?? 0}</span>
            <span className="text-xs text-gray-400 dark:text-zinc-500">Task</span>
          </button>
          <button onClick={() => onNavigateTab("home")} className="flex-1 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center gap-2 active:scale-95 transition">
            <Zap className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{userData.stats?.plans ?? 0}</span>
            <span className="text-xs text-gray-400 dark:text-zinc-500">Plan</span>
          </button>
          <button className="flex-1 py-2.5 rounded-2xl bg-gray-50 dark:bg-zinc-900 flex items-center justify-center gap-2">
            <Star className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <span className="text-sm font-bold text-gray-900 dark:text-white">{userData.stats?.rating ?? 0}</span>
          </button>
        </div>
      </div>

      {/* Menu sections */}
      <div className="px-6 mt-2 space-y-6">
        <div>
          <SectionLabel>HỒ SƠ</SectionLabel>
          <Item label="Thông tin cá nhân" icon={User} onClick={() => window.location.href = "/profile/edit"} />
          <Item label="Mã QR của tôi" icon={QrCode} onClick={() => setShowQR(true)} />
          <Item label="Quét mã QR" icon={ScanLine} onClick={() => setShowScanQR(true)} />
          <Item label="Chia sẻ hồ sơ" icon={Share2} onClick={handleShare} />
        </div>
        <div>
          <SectionLabel>BẢO MẬT</SectionLabel>
          <Item label="Xác thực CCCD" icon={Shield} />
          <Item label="Đổi mật khẩu" icon={Lock} onClick={() => window.location.href = "/settings/change-password"} />
        </div>
        <div>
          <SectionLabel>HỖ TRỢ</SectionLabel>
          <Item label="Trung tâm trợ giúp" icon={HelpCircle} />
          <Item label="Cài đặt" icon={Settings} onClick={() => window.location.href = "/settings"} />
          <Item label="Đăng xuất" icon={LogOut} onClick={() => setShowLogoutModal(true)} danger />
          <Item label="Xoá tài khoản" icon={Trash2} onClick={() => setShowDeleteModal(true)} danger />
        </div>
      </div>

      {/* QR Modal */}
      {showQR && userData.userId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-center mb-1 text-gray-900 dark:text-white">@{userData.userId}</h3>
            <p className="text-sm text-center text-gray-500 mb-4">Quét để kết nối với {userData.name}</p>
            <div className="bg-white p-4 rounded-2xl flex items-center justify-center">
              <QRCodeSVG value={`https://airanh.vercel.app/u/${userData.userId}`} size={200} level="H" includeMargin />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button onClick={handleShare} className="py-3 rounded-2xl font-bold bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white flex items-center justify-center gap-2 active:scale-95 transition">
                <Share2 size={18} /> Chia sẻ
              </button>
              <button onClick={() => { setShowQR(false); setShowScanQR(true); }} className={`py-3 rounded-2xl font-bold bg-gradient-to-r ${accentGradient} text-white flex items-center justify-center gap-2 active:scale-95 transition`}>
                <ScanLine size={18} /> Quét mã
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scan QR fullscreen */}
      {showScanQR && (
        <div className="fixed inset-0 bg-black z-50">
          <div id="qr-reader" className="w-full h-full" />
          <button onClick={stopScan} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center">
            <p className="font-bold">Đưa mã QR vào khung</p>
            <p className="text-sm opacity-70 mt-1">Tự động quét khi phát hiện</p>
          </div>
        </div>
      )}

      {/* Modals xác nhận */}
      {showLogoutModal && (
        <ProfileModal title="Đăng xuất?" desc="Bạn sẽ cần đăng nhập lại để sử dụng app" onClose={() => setShowLogoutModal(false)} onConfirm={handleLogout} confirmText="Đăng xuất" danger />
      )}
      {showDeleteModal && (
        <ProfileModal title="Xóa tài khoản?" desc="Hành động này không thể hoàn tác. Dữ liệu sẽ bị xóa vĩnh viễn." onClose={() => setShowDeleteModal(false)} onConfirm={handleDeleteAccount} confirmText="Xóa vĩnh viễn" danger />
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-bold text-gray-400 dark:text-zinc-600 tracking-wider mb-1 uppercase mt-2">{children}</p>;
}

function Item({ label, icon: Icon, onClick, danger }: { label: string; icon: React.ElementType; onClick?: () => void; danger?: boolean; }) {
  return (
    <button onClick={() => { if ("vibrate" in navigator) navigator.vibrate(5); onClick?.(); }} className="w-full flex items-center justify-between py-3.5 active:opacity-50 transition-opacity border-b border-gray-50 dark:border-zinc-900 text-left">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${danger ? "text-red-500" : "text-gray-700 dark:text-zinc-300"}`} />
        <span className={`text-base font-semibold ${danger ? "text-red-500" : "text-gray-900 dark:text-white"}`}>{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </button>
  );
}

function ProfileModal({ title, desc, onClose, onConfirm, confirmText, danger }: { title: string; desc: string; onClose: () => void; onConfirm: () => void; confirmText: string; danger?: boolean; }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-t-3xl p-6 animate-in slide-in-from-bottom" onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">{desc}</p>
        <button onClick={onConfirm} className={`w-full py-3.5 rounded-2xl font-semibold mb-3 active:scale-[0.98] transition ${danger ? "bg-red-500 text-white" : "bg-blue-500 text-white"}`}>{confirmText}</button>
        <button onClick={onClose} className="w-full py-3.5 bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-2xl font-semibold">Hủy</button>
      </div>
    </div>
  );
}