"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, onSnapshot, doc, getDoc, setDoc, serverTimestamp, query, where, limit } from "firebase/firestore";
import { FiUsers, FiShield, FiUserPlus, FiSearch, FiMessageCircle, FiUserX } from "react-icons/fi";
import { RiVipCrownLine, RiUserSearchLine } from "react-icons/ri";
import { IoStatsChart, IoRibbon } from "react-icons/io5";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

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

type RequestItem = {
  uid: string;
  name: string;
  avatar: string;
  mutualFriends: number;
  time: any;
};

export default function FriendsPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [tab, setTab] = useState<'friends' | 'requests' | 'suggestions'>('friends');
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [suggestions, setSuggestions] = useState<RequestItem[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterOnline, setFilterOnline] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch friends
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

  // Fetch requests
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

  // Fetch suggestions
  useEffect(() => {
    if (!user?.uid) return;
    const friendIds = friends.map(f => f.uid);
    const q = query(
      collection(db, "users"),
      where("__name__", "not-in", [...friendIds, user.uid].slice(0, 10)),
      limit(10)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const suggs: RequestItem[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        const mutual = Object.keys(data.friends || {}).filter(fid => friendIds.includes(fid)).length;
        suggs.push({
          uid: d.id,
          name: data.name,
          avatar: data.avatar,
          mutualFriends: mutual,
          time: null
        });
      });
      setSuggestions(suggs.sort((a, b) => b.mutualFriends - a.mutualFriends));
    });
    return () => unsub();
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

  const handleAddFriend = async (friendId: string) => {
    const functions = getFunctions(getApp(), "asia-southeast1");
    const sendRequest = httpsCallable(functions, 'sendFriendRequest');
    await sendRequest({ toUid: friendId });
    toast.success("Đã gửi lời mời");
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

  const filteredFriends = useMemo(() => {
    let result = friends;
    if (filterOnline) result = result.filter(f => f.isOnline);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q) || f.username.toLowerCase().includes(q));
    }
    return result.sort((a, b) => {
      if (a.isOnline!== b.isOnline) return b.isOnline? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [friends, search, filterOnline]);

  const onlineCount = friends.filter(f => f.isOnline).length;

  const FriendRow = ({ friend }: { friend: FriendItem }) => {
    const x = useMotionValue(0);
    const opacity = useTransform(x, [-100, 0], [1, 0]);

    return (
      <motion.div className="relative overflow-hidden rounded-[20px]">
        <motion.div
          className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center rounded-r-[20px]"
          style={{ opacity }}
        >
          <FiUserX className="text-white" size={20} />
        </motion.div>
        <motion.div
          drag="x"
          dragConstraints={{ left: -80, right: 0 }}
          style={{ x }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) handleRemoveFriend(friend);
          }}
          className="bg-white dark:bg-zinc-900 border border-black/[0.06] dark:border-white/[0.06] rounded-[20px]"
        >
          <button
            onClick={() => handleStartChat(friend.uid)}
            onContextMenu={(e) => { e.preventDefault(); setSelectedFriend(friend); }}
            className="flex items-center gap-3 p-4 w-full active:bg-gray-50 dark:active:bg-zinc-800 rounded-[20px]"
          >
            <div className="relative flex-shrink-0">
              <img src={friend.avatar} alt={friend.name} className="w-14 h-14 rounded-full object-cover" />
              {friend.isOnline && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#30d158] rounded-full border-[3px] border-white dark:border-zinc-900" />
              )}
              {friend.vip?.tier === 'elite' && (
                <div className="absolute -top-1 -right-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full p-1">
                  <RiVipCrownLine className="text-white" size={12} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <p className="text-[17px] leading-5 font-[600] truncate font-serif">{friend.name}</p>
                {friend.vip?.tier === 'pro' && <span className="text-sm">💎</span>}
              </div>
              <div className="flex items-center gap-2 text-[14px] leading-4 text-[#8e8e93] dark:text-zinc-500 font-serif">
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
        </motion.div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-dvh bg-[#F7F8FA] dark:bg-[#0A0A0B] font-serif">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06]">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-[34px] font-[700] tracking-[-0.6px]">Bạn bè</h1>
            <button
              onClick={() => router.push('/friends/add')}
              className="w-11 h-11 bg-[#007AFF] rounded-full flex items-center justify-center active:scale-90 transition-transform"
            >
              <FiUserPlus className="text-white" size={22} strokeWidth={2.5} />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={20} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bạn bè"
              className="w-full h-[48px] pl-12 pr-4 bg-[#F2F2F7] dark:bg-zinc-800 rounded-[14px] text-[17px] outline-none border border-black/[0.04] dark:border-white/[0.06] focus:ring-2 focus:ring-[#007AFF]/20"
            />
          </div>

          {/* Segmented Control */}
          <div className="bg-[#F2F2F7] dark:bg-zinc-800 rounded-[12px] p-1 flex gap-1">
            {(['friends', 'requests', 'suggestions'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 h-[36px] rounded-[10px] text-[15px] font-[600] transition-all flex items-center justify-center gap-1.5 ${
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
      </div>

      <div ref={scrollRef} className="overflow-auto pb-20 px-5 pt-4">
        {tab === 'friends' && (
          <>
            {/* Stats Cards giống ảnh */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white dark:bg-zinc-900 rounded-[20px] p-4 border border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1">
                  <FiUsers className="text-[#8e8e93]" size={18} />
                  <span className="text-[14px] text-[#8e8e93]">Bạn bè</span>
                </div>
                <p className="text-[28px] font-[700]">{friends.length}</p>
              </div>
              <div className="bg-white dark:bg-zinc-900 rounded-[20px] p-4 border border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center gap-2 mb-1">
                  <FiShield className="text-[#8e8e93]" size={18} />
                  <span className="text-[14px] text-[#8e8e93]">Đang hoạt động</span>
                </div>
                <p className="text-[28px] font-[700]">{onlineCount}</p>
              </div>
            </div>

            {friendsLoading? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 rounded-[20px] p-4 border border-black/[0.06] dark:border-white/[0.06]">
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
              <div className="bg-white dark:bg-zinc-900 rounded-[20px] p-10 border border-black/[0.06] dark:border-white/[0.06] text-center">
                <div className="w-[72px] h-[72px] bg-[#F2F2F7] dark:bg-zinc-800 rounded-[20px] flex items-center justify-center mx-auto mb-4">
                  <FiUsers className="text-[#8e8e93]" size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-[20px] font-[700] mb-2">
                  {search? "Không tìm thấy" : "Chưa có bạn"}
                </h3>
                <p className="text-[15px] text-[#8e8e93] mb-6">
                  {search? "Thử tìm kiếm khác" : "Mời kết bạn để bắt đầu trò chuyện"}
                </p>
                {!search && (
                  <button
                    onClick={() => router.push('/friends/add')}
                    className="px-8 h-[48px] bg-[#007AFF] text-white rounded-[14px] text-[16px] font-[600] active:scale-95 transition-all inline-flex items-center justify-center gap-2"
                  >
                    <FiUserPlus size={20} />
                    Kết bạn ngay
                  </button>
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
              <div className="bg-white dark:bg-zinc-900 rounded-[20px] p-10 border border-black/[0.06] dark:border-white/[0.06] text-center text-[#8e8e93]">
                Chưa có lời mời nào
              </div>
            ) : (
              requests.map(req => (
                <div key={req.uid} className="bg-white dark:bg-zinc-900 rounded-[20px] p-4 border border-black/[0.06] dark:border-white/[0.06]">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={req.avatar} className="w-14 h-14 rounded-full" />
                    <div className="flex-1">
                      <p className="text-[17px] font-[600]">{req.name}</p>
                      <p className="text-[14px] text-[#8e8e93]">{req.mutualFriends} bạn chung</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(req.uid)}
                      className="flex-1 h-[44px] bg-[#007AFF] text-white rounded-[14px] text-[16px] font-[600] active:scale-95"
                    >
                      Chấp nhận
                    </button>
                    <button className="flex-1 h-[44px] bg-[#F2F2F7] dark:bg-zinc-800 text-[#8e8e93] rounded-[14px] text-[16px] font-[600]">
                      Xóa
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'suggestions' && (
          <div>
            <div className="bg-white dark:bg-zinc-900 rounded-[20px] p-4 border border-black/[0.06] dark:border-white/[0.06] mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#007AFF] rounded-[12px] flex items-center justify-center">
                  <RiUserSearchLine className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[16px] font-[600]">Tìm xung quanh</p>
                  <p className="text-[13px] text-[#8e8e93]">Bạn bè gần bạn</p>
                </div>
                <FiSearch className="text-[#8e8e93]" size={20} />
              </div>
            </div>

            <h3 className="text-[13px] font-[600] text-[#8e8e93] uppercase tracking-wide mb-3 px-1">Gợi ý cho bạn</h3>
            <div className="grid grid-cols-2 gap-3">
              {suggestions.map(sugg => (
                <div key={sugg.uid} className="bg-white dark:bg-zinc-900 rounded-[20px] p-4 border border-black/[0.06] dark:border-white/[0.06]">
                  <img src={sugg.avatar} className="w-16 h-16 rounded-full mx-auto mb-2" />
                  <p className="text-[15px] font-[600] text-center truncate mb-1">{sugg.name}</p>
                  <p className="text-[12px] text-[#8e8e93] text-center mb-3">{sugg.mutualFriends} bạn chung</p>
                  <button
                    onClick={() => handleAddFriend(sugg.uid)}
                    className="w-full h-[40px] bg-[#007AFF] text-white rounded-[14px] text-[15px] font-[600] active:scale-95"
                  >
                    Kết bạn
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet Actions */}
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
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-[28px] z-50 p-5 pb-10"
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-zinc-700 rounded-full mx-auto mb-5" />
              <div className="flex items-center gap-3 mb-6">
                <img src={selectedFriend.avatar} className="w-16 h-16 rounded-full" />
                <div>
                  <p className="text-[19px] font-[600]">{selectedFriend.name}</p>
                  <p className="text-[15px] text-[#8e8e93]">@{selectedFriend.username}</p>
                </div>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => { handleStartChat(selectedFriend.uid); setSelectedFriend(null); }}
                  className="w-full h-[54px] flex items-center gap-3 px-5 bg-[#F2F2F7] dark:bg-zinc-800 rounded-[16px] active:scale-98"
                >
                  <FiMessageCircle size={22} />
                  <span className="text-[17px] font-[500]">Nhắn tin</span>
                </button>
                <button
                  onClick={() => { handleRemoveFriend(selectedFriend); }}
                  className="w-full h-[54px] flex items-center gap-3 px-5 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-[16px] active:scale-98"
                >
                  <FiUserX size={22} />
                  <span className="text-[17px] font-[500]">Hủy kết bạn</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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