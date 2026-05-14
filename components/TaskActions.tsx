"use client";
import { useRouter } from "next/navigation";
import { FiHeart, FiMessageCircle, FiShare2, FiBookmark } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { doc, onSnapshot, runTransaction, arrayUnion, arrayRemove, updateDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { incrementTaskView } from "@/lib/taskService";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import LottiePlayer from "@/components/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";

type Props = { taskId: string; chatCount?: number; initialLikes?: string[]; isBookmarked?: boolean };

export default function TaskActions({ taskId, chatCount = 0, initialLikes = [], isBookmarked = false }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const db = useMemo(() => getFirebaseDB(), []);

  const [likes, setLikes] = useState<string[]>(initialLikes);
  const [liking, setLiking] = useState(false);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const [showShareBurst, setShowShareBurst] = useState(false);
  const [showBookmarkBurst, setShowBookmarkBurst] = useState(false);
  const shareLockRef = useRef(false);
  const lastTapRef = useRef(0);

  const liked = user && likes.includes(user.uid);
  const likeCount = likes.length;

  useEffect(() => {
    if (!taskId) return;
    const unsub = onSnapshot(doc(db, "tasks", taskId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLikes(Array.isArray(data.likes)? data.likes : []);
      }
    }, (err) => console.error("Listen likes error:", err));
    return () => unsub();
  }, [taskId, db]);

  const handleLike = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) return router.push("/login");
    if (liking) return;

    // Double tap detection
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;

    setLiking(true);
    const willLike =!liked;
    const newLikes = willLike? [...likes, user.uid] : likes.filter((id) => id!== user.uid);
    setLikes(newLikes);

    if (willLike) {
      setShowLikeBurst(true);
      navigator.vibrate?.(isDoubleTap? [5, 5, 10] : 10);
      setTimeout(() => setShowLikeBurst(false), 850);
      if (isDoubleTap) toast.success("❤️", { duration: 800, position: "bottom-center" });
    } else {
      navigator.vibrate?.(5);
    }

    try {
      await runTransaction(db, async (transaction) => {
        const ref = doc(db, "tasks", taskId);
        const snap = await transaction.get(ref);
        if (!snap.exists()) throw new Error("Task không tồn tại");
        const currentLikes = snap.data().likes || [];
        const hasLiked = currentLikes.includes(user.uid);
        transaction.update(ref, { likes: hasLiked? arrayRemove(user.uid) : arrayUnion(user.uid), likeCount: hasLiked? currentLikes.length - 1 : currentLikes.length + 1 });
      });
    } catch (err) {
      console.error("Lỗi like:", err);
      setLikes(likes);
      toast.error("Thao tác thất bại");
    } finally {
      setLiking(false);
    }
  }, [user, liked, liking, likes, taskId, router, db]);

  const handleChat = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.vibrate?.(5);
    incrementTaskView(taskId);
    router.push(`/task/${taskId}#comments`);
  }, [router, taskId]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (shareLockRef.current) return;
    shareLockRef.current = true;
    setTimeout(() => (shareLockRef.current = false), 1200);

    const url = `${window.location.origin}/task/${taskId}`;
    setShowShareBurst(true);
    navigator.vibrate?.([5, 10]);
    setTimeout(() => setShowShareBurst(false), 750);

    try {
      if (navigator.share) {
        await navigator.share({ title: "Xem task này trên HUHA", text: "Khám phá công việc thú vị", url });
        toast.success("Đã chia sẻ");
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Đã sao chép link", { icon: "🔗" });
      }
    } catch (err: any) {
      if (err.name!== "AbortError") {
        await navigator.clipboard.writeText(url);
        toast.success("Đã sao chép link");
      }
    }
  }, [taskId]);

  const handleBookmark = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return router.push("/login");

    const newState =!bookmarked;
    setBookmarked(newState);
    setShowBookmarkBurst(newState);
    navigator.vibrate?.(newState? 10 : 5);
    setTimeout(() => setShowBookmarkBurst(false), 700);

    try {
      await updateDoc(doc(db, "users", user.uid), { bookmarks: newState? arrayUnion(taskId) : arrayRemove(taskId) });
      toast.success(newState? "Đã lưu" : "Đã bỏ lưu", { icon: newState? "🔖" : "✓" });
    } catch {
      setBookmarked(!newState);
      toast.error("Thao tác thất bại");
    }
  }, [user, bookmarked, taskId, router, db]);

  return (
    <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-zinc-100/80 dark:border-zinc-800/50">
      <div className="flex items-center gap-1">
        {/* Like */}
        <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike} disabled={liking} className="group relative flex items-center gap-1.5 h-8 px-2.5 -ml-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors disabled:opacity-60">
          <div className="relative w-5 h-5 grid place-items-center">
            <AnimatePresence mode="wait">
              {liked? (
                <motion.div key="liked" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 600, damping: 15 }}>
                  <FaHeart className="text-red-500" size={18} />
                </motion.div>
              ) : (
                <motion.div key="unliked" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <FiHeart size={18} className="text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" strokeWidth={2} />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showLikeBurst && (
                <motion.div initial={{ opacity: 0, scale: 0.3 }} animate={{ opacity: [0, 1, 0], scale: [0.3, 1.6, 2.2], y: [0, -8, -16] }} exit={{ opacity: 0 }} transition={{ duration: 0.85, ease: "easeOut" }} className="absolute inset-0 pointer-events-none z-10">
                  <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-11 h-11 -ml-3 -mt-3" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            <motion.span key={likeCount} initial={{ y: liked? -8 : 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: liked? 8 : -8, opacity: 0 }} transition={{ duration: 0.2 }} className={`text-sm font-semibold tabular-nums min-w-[20px] text-center ${liked? "text-red-500" : "text-zinc-600 dark:text-zinc-400"}`}>
              {likeCount > 999? `${(likeCount / 1000).toFixed(1)}k` : likeCount}
            </motion.span>
          </AnimatePresence>
        </motion.button>

        {/* Comment */}
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleChat} className="flex items-center gap-1.5 h-8 px-2.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors group">
          <FiMessageCircle size={18} className="text-zinc-500 group-hover:text-[#0a84ff] transition-colors" strokeWidth={2} />
          <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums min-w-[16px]">{chatCount > 99? "99+" : chatCount}</span>
        </motion.button>
      </div>

      <div className="flex items-center gap-0.5">
        {/* Bookmark */}
        <motion.button whileTap={{ scale: 0.85 }} onClick={handleBookmark} className="relative w-8 h-8 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors group">
          <AnimatePresence mode="wait">
            {bookmarked? (
              <motion.div key="bookmarked" initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 180 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
                <FiBookmark size={17} className="fill-[#0a84ff] text-[#0a84ff]" strokeWidth={2} />
              </motion.div>
            ) : (
              <motion.div key="unbookmarked" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <FiBookmark size={17} className="text-zinc-500 group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors" strokeWidth={2} />
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {showBookmarkBurst && (
              <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: [0, 1.4, 1.8], opacity: [1, 1, 0] }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-0 pointer-events-none">
                <div className="w-full h-full rounded-full border-2 border-[#0a84ff] animate-ping" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Share */}
        <motion.button whileTap={{ scale: 0.85 }} onClick={handleShare} className="relative w-8 h-8 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors group">
          <FiShare2 size={17} className="text-zinc-500 group-hover:text-[#00C853] transition-colors" strokeWidth={2} />
          <AnimatePresence>
            {showShareBurst && (
              <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1.5 }} exit={{ opacity: 0, scale: 2 }} transition={{ duration: 0.7 }} className="absolute inset-0 pointer-events-none">
                <LottiePlayer animationData={celebrate} autoplay loop={false} className="w-9 h-9 -ml-1 -mt-1 opacity-80" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}