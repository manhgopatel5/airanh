"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { FiSend, FiLoader } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

type Message = {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  text: string;
  createdAt: any;
};

type Props = {
  taskId: string;
};

export default function TaskChat({ taskId }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!taskId) return;

    const q = query(
      collection(db, "taskMessages"),
      where("taskId", "==", taskId),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list: Message[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id,...doc.data() } as Message);
      });
      setMessages(list);
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => unsub();
  }, [taskId]);

  /* ================= SEND MESSAGE ================= */
  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!user ||!text.trim() || sending) return;

    const msg = text.trim();
    setText("");
    setSending(true);

    try {
      await addDoc(collection(db, "taskMessages"), {
        taskId,
        userId: user.uid,
        userName: user.displayName || "User",
        userAvatar: user.photoURL || "",
        text: msg,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Lỗi gửi tin:", err);
      setText(msg);
    } finally {
      setSending(false);
    }
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp?.seconds) return "";
    return formatDistanceToNow(new Date(timestamp.seconds * 1000), {
      addSuffix: true,
      locale: vi,
    });
  };

  if (!taskId) return null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800">
      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/4" />
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-zinc-500 text-sm">
            Chưa có tin nhắn nào. Bắt đầu trò chuyện!
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.userId === user?.uid;
          return (
            <div key={msg.id} className={`flex gap-3 ${isMe? "flex-row-reverse" : ""}`}>
              <img
                src={msg.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.userName)}&background=random`}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className={`flex-1 ${isMe? "text-right" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                    {msg.userName}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-zinc-500">
                    {timeAgo(msg.createdAt)}
                  </span>
                </div>
                <div
                  className={`inline-block px-3 py-2 rounded-2xl text-sm ${
                    isMe
                     ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* INPUT */}
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập tin nhắn..."
            disabled={!user || sending}
            className="flex-1 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!text.trim() ||!user || sending}
            className="p-2.5 bg-blue-500 text-white rounded-2xl active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending? <FiLoader className="animate-spin" size={18} /> : <FiSend size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
}