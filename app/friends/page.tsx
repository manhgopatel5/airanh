"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, onSnapshot, doc, getDoc, setDoc, serverTimestamp, query, where, limit } from "firebase/firestore";
import { FiUsers, FiX, FiUserPlus, FiSearch, FiRefreshCw } from "react-icons/fi";
import { RiVipCrownLine } from "react-icons/ri";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

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

type SuggestionItem = {
  uid: string;
  name: string;
  avatar: string;
  mutualFriends: number;
  reason: string;
};

export default function FriendsPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterOnline, setFilterOnline] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch friends + mutual count
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
      const friendsData: FriendItem[] = await Promise.all(
        userDocs.map(async (userDoc) => {
          if (!userDoc.exists()) return null;
          const data = userDoc.data();

          // Đếm bạn chung
          const theirFriendsSnap = await getDoc(doc(db, "users", userDoc.id, "friends", user.uid));
          const mutualCount = theirFriendsSnap.exists()?
            Object.keys(data.friends || {}).filter(fid => activeFriendIds.includes(fid)).length : 0;

          return {
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
        })
      );

      setFriends(friendsData.filter(Boolean) as FriendItem[]);
      setFriendsLoading(false);
    });

    return () => unsub();
  }, [user?.uid, db]);

  // Gợi ý bạn bè
  useEffect(() => {
    if (!user?.uid || friends.length === 0) return;

    const fetchSuggestions = async () => {
      const friendIds = friends.map(f => f.uid);
      const q = query(
        collection(db, "users"),
        where("__name__", "not-in", [...friendIds, user.uid]),
        limit(5)
      );

      const snap = await onSnapshot(q, (snapshot) => {
        const suggs: SuggestionItem[] = [];
        snapshot.forEach(d => {
          const data = d.data();
          const mutual = Object.keys(data.friends || {}).filter(fid => friendIds.includes(fid)).length;
          if (mutual > 0) {
            suggs.push({
              uid: d.id,
              name: data.name,
              avatar: data.avatar,
              mutualFriends: mutual,
              reason: `${mutual} bạn chung`
            });
          }
        });
        setSuggestions(suggs.sort((a, b) => b.mutualFriends - a.mutualFriends));
      });
      return snap;
    };
    fetchSuggestions();
  }, [friends, user?.uid, db]);

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
        [user.uid]: {
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
  };

  const handleAddFriend = async (friendId: string) => {
    if (!user?.uid) return;
    try {
      const functions = getFunctions(getApp(), "asia-southeast1");
      const sendRequest = httpsCallable(functions, 'sendFriendRequest');
      await sendRequest({ toUid: friendId });
      toast.success("Đã gửi lời mời kết bạn");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (!user?.uid) return;
    if (!confirm(`Xóa ${friendName} khỏi danh sách bạn bè?`)) return;

    try {
      const functions = getFunctions(getApp(), "asia-southeast1");
      const unfriend = httpsCallable(functions, 'unfriend');
      await unfriend({ friendUid: friendId });
      toast.success("Đã hủy kết bạn");
      if ("vibrate" in navigator) navigator.vibrate(10);
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message}`);
    }
  };

  const formatLastSeen = (timestamp?: any): string => {
    if (!timestamp?.toDate) return "Lâu rồi";
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: vi });
  };

  const filteredFriends = useMemo(() => {
    let result = friends;
    if (filterOnline) result = result.filter(f => f.isOnline);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => {
      if (a.isOnline!== b.isOnline) return b.isOnline? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [friends, search, filterOnline]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - touchStartY.current;
    if (deltaY > 80 && scrollRef.current?.scrollTop === 0 &&!isRefreshing) {
      setIsRefreshing(true);
      setTimeout(() => setIsRefreshing(false), 1000);
      if ("vibrate" in navigator) navigator.vibrate(10);
    }
  };

  const onlineCount = friends.filter(f => f.isOnline).length;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="px-4 pt-3 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-[28px] font-bold tracking-tight">Bạn bè</h1>
            <button
              onClick={() => router.push('/friends/add')}
              className="w-9 h-9 bg-[#0a84ff] rounded-full flex items-center justify-center active:scale-90 transition-transform"
            >
              <FiUserPlus className="text-white" size={18} strokeWidth={2.5} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bạn bè"
              className="w-full h-10 pl-10 pr-4 bg-[#f2f2f7] dark:bg-zinc-800 rounded-xl text-[15px] outline-none focus:ring-2 focus:ring-[#0a84ff]/20"
            />
          </div>

          {/* Stats + Filter */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[#30d158] rounded-full animate-pulse" />
                <span className="text-[13px] font-medium text-[#8e8e93]">{onlineCount} đang hoạt động</span>
              </div>
              <span className="text-[#8e8e93]">•</span>
              <span className="text-[13px] font-medium text-[#8e8e93]">{friends.length} bạn</span>
            </div>
            <button
              onClick={() => setFilterOnline(!filterOnline)}
              className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                filterOnline
                ? 'bg-[#0a84ff] text-white'
                  : 'bg-[#f2f2f7] dark:bg-zinc-800 text-[#8e8e93]'
              }`}
            >
              Online
            </button>
          </div>
        </div>
      </div>

      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {isRefreshing && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 50 }}
            exit={{ height: 0 }}
            className="flex items-center justify-center overflow-hidden"
          >
            <FiRefreshCw className="animate-spin text-[#0a84ff]" size={20} />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="overflow-auto"
      >
        {/* Gợi ý kết bạn */}
        {suggestions.length > 0 &&!search && (
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-[13px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-3">Gợi ý cho bạn</h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {suggestions.map(sugg => (
                <div key={sugg.uid} className="flex-shrink-0 w-[140px] bg-white dark:bg-zinc-900 rounded-2xl p-3 border border-black/5 dark:border-white/5">
                  <img src={sugg.avatar} className="w-16 h-16 rounded-full mx-auto mb-2" />
                  <p className="text-[14px] font-semibold text-center truncate mb-1">{sugg.name}</p>
                  <p className="text-[12px] text-[#8e8e93] text-center mb-2">{sugg.reason}</p>
                  <button
                    onClick={() => handleAddFriend(sugg.uid)}
                    className="w-full h-8 bg-[#0a84ff] text-white rounded-lg text-[13px] font-semibold active:scale-95 transition-transform"
                  >
                    Kết bạn
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* List friends */}
        {friendsLoading? (
          <div className="px-4 pt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredFriends.length === 0? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] px-8 text-center">
            <div className="w-[72px] h-[72px] bg-[#f2f2f7] dark:bg-zinc-900 rounded-[20px] flex items-center justify-center mb-4">
              <FiUsers className="text-gray-400" size={30} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-semibold tracking-tight mb-1.5">
              {search? "Không tìm thấy" : "Chưa có bạn"}
            </h3>
            <p className="text-[15px] leading-5 text-[#8e8e93] max-w-[280px]">
              {search? "Thử tìm kiếm khác" : "Mời kết bạn để bắt đầu trò chuyện"}
            </p>
            {!search && (
              <button
                onClick={() => router.push('/friends/add')}
                className="mt-6 px-6 h-11 bg-[#0a84ff] hover:bg-[#007aff] active:bg-[#0051d5] text-white rounded-full text-[15px] font-[550] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <FiUserPlus size={18} />
                Kết bạn ngay
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-zinc-900">
            {filteredFriends.map((friend) => (
              <motion.div
                key={friend.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 active:bg-gray-100 dark:active:bg-zinc-800 transition-colors"
              >
                <button
                  onClick={() => handleStartChat(friend.uid)}
                  className="flex items-center gap-3 flex-1 min-w-0 active:scale-[0.98] transition-transform"
                >
                  <div className="relative flex-shrink-0">
                    <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-zinc-800" />
                    {friend.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#30d158] rounded-full border-2 border-white dark:border-black" />
                    )}
                    {friend.vip?.tier === 'elite' && (
                      <div className="absolute -top-1 -right-1">
                        <RiVipCrownLine className="text-amber-500" size={16} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-base leading-5 font-[550] truncate">{friend.name}</p>
                      {friend.vip?.tier === 'pro' && <span className="text-sm">💎</span>}
                      {friend.isDeletedByThem && (
                        <span className="text-xs text-red-500 font-medium flex-shrink-0">Đã xóa</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm leading-4 text-[#8e8e93] dark:text-zinc-500">
                      <span>{friend.isOnline? "Đang hoạt động" : formatLastSeen(friend.lastSeen)}</span>
                      {friend.mutualFriends! > 0 && (
                        <>
                          <span>•</span>
                          <span>{friend.mutualFriends} bạn chung</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleRemoveFriend(friend.uid, friend.name)}
                  className="w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-red-500 active:scale-90 transition-all"
                >
                  <FiX size={18} strokeWidth={2.5} />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
}