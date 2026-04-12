"use client";

import { useEffect, useRef, useState } from "react";
import { db, serverTimestamp } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

export default function Chat() {
  const { user } = useAuth();

  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // 👉 ID phòng chat (tạm 1 room)
  const conversationId = "global-chat";

  /* ================= REALTIME ================= */
  useEffect(() => {
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(data);
    });

    return () => unsub();
  }, []);

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ================= SEND ================= */
  const send = async () => {
    if (!msg.trim() || !user) return;

    await addDoc(
      collection(db, "conversations", conversationId, "messages"),
      {
        text: msg,
        senderId: user.uid,
        senderName: user.email,
        createdAt: serverTimestamp(), // 🔥 FIX
      }
    );

    setMsg("");
  };

  /* ================= UI ================= */
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* HEADER */}
      <div className="p-4 border-b bg-white font-semibold">
        Chat
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => {
          const isMe = m.senderId === user?.uid;

          return (
            <div
              key={m.id}
              className={`flex ${
                isMe ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-3 py-2 rounded-2xl max-w-[70%] text-sm ${
                  isMe
                    ? "bg-black text-white"
                    : "bg-gray-200 text-black"
                }`}
              >
                {!isMe && (
                  <div className="text-xs text-gray-500 mb-1">
                    {m.senderName}
                  </div>
                )}

                {m.text}
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="p-3 border-t bg-white flex gap-2">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Nhắn gì đó..."
          className="flex-1 border rounded-full px-4 py-2 outline-none"
        />

        <button
          onClick={send}
          className="bg-black text-white px-4 rounded-full"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
