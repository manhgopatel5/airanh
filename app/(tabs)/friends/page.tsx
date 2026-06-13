"use client";
import { useState, useEffect, useRef } from "react";
import { collection, query, where, onSnapshot, doc, getDoc, Unsubscribe, DocumentData } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { FiUserPlus, FiX, FiUsers, FiMessageSquare, FiCheck } from "react-icons/fi";
import { toast, Toaster } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  listenFriendRequests,
  acceptRequest,
  rejectRequest,
  sendFriendRequest,
  unfriend,
  type FriendRequest,
} from "@/lib/friendService";

type FriendItem = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  userId: string;
  isOnline: boolean;
  lastSeen?: any;
};

type StrangerChat = {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
    username: string;
  };
  lastMessage?: string;
  updatedAt?: any;
};

export default function FriendsPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [strangerChats, setStrangerChats] = useState<StrangerChat[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "requests" | "messages">("all");
  const unsubChatsRef = useRef<Unsubscribe | null>(null);
  const unsubFriendsRef = useRef<Unsubscribe | null>(null);

  // 1. Load danh sách bạn bè - CHỈ KHI TAB "all"
  useEffect(() => {
    if (!user?.uid) return;

    // CHỈ QUERY KHI Ở TAB "all"
    if (activeTab!== "all") {
      setFriends([]);
      setLoading(false);
      if (unsubFriendsRef.current) {
        unsubFriendsRef.current();
        unsubFriendsRef.current = null;
      }
      return;
    }

    setLoading(true);
    const friendsRef = collection(db, "users", user.uid, "friends");
    const unsub = onSnapshot(friendsRef, async (snap) => {
      const friendList: FriendItem[] = [];

      for (const d of snap.docs) {
        if (d.data()?.status === "removed") continue;

        const userDoc = await getDoc(doc(db, "users", d.id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          friendList.push({
            uid: d.id,
            name: data.name || "User",
            username: data.username || "",
            avatar: data.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random`,
            userId: data.userId || "",
            isOnline: Boolean(data.isOnline),
            lastSeen: data.lastSeen,
          });
        }
      }

      friendList.sort((a, b) => {
        if (a.isOnline!== b.isOnline) return b.isOnline? 1 : -1;
        return a.name.localeCompare(b.name);
      });

      setFriends(friendList);
      setLoading(false);
    }, (error) => {
      console.error("Friends listener error:", error);
      setLoading(false);
    });

    unsubFriendsRef.current = unsub;
    return () => {
      if (unsub) unsub();
    };
  }, [user?.uid, db, activeTab]);

  // 2. Load DM từ người lạ - CHỈ KHI TAB "messages"
  useEffect(() => {
    if (!user?.uid) return;

    // CHỈ QUERY KHI Ở TAB "messages"
    if (activeTab!== "messages") {
      setStrangerChats([]);
      if (unsubChatsRef.current) {
        unsubChatsRef.current();
        unsubChatsRef.current = null;
      }
      return;
    }

    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, async (snap) => {
      const strangerList: StrangerChat[] = [];

      for (const docSnap of snap.docs) {
        try {
          const data = docSnap.data();

          if (!data.members ||!Array.isArray(data.members)) continue;
          if (data.isGroup === true || data.isPublicRoom === true) continue;
          if (docSnap.id.startsWith('public_')) continue;

          const otherUserId = data.members.find((id: string) => id!== user.uid);
          if (!otherUserId) continue;

          const friendDoc = await getDoc(doc(db, "users", user.uid, "friends", otherUserId));

          if (!friendDoc.exists() || friendDoc.data()?.status === "removed") {
            const otherUserData = await getDoc(doc(db, "users", otherUserId));
            if (otherUserData.exists()) {
              const u = otherUserData.data();
              strangerList.push({
                id: docSnap.id,
                user: {
                  id: otherUserId,
                  name: u.name || "User",
                  avatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`,
                  username: u.username || "",
                },
                lastMessage: typeof data.lastMessage === 'string'? data.lastMessage : data.lastMessage?.text || "",
                updatedAt: data.updatedAt,
              });
            }
          }
        } catch (e) {
          console.error("Lỗi xử lý chat:", docSnap.id, e);
        }
      }

      strangerList.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setStrangerChats(strangerList);
    }, (error) => {
      console.error("Lỗi load stranger chats:", error);
    });

    unsubChatsRef.current = unsub;
    return () => {
      if (unsub) unsub();
    };
  }, [user?.uid, db, activeTab]);

  // 3. Load lời mời kết bạn - CHỈ KHI TAB "requests"
  useEffect(() => {
    if (!user?.uid) return;

    if (activeTab!== "requests") {
      setRequests([]);
      return;
    }

    const unsub = listenFriendRequests(user.uid, async (reqs) => {
      const reqList = await Promise.all(
        reqs.map(async (req) => {
          const fromUser = await getDoc(doc(db, "users", req.fromUserId));
          const u = fromUser.exists()? fromUser.data() : {};
          return {
          ...req,
            fromName: u.name || "User",
            fromAvatar: u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "U")}&background=random`,
          };
        })
      );
      setRequests(reqList as any);
    });

    return () => unsub();
  }, [user?.uid, db, activeTab]);

  const handleSendFriendRequest = async (toUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      await sendFriendRequest(user.uid, toUserId);
      toast.success("Đã gửi lời mời kết bạn");
    } catch (err: any) {
      toast.error(err.message || "Lỗi gửi lời mời");
    }
  };

  const handleAcceptRequest = async (req: any) => {
    if (!user) return;
    try {
      await acceptRequest(req);
      toast.success(`Đã kết bạn với ${req.fromName}`);
    } catch (err: any) {
      toast.error(err.message || "Lỗi chấp nhận");
    }
  };

  const handleRejectRequest = async (reqId: string) => {
    if (!user) return;
    try {
      await rejectRequest(reqId, user.uid);
      toast.success("Đã từ chối");
    } catch (err: any) {
      toast.error(err.message || "Lỗi từ chối");
    }
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (!user ||!confirm(`Xóa ${friendName} khỏi danh sách bạn bè?`)) return;

    try {
      await unfriend(user.uid, friendId);
      toast.success("Đã hủy kết bạn");
    } catch (err: any) {
      toast.error(err.message || "Lỗi xóa bạn");
    }
  };

  const formatTime = (timestamp?: any) => {
    if (!timestamp?.toDate) return "";
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: vi });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Vui lòng đăng nhập</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black pb-20">
      <Toaster richColors position="top-center" />

      <div className="sticky top-0 z-10 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-900">
        <div className="px-4 pt-3 pb-2">
          <h1 className="text-2xl font-bold mb-3">Bạn bè</h1>

          <div className="flex gap-2">
            {[
              { id: "all", label: "Tất cả", count: friends.length },
              { id: "requests", label: "Lời mời", count: requests.length },
              { id: "messages", label: "Tin nhắn", count: strangerChats.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 h-8 rounded-full text-[14px] font-[550] transition-all ${
                  activeTab === tab.id
                ? "bg-[#0a84ff] text-white"
                    : "bg-gray-100 dark:bg-zinc-900 text-gray-600 dark:text-zinc-400"
                }`}
              >
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {activeTab === "requests" && (
          <div className="space-y-2">
            {requests.length === 0? (
              <div className="py-20 text-center">
                <FiUsers className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">Không có lời mời nào</p>
              </div>
            ) : (
              requests.map((req: any) => (
                <div key={req.id} className="flex items-center gap-3 py-3">
                  <img src={req.fromAvatar} className="w-14 h-14 rounded-full object-cover" alt={req.fromName} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[16px] truncate">{req.fromName}</p>
                    <p className="text-[13px] text-gray-500">{formatTime(req.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      className="h-9 px-4 bg-[#0a84ff] text-white rounded-full text-[14px] font-medium active:scale-95"
                    >
                      <FiCheck size={18} />
                    </button>
                    <button
                      onClick={() => handleRejectRequest(req.id)}
                      className="h-9 px-4 bg-gray-200 dark:bg-zinc-800 rounded-full text-[14px] font-medium active:scale-95"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div className="space-y-2">
            {strangerChats.length === 0? (
              <div className="py-20 text-center">
                <FiMessageSquare className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">Chưa có tin nhắn nào</p>
                <p className="text-sm text-gray-400 mt-1">Tin nhắn từ người lạ sẽ hiện ở đây</p>
              </div>
            ) : (
              strangerChats.map((chat) => (
                <div key={chat.id} className="flex items-center gap-3 py-3 active:bg-gray-50 dark:active:bg-zinc-900 rounded-xl px-2">
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/chat/${chat.id}`)}
                  >
                    <img src={chat.user.avatar} className="w-14 h-14 rounded-full object-cover" alt={chat.user.name} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[16px] truncate">{chat.user.name}</p>
                      <p className="text-[13px] text-gray-500 truncate">
                        {chat.lastMessage || "Bắt đầu trò chuyện"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleSendFriendRequest(chat.user.id, e)}
                    className="w-10 h-10 rounded-full bg-[#0a84ff] flex items-center justify-center active:scale-90 transition-transform flex-shrink-0"
                  >
                    <FiUserPlus className="text-white" size={20} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "all" && (
          <div className="space-y-2">
            {loading? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3 animate-pulse">
                  <div className="w-14 h-14 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
                  </div>
                </div>
              ))
            ) : friends.length === 0? (
              <div className="py-20 text-center">
                <FiUsers className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">Chưa có bạn bè nào</p>
                <p className="text-sm text-gray-400 mt-1">Kết bạn để bắt đầu trò chuyện</p>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.uid} className="flex items-center gap-3 py-3 active:bg-gray-50 dark:active:bg-zinc-900 rounded-xl px-2">
                  <div
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    onClick={() => router.push(`/chat/${[user.uid, friend.uid].sort().join("_")}`)}
                  >
                    <div className="relative">
                      <img src={friend.avatar} className="w-14 h-14 rounded-full object-cover" alt={friend.name} />
                      {friend.isOnline && (
                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#30d158] rounded-full border-2 border-white dark:border-black" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[16px] truncate">{friend.name}</p>
                      <p className="text-[13px] text-gray-500">
                        {friend.isOnline? "Đang hoạt động" : formatTime(friend.lastSeen)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFriend(friend.uid, friend.name)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 active:scale-90 transition-all"
                  >
                    <FiX size={20} strokeWidth={2.5} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}