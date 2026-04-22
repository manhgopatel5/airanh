"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { searchUsers } from "@/lib/userService";
import { sendFriendRequest, cancelFriendRequest, getFriendStatus } from "@/lib/friendService";
import { useAuth } from "@/lib/AuthContext";
import { FiSearch, FiUserPlus, FiClock, FiCheck, FiX, FiUserX } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi";

type UserResult = {
  uid: string;
  name?: string;
  username?: string; // ✅ FIX 4
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
  
  const abortRef = useRef<AbortController | null>(null); // ✅ FIX 1
  const mountedRef = useRef(true); // ✅ FIX 3

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ================= DEBOUNCE SEARCH + CANCEL ================= */
  useEffect(() => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    if (abortRef.current) abortRef.current.abort(); // ✅ FIX 1: Hủy request cũ
    abortRef.current = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(keyword, { signal: abortRef.current?.signal }); // ✅ FIX 5: limit
        
        // ✅ FIX 2: Lấy status cho từng user
        const withStatus = await Promise.all(
          res.filter((u: UserResult) => u.uid !== user?.uid).map(async (u: UserResult) => {
            const status = await getFriendStatus(user!.uid, u.uid);
            return { ...u, status };
          })
        );

        if (mountedRef.current) setResults(withStatus);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error("Lỗi search:", err);
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

  /* ================= ADD FRIEND ================= */
  const handleAddFriend = async (targetId: string) => {
    if (!user?.uid || sending) return;

    setSending(targetId);
    try {
      await sendFriendRequest(user.uid, targetId);
      if (mountedRef.current) {
        setResults((prev) =>
          prev.map((u) => (u.uid === targetId ? { ...u, status: "requested" } : u))
        );
      }
    } catch (err) {
      console.error("❌ lỗi kết bạn:", err);
    } finally {
      if (mountedRef.current) setSending(null);
    }
  };

  /* ================= CANCEL REQUEST - ✅ FIX 7 ================= */
  const handleCancelRequest = async (targetId: string) => {
    if (!user?.uid || sending) return;
    setSending(targetId);
    try {
      await cancelFriendRequest(user.uid, targetId);
      if (mountedRef.current) {
        setResults((prev) =>
          prev.map((u) => (u.uid === targetId ? { ...u, status: "none" } : u))
        );
      }
    } catch (err) {
      console.error("❌ lỗi hủy:", err);
    } finally {
      if (mountedRef.current) setSending(null);
    }
  };

  /* ================= HIGHLIGHT - ✅ FIX 6 ================= */
  const highlightText = (text: string, keyword: string) => {
    if (!keyword.trim()) return text;
    const parts = text.split(new RegExp(`(${keyword})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 font-semibold">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  /* ================= UI BUTTON ================= */
  const renderButton = (u: UserResult) => {
    const isSending = sending === u.uid;

    switch (u.status) {
      case "friends":
        return (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold">
            <FiCheck size={16} />
            Bạn bè
          </div>
        );
      case "requested":
        return (
          <button
            onClick={() => handleCancelRequest(u.uid)}
            disabled={isSending}
            className="flex items-center gap-1.5 text-gray-400 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-400 text-sm font-semibold transition-colors disabled:opacity-50"
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
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 text-sm font-semibold">
            <FiUserPlus size={16} />
            Phản hồi
          </div>
        );
      default:
        return (
          <button
            onClick={() => handleAddFriend(u.uid)}
            disabled={!user?.uid || isSending}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
      {/* INPUT SEARCH */}
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo tên, email, @username..."
          className="w-full pl-10 pr-10 py-3 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
        />
        {keyword && (
          <button
            onClick={() => setKeyword("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 dark:text-zinc-500 transition-colors"
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      {/* LOADING */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 rounded-3xl p-3 animate-pulse border border-gray-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
                </div>
                <div className="w-20 h-8 bg-gray-200 dark:bg-zinc-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY */}
      {!loading && keyword && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-zinc-500">
          <HiSparkles size={48} className="mb-3" />
          <p className="font-semibold text-sm">Không tìm thấy "{keyword}"</p>
          <p className="text-xs mt-1">Thử tìm với từ khóa khác</p>
        </div>
      )}

      {/* RESULTS */}
      {!loading && (
        <div className="space-y-2">
          {results.map((u) => (
            <div
              key={u.uid}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm shadow-gray-100/50 dark:shadow-black/20 p-3 flex items-center justify-between gap-3 group hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/40 transition-all duration-200"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <img
                  src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "U")}&background=random`}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-50 dark:ring-zinc-800"
                  alt="avatar"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {highlightText(u.name || "User", keyword)} {/* ✅ FIX 6 */}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                    {u.username && `@${highlightText(u.username, keyword)} · `}
                    {highlightText(u.email || "", keyword)}
                  </p>
                </div>
              </div>
              <div className="shrink-0">{renderButton(u)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
