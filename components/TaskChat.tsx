"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
  where,
} from "firebase/firestore";
import { FiSend, FiMessageCircle, FiTrash2, FiCornerUpLeft, FiImage } from "react-icons/fi";
import { useAuth } from "@/lib/AuthContext";

type UserType = {
  uid: string;
  name: string;
  avatar?: string;
};

type MessageType = {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  attachments?: { url: string; type: "image" }[];
  replyTo?: { id: string; text: string; userName: string };
  createdAt?: Timestamp | null;
  deletedFor?: string[];
  edited?: boolean;
};

type TaskChatProps = {
  taskId: string;
  currentUser: UserType;
};

const MSG_LIMIT = 50;
const RATE_LIMIT_MS = 2000; // ✅ FIX 3: 1 tin/2s

export default function TaskChat({ taskId, currentUser }: TaskChatProps) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [canComment, setCanComment] = useState(false); // ✅ FIX 2

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastSentRef = useRef<number>(0); // ✅ FIX 3: Rate limit

  // ✅ FIX 2: Check quyền comment
  useEffect(() => {
    getDoc(doc(db, "tasks", taskId)).then((snap) => {
      const data = snap.data();
      const allowed = data?.userId === currentUser.uid || data?.applicants?.includes(currentUser.uid);
      setCanComment(!!allowed);
    });
  }, [taskId, currentUser.uid]);

  // 🔥 REALTIME LISTEN - ✅ FIX 1 + FIX 4
  useEffect(() => {
    const q = query(
      collection(db, "tasks", taskId, "messages"),
      orderBy("createdAt", "desc"), // ✅ FIX 4: desc để lấy mới nhất
      limit(MSG_LIMIT)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: MessageType[] = snap.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<MessageType, "id">) }))
        .filter((m) => !m.deletedFor?.includes(currentUser.uid)) // Filter đã xóa
        .reverse(); // Đảo lại asc để hiển thị

      setMessages(data);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === MSG_LIMIT);
      setLoading(false);
    });

    return () => unsub();
  }, [taskId, currentUser.uid]);

  // ✅ FIX 7: Load more
  const loadMore = async () => {
    if (!lastDocRef.current || loadingMore) return;
    setLoadingMore(true);
    const q = query(
      collection(db, "tasks", taskId, "messages"),
      orderBy("createdAt", "desc"),
      startAfter(lastDocRef.current),
      limit(MSG_LIMIT)
    );
    const snap = await onSnapshot(q, (s) => {
      const older = s.docs.map((d) => ({ id: d.id, ...d.data() } as MessageType)).reverse();
      setMessages((prev) => [...older, ...prev]);
      lastDocRef.current = s.docs[s.docs.length - 1] || null;
      setHasMore(s.docs.length === MSG_LIMIT);
      setLoadingMore(false);
    });
  };

  // AUTO SCROLL
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // SEND MESSAGE - ✅ FIX 3 + FIX 5
  const sendMessage = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !canComment) return;

    // ✅ FIX 3: Rate limit
    const now = Date.now();
    if (now - lastSentRef.current < RATE_LIMIT_MS) {
      alert(`Chờ ${Math.ceil((RATE_LIMIT_MS - (now - lastSentRef.current)) / 1000)}s nữa`);
      return;
    }

    // ✅ FIX 10: Filter từ cấm cơ bản
    const badWords = ["đm", "vcl", "clgt"];
    if (badWords.some((w) => trimmed.toLowerCase().includes(w))) {
      alert("Tin nhắn chứa từ ngữ không phù hợp");
      return;
    }

    setSending(true);
    setText("");
    lastSentRef.current = now;

    try {
      await addDoc(collection(db, "tasks", taskId, "messages"), {
        text: trimmed,
        userId: currentUser.uid,
        userName: currentUser.name,
        userAvatar: currentUser.avatar || null,
        replyTo: replyingTo ? { id: replyingTo.id, text: replyingTo.text, userName: replyingTo.userName } : null,
        createdAt: serverTimestamp(),
        deletedFor: [],
      });
      setReplyingTo(null);
    } catch (err) {
      console.error("Lỗi gửi tin:", err);
      setText(trimmed);
    } finally {
      setSending(false);
    }
  };

  // ✅ FIX 5: Delete message
  const deleteMessage = async (msgId: string) => {
    await updateDoc(doc(db, "tasks", taskId, "messages", msgId), {
      deletedFor: arrayUnion(currentUser.uid),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp?: Timestamp | null) => {
    if (!timestamp?.seconds) return "Đang gửi...";
    return new Date(timestamp.seconds * 1000).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="mt-3 border-t border-gray-100 dark:border-zinc-800 pt-3">
      <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-zinc-300">
        <FiMessageCircle size={16} />
        <span className="text-sm font-semibold">
          Bình luận {messages.length > 0 && `(${messages.length})`}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="max-h-80 overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-zinc-700"
      >
        {/* ✅ FIX 7: Load more */}
        {hasMore && !loading && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full text-xs text-blue-600 dark:text-blue-400 py-2 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg"
          >
            {loadingMore ? "Đang tải..." : "Tải tin nhắn cũ hơn"}
          </button>
        )}

        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2 animate-pulse">
                <div className="w-7 h-7 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
                  <div className="h-8 bg-gray-200 dark:bg-zinc-800 rounded-2xl w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-6 text-gray-400 dark:text-zinc-500">
            <FiMessageCircle size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có bình luận nào</p>
            <p className="text-xs mt-0.5">Hãy là người đầu tiên bình luận</p>
          </div>
        )}

        {!loading &&
          messages.map((msg) => {
            const isMe = msg.userId === currentUser.uid;
            const time = formatTime(msg.createdAt);

            return (
              <div key={msg.id} className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}>
                <img
                  src={msg.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.userName || "U")}&background=random&size=28`}
                  alt={msg.userName}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-gray-50 dark:ring-zinc-800 shrink-0"
                />
                <div className={`flex flex-col max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                  {!isMe && (
                    <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-0.5 px-1">
                      {msg.userName}
                    </span>
                  )}
                  {/* ✅ FIX 5: Reply preview */}
                  {msg.replyTo && (
                    <div className="text-xs text-gray-500 dark:text-zinc-400 mb-1 px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded-lg border-l-2 border-blue-500">
                      <FiCornerUpLeft size={12} className="inline mr-1" />
                      {msg.replyTo.userName}: {msg.replyTo.text.slice(0, 30)}...
                    </div>
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm leading-relaxed break-words shadow-sm relative ${
                      isMe
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-md"
                        : "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-bl-md"
                    }`}
                  >
                    {msg.text}
                    {/* ✅ FIX 5: Delete button */}
                    {isMe && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 shadow-lg transition-opacity"
                      >
                        <FiTrash2 size={12} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 px-1">
                    <span className="text-xs text-gray-400 dark:text-zinc-500">{time}</span>
                    {!isMe && (
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Trả lời
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* ✅ FIX 2: Không cho comment nếu không join */}
      {!canComment ? (
        <div className="text-center text-xs text-gray-400 dark:text-zinc-500 py-2">
          Tham gia công việc để bình luận
        </div>
      ) : (
        <>
          {/* Reply preview */}
          {replyingTo && (
            <div className="flex items-center justify-between text-xs bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg mb-2">
              <span className="text-blue-600 dark:text-blue-400">
                Đang trả lời {replyingTo.userName}
              </span>
              <button onClick={() => setReplyingTo(null)}><FiX size={14} /></button>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Viết bình luận..."
              maxLength={500}
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim() || sending}
              className="shrink-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-2.5 rounded-2xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <FiSend size={18} />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
