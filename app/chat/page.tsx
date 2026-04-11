"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
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

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt"));

    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((doc) => doc.data()));
    });

    return () => unsub();
  }, []);

  const send = async () => {
    if (!msg) return;

    await addDoc(collection(db, "messages"), {
      text: msg,
      user: user?.email,
      createdAt: Date.now(),
    });

    setMsg("");
  };

  return (
    <div className="p-4 space-y-2">
      {messages.map((m, i) => (
        <div key={i} className="bg-gray-200 p-2 rounded">
          {m.user}: {m.text}
        </div>
      ))}

      <div className="flex gap-2 mt-4">
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          className="border p-2 flex-1"
        />
        <button onClick={send}>Gửi</button>
      </div>
    </div>
  );
}
