"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, doc, getDoc, getDocs,
  orderBy, limit, addDoc, serverTimestamp, Timestamp, setDoc, writeBatch
} from "firebase/firestore";
import { FiSearch, FiSend, FiChevronLeft, FiMoreVertical, FiUsers } from "react-icons/fi";
import { toast, Toaster } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type Friend = {
  id: string;
  friendId: string;
  name: string;
  avatar: string;
  online: boolean;
  lastSeen?: Timestamp;
  lastMessage?: string;
  unreadCount: number; // ✅ FIX 1: Luôn có
  updatedAt?: Timestamp;
};

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp | null;
  seenBy?: string[];
};

export default function ChatPage() {
  const db = getFirebaseDB();
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* ================= LOAD FRIENDS + UNREAD COUNT ================= */
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(collection(db, "friends"), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const friendIds = snap.docs.map((d) => d.data().friendId);
      if (!friendIds.length) {
        setFriends([]);
        setLoading(false);
        return;
      }

      // Batch load users: 10 id/query
      const chunks: string[][] = [];
      for (let i = 0; i < friendIds.length; i += 10) {
        chunks.push(friendIds.slice(i, i + 10));
      }

      const userSnaps = await Promise.all(
        chunks.map((chunk) =>
          getDocs(query(collection(db, "users"), where("__name__", "in", chunk)))
        )
      );

      const userMap = new Map();
      userSnaps.forEach((snap) =>
        snap.docs.forEach((d) => userMap.set(d.id, { id: d.id,...d.data() }))
      );

      // Load last message + unread cho từng friend
      const friendsWithLastMsg = await Promise.all(
        snap.docs.map(async (d) => {
          const friendData = userMap.get(d.data().friendId);
          if (!friendData) return null;

          const chatId = [user.uid, friendData.id].sort().join("_");

          // Last message
          const msgQuery = query(
            collection(db, "chats", chatId, "messages"),
            where("createdAt", "!=", null),
            orderBy("createdAt", "desc"),
            limit(1)
          );
          const msgSnap = await getDocs(msgQuery);
          const lastMsg = msgSnap.docs[0]?.data();

          // ✅ FIX 2: Count unread
          const unreadQuery = query(
            collection(db, "chats", chatId, "messages"),
            where("senderId", "==", friendData.id),
            where("seenBy", "not-in", [[user.uid]])
          );
          const unreadSnap = await getDocs(unreadQuery);

          // Get chat updatedAt
          const chatSnap = await getDoc(doc(db, "chats", chatId));
          const updatedAt = chatSnap.data()?.updatedAt || null;

          return {
            id: d.id,
            friendId: friendData.id,
            name: friendData.name || "User",
            avatar: friendData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friendData.name || "U")}`,
            online: friendData.online || false,
            lastSeen: friendData.lastSeen,
            lastMessage: lastMsg?.text || "",
            unreadCount: unreadSnap.size,
            updatedAt,
          } as Friend;
        })
      );

      const sorted = (friendsWithLastMsg.filter(Boolean) as Friend[]).sort((a, b) => {
        const t1 = a.updatedAt?.toMillis() || 0;
        const t2 = b.updatedAt?.toMillis() || 0;
        return t2 - t1;
      });

      setFriends(sorted);
      setLoading(false);
    });

    return () => unsub();
  }, [user?.uid]);

  /* ================= LOAD MESSAGES + MARK READ ================= */
  useEffect(() => {
    if (!user ||!selectedFriend) {
      setMessages([]);
      return;
    }

    const chatId = [user.uid, selectedFriend.friendId].sort().join("_");
    const q = query(
      collection(db, "chats", chatId, "messages"),
      where("createdAt", "!=", null),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id,...d.data() } as Message));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

      // ✅ FIX 3: Mark all as read khi mở chat
      const unread = snap.docs.filter((d) => {
        const data = d.data();
        return data.senderId === selectedFriend.friendId &&!data.seenBy?.includes(user.uid);
      });

      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach((d) => {
          batch.update(doc(db, "chats", chatId, "messages", d.id), {
            seenBy: [...(d.data().seenBy || []), user.uid],
          });
        });
        batch.commit().catch(() => {});
      }
    });

    return () => unsub();
  }, [user, selectedFriend]);

  /* ================= SEND MESSAGE ================= */
  const sendMessage = useCallback(async () => {
    if (!text.trim() ||!user ||!selectedFriend) return;

    const chatId = [user.uid, selectedFriend.friendId].sort().join("_");
    const tempText = text;
    setText("");

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: tempText,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        seenBy: [user.uid],
      });

      await setDoc(
        doc(db, "chats", chatId),
        {
          members: [user.uid, selectedFriend.friendId],
          lastMessage: tempText,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
      toast.error("Gửi tin nhắn thất bại");
      setText(tempText);
    }
  }, [user, text, selectedFriend]);

  const filteredFriends = useMemo(
    () => friends.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())),
    [friends, search]
  );

  const formatTime = (time?: Timestamp) => {
    if (!time) return "";
    try {
      const date = time.toDate();
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const hours = diff / (1000 * 60 * 60);

      if (hours < 24) {
        return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      }
      return formatDistanceToNow(date, { addSuffix: true, locale: vi });
    } catch {
      return "";
    }
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950">
      <Toaster richColors position="top-center" />

      {/* SIDEBAR FRIENDS */}
      <div className={`w-full md:w-80 border-r border-gray-100 dark:border-zinc-800 flex-col ${selectedFriend? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
          <h1 className="font-bold text-xl mb-3 text-gray-900 dark:text-gray-100">Tin nhắn</h1>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bạn bè..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-zinc-900 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-3 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredFriends.length === 0? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-zinc-500">
              <FiUsers size={48} className="mb-3 opacity-50" />
              <p className="font-semibold">Chưa có bạn bè</p>
            </div>
          ) : (
            filteredFriends.map((f) => (
              <div
                key={f.id}
                onClick={() => {
                  setSelectedFriend(f);
                  // ✅ FIX 4: Reset unread count UI ngay lập tức
                  setFriends((prev) => prev.map((x) => x.id === f.id? {...x, unreadCount: 0 } : x));
                }}
                className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900 cursor-pointer transition ${
                  selectedFriend?.friendId === f.friendId? "bg-blue-50 dark:bg-blue-950/30" : ""
                }`}
              >
                <div className="relative">
                  <img src={f.avatar} className="w-12 h-12 rounded-full object-cover" />
                  {f.online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-white dark:ring-zinc-950" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">{f.name}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 shrink-0 ml-2">
                      {formatTime(f.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate ${f.unreadCount > 0? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-zinc-400"}`}>
                      {f.lastMessage || "Chưa có tin nhắn"}
                    </p>
                    {f.unreadCount > 0 && (
                      <div className="bg-blue-500 text-white text-xs font-bold rounded-full min-w- h-5 flex items-center justify-center px-1.5 ml-2 shrink-0">
                        {f.unreadCount > 99? "99+" : f.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      {selectedFriend? (
        <div className="flex-1 flex flex-col">
          {/* HEADER */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
            <button onClick={() => setSelectedFriend(null)} className="md:hidden p-2 -ml-2">
              <FiChevronLeft size={22} className="text-gray-900 dark:text-gray-100" />
            </button>
            <img src={selectedFriend.avatar} className="w-10 h-10 rounded-full object-cover" />
            <div className="flex-1">
              <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">{selectedFriend.name}</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {selectedFriend.online? "Đang hoạt động" : formatTime(selectedFriend.lastSeen)}
              </p>
            </div>
            <button className="p-2 text-gray-900 dark:text-gray-100">
              <FiMoreVertical size={20} />
            </button>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-zinc-900">
            {messages.map((m) => {
              const isMe = m.senderId === user.uid;
              return (
                <div key={m.id} className={`flex ${isMe? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-3xl ${
                      isMe
                   ? "bg-blue-500 text-white rounded-br-md"
                        : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-bl-md shadow-sm"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            <div className="flex items-end gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" &&!e.shiftKey && (e.preventDefault(), sendMessage())}
                placeholder="Nhắn tin..."
                className="flex-1 px-4 py-3 bg-gray-100 dark:bg-zinc-900 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500/20 text-sm resize-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
              <button
                onClick={sendMessage}
                disabled={!text.trim()}
                className="w-11 h-11 bg-blue-500 text-white rounded-full flex items-center justify-center active:scale-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-400 dark:text-zinc-500">
          <div className="text-center">
            <FiSend size={64} className="mx-auto mb-4 opacity-50" />
            <p className="font-semibold">Chọn một cuộc trò chuyện</p>
          </div>
        </div>
      )}
    </div>
  );
}
