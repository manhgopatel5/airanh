"use client";

import { useRouter } from "next/navigation";
import { FiHeart, FiShare2 } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { useEffect, useState, useCallback, memo } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { incrementTaskView } from "@/lib/task";
import { TaskListItem } from "@/types/task";
import { toast } from "sonner";

function TaskCard({ task }: { task: TaskListItem }) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [liking, setLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState<string[]>(task.likes || []);

  useEffect(() => onAuthStateChanged(auth, setCurrentUser), []);

  if (!task) return <Skeleton />;

  const isPlan = task.budgetType === "fixed" && task.price === 0;
  const liked = currentUser && localLikes.includes(currentUser.uid);
  const likeCount = localLikes.length;

  const statusConfig = {
    open: { text: "Đang tuyển", color: "emerald" },
    full: { text: "Đã đủ", color: "amber" },
    completed: { text: "Hoàn thành", color: "blue" },
    cancelled: { text: "Đã hủy", color: "gray" },
  } as const;

  const status = statusConfig[task.status || "open"];

  /* ================= LIKE ================= */
  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return router.push("/login");
    if (liking) return;

    setLiking(true);

    const newLikes = liked
      ? localLikes.filter((id) => id !== currentUser.uid)
      : [...localLikes, currentUser.uid];

    setLocalLikes(newLikes);

    try {
      await updateDoc(doc(db, "tasks", task.id), {
        likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        likeCount: newLikes.length,
      });
    } catch {
      setLocalLikes(task.likes || []);
      toast.error("Thao tác thất bại");
    } finally {
      setLiking(false);
    }
  }, [currentUser, liked, liking, localLikes, task.id, task.likes, router]);

  /* ================= SHARE ================= */
  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();

    const url = `${window.location.origin}/task/${task.slug}`;
    const title = task.title || "Xem công việc";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép link");
    }
  }, [task.slug, task.title]);

  /* ================= NAV ================= */
  const handleClick = useCallback(() => {
    incrementTaskView(task.id);
    router.push(`/task/${task.slug}`);
  }, [router, task.id, task.slug]);

  const goToProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.userId) router.push(`/user/${task.userId}`);
  }, [router, task.userId]);

  const handleMouseEnter = useCallback(() => {
    router.prefetch(`/task/${task.slug}`);
  }, [router, task.slug]);

  /* ================= TIME ================= */
  const timeAgo = (seconds?: number) => {
    if (!seconds) return "";
    const diff = Date.now() / 1000 - seconds;
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày`;
    return new Date(seconds * 1000).toLocaleDateString("vi-VN");
  };

  const formatPrice = (price: number, currency = "VND") =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm p-4 cursor-pointer"
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={goToProfile} className="flex items-center gap-3">
          <img
            src={task.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.userName || "U")}`}
            alt="avatar"
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-semibold text-sm">{task.userName || "User"}</p>
            <p className="text-xs text-gray-500">{timeAgo(task.createdAt?.seconds)}</p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <button onClick={handleLike} disabled={liking} className="flex items-center gap-1 active:scale-90 transition disabled:opacity-50">
            {liked ? <FaHeart className="text-red-500" /> : <FiHeart />}
            <span className="text-xs">{likeCount}</span>
          </button>
          <button onClick={handleShare}>
            <FiShare2 />
          </button>
        </div>
      </div>

      {/* TITLE */}
      <h3 className="font-bold">{task.title}</h3>

      {/* PRICE */}
      {!isPlan && task.price !== undefined && (
        <p className="text-emerald-600 font-bold">
          {formatPrice(task.price, task.currency)}
        </p>
      )}
    </div>
  );
}

function Skeleton() {
  return <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />;
}

export default memo(TaskCard);
