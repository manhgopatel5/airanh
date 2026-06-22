"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, onSnapshot, doc, getDoc, setDoc, serverTimestamp, query, limit, getDocs, where, orderBy } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { FiUsers, FiShare2, FiShield, FiSearch, FiMessageCircle, FiUserX, FiMapPin, FiRefreshCw, FiX, FiZap } from "react-icons/fi";
import { RiVipCrownLine } from "react-icons/ri";
import { IoStatsChart, IoRibbon } from "react-icons/io5";
import { SlidersHorizontal } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import Image from "next/image";

type FriendItem = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  userId: string;
  isOnline: boolean;
  lastSeen?: any;
  isDeletedByThem?: boolean;
  mutualFriends?: number;
  vip?: { tier: 'free' | 'pro' | 'elite' };
};

type StrangerChatItem = {
  uid: string;
  chatId: string;
  name: string;
  username: string;
  avatar: string;
  uid: string; 
  userId: string;
  isOnline: boolean;
  lastSeen?: any;
  isStranger: boolean;
  lastMessage?: string;
  updatedAt?: any;
  unreadCount?: number;
};

type RequestItem = {
  uid: string;
  name: string;
  avatar: string;
  mutualFriends: number;
  time: any;
};

type UserSuggestion = {
  uid: string;
  username: string;
  name: string;
  avatarUrl?: string;
  status?: "none" | "friend" | "sent" | "received";
  distance?: number;
  age?: number;
  gender?: "male" | "female" | "other";
  mutualFriends?: number;
};

export default function FriendsPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [tab, setTab] = useState<'friends' | 'requests' | 'suggestions'>('friends');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [strangerChats, setStrangerChats] = useState<StrangerChatItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [nearbyUsers, setNearbyUsers] = useState<UserSuggestion[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<FriendItem | StrangerChatItem | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [showScanQR, setShowScanQR] = useState(false);
  const [scanMode, setScanMode] = useState<"camera" | "upload">("camera");
  const [filters, setFilters] = useState<{
    gender: "all" | "male" | "female";
    minAge: number | '';
    maxAge: number | '';
    maxDistance: number | '';
  }>({
    gender: "all",
    minAge: 18,
    maxAge: 25,
    maxDistance: 50
  });
  const [myUsername, setMyUsername] = useState("");

  useEffect(() => {
    if (user?.uid) {
      getDoc(doc(db, "users", user.uid)).then((snap) => {
        if (snap.exists()) setMyUsername(snap.data().username || "");
      });
    }
  }, [user?.uid, db]);

  const stopScan = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {}
    }
    setShowScanQR(false);
  };

  const startScan = async () => {
    const scanner = new Html5Qrcode("qr-reader-add");
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          toast.success(`Đã quét: ${decodedText}`);
          stopScan();
          router.push(`/profile/${decodedText}`);
        },
        () => {}
      );
    } catch (e) {
      toast.error("Không mở được camera");
      stopScan();
    }
  };

  useEffect(() => {
    if (showScanQR && scanMode === "camera") startScan();
    return () => { stopScan(); };
  }, [showScanQR, scanMode]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    setFriendsLoading(true);

    const friendsRef = collection(db, "users", user.uid, "friends");
    const unsub = onSnapshot(friendsRef, async (snapshot) => {
      const activeFriendIds = snapshot.docs.filter(d => d.data()?.status!== "removed").map(d => d.id);
      if (activeFriendIds.length === 0) {
        setFriends([]);
        setFriendsLoading(false);
        return;
      }

      const userDocs = await Promise.all(activeFriendIds.map(id => getDoc(doc(db, "users", id))));
      const friendsData = await Promise.all(
        userDocs.map(async (userDoc) => {
          if (!userDoc.exists()) return null;
          const data = userDoc.data();
          const theirFriendsSnap = await getDoc(doc(db, "users", userDoc.id, "friends", user.uid));
          const mutualCount = theirFriendsSnap.exists()
        ? Object.keys(data.friends || {}).filter(fid => activeFriendIds.includes(fid)).length
            : 0;

          const friend: FriendItem = {
            uid: userDoc.id,
            name: data.name || "User",
            username: data.username || "",
            avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "U")}&background=random`,
            userId: data.userId || "",
            isOnline: Boolean(data.isOnline),
            lastSeen: data.lastSeen,
            isDeletedByThem: Boolean(snapshot.docs.find(d => d.id === userDoc.id)?.data()?.removedBy),
            mutualFriends: mutualCount,
            vip: data.vip || { tier: 'free' }
          };
          return friend;
        })
      );

      const filtered = friendsData.filter(f => f!== null) as FriendItem[];
      setFriends(filtered);
      setFriendsLoading(false);
    });

    return () => unsub();
  }, [user?.uid, db]);

  // QUERY CHAT NGƯỜI LẠ CHƯA KẾT BẠN
  useEffect(() => {
  if (!user?.uid) return;

  const q = query(
    collection(db, "chats"),
    where("members", "array-contains", user.uid),
    where("isGroup", "==", false),
    where("isStranger", "==", true),
    orderBy("updatedAt", "desc")
  );

  const unsub = onSnapshot(q, async (snap) => {
    const friendIds = new Set(friends.map(f => f.uid));
    const list: StrangerChatItem[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      const otherUid = data.members?.find((m: string) => m!== user.uid);
      if (!otherUid || friendIds.has(otherUid)) continue;

      const userDoc = await getDoc(doc(db, "users", otherUid));
      const userData = userDoc.data() || {};

      list.push({
        uid: otherUid, // QUAN TRỌNG: Phải có uid
        chatId: d.id,
        name: userData.name || "Người lạ",
        username: userData.username || "",
        avatar: userData.avatar || `https://ui-avatars.com/api/?name=?&background=ec4899&color=fff&bold=true`,
        userId: userData.userId || "",
        isOnline: Boolean(userData.isOnline),
        lastSeen: userData.lastSeen,
        isStranger: true,
        lastMessage: data.lastMessage || "Bắt đầu trò chuyện",
        updatedAt: data.updatedAt,
        unreadCount: data.unread?.[user.uid] || 0
      });
    }
    setStrangerChats(list);
  });

  return () => unsub();
}, [user?.uid, db, friends]);

  useEffect(() => {
    if (!user?.uid) return;
    const reqRef = collection(db, "users", user.uid, "friendRequests");
    const unsub = onSnapshot(reqRef, async (snapshot) => {
      const reqs = await Promise.all(
        snapshot.docs.map(async (d) => {
          const userData = await getDoc(doc(db, "users", d.id));
          if (!userData.exists()) return null;
          return {
            uid: d.id,
            name: userData.data().name,
            avatar: userData.data().avatar,
            mutualFriends: 0,
            time: d.data().createdAt
          };
        })
      );
      setRequests(reqs.filter(r => r!== null) as RequestItem[]);
    });
    return () => unsub();
  }, [user?.uid, db]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationDenied(false);
        },
        () => {
          setLocationDenied(true);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  useEffect(() => {
    if (!userLocation) return;
    fetchNearbyUsers();
    fetchSuggestedUsers();
  }, [userLocation, filters]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchNearbyUsers = async () => {
    if (!userLocation) return;
    setLoadingNearby(true);

    try {
      const auth = getAuth();
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const usersRef = collection(db, "users");
      const q = query(usersRef, limit(100));
      const snap = await getDocs(q);
      const results: UserSuggestion[] = [];

      for (const docSnap of snap.docs) {
        if (docSnap.id === currentUid) continue;
        const data = docSnap.data();

        if (!data.location?.lat ||!data.location?.lng) continue;

        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          data.location.lat,
          data.location.lng
        );

        const maxDist = Number(filters.maxDistance) || 100;
        const minAge = Number(filters.minAge) || 18;
        const maxAge = Number(filters.maxAge) || 100;

        if (distance > maxDist) continue;
        if (filters.gender!== "all" && data.gender!== filters.gender) continue;
        if (data.age && (data.age < minAge || data.age > maxAge)) continue;

        let status: UserSuggestion["status"] = "none";
        const friendDoc = await getDoc(doc(db, "users", currentUid, "friends", docSnap.id));
        if (friendDoc.exists()) continue;

        const sentReq = await getDoc(doc(db, "friendRequests", `${currentUid}_${docSnap.id}`));
        if (sentReq.exists() && sentReq.data().status === "pending") {
          status = "sent";
        } else {
          const receivedReq = await getDoc(doc(db, "friendRequests", `${docSnap.id}_${currentUid}`));
          if (receivedReq.exists() && receivedReq.data().status === "pending") {
            status = "received";
          }
        }

        results.push({
          uid: docSnap.id,
          username: data.username || "",
          name: data.name || "",
          avatarUrl: data.avatarUrl,
          status,
          distance: Math.round(distance * 10) / 10,
          age: data.age,
          gender: data.gender
        });
      }

      results.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      setNearbyUsers(results.slice(0, 20));
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNearby(false);
    }
  };

  const fetchSuggestedUsers = async () => {
    setLoadingSuggested(true);
    try {
      const auth = getAuth();
      const currentUid = auth.currentUser?.uid;
      if (!currentUid) return;

      const friendIds = friends.map(f => f.uid);
      const usersRef = collection(db, "users");
      const q = query(usersRef, limit(50));
      const snap = await getDocs(q);
      const results: UserSuggestion[] = [];
      const randomUsers: UserSuggestion[] = [];

      for (const docSnap of snap.docs) {
        if (docSnap.id === currentUid) continue;
        if (friendIds.includes(docSnap.id)) continue;

        const data = docSnap.data();

        const friendDoc = await getDoc(doc(db, "users", currentUid, "friends", docSnap.id));
        if (friendDoc.exists()) continue;

        const myFriendsSnap = await getDocs(collection(db, "users", currentUid, "friends"));
        const theirFriendsSnap = await getDocs(collection(db, "users", docSnap.id, "friends"));
        const myFriends = new Set(myFriendsSnap.docs.map(d => d.id));
        const mutualCount = theirFriendsSnap.docs.filter(d => myFriends.has(d.id)).length;

        const userData: UserSuggestion = {
          uid: docSnap.id,
          username: data.username || "",
          name: data.name || "",
          avatarUrl: data.avatarUrl,
          status: "none",
          mutualFriends: mutualCount,
          age: data.age,
          gender: data.gender
        };

        if (mutualCount > 0) {
          results.push(userData);
        } else {
          randomUsers.push(userData);
        }
      }

      results.sort((a, b) => (b.mutualFriends || 0) - (a.mutualFriends || 0));

      if (results.length === 0) {
        const shuffled = randomUsers.sort(() => 0.5 - Math.random());
        setSuggestions(shuffled.slice(0, 10));
      } else {
        setSuggestions(results.slice(0, 10));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSuggested(false);
    }
  };

  const handleStartChat = async (friendId: string) => {
    if (!user?.uid) return;
    const chatId = [user.uid, friendId].sort().join("_");
    const [currentUserDoc, friendDoc] = await Promise.all([
      getDoc(doc(db, "users", user.uid)),
      getDoc(doc(db, "users", friendId))
    ]);
    const currentData = currentUserDoc.data();
    const friendData = friendDoc.data();

    await setDoc(doc(db, "chats", chatId), {
      members: [user.uid, friendId],
      isGroup: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      membersInfo: {
        [user.uid]: { name: currentData?.name || "User", avatar: currentData?.avatar || "", username: currentData?.username || "" },
        [friendId]: { name: friendData?.name || "User", avatar: friendData?.avatar || "", username: friendData?.username || "" }
      }
    }, { merge: true });

    router.push(`/chat/${chatId}`);
  };

  const handleAccept = async (uid: string) => {
    const functions = getFunctions(getApp(), "asia-southeast1");
    const accept = httpsCallable(functions, 'acceptFriendRequest');
    await accept({ fromUid: uid });
    toast.success("Đã chấp nhận");
  };

  const handleAddFriend = async (friendId: string, username?: string) => {
    const functions = getFunctions(getApp(), "asia-southeast1");
    const sendRequest = httpsCallable(functions, 'sendFriendRequest');
    await sendRequest({ toUid: friendId });
    toast.success(`Đã gửi lời mời tới ${username || 'người dùng'}`);
    fetchNearbyUsers();
    fetchSuggestedUsers();
  };

  const copyMyLink = () => {
    if (!myUsername) {
      toast.error("Chưa có username");
      return;
    }
    const link = `${window.location.origin}/u/${myUsername}`;
    navigator.clipboard.writeText(link);
    if ("vibrate" in navigator) navigator.vibrate(10);
    toast.success("Đã copy link mời bạn");
  };

  const handleRemoveFriend = async (friend: FriendItem) => {
    if (!confirm(`Xóa ${friend.name} khỏi danh sách bạn bè?`)) return;
    const functions = getFunctions(getApp(), "asia-southeast1");
    const unfriend = httpsCallable(functions, 'unfriend');
    await unfriend({ friendUid: friend.uid });
    toast.success("Đã hủy kết bạn");
    setSelectedFriend(null);
    if ("vibrate" in navigator) navigator.vibrate(10);
  };

  const formatLastSeen = (timestamp?: any): string => {
    if (!timestamp?.toDate) return "Lâu rồi";
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: vi });
  };

  const allItems = useMemo((): (FriendItem | StrangerChatItem)[] => {
  return [...friends,...strangerChats];
}, [friends, strangerChats]);

const filteredFriends = useMemo((): (FriendItem | StrangerChatItem)[] => {
  let result = allItems;
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(f => f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q));
  }
  return result.sort((a, b) => {
    if (a.isOnline!== b.isOnline) return b.isOnline? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}, [allItems, search]);
  const onlineCount = friends.filter(f => f.isOnline).length;

  const FriendRow = ({ friend }: { friend: FriendItem | StrangerChatItem }) => {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0], [1, 0]);
  const isStranger = 'isStranger' in friend && friend.isStranger;

  return (
    <motion.div className="relative overflow-hidden rounded-xl">
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center rounded-r-xl"
        style={{ opacity }}
      >
        <FiUserX className="text-white" size={20} />
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -80, right: 0 }}
        style={{ x }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60 &&!isStranger) handleRemoveFriend(friend as FriendItem);
        }}
        className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.06] rounded-xl shadow-sm hover:shadow-md transition-shadow"
      >
        <button
          onClick={() => isStranger? router.push(`/chat/${(friend as StrangerChatItem).chatId}`) : handleStartChat(friend.uid)}
          onContextMenu={(e) => { e.preventDefault(); if (!isStranger) setSelectedFriend(friend as FriendItem); }}
          className="flex items-center gap-3 p-4 w-full active:bg-gray-50 dark:active:bg-zinc-800 rounded-xl"
        >
          <div className="relative flex-shrink-0">
            <img src={friend.avatar} alt={friend.name} className="w-14 h-14 rounded-full object-cover" />
            {friend.isOnline && (
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#30d158] rounded-full border-[3px] border-white dark:border-zinc-900" />
            )}
            {isStranger && (
              <div className="absolute -top-1 -right-1 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full p-1 shadow-md">
                <FiZap className="text-white" size={12} />
              </div>
            )}
            {!isStranger && (friend as FriendItem).vip?.tier === 'elite' && (
              <div className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-1 shadow-md">
                <RiVipCrownLine className="text-white" size={12} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-1.5">
              <p className="text-base leading-5 font-[600] truncate font-serif">{friend.name}</p>
              {isStranger && <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-pink-500/15 to-purple-500/15 text-pink-600 dark:text-pink-400 rounded-md font-[600]">Người lạ</span>}
              {!isStranger && (friend as FriendItem).vip?.tier === 'pro' && <span className="text-sm">💎</span>}
            </div>
            <div className="flex items-center gap-2 text-sm leading-4 text-[#8e8e93] dark:text-zinc-500 font-serif">
              <span>{friend.isOnline? "Đang hoạt động" : formatLastSeen(friend.lastSeen)}</span>
              {!isStranger && (friend as FriendItem).mutualFriends! > 0 && (
                <>
                  <span>•</span>
                  <span>{(friend as FriendItem).mutualFriends} bạn chung</span>
                </>
              )}
              {isStranger && 'lastMessage' in friend && (
                <>
                  <span>•</span>
                  <span className="truncate">{friend.lastMessage}</span>
                </>
              )}
            </div>
          </div>
          {'unreadCount' in friend && friend.unreadCount! > 0 && (
            <div className="min-w-5 h-5 px-1.5 bg-[#0a84ff] rounded-full flex items-center justify-center shadow-md shadow-[#0a84ff]/30">
              <span className="text-xs font-[700] text-white">{friend.unreadCount}</span>
            </div>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
};

  return (
  <div className="min-h-[100dvh] bg-[#F7F8FA] dark:bg-[#0A0A0B] font-serif">
    <div className="px-5 pt-4 pb-3">
      <div className="relative mb-4">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={20} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm bạn bè"
          className="w-full h-11 pl-12 pr-4 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl text-base outline-none border border-black/[0.04] dark:border-white/[0.06] focus:ring-2 focus:ring-[#007AFF]/20"
        />
      </div>

      <div className="bg-[#F2F7] dark:bg-zinc-800 rounded-xl p-1 flex gap-1">
        {(['friends', 'requests', 'suggestions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 h-9 rounded-lg text-sm font-[600] transition-all flex items-center justify-center gap-1.5 ${
              tab === t
          ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm'
              : 'text-[#8e8e93]'
            }`}
          >
            {t === 'friends' && <><FiUsers size={16} /> Bạn bè</>}
            {t === 'requests' && <><IoRibbon size={16} /> Lời mời{requests.length > 0? ` (${requests.length})` : ''}</>}
            {t === 'suggestions' && <><IoStatsChart size={16} /> Gợi ý</>}
          </button>
        ))}
      </div>
    </div>

    <div ref={scrollRef} className="overflow-auto pb-20 px-5 pt-4">
      {tab === 'friends' && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <FiUsers className="text-[#8e8e93]" size={18} />
                <span className="text-sm text-[#8e8e93]">Bạn bè</span>
              </div>
              <p className="text-2xl font-[700] leading-8">{friends.length}</p>
            </div>
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <FiShield className="text-[#8e8e93]" size={18} />
                <span className="text-sm text-[#8e8e93]">Đang hoạt động</span>
              </div>
              <p className="text-2xl font-[700] leading-8">{onlineCount}</p>
            </div>
          </div>

          {friendsLoading? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="flex items-center gap-3 animate-pulse">
                    <div className="w-14 h-14 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                      <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFriends.length === 0? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-10 border-black/[0.06] dark:border-white/[0.06] text-center shadow-sm">
              <div className="w-16 h-16 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl flex items-center justify-center mx-auto mb-4">
                <FiUsers className="text-[#8e8e93]" size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-[700] mb-2">
                {search? "Không tìm thấy" : "Chưa có bạn"}
              </h3>
              <p className="text-sm text-[#8e8e93] mb-6">
                {search? "Thử tìm kiếm khác" : "Mời kết bạn để bắt đầu trò chuyện"}
              </p>
              {!search && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTab('suggestions')}
                    className="h-11 bg-[#0a84ff] text-white rounded-xl text-sm font-[600] flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-[#0a84ff]/30"
                  >
                    <FiUsers size={18} /> Tìm bạn
                  </button>
                  <button
                    onClick={copyMyLink}
                    className="h-11 bg-zinc-100 dark:bg-zinc-800 border-black/5 dark:border-white/5 rounded-xl text-sm font-[600] flex items-center justify-center gap-2 active:scale-95 transition shadow-sm"
                  >
                    <FiShare2 size={18} /> Mời bạn
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
{filteredFriends.map((friend) => <FriendRow key={friend.uid} friend={friend} />)}
            </div>
          )}
        </>
      )}

      {tab === 'requests' && (
        <div className="space-y-3">
          {requests.length === 0? (
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-10 border-black/[0.06] dark:border-white/[0.06] text-center text-[#8e8e93] shadow-sm">
              Chưa có lời mời nào
            </div>
          ) : (
            requests.map(req => (
              <div key={req.uid} className="bg-white dark:bg-zinc-900 rounded-xl p-4 border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <img src={req.avatar} className="w-14 h-14 rounded-full" />
                  <div className="flex-1">
                    <p className="text-base font-[600]">{req.name}</p>
                    <p className="text-sm text-[#8e8e93]">{req.mutualFriends} bạn chung</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(req.uid)}
                    className="flex-1 h-11 bg-[#007AFF] text-white rounded-xl text-base font-[600] active:scale-95 shadow-md shadow-[#007AFF]/30"
                  >
                    Chấp nhận
                  </button>
                  <button className="flex-1 h-11 bg-[#F2F7] dark:bg-zinc-800 text-[#8e8e93] rounded-xl text-base font-[600]">
                    Xóa
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'suggestions' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30">
                  <FiMapPin className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-base font-[700]">Tìm xung quanh</p>
                  <p className="text-sm text-[#8e8e93]">Bạn bè gần bạn</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowScanQR(true)}
                  className="w-9 h-9 flex items-center justify-center text-[#0a84ff] bg-white/60 dark:bg-zinc-800/60 backdrop-blur rounded-xl active:scale-95 transition-all shadow-sm"
                >
                  <FiUsers size={18} />
                </button>
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="w-9 h-9 flex items-center justify-center text-[#0a84ff] bg-white/60 dark:bg-zinc-800/60 backdrop-blur rounded-xl active:scale-95 transition-all shadow-sm"
                >
                  <SlidersHorizontal size={18} />
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showFilter && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="p-3 bg-white/60 dark:bg-zinc-800/60 backdrop-blur rounded-xl space-y-4 shadow-sm">
                    <div>
                      <p className="text-sm font-[600] mb-3">Giới tính</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Tất cả", value: "all" },
                          { label: "Nam", value: "male" },
                          { label: "Nữ", value: "female" }
                        ].map((g) => (
                          <button
                            key={g.value}
                            onClick={() => setFilters({...filters, gender: g.value as any })}
                            className={`h-11 rounded-xl text-sm font-[600] transition-all active:scale-95 ${
                              filters.gender === g.value
                         ? "bg-gradient-to-br from-[#0a84ff] to-purple-500 text-white shadow-lg shadow-blue-500/30"
                              : "bg-white dark:bg-zinc-700"
                            }`}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-[600] mb-3">Tuổi</p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-[#8e8e93] dark:text-zinc-500 mb-1.5">Từ</p>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={filters.minAge}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setFilters({...filters, minAge: val? Number(val) : ''});
                            }}
                            onBlur={(e) => {
                              let val = Number(e.target.value) || 18;
                              if (val < 18) {
                                toast.error("Tuổi tối thiểu phải từ 18 trở lên");
                                val = 18;
                              }
                              if (val > 100) val = 100;
                              setFilters({
                            ...filters,
                                minAge: val,
                                maxAge: Math.max(val, Number(filters.maxAge) || val)
                              });
                            }}
                            className="w-full h-12 px-4 bg-white dark:bg-zinc-700 rounded-xl text-center text-base font-[600] outline-none focus:ring-4 focus:ring-[#0a84ff]/20 transition-all"
                            placeholder="18"
                          />
                        </div>
                        <div className="w-4 h-[2px] bg-zinc-300 dark:bg-zinc-600 mt-6" />
                        <div className="flex-1">
                          <p className="text-xs text-[#8e8e93] dark:text-zinc-500 mb-1.5">Đến</p>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={filters.maxAge}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setFilters({...filters, maxAge: val? Number(val) : ''});
                            }}
                            onBlur={(e) => {
                              let val = Number(e.target.value) || 25;
                              if (val < 18) {
                                toast.error("Tuổi tối thiểu phải từ 18 trở lên");
                                val = 18;
                              }
                              if (val > 100) val = 100;
                              setFilters({
                            ...filters,
                                maxAge: val,
                                minAge: Math.min(val, Number(filters.minAge) || val)
                              });
                            }}
                            className="w-full h-12 px-4 bg-white dark:bg-zinc-700 rounded-xl text-center text-base font-[600] outline-none focus:ring-4 focus:ring-[#0a84ff]/20 transition-all"
                            placeholder="25"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-[600] mb-3">Khoảng cách tối đa</p>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={filters.maxDistance}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setFilters({...filters, maxDistance: val? Number(val) : ''});
                          }}
                          onBlur={(e) => {
                            let val = Number(e.target.value);
                            if (e.target.value === '') val = 50;
                            val = Math.max(0, Math.min(100, val));
                            setFilters({...filters, maxDistance: val});
                          }}
                          className="w-full h-12 px-4 pr-12 bg-white dark:bg-zinc-700 rounded-xl text-center text-base font-[600] outline-none focus:ring-4 focus:ring-[#0a84ff]/20 transition-all"
                          placeholder="50"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-[600] text-[#8e8e93] dark:text-zinc-500">km</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
{!loadingNearby && locationDenied && (
  <div className="py-8 text-center">
    <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-3">
      <FiMapPin className="text-red-500" size={28} />
    </div>
    <p className="text-base font-[600]">Bạn đã từ chối quyền vị trí</p>
    <p className="text-sm text-[#8e93] dark:text-zinc-500 mt-1">
      Bật quyền vị trí trong cài đặt trình duyệt để tìm bạn bè gần bạn
    </p>
    <button
      onClick={() => window.location.reload()}
      className="mt-4 px-4 h-10 bg-[#0a84ff] text-white rounded-xl text-sm font-[600] shadow-md shadow-[#0a84ff]/30"
    >
      Thử lại
    </button>
  </div>
)}
              {loadingNearby && (
                <div className="py-12 text-center text-[#8e8e93]">
                  <FiRefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  <p className="text-sm">Đang tìm bạn bè gần bạn...</p>
                </div>
              )}

              {!loadingNearby && nearbyUsers.length === 0 && userLocation && (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 bg-white/50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiMapPin className="text-[#8e8e93]" size={28} />
                  </div>
                  <p className="text-base font-[600]">Không tìm thấy ai gần bạn</p>
                  <p className="text-sm text-[#8e8e93] dark:text-zinc-500 mt-1">Thử mở rộng khoảng cách tìm kiếm</p>
                </div>
              )}

      {!loadingNearby && nearbyUsers.length > 0 && (
  <div className="space-y-2 mb-3">
    {nearbyUsers.map((user) => (
      <div
        key={user.uid}
        className="flex items-center gap-3 p-3 bg-white/60 dark:bg-zinc-800/60 backdrop-blur rounded-xl shadow-sm hover:shadow-md transition-shadow"
      >
        {user.avatarUrl? (
          <Image src={user.avatarUrl} alt={user.name} width={48} height={48} className="rounded-full" />
        ) : (
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {user.name[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-[600] text-base truncate">{user.name}</p>
          <div className="flex items-center gap-2 text-sm text-[#8e8e93] dark:text-zinc-500">
            <span>@{user.username}</span>
            {user.distance!== undefined && (
              <>
                <span>•</span>
                <span className="flex items-center gap-0.5 font-[600] text-[#0a84ff]">
                  <FiMapPin size={12} />
                  {user.distance}km
                </span>
              </>
            )}
            {user.age && (
              <>
                <span>•</span>
                <span>{user.age}t</span>
              </>
            )}
          </div>
        </div>
        {user.status === "sent" && (
          <div className="px-3 py-1.5 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-[600]">
            Đã gửi
          </div>
        )}
        {user.status === "received" && (
          <div className="px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-[600]">
            Chờ xác nhận
          </div>
        )}
        {user.status === "none" && (
          <button
            onClick={() => handleAddFriend(user.uid, user.username)}
            className="px-4 h-9 bg-[#0a84ff] text-white rounded-xl text-sm font-[600] active:scale-95 transition-all shadow-md shadow-[#0a84ff]/30"
          >
            Kết bạn
          </button>
        )}
      </div>
    ))}
  </div>
)}
              {userLocation && (
                <button
                  onClick={fetchNearbyUsers}
                  disabled={loadingNearby}
                  className="w-full h-10 flex items-center justify-center gap-2 bg-white/60 dark:bg-zinc-800/60 backdrop-blur rounded-xl text-[#0a84ff] font-[600] active:scale-95 transition-all disabled:opacity-40 shadow-sm"
                >
                  <FiRefreshCw size={18} className={loadingNearby? "animate-spin" : ""} />
                  Làm mới
                </button>
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-4 border border-black/[0.06] dark:border-white/[0.06] shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md shadow-purple-500/30">
                  <FiUsers className="text-white" size={20} />
                </div>
                <div>
                  <p className="text-base font-[700]">
                    {suggestions.some(u => u.mutualFriends && u.mutualFriends > 0)
                  ? "Những người bạn có thể biết"
                      : "Gợi ý cho bạn"}
                  </p>
                  <p className="text-sm text-[#8e8e93] dark:text-zinc-500">
                    {suggestions.some(u => u.mutualFriends && u.mutualFriends > 0)
                  ? "Dựa trên bạn chung"
                      : "Người dùng mới"}
                  </p>
                </div>
              </div>

              {loadingSuggested? (
                <div className="py-12 text-center text-[#8e8e93]">
                  <FiRefreshCw className="animate-spin mx-auto mb-2" size={24} />
                  <p className="text-sm">Đang tải gợi ý...</p>
                </div>
              ) : suggestions.length === 0? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-white/50 dark:bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <FiUsers className="text-[#8e8e93]" size={28} />
                  </div>
                  <p className="text-base font-[600]">Chưa có gợi ý nào</p>
                  <p className="text-sm text-[#8e8e93] dark:text-zinc-500 mt-1">Hãy thử lại sau</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {suggestions.map((user) => (
                    <div
                      key={user.uid}
                      className="flex items-center gap-3 p-3 bg-white/60 dark:bg-zinc-800/60 backdrop-blur rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    >
                      {user.avatarUrl? (
                        <Image src={user.avatarUrl} alt={user.name} width={48} height={48} className="rounded-full" />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {user.name[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-[600] text-base truncate">{user.name}</p>
                        <div className="flex items-center gap-2 text-sm text-[#8e8e93] dark:text-zinc-500">
                          <span>@{user.username}</span>
                          {user.mutualFriends && user.mutualFriends > 0? (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5 font-[600] text-purple-600 dark:text-purple-400">
                                <FiUsers size={12} />
                                {user.mutualFriends} bạn chung
                              </span>
                            </>
                          ) : (
                            <>
                              <span>•</span>
                              <span className="font-[600] text-green-600 dark:text-green-400">Mới tham gia</span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddFriend(user.uid, user.username)}
                        className="px-4 h-9 bg-[#0a84ff] text-white rounded-xl text-sm font-[600] active:scale-95 transition-all shadow-md shadow-[#0a84ff]/30"
                      >
                        Kết bạn
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedFriend && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedFriend(null)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-2xl z-50 p-5 pb-10 shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-5" />
              <div className="flex items-center gap-3 mb-6">
                <img src={selectedFriend.avatar} className="w-16 h-16 rounded-full" />
                <div>
                  <p className="text-lg font-[600]">{selectedFriend.name}</p>
                  <p className="text-sm text-[#8e93]">@{selectedFriend.username}</p>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => { handleStartChat(selectedFriend.uid); setSelectedFriend(null); }}
                  className="w-full h-12 flex items-center gap-3 px-5 bg-[#F2F2F7] dark:bg-zinc-800 rounded-xl active:scale-98 shadow-sm"
                >
                  <FiMessageCircle size={22} />
                  <span className="text-base font-[500]">Nhắn tin</span>
                </button>
                <button
                  onClick={() => { handleRemoveFriend(selectedFriend); }}
                  className="w-full h-12 flex items-center gap-3 px-5 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-xl active:scale-98 shadow-sm"
                >
                  <FiUserX size={22} />
                  <span className="text-base font-[500]">Hủy kết bạn</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

  {showScanQR && (
  <div className="fixed inset-0 bg-black z-[70]">
    <div id="qr-reader-add" className={scanMode === "camera"? "w-full h-full" : "hidden"} />
    <div id="qr-reader-file-add" className={scanMode === "upload"? "w-full h-full" : "hidden"} />

    <button
      onClick={() => stopScan()}
      className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/50 backdrop-blur flex items-center justify-center active:scale-90 transition"
      style={{ top: "max(24px, env(safe-area-inset-top))" }}
    >
      <FiX className="w-5 h-5 text-white" />
    </button>

    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur rounded-xl p-1 flex gap-1"
         style={{ top: "max(24px, env(safe-area-inset-top))" }}>
      <button
        onClick={() => setScanMode("camera")}
        className={`px-4 h-9 rounded-lg text-sm font-[600] transition-all ${
          scanMode === "camera"
        ? 'bg-white text-black'
          : 'text-white/70'
        }`}
      >
        Camera
      </button>
      <button
        onClick={() => setScanMode("upload")}
        className={`px-4 h-9 rounded-lg text-sm font-[600] transition-all ${
          scanMode === "upload"
        ? 'bg-white text-black'
          : 'text-white/70'
        }`}
      >
        Tải ảnh
      </button>
    </div>
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white text-center">
            <p className="font-bold">Đưa mã QR vào khung</p>
            <p className="text-sm opacity-70 mt-1">Tự động quét khi phát hiện</p>
          </div>
        </div>
      )}

<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={async (e) => {
    const file = e.target.files?.[0];
    if (!file ||!scannerRef.current) return;
    try {
      const result = await scannerRef.current.scanFile(file, true);
      toast.success(`Đã quét: ${result}`);
      stopScan();
    } catch (e) {
      toast.error("Không đọc được mã QR");
    }
  }}
/>

      <style jsx global>{`
     .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
