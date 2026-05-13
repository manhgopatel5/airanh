"use client";

import { useRouter } from "next/navigation";
import { FiHeart, FiShare2, FiMessageCircle, FiUsers, FiClock, FiMapPin, FiCalendar } from "react-icons/fi";
import { useEffect, useState, useCallback, memo } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { incrementTaskView } from "@/lib/task";
import { TaskListItem, PlanListItem } from "@/types/task";
import { AppMode } from "@/types/app";
import { toast } from "sonner";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion } from "framer-motion";

type Props = {
  task: TaskListItem | PlanListItem;
  mode: AppMode;
  onDelete?: (id: string) => void;
};

const planCategoryEmoji: Record<string, string> = {
  food: "🍜", nightlife: "🎉", outdoor: "🥾", sightseeing: "🗺️",
  entertainment: "🎬", shopping: "🛍️", wellness: "🧘", social: "💬", other: "✨",
};

function TaskCard({ task, mode }: Props) {
  const router = useRouter();
  const db = getFirebaseDB();
  const auth = getFirebaseAuth();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [liking, setLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState<string[]>(task.likes || []);
  const [showLikeBurst, setShowLikeBurst] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setCurrentUser);
    return () => unsub();
  }, [auth]);

  if (!task) return <Skeleton />;

  const isPlanMode = mode === "plan";
  const liked = currentUser && localLikes.includes(currentUser.uid);
  const likeCount = localLikes.length;

  const statusConfig = {
    open: { text: "Đang tuyển", color: "emerald", bg: "bg-emerald-50 dark:bg-emerald-950/40", textCls: "text-emerald-600 dark:text-emerald-400" },
    full: { text: "Đã đủ", color: "amber", bg: "bg-amber-50 dark:bg-amber-950/40", textCls: "text-amber-600 dark:text-amber-400" },
    in_progress: { text: "Đang làm", color: "blue", bg: "bg-blue-50 dark:bg-blue-950/40", textCls: "text-blue-600 dark:text-blue-400" },
    completed: { text: "Hoàn thành", color: "blue", bg: "bg-blue-50 dark:bg-blue-950/40", textCls: "text-blue-600 dark:text-blue-400" },
    cancelled: { text: "Đã hủy", color: "gray", bg: "bg-zinc-100 dark:bg-zinc-800", textCls: "text-zinc-500" },
  } as const;

  const safeStatus = (task.status && task.status in statusConfig? task.status : "open") as keyof typeof statusConfig;
  const status = statusConfig[safeStatus];

  const taskData = task as TaskListItem;
  const planData = task as PlanListItem;

  const handleLike = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) return router.push("/login");
    if (liking) return;

    setLiking(true);
    const newLikes = liked
     ? localLikes.filter((id) => id!== currentUser.uid)
      : [...localLikes, currentUser.uid];
    setLocalLikes(newLikes);

    if (!liked) {
      setShowLikeBurst(true);
      if ("vibrate" in navigator) navigator.vibrate(10);
      setTimeout(() => setShowLikeBurst(false), 800);
    }

    try {
      await updateDoc(doc(db, "tasks", task.id), {
        likes: liked? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid),
        likeCount: newLikes.length,
      });
    } catch {
      setLocalLikes(task.likes || []);
      toast.error("Thao tác thất bại");
    } finally {
      setLiking(false);
    }
  }, [currentUser, liked, liking, localLikes, task.id, task.likes, router, db]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/${mode}/${task.slug}`;
    if (navigator.share) {
      try { await navigator.share({ title: task.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép link", { icon: "🔗" });
    }
    if ("vibrate" in navigator) navigator.vibrate(5);
  }, [task.slug, task.title, mode]);

  const handleClick = useCallback(() => {
    incrementTaskView(task.id);
    router.push(`/${mode}/${task.slug}`);
  }, [router, task.id, task.slug, mode]);

  const goToProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.userId) router.push(`/user/${task.userId}`);
  }, [router, task.userId]);

  const timeAgo = (seconds?: number) => {
    if (!seconds) return "";
    const diff = Date.now() / 1000 - seconds;
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
    return `${Math.floor(diff / 86400)} ngày`;
  };

  const formatPrice = (price: number, currency = "VND") =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      onHoverStart={() => router.prefetch(`/${mode}/${task.slug}`)}
      className="bg-white dark:bg-zinc-900 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:shadow-gray-200/40 dark:hover:shadow-black/30 transition-all duration-300 cursor-pointer overflow-hidden group"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <button onClick={goToProfile} className="flex items-center gap-3 flex-1 min-w-0 text-left">
            <img
              src={task.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.userName || "U")}&background=0042B2&color=fff`}
              alt="avatar"
              className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-50 dark:ring-zinc-800 group-hover:ring-[#0042B2]/20 transition"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-[14px] text-gray-900 dark:text-gray-100 truncate">
                  {task.userName || "User"}
                </span>
                {isPlanMode? (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${status.bg} ${status.textCls}`}>
                    <div className="w-3.5 h-3.5 -ml-0.5">
                      <DotLottieReact src="/lotties/huha-idle-full.lottie" autoplay loop style={{width:14,height:14}} />
                    </div>
                    {planCategoryEmoji[planData.category || "other"]} PLAN
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg ${status.bg} ${status.textCls}`}>
                    {safeStatus === "completed" && (
                      <div className="w-3.5 h-3.5 -ml-0.5">
                        <DotLottieReact src="/lotties/huha-celebrate-full.lottie" autoplay loop style={{width:14,height:14}} />
                      </div>
                    )}
                    {status.text}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                <FiClock size={11} />{timeAgo(task.createdAt?.seconds)}
              </div>
            </div>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-3.5 text-zinc-500 dark:text-zinc-400">
            <button onClick={handleLike} disabled={liking} className="relative flex items-center gap-1 active:scale-90 transition">
              <div className="w-4 h-4 relative">
                {showLikeBurst && (
                  <div className="absolute -inset-2 z-10 pointer-events-none">
                    <DotLottieReact src="/lotties/huha-coin-drop-full.lottie" autoplay style={{width:32,height:32}} />
                  </div>
                )}
                {liked? (
                  <div className="w-4 h-4">
                    <DotLottieReact src="/lotties/huha-celebrate-full.lottie" autoplay loop style={{width:16,height:16}} />
                  </div>
                ) : (
                  <FiHeart size={16} className="group-hover:text-red-400 transition-colors" />
                )}
              </div>
              <span className="text-xs font-medium min-w-[14px]">{likeCount}</span>
            </button>
            <div className="flex items-center gap-1">
              <FiMessageCircle size={15} className="group-hover:text-[#0042B2] transition-colors" />
              <span className="text-xs">{task.commentCount || 0}</span>
            </div>
            <button onClick={handleShare} className="active:scale-90 transition">
              <FiShare2 size={15} className="group-hover:text-[#00C853] transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-[15px] leading-snug text-gray-900 dark:text-white flex-1 line-clamp-2">
              {task.title}
            </h3>

            {task.type === "task" && taskData.price!== undefined && (
              <div className="text-right shrink-0">
                <div className="text-[17px] font-extrabold" style={{color: '#00C853'}}>
                  {formatPrice(taskData.price, taskData.currency)}
                </div>
                {taskData.totalSlots && (
                  <div className="flex items-center gap-1 text-[11px] text-zinc-500 justify-end">
                    <FiUsers size={11} />{taskData.joined || 0}/{taskData.totalSlots}
                  </div>
                )}
              </div>
            )}

            {isPlanMode && planData.maxParticipants && (
              <div className="shrink-0 px-2.5 py-1 rounded-xl text-white text-xs font-bold flex items-center gap-1"
                style={{background: 'linear-gradient(135deg, #0042B2, #0066FF)'}}>
                <FiUsers size={12} />{planData.currentParticipants || 0}/{planData.maxParticipants}
              </div>
            )}
          </div>

          {task.description && (
            <p className="text-[13px] text-zinc-600 dark:text-zinc-400 leading-[1.5] line-clamp-2">
              {task.description}
            </p>
          )}

          {isPlanMode && (
            <div className="flex items-center gap-3 text-[11px] text-zinc-500">
              {planData.eventDate && (
                <span className="flex items-center gap-1"><FiCalendar size={12} />
                  {new Date(planData.eventDate.seconds * 1000).toLocaleDateString("vi-VN")}
                </span>
              )}
              {task.location && (
                <span className="flex items-center gap-1 truncate"><FiMapPin size={12} />
                  {task.location.address || task.location.city}
                </span>
              )}
            </div>
          )}

          {task.images?.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
              {task.images.slice(0, 3).map((img, i) => (
                <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <img src={img} alt="" loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-4">
      <div className="flex items-center justify-center py-6">
        <DotLottieReact src="/lotties/huha-loading-pull-full.lottie" autoplay loop style={{width:60,height:60}} />
      </div>
    </div>
  );
}

export default memo(TaskCard, (prev, next) =>
  prev.task.id === next.task.id &&
  prev.mode === next.mode &&
  prev.task.likeCount === next.task.likeCount &&
  prev.task.commentCount === next.task.commentCount
);