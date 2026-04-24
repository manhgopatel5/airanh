"use client";

import { useRouter } from "next/navigation";
import { FiHeart, FiMessageCircle, FiShare2 } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { useEffect, useState, useCallback, useRef } from "react";
import { doc, onSnapshot, runTransaction, arrayUnion, arrayRemove } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase"; // ✅ FIX
import { useAuth } from "@/lib/AuthContext";
import { incrementTaskView } from "@/lib/taskService";

type Props = {
  taskId: string;
  chatCount?: number;
};

export default function TaskActions({ taskId, chatCount = 0 }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const db = getFirebaseDB(); // ✅ FIX DUY NHẤT

  const [likes, setLikes] = useState<string[]>([]);
  const [liking, setLiking] = useState(false);
  const shareLockRef = useRef(false);

  const liked = user && likes.includes(user.uid);

  /* ================= LISTEN LIKES ONLY ================= */
  useEffect(() => {
    if (!taskId) return;

    const unsub = onSnapshot(doc(db, "tasks", taskId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLikes(Array.isArray(data.likes) ? data.likes : []);
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

    const newLikes = liked
      ? likes.filter((id) => id !== user.uid)
      : [...likes, user.uid];

    setLikes(newLikes);

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

    if (navigator.share) {
      try {
        await navigator.share({ title: "Xem task này", url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [taskId]);

  return (
    <div className="flex items-center gap-5 pt-2 text-gray-500 dark:text-zinc-400">
      {/* LIKE */}
      <button
        onClick={handleLike}
        disabled={liking}
        className="flex items-center gap-1.5 active:scale-90 transition group/like disabled:opacity-50"
      >
        {liked ? (
          <FaHeart className="text-red-500" size={20} />
        ) : (
          <FiHeart className="group-hover/like:text-red-400" size={20} />
        )}
        <span className="text-sm font-semibold">{likes.length}</span>
      </button>

      {/* CHAT */}
      <button
        onClick={handleChat}
        className="flex items-center gap-1.5 active:scale-90 transition group/comment"
      >
        <FiMessageCircle className="group-hover/comment:text-blue-400" size={20} />
        <span className="text-sm font-semibold">{chatCount}</span>
      </button>

      {/* SHARE */}
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 active:scale-90 transition group/share ml-auto"
      >
        <FiShare2 className="group-hover/share:text-emerald-400" size={20} />
      </button>
    </div>
  );
}