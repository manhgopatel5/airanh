"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getFirebaseDB } from "@/lib/firebase";
import { doc, onSnapshot, collection, query, orderBy, limit } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

type Group = {
  name: string;
  members: string[];
  admins: string[];
  ownerId: string;
  avatar: string;
  groupCode: string;
  lastMessage: string;
  updatedAt: any;
};

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: any;
};

export default function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const db = getFirebaseDB();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId || !user?.uid) return;

    // Listen group info
    const groupRef = doc(db, "groups", groupId);
    const unsubGroup = onSnapshot(groupRef, (snap) => {
      if (snap.exists()) {
        setGroup(snap.data() as Group);
      }
      setLoading(false);
    }, (err) => {
      console.error("Group error:", err);
      setLoading(false);
    });

    // Listen messages
    const q = query(
      collection(db, "groups", groupId, "messages"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsubMsg = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
      setMessages(msgs.reverse());
    });

    return () => {
      unsubGroup();
      unsubMsg();
    };
  }, [groupId, user?.uid, db]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!group) return <div className="p-4">Nhóm không tồn tại</div>;

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b bg-white dark:bg-zinc-900">
        <h1 className="text-lg font-bold">{group.name}</h1>
        <p className="text-sm text-zinc-500">{group.members.length} thành viên</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-3 py-2 rounded-2xl max-w-[70%] ${
              msg.senderId === user?.uid 
                ? 'bg-[#0a84ff] text-white' 
                : 'bg-zinc-100 dark:bg-zinc-800'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 border-t">
        <input 
          placeholder="Nhắn tin..." 
          className="w-full h-10 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-full outline-none"
        />
      </div>
    </div>
  );
}