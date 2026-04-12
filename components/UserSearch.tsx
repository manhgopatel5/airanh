"use client";

import { useState } from "react";
import { searchUsers } from "@/lib/userService";
import { sendFriendRequest } from "@/lib/friendService";
import { useAuth } from "@/lib/AuthContext";

export default function UserSearch() {
  const { user } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  /* ================= SEARCH ================= */
  const handleSearch = async (e: any) => {
    const val = e.target.value;
    setKeyword(val);

    if (!val.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      const res = await searchUsers(val);
      setResults(res);
    } catch (err) {
      console.error("Lỗi search:", err);
    }

    setLoading(false);
  };

  /* ================= ADD FRIEND ================= */
  const handleAddFriend = async (targetId: string) => {
    if (!user?.uid) return; // 🔥 FIX TS

    if (user.uid === targetId) return; // ❌ không add chính mình

    try {
      await sendFriendRequest(user.uid, targetId);
    } catch (err) {
      console.error("Lỗi kết bạn:", err);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="p-3">
      {/* INPUT */}
      <input
        value={keyword}
        onChange={handleSearch}
        placeholder="Tìm bạn..."
        className="w-full border p-2 rounded-lg mb-3 outline-none"
      />

      {/* LOADING */}
      {loading && (
        <div className="text-sm text-gray-400 mb-2">
          Đang tìm...
        </div>
      )}

      {/* EMPTY */}
      {!loading && keyword && results.length === 0 && (
        <div className="text-sm text-gray-400">
          Không tìm thấy
        </div>
      )}

      {/* RESULTS */}
      {results.map((u) => (
        <div
          key={u.uid}
          className="flex items-center justify-between p-2 bg-white rounded-xl shadow mb-2"
        >
          {/* USER INFO */}
          <div className="flex items-center gap-2">
            <img
              src={u.avatar || "/avatar.png"}
              className="w-10 h-10 rounded-full"
              alt="avatar"
            />
            <div>
              <div className="font-medium">
                {u.name || "User"}
              </div>
              <div className="text-xs text-gray-400">
                {u.email}
              </div>
            </div>
          </div>

          {/* BUTTON */}
          <button
            onClick={() => handleAddFriend(u.uid)}
            disabled={!user || user.uid === u.uid}
            className="bg-blue-500 text-white px-3 py-1 rounded-lg disabled:opacity-50"
          >
            Kết bạn
          </button>
        </div>
      ))}
    </div>
  );
}
