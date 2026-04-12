"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/lib/chatService";

export default function FriendList() {
  const { user } = useAuth();
  const router = useRouter();

  const [friends, setFriends] = useState<any[]>([]);

  useEffect(() => {
    const loadFriends = async () => {
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const data = userDoc.data();

      if (!data?.friends) return;

      const list = [];

      for (const fid of data.friends) {
        const fDoc = await getDoc(doc(db, "users", fid));
        list.push(fDoc.data());
      }

      setFriends(list);
    };

    loadFriends();
  }, [user]);

  const handleChat = async (fid: string) => {
    const id = await getOrCreateConversation(user.uid, fid);
    router.push(`/chat/${id}`);
  };

  return (
    <div className="p-3">
      <h2 className="font-semibold mb-2">Bạn bè</h2>

      {friends.map((f) => (
        <div
          key={f.uid}
          className="flex items-center justify-between p-2 bg-white rounded-xl shadow mb-2"
        >
          <div className="flex items-center gap-2">
            <img
              src={f.avatar || "/avatar.png"}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <div className="font-medium">{f.name}</div>
              <div className="text-xs text-gray-400">
                Online
              </div>
            </div>
          </div>

          <button
            onClick={() => handleChat(f.uid)}
            className="bg-black text-white px-3 py-1 rounded-lg"
          >
            Nhắn tin
          </button>
        </div>
      ))}
    </div>
  );
}
