"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase.client";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/lib/chatService";

export default function FriendList() {
  const { user } = useAuth();
  const router = useRouter();

  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ================= LOAD FRIENDS ================= */
  useEffect(() => {
    const loadFriends = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();

        if (!data?.friends || data.friends.length === 0) {
          setFriends([]);
          setLoading(false);
          return;
        }

        const list = [];

        for (const fid of data.friends) {
          const fDoc = await getDoc(doc(db, "users", fid));

          if (fDoc.exists()) {
            list.push(fDoc.data());
          }
        }

        setFriends(list);
      } catch (err) {
        console.error("Lỗi load friends:", err);
      }

      setLoading(false);
    };

    loadFriends();
  }, [user]);

  /* ================= CHAT ================= */
  const handleChat = async (fid: string) => {
    if (!user?.uid) return; // 🔥 FIX LỖI TS

    try {
      const id = await getOrCreateConversation(user.uid, fid);
      router.push(`/chat/${id}`);
    } catch (err) {
      console.error("Lỗi chat:", err);
    }
  };

  /* ================= UI ================= */
  if (loading) {
    return (
      <div className="p-3 text-gray-400">Đang tải...</div>
    );
  }

  if (!friends.length) {
    return (
      <div className="p-3 text-gray-400">
        Chưa có bạn bè
      </div>
    );
  }

  return (
    <div className="p-3">
      <h2 className="font-semibold mb-2">Bạn bè</h2>

      {friends.map((f) => (
        <div
          key={f.uid}
          className="flex items-center justify-between p-2 bg-white rounded-xl shadow mb-2"
        >
          {/* USER INFO */}
          <div className="flex items-center gap-2">
            <img
              src={f.avatar || "/avatar.png"}
              className="w-10 h-10 rounded-full"
              alt="avatar"
            />
            <div>
              <div className="font-medium">
                {f.name || "User"}
              </div>
              <div className="text-xs text-gray-400">
                Online
              </div>
            </div>
          </div>

          {/* CHAT BUTTON */}
          <button
            onClick={() => handleChat(f.uid)}
            disabled={!user}
            className="bg-black text-white px-3 py-1 rounded-lg disabled:opacity-50"
          >
            Nhắn tin
          </button>
        </div>
      ))}
    </div>
  );
}
