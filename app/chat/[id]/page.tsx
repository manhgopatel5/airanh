"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

export default function ChatPage() {
  const { id } = useParams();
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");

  // 📡 realtime message
  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", id),
      orderBy("createdAt")
    );

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => d.data()));
    });

    return () => unsub();
  }, [id]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    await addDoc(collection(db, "messages"), {
      chatId: id,
      text,
      senderId: auth.currentUser?.uid,
      createdAt: Date.now(),
    });

    setText("");
  };

  return (
    <div className="flex flex-col h-screen">
      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded-lg max-w-[70%] ${
              m.senderId === auth.currentUser?.uid
                ? "bg-black text-white ml-auto"
                : "bg-gray-200"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="p-3 flex gap-2 border-t">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 border rounded-lg p-2"
          placeholder="Nhắn tin..."
        />
        <button
          onClick={sendMessage}
          className="bg-black text-white px-4 rounded-lg"
        >
          Gửi
        </button>
      </div>
    </div>
  );
}
