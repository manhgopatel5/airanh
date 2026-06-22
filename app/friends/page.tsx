"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { FiUsers, FiX, FiLoader, FiUserPlus } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { format } from "date-fns";

type FriendItem = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  userId: string;
  isOnline: boolean;
  lastSeen?: any;
  isDeletedByThem?: boolean;
};

export default function FriendsPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    setFriendsLoading(true);

    const friendsRef = collection(db, "users", user.uid, "friends");
    const unsub = onSnapshot(friendsRef, async (snapshot) => {
      const activeFriendIds = snapshot.docs.filter(d => d.data()?.status!== "removed").map(d => d.id);
      const friendsData: FriendItem[] = [];

      if (activeFriendIds.length === 0) {
        setFriends([]);
        setFriendsLoading(false);
        return;
      }

      const userDocs = await Promise.all(activeFriendIds.map(id => getDoc(doc(db, "users", id))));
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
            isDeletedByThem: Boolean(snapshot.docs.find(d => d.id === userDoc.id)?.data()?.removedBy),
          });
        }
      });

      friendsData.sort((a, b) => {
        if (a.isOnline!== b.isOnline) return b.isOnline? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      setFriends(friendsData);
      setFriendsLoading(false);
    });

    return () => unsub();
  }, [user?.uid, db]);

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

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (!user?.uid) return;
    if (!confirm(`Xóa ${friendName} khỏi danh sách bạn bè?`)) return;

    try {
      const functions = getFunctions(getApp(), "asia-southeast1");
      const unfriend = httpsCallable(functions, 'unfriend');
      await unfriend({ friendUid: friendId });
      toast.success("Đã hủy kết bạn");
    } catch (error: any) {
      toast.error(`Lỗi: ${error.message}`);
    }
  };

  const formatLastSeen = (timestamp?: any): string => {
    if (!timestamp?.toDate) return "Lâu rồi";
    const date = timestamp.toDate();
    const now = new Date();
    const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return format(date, "dd/MM/yyyy");
  };

  if (friendsLoading) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">
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
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A] flex flex-col items-center justify-center px-8 text-center">
        <div className="w-[72px] h-[72px] bg-[#f2f2f7] dark:bg-zinc-900 rounded-[20px] flex items-center justify-center mb-4">
          <FiUsers className="text-gray-400" size={30} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white mb-1.5">Chưa có bạn</h3>
        <p className="text-[15px] leading-5 text-[#8e8e93] dark:text-zinc-500 max-w-[280px]">
          Mời kết bạn để bắt đầu trò chuyện cùng nhau
        </p>
        <button
          onClick={() => router.push('/friends/add')}
          className="mt-6 px-6 h-11 bg-[#0a84ff] hover:bg-[#007aff] active:bg-[#0051d5] text-white rounded-full text-[15px] font-[550] shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <FiUserPlus size={18} />
          Kết bạn ngay
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#F7FAFF] via-white to-[#F5F7FB] dark:from-[#05070A] dark:via-zinc-950 dark:to-[#0F172A]">
      <div className="sticky top-0 z-10 px-4 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <h1 className="text-lg font-[700]">Bạn bè ({friends.length})</h1>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-zinc-900">
        {friends.map((friend) => (
          <div key={friend.uid} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-900/50 active:bg-gray-100 dark:active:bg-zinc-800 transition-colors">
            <button
              onClick={() => handleStartChat(friend.uid)}
              className="flex items-center gap-3 flex-1 min-w-0 active:scale-[0.98] transition-transform"
            >
              <div className="relative flex-shrink-0">
                <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full object-cover bg-gray-100 dark:bg-zinc-800" />
                {friend.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#30d158] rounded-full border-2 border-white dark:border-black" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-base leading-5 font-[550] truncate">{friend.name}</p>
                  {friend.isDeletedByThem && (
                    <span className="text-xs text-red-500 font-medium flex-shrink-0">Đã xóa</span>
                  )}
                </div>
                <p className="text-sm leading-4 text-[#8e8e93] dark:text-zinc-500 truncate">
                  {friend.isOnline? "Đang hoạt động" : formatLastSeen(friend.lastSeen)}
                </p>
              </div>
            </button>
            <button
              onClick={() => handleRemoveFriend(friend.uid, friend.name)}
              className="w-8 h-8 flex items-center justify-center text-[#8e8e93] hover:text-red-500 active:scale-90 transition-all"
            >
              <FiX size={18} strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}