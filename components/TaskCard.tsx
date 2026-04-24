"use client";

import { useRouter } from "next/navigation";
import { FiHeart, FiShare2, FiMessageCircle, FiUsers, FiClock } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { useEffect, useState, useCallback, memo } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { incrementTaskView } from "@/lib/task";
import { TaskListItem } from "@/types/task";
import { toast } from "sonner";

type Props = {
  task: TaskListItem;
  onDelete?: (id: string) => void;
};

function TaskCard({ task }: Props) {
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
    in_progress: { text: "Đang làm", color: "blue" }, // <-- thêm dòng này
    completed: { text: "Hoàn thành", color: "blue" },
    cancelled: { text: "Đã hủy", color: "gray" },
  } as const;

  const safeStatus = (task.status && task.status in statusConfig
  ? task.status
  : "open") as keyof typeof statusConfig;

const status = statusConfig[safeStatus];

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
      className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm shadow-gray-100/50 dark:shadow-black/20 active:scale-[0.98] transition-all duration-200 cursor-pointer overflow-hidden group hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/40"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <button onClick={goToProfile} className="flex items-center gap-3 flex-1 min-w-0">
            <img
              src={task.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.userName || "U")}&background=random`}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-50 dark:ring-zinc-800"
            />
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {task.userName || "User"}
                </span>
                {isPlan ? (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg">
                    PLAN
                  </span>
                ) : (
                  <span className={`text-xs font-bold text-${status.color}-600 dark:text-${status.color}-400 bg-${status.color}-50 dark:bg-${status.color}-950/50 px-2 py-0.5 rounded-lg`}>
                    {status.text}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
                <FiClock size={12} />
                {timeAgo(task.createdAt?.seconds)}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-4 text-gray-400 dark:text-zinc-500">
            <button onClick={handleLike} disabled={liking} className="flex items-center gap-1 active:scale-90 transition disabled:opacity-50">
              {liked ? <FaHeart className="text-red-500" size={16} /> : <FiHeart className="group-hover:text-red-400" size={16} />}
              <span className="text-xs font-medium">{likeCount}</span>
            </button>

            <div className="flex items-center gap-1">
              <FiMessageCircle size={16} className="group-hover:text-blue-400" />
              <span className="text-xs font-medium">{task.commentCount || 0}</span>
            </div>

            <button onClick={handleShare} className="active:scale-90 transition">
              <FiShare2 size={16} className="group-hover:text-emerald-400" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 leading-snug flex-1">
              {task.title}
            </h3>
            {!isPlan && task.price !== undefined && (
              <div className="shrink-0 text-right">
                <div className="text-lg font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  {formatPrice(task.price, task.currency)}
                </div>
                {task.totalSlots && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400 justify-end">
                    <FiUsers size={12} />
                    {task.joined || 0}/{task.totalSlots}
                  </div>
                )}
              </div>
            )}
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed line-clamp-2 whitespace-pre-wrap">
              {task.description}
            </p>
          )}

          {task.images && task.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-1">
              {task.images.slice(0, 3).map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Image ${i + 1}`}
                  loading="lazy"
                  className="w-full h-24 object-cover rounded-2xl bg-gray-200 dark:bg-zinc-800"
                  onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 p-4 animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-zinc-800 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
          <div className="h-3 bg-gray-200 dark:bg-zinc-800 rounded w-1/3" />
        </div>
      </div>
      <div className="h-5 bg-gray-200 dark:bg-zinc-800 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-full" />
    </div>
  );
}

export default memo(TaskCard, (prev, next) => {
  return (
    prev.task.id === next.task.id &&
    prev.task.likeCount === next.task.likeCount &&
    prev.task.commentCount === next.task.commentCount &&
    prev.task.joined === next.task.joined
  );
});