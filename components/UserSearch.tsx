"use client";

import { useEffect, useState, useRef } from "react";
import { searchUsers } from "@/lib/userService";
import { sendFriendRequest, cancelFriendRequest, getFriendStatus } from "@/lib/friendService";
import { useAuth } from "@/lib/AuthContext";
import { FiSearch, FiUserPlus, FiCheck, FiX, FiUserX } from "react-icons/fi";

type UserResult = {
  uid: string;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string;
  status?: "none" | "friends" | "requested" | "pending";
};

export default function UserSearch() {
  const { user } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(keyword.trim().toUpperCase(), user?.uid);

        console.log("SEARCH RESULT:", res);

        const filtered = res.users.filter((u: UserResult) => u.uid !== user?.uid);

        const withStatus = await Promise.all(
          filtered.map(async (u: UserResult) => {
            if (!user?.uid) return { ...u, status: "none" as const };

            const friendStatus = await getFriendStatus(user.uid, u.uid);

            let status: UserResult["status"] = "none";

            if (friendStatus === "friends") status = "friends";
            else if (friendStatus === "pending_sent") status = "requested";
            else if (friendStatus === "pending_received") status = "pending";

            return { ...u, status };
          })
        );

        if (mountedRef.current) setResults(withStatus);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("❌ Lỗi search:", err);
        if (mountedRef.current) setResults([]);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [keyword, user?.uid]);

  const handleAddFriend = async (targetId: string) => {
    if (!user?.uid || sending) return;

    setSending(targetId);

    try {
      await sendFriendRequest(user.uid, targetId);

      if (mountedRef.current) {
        setResults((prev) =>
          prev.map((u) =>
            u.uid === targetId ? { ...u, status: "requested" } : u
          )
        );
      }
    } catch (err) {
      console.error("❌ lỗi kết bạn:", err);
    } finally {
      if (mountedRef.current) setSending(null);
    }
  };

  const handleCancelRequest = async (targetId: string) => {
    if (!user?.uid || sending) return;

    setSending(targetId);

    try {
      await cancelFriendRequest(user.uid, targetId);

      if (mountedRef.current) {
        setResults((prev) =>
          prev.map((u) =>
            u.uid === targetId ? { ...u, status: "none" } : u
          )
        );
      }
    } catch (err) {
      console.error("❌ lỗi hủy:", err);
    } finally {
      if (mountedRef.current) setSending(null);
    }
  };

  // ❌ XÓA HÀM highlightText vì không dùng

  const renderButton = (u: UserResult) => {
    const isSending = sending === u.uid;

    switch (u.status) {
      case "friends":
        return (
          <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
            <FiCheck size={16} />
            Bạn bè
          </div>
        );

      case "requested":
        return (
          <button
            onClick={() => handleCancelRequest(u.uid)}
            disabled={isSending}
            className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 text-sm font-semibold"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
            ) : (
              <FiUserX size={16} />
            )}
            Hủy
          </button>
        );

      case "pending":
        return (
          <div className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold">
            <FiUserPlus size={16} />
            Phản hồi
          </div>
        );

      default:
        return (
          <button
            onClick={() => handleAddFriend(u.uid)}
            disabled={!user?.uid || isSending}
            className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FiUserPlus size={16} />
            )}
            Kết bạn
          </button>
        );
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />

        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Nhập User ID (VD: PVT331HC)"
          className="w-full pl-10 pr-10 py-3 rounded-2xl border bg-white text-sm"
        />

        {keyword && (
          <button
            onClick={() => setKeyword("")}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      {loading && <p>Đang tìm...</p>}

      {!loading && keyword && results.length === 0 && (
        <div className="text-center text-gray-400">
          Không tìm thấy "{keyword}"
        </div>
      )}

      {!loading &&
        results.map((u) => (
          <div key={u.uid} className="flex items-center justify-between p-3 border rounded-xl">
            <div className="flex items-center gap-3">
              <img
                src={
                  u.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "U")}`
                }
                alt={u.name || "User avatar"} // ✅ Thêm alt
                className="w-10 h-10 rounded-full"
              />
              <div>
                <p>{u.name || "User"}</p>
                <p className="text-xs text-gray-500">{u.email}</p>
              </div>
            {renderButton(u)}
          </div>
        ))}
    </div>
  );
}