"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { searchUsers } from "@/lib/userService";
import { sendFriendRequest, cancelFriendRequest, getFriendStatus } from "@/lib/friendService";
import { useAuth } from "@/lib/AuthContext";
import { FiSearch, FiUserPlus, FiCheck, FiX, FiUserX, FiAlertCircle, FiUsers, FiClock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    mountedRef.current = true;
    const saved = localStorage.getItem("huha_recent_searches");
    if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5));
    return () => { mountedRef.current = false; };
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
              return {...u, status: status === "blocked"? "none" : status };
            } catch {
              return {...u, status: "none" as const };
            }
          })
        );
        if (mountedRef.current) {
          setResults(withStatus);
          if (withStatus.length > 0 && keyword.trim()) {
            const updated = [keyword.trim(),...recentSearches.filter((s) => s!== keyword.trim())].slice(0, 5);
            setRecentSearches(updated);
            localStorage.setItem("huha_recent_searches", JSON.stringify(updated));
          }
        }
      } catch (err: any) {
        if (err.name!== "AbortError" && mountedRef.current) {
          setError(err.message || "Lỗi tìm kiếm");
          setResults([]);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }, 300);

    return () => { clearTimeout(timer); abortRef.current?.abort(); };
  }, [keyword, user?.uid, recentSearches]);

  const handleAddFriend = async (targetId: string) => {
    if (!user?.uid || sending) return;
    setSending(targetId);
    navigator.vibrate?.(5);
    try {
      await sendFriendRequest(user.uid, targetId);
      if (mountedRef.current) {
        setResults((prev) => prev.map((u) => (u.uid === targetId? {...u, status: "pending_sent" } : u)));
        toast.success("Đã gửi lời mời kết bạn");
      }
    } catch (err: any) {
      toast.error(err.message || "Gửi lời mời thất bại");
    } finally {
      if (mountedRef.current) setSending(null);
    }
  };

  const handleCancelRequest = async (targetId: string) => {
    if (!user?.uid || sending) return;
    setSending(targetId);
    navigator.vibrate?.(5);
    try {
      await cancelFriendRequest(user.uid, targetId);
      if (mountedRef.current) {
        setResults((prev) => prev.map((u) => (u.uid === targetId? {...u, status: "none" } : u)));
        toast.success("Đã hủy lời mời");
      }
    } catch (err: any) {
      toast.error(err.message || "Hủy thất bại");
    } finally {
      if (mountedRef.current) setSending(null);
    }
  };

  const renderButton = (u: UserResult) => {
    const isSending = sending === u.uid;
    const baseBtn = "h-9 px-3.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50";

    switch (u.status) {
      case "friends":
        return (
          <div className={`${baseBtn} bg-[#00C853]/10 text-[#00C853] cursor-default`}>
            <FiCheck size={16} />Bạn bè
          </div>
        );
      case "pending_sent":
        return (
          <button onClick={() => handleCancelRequest(u.uid)} disabled={isSending} className={`${baseBtn} bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600`}>
            {isSending? <div className="w-4 h-4 border-2 border-zinc-300 border-t-red-500 rounded-full animate-spin" /> : <><FiClock size={14} />Đã gửi</>}
          </button>
        );
      case "pending_received":
        return (
          <div className={`${baseBtn} bg-[#0a84ff]/10 text-[#0a84ff] cursor-default`}>
            <FiUserPlus size={14} />Chờ phản hồi
          </div>
        );
      default:
        return (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleAddFriend(u.uid)} disabled={!user?.uid || isSending} className={`${baseBtn} bg-[#0a84ff] text-white shadow-lg shadow-[#0a84ff]/20 hover:shadow-xl hover:shadow-[#0a84ff]/30`}>
            {isSending? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><FiUserPlus size={14} />Kết bạn</>}
          </motion.button>
        );
    }
  };

  const stats = useMemo(() => ({
    friends: results.filter((r) => r.status === "friends").length,
    pending: results.filter((r) => r.status === "pending_sent").length,
  }), [results]);

  return (
    <div className="w-full max-w-[560px] mx-auto">
      {/* Search header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-2xl pt-4 pb-3 -mx-4 px-4 border-b border-black/5 dark:border-white/5">
        <div className="relative group">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-[#0a84ff] transition-colors" size={18} />
          <input ref={inputRef} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Tìm theo ID, tên, email..." className="w-full h-12 pl-11 pr-11 bg-zinc-100 dark:bg-zinc-900 rounded-2xl outline-none text- font-medium placeholder:text-zinc-400 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-[#0a84ff]/20 focus:shadow-lg transition-all" autoComplete="off" />
          <AnimatePresence>
            {keyword && (
              <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} onClick={() => { setKeyword(""); inputRef.current?.focus(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-7 h-7 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:scale-90 transition-all">
                <FiX size={16} className="text-zinc-500" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <AnimatePresence>
          {keyword && results.length > 0 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-4 mt-3 px-1">
              <span className="text-xs text-zinc-500">{results.length} kết quả</span>
              {stats.friends > 0 && <span className="text-xs flex items-center gap-1 text-[#00C853]"><FiUsers size={12} />{stats.friends} bạn</span>}
              {stats.pending > 0 && <span className="text-xs flex items-center gap-1 text-amber-600"><FiClock size={12} />{stats.pending} chờ</span>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-1 py-4">
        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2.5 p-3.5 mb-4 bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/50 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 grid place-items-center flex-shrink-0">
                <FiAlertCircle size={16} className="text-red-600" />
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 font-medium flex-1">{error}</p>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-500/10 rounded-lg transition-colors"><FiX size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent searches */}
        {!keyword && recentSearches.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">Tìm gần đây</p>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, i) => (
                <motion.button key={search} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }} onClick={() => setKeyword(search)} className="px-3.5 h-8 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-sm font-medium active:scale-95 transition-all">
                  {search}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#0a84ff]/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-14 h-14">
                <LottiePlayer animationData={loadingPull} autoplay loop className="w-14 h-14" aria-label="Đang tải" />
              </div>
            </div>
            <p className="text-sm text-zinc-500 font-medium">Đang tìm kiếm...</p>
          </div>
        )}

        {/* No user */}
        {!user?.uid && keyword && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900 grid place-items-center">
              <FiUserPlus size={24} className="text-zinc-400" />
            </div>
            <p className="text-zinc-500 font-medium">Đăng nhập để tìm bạn bè</p>
          </div>
        )}

        {/* Empty */}
        {!loading && keyword && user?.uid && results.length === 0 &&!error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 relative">
              <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 rounded-full" />
              <div className="relative w-full h-full grid place-items-center">
                <FiSearch size={28} className="text-zinc-400" strokeWidth={1.5} />
              </div>
            </div>
            <p className="font-semibold text-zinc-900 dark:text-white mb-1">Không tìm thấy</p>
            <p className="text-sm text-zinc-500">Không có kết quả cho "{keyword}"</p>
          </motion.div>
        )}

        {/* Results */}
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {!loading && results.map((u, i) => (
              <motion.div key={u.uid} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.02, type: "spring", stiffness: 400, damping: 25 }} layout className="group relative">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#0a84ff]/0 via-[#0a84ff]/5 to-[#0a84ff]/0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-3.5 p-3.5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 hover:shadow-md hover:shadow-black/5 transition-all">
                  <div className="relative flex-shrink-0">
                    <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || "U")}&background=0a84ff&color=fff&bold=true`} alt={u.name} className="w-12 h-12 rounded-2xl object-cover ring-2 ring-white dark:ring-zinc-900 shadow-sm" />
                    {u.status === "friends" && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00C853] rounded-full grid place-items-center ring-2 ring-white dark:ring-zinc-900"><FiCheck size={10} className="text-white" strokeWidth={3} /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text- truncate text-zinc-900 dark:text-white">{u.name || "Người dùng"}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-zinc-500 truncate">{u.userId? `@${u.userId}` : u.email}</p>
                      {u.status === "pending_sent" && <span className="text- px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 font-medium">Đã gửi</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0">{renderButton(u)}</div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}