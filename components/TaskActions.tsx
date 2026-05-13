"use client";

import { useRouter } from "next/navigation";
import { FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { useEffect, useState, useCallback, useRef } from "react";
import { doc, onSnapshot, runTransaction, arrayUnion, arrayRemove } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { incrementTaskView } from "@/lib/taskService";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  taskId: string;
  chatCount?: number;
};

export default function TaskActions({ taskId, chatCount = 0 }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const db = getFirebaseDB();

  const [likes, setLikes] = useState<string[]>([]);
  const [liking, setLiking] = useState(false);
  const shareLockRef = useRef(false);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const [showShareBurst, setShowShareBurst] = useState(false);

  const liked = user && likes.includes(user.uid);

  // ✅ LOTTIE PATHS
  const likeBurstLottie = "/lotties/huha-celebrate-full.lottie";
  const shareLottie = "/lotties/huha-celebrate-full.lottie";

  /* ================= LISTEN LIKES ONLY ================= */
  useEffect(() => {
    if (!taskId) return;

    const unsub = onSnapshot(doc(db, "tasks", taskId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLikes(Array.isArray(data.likes)? data.likes : []);
      }
    });

    return () => unsub();
  }, [taskId, db]);

  /* ================= LIKE ================= */
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return router.push("/login");
    if (liking) return;

    setLiking(true);
    const willLike =!liked;

    const newLikes = liked
    ? likes.filter((id) => id!== user.uid)
      : [...likes, user.uid];

    setLikes(newLikes);

    // ✅ BURST ANIMATION
    if (willLike) {
      setShowLikeBurst(true);
      navigator.vibrate?.([5, 10, 5]);
      setTimeout(() => setShowLikeBurst(false), 800);
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

        transaction.update(ref, {
          likes: hasLiked
          ? arrayRemove(user.uid)
            : arrayUnion(user.uid),
        });
      });
    } catch (err) {
      console.error("Lỗi like:", err);
      setLikes(likes);
    } finally {
      setLiking(false);
    }
  }, [user, liked, liking, likes, taskId, router, db]);

  /* ================= CHAT ================= */
  const handleChat = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.vibrate?.(5);
    incrementTaskView(taskId);
    router.push(`/task/${taskId}`);
  }, [router, taskId]);

  /* ================= SHARE ================= */
  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (shareLockRef.current) return;
    shareLockRef.current = true;
    setTimeout(() => (shareLockRef.current = false), 1000);

    const url = `${window.location.origin}/task/${taskId}`;

    // ✅ SHARE BURST
    setShowShareBurst(true);
    navigator.vibrate?.(10);
    setTimeout(() => setShowShareBurst(false), 700);

    if (navigator.share) {
      try {
        await navigator.share({ title: "Xem task này", url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [taskId]);

  return (
    <div className="flex items-center gap-5 pt-2 text-zinc-500 dark:text-zinc-400 relative">
      {/* LIKE */}
      <button
        onClick={handleLike}
        disabled={liking}
        className="flex items-center gap-1.5 active:scale-90 transition group/like disabled:opacity-50 relative"
      >
        <div className="relative w-5 h-5 flex items-center justify-center">
          {liked? (
            <motion.div initial={{scale:0.8}} animate={{scale:1}} transition={{type:"spring",stiffness:500,damping:15}}>
              <FaHeart className="text-red-500" size={20} />
            </motion.div>
          ) : (
            <FiHeart className="group-hover/like:text-red-400 transition-colors" size={20} />
          )}
          {/* ✅ LIKE BURST LOTTIE */}
          <AnimatePresence>
            {showLikeBurst && (
              <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1.8}} exit={{opacity:0,scale:2}} className="absolute inset-0 pointer-events-none">
                <DotLottieReact src={likeBurstLottie} autoplay style={{width:40,height:40,marginLeft:-10,marginTop:-10}} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span className="text-sm font-semibold min-w-[16px] text-center">{likes.length}</span>
      </button>

      {/* CHAT */}
      <button
        onClick={handleChat}
        className="flex items-center gap-1.5 active:scale-90 transition group/comment hover:text-[#0042B2]"
      >
        <FiMessageCircle className="group-hover/comment:text-[#0042B2] transition-colors" size={20} />
        <span className="text-sm font-semibold">{chatCount}</span>
      </button>

      {/* SHARE */}
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 active:scale-90 transition group/share ml-auto relative"
      >
        <div className="relative">
          <FiShare2 className="group-hover/share:text-[#00C853] transition-colors" size={20} />
          {/* ✅ SHARE BURST */}
          <AnimatePresence>
            {showShareBurst && (
              <motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1.5}} exit={{opacity:0}} className="absolute -inset-2 pointer-events-none">
                <DotLottieReact src={shareLottie} autoplay style={{width:36,height:36,marginLeft:-8,marginTop:-8}} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </button>
    </div>
  );
}