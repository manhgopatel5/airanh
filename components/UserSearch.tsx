"use client";

import { useEffect, useState, useRef } from "react";
import { searchUsers } from "@/lib/userService";
import { sendFriendRequest, cancelFriendRequest, getFriendStatus } from "@/lib/friendService";
import { useAuth } from "@/lib/AuthContext";
import { FiSearch, FiUserPlus, FiCheck, FiX, FiUserX, FiAlertCircle } from "react-icons/fi";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";

type UserResult = {
  uid: string;
  name?: string;
  username?: string;
  userId?: string;
  email?: string;
  avatar?: string;
  status?: "none" | "friends" | "pending_sent" | "pending_received";
};

export default function UserSearch() {
  const { user } = useAuth();

  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const searchLottie = "/lotties/huha-loading-pull-full.lottie";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!keyword.trim() ||!user?.uid) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(keyword.trim(), user.uid);
        const filtered = res.users.filter((u: UserResult) => u.uid!== user.uid);

        const withStatus = await Promise.all(
          filtered.map(async (u: UserResult) => {
            try {
              const status = await getFriendStatus(user.uid, u.uid);
              const mappedStatus: UserResult["status"] = 
                status === "blocked"? "none" : status;
              return {...u, status: mappedStatus };
            } catch (e) {
              console.error("Lỗi getFriendStatus:", e);
              return {...u, status: "none" as const };
            }
          })
        );

        if (mountedRef.current) setResults(withStatus);
      } catch (err: any) {
        if (err.name!== "AbortError") {
          console.error("❌ Lỗi search chi tiết:", err.code, err.message, err);
          if (mountedRef.current) {
            setError(`${err.code || 'unknown'}: ${err.message || 'Lỗi không xác định'}`);
            setResults([]);
          }
        }
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
    setError(null);
    navigator.vibrate?.(5);

    try {
      await sendFriendRequest(user.uid, targetId);
      if (mountedRef.current) {
        setResults((prev) =>
          prev.map((u) =>
            u.uid === targetId? {...u, status: "pending_sent" } : u
          )
        );
      }
    } catch (err: any) {
      console.error("❌ lỗi kết bạn:", err);
      if (mountedRef.current) {
        setError(err.message || "Gửi lời mời thất bại");
      }
    } finally {
      if (mountedRef.current) setSending(null);
    }
  };

  const handleCancelRequest = async (targetId: string) => {
    if (!user?.uid || sending) return;

    setSending(targetId);
    setError(null);
    navigator.vibrate?.(5);

    try {
      await cancelFriendRequest(user.uid, targetId);
      if (mountedRef.current) {
        setResults((prev) =>
          prev.map((u) =>
            u.uid === targetId? {...u, status: "none" } : u
          )
        );
      }
    } catch (err: any) {
      console.error("❌ lỗi hủy:", err);
      if (mountedRef.current) {
        setError(err.message || "Hủy lời mời thất bại");
      }
    } finally {
      if (mountedRef.current) setSending(null);
    }
  };

  const renderButton = (u: UserResult) => {
    const isSending = sending === u.uid;

    switch (u.status) {
      case "friends":
        return (
          <div className="flex items-center gap-1.5 text-[#00C853] text-sm font-semibold">
            <FiCheck size={16} />
            Bạn bè
          </div>
        );

      case "pending_sent":
        return (
          <button
            onClick={() => handleCancelRequest(u.uid)}
            disabled={isSending}
            className="flex items-center gap-1.5 text-zinc-400 hover:text-red-500 text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {isSending? (
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-red-500 rounded-full animate-spin" />
            ) : (
              <FiUserX size={16} />
            )}
            Hủy
          </button>
        );

      case "pending_received":
        return (
          <div className="flex items-center gap-1.5 text-[#0042B2] text-sm font-semibold">
            <FiUserPlus size={16} />
            Phản hồi
          </div>
        );

      default:
        return (
          <motion.button
            whileTap={{scale:0.95}}
            onClick={() => handleAddFriend(u.uid)}
            disabled={!user?.uid || isSending}
            className="flex items-center gap-1.5 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 shadow-md"
            style={{background:'linear-gradient(135deg,#0042B2,#0066FF)'}}
          >
            {isSending? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FiUserPlus size={16} />
            )}
            Kết bạn
          </motion.button>
        );
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="relative">
        <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />

        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Nhập User ID hoặc tên (VD: PVT331HC)"
          className="w-full pl-10 pr-10 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm focus:outline-none focus:ring-2 focus:ring-[#0042B2]/30 focus:border-[#0042B2] transition-all"
        />

        {keyword && (
          <button
            onClick={() => {
              setKeyword("");
              setError(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <FiX size={16} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-red-600 dark:text-red-400 text-sm">
            <FiAlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {!user?.uid && keyword && (
        <div className="text-center text-zinc-400 text-sm py-4">
          Vui lòng đăng nhập để tìm kiếm
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <div className="w-12 h-12">
            <DotLottieReact src={searchLottie} autoplay loop style={{width:48,height:48}} />
          </div>
          <p className="text-zinc-500 text-sm">Đang tìm...</p>
        </div>
      )}

      {!loading && keyword && user?.uid && results.length === 0 &&!error && (
        <div className="text-center text-zinc-400 py-8">
          Không tìm thấy "{keyword}"
        </div>
      )}

      <div className="space-y-2">
  <AnimatePresence>
    {!loading &&
      results.map((u, i) => (
        <motion.div
          key={u.uid}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 12 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={
                u.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  u.name || "U"
                )}&background=0042B2&color=fff`
              }
              alt={u.name || "User avatar"}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0 ring-2 ring-zinc-100 dark:ring-zinc-800"
            />

            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">
                {u.name || "User"}
              </p>

              <p className="text-xs text-zinc-500 truncate">
                {u.userId ? `@${u.userId}` : u.email}
              </p>
            </div>

            <div className="flex-shrink-0 ml-2">
              {renderButton(u)}
            </div>
          </div>
        </motion.div>
      ))}
  </AnimatePresence>
</div>
    </div>
  );
}
