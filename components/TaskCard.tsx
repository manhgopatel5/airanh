"use client";
import { useRouter } from "next/navigation";
import { FiHeart, FiShare2, FiMessageCircle, FiUsers, FiClock, FiMapPin, FiCalendar, FiStar, FiCheckCircle } from "react-icons/fi";
import { useEffect, useState, useCallback, memo, useMemo } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getFirebaseDB, getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { incrementTaskView } from "@/lib/task";
import { TaskListItem, PlanListItem } from "@/types/task";
import { AppMode } from "@/types/app";
import { toast, Toaster } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";

type Props = { task: TaskListItem | PlanListItem; mode: AppMode; onDelete?: (id: string) => void };

const planCategoryEmoji: Record<string, string> = { food: "🍜", nightlife: "🎉", outdoor: "🥾", sightseeing: "🗺️", entertainment: "🎬", shopping: "🛍️", wellness: "🧘", social: "💬", other: "✨" };

function TaskCard({ task, mode }: Props) {
  const router = useRouter();
  const db = useMemo(() => getFirebaseDB(), []);
  const auth = useMemo(() => getFirebaseAuth(), []);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [liking, setLiking] = useState(false);
  const [localLikes, setLocalLikes] = useState<string[]>(task.likes || []);
  const [showLikeBurst, setShowLikeBurst] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => { const unsub = onAuthStateChanged(auth, setCurrentUser); return () => unsub(); }, [auth]);

  if (!task) return <Skeleton />;

  const isPlanMode = mode === "plan";
  const liked = currentUser && localLikes.includes(currentUser.uid);
  const likeCount = localLikes.length;

  const statusConfig = {
    open: { text: "Đang tuyển", color: "#30d158", bg: "bg-[#30d158]/10", textCls: "text-[#30d158]", icon: null },
    full: { text: "Đã đủ", color: "#ff9f0a", bg: "bg-[#ff9f0a]/10", textCls: "text-[#ff9f0a]", icon: null },
    in_progress: { text: "Đang làm", color: "#0a84ff", bg: "bg-[#0a84ff]/10", textCls: "text-[#0a84ff]", icon: null },
    completed: { text: "Hoàn thành", color: "#0a84ff", bg: "bg-[#0a84ff]/10", textCls: "text-[#0a84ff]", icon: FiCheckCircle },
    cancelled: { text: "Đã hủy", color: "#8e8e93", bg: "bg-zinc-100 dark:bg-zinc-800", textCls: "text-zinc-500", icon: null },
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
    const newLikes = liked? localLikes.filter((id) => id!== currentUser.uid) : [...localLikes, currentUser.uid];
    setLocalLikes(newLikes);
    if (!liked) {
      setShowLikeBurst(true);
      navigator.vibrate?.(10);
      setTimeout(() => setShowLikeBurst(false), 900);
    } else {
      navigator.vibrate?.(5);
    }
    try {
      await updateDoc(doc(db, "tasks", task.id), { likes: liked? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid), likeCount: newLikes.length });
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
    navigator.vibrate?.(5);
    if (navigator.share) {
      try { await navigator.share({ title: task.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép link");
    }
  }, [task.slug, task.title, mode]);

  const handleClick = useCallback(() => {
    incrementTaskView(task.id);
    navigator.vibrate?.(3);
    router.push(`/${mode}/${task.slug}`);
  }, [router, task.id, task.slug, mode]);

  const goToProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.userId) router.push(`/user/${task.userId}`);
  }, [router, task.userId]);

  const timeAgo = useCallback((seconds?: number) => {
    if (!seconds) return "";
    const diff = Date.now() / 1000 - seconds;
    if (diff < 60) return "vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)}p`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}n`;
    return new Date(seconds * 1000).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  }, []);

  const formatPrice = useCallback((price: number, currency = "VND") => new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(price), []);

  const progressPercent = useMemo(() => {
    if (taskData.totalSlots) return Math.round(((taskData.joined || 0) / taskData.totalSlots) * 100);
    if (planData.maxParticipants) return Math.round(((planData.currentParticipants || 0) / planData.maxParticipants) * 100);
    return 0;
  }, [taskData, planData]);

  return (
    <>
      <Toaster richColors position="top-center" />
      <motion.article whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} onClick={handleClick} onHoverStart={() => { setIsHovered(true); router.prefetch(`/${mode}/${task.slug}`); }} onHoverEnd={() => setIsHovered(false)} className="group relative bg-white dark:bg-zinc-900 rounded- overflow-hidden border border-zinc-100/80 dark:border-zinc-800/80 shadow-sm hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 transition-all duration-300 cursor-pointer">
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0a84ff] via-[#5e5ce6] to-[#0a84ff] opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3.5">
            <button onClick={goToProfile} className="relative flex-shrink-0 group/avatar">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#0a84ff]/0 via-[#0a84ff]/20 to-[#0a84ff]/0 rounded-full opacity-0 group-hover/avatar:opacity-100 blur-md transition-opacity" />
              <img src={task.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.userName || "U")}&background=0a84ff&color=fff&bold=true`} alt="avatar" className="relative w-10 h-10 rounded-full object-cover ring-2 ring-zinc-100 dark:ring-zinc-800 group-hover/avatar:ring-[#0a84ff]/30 transition-all" />
              {task.userVerified && <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#0a84ff] rounded-full grid place-items-center ring-2 ring-white dark:ring-zinc-900"><FiCheckCircle size={10} className="text-white" /></div>}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text- text-zinc-900 dark:text-white truncate hover:text-[#0a84ff] transition-colors">{task.userName || "User"}</span>
                <span className={`inline-flex items-center gap-1 px-2 h-5 rounded-full text- font-bold ${status.bg} ${status.textCls}`}>
                  {status.icon && <status.icon size={11} />}
                  {isPlanMode && planCategoryEmoji[planData.category || "other"]} {isPlanMode? "PLAN" : status.text}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-1">
                <span className="flex items-center gap-1 text- text-zinc-500"><FiClock size={11} />{timeAgo(task.createdAt?.seconds)}</span>
                {task.location?.city && <span className="flex items-center gap-1 text- text-zinc-500 truncate"><FiMapPin size={11} />{task.location.city}</span>}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex items-center gap-1 -mr-1">
              <motion.button whileTap={{ scale: 0.85 }} onClick={handleLike} disabled={liking} className="relative w-8 h-8 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-200 dark:active:bg-zinc-700 transition-colors">
                <AnimatePresence>
                  {showLikeBurst && <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.8, opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }} className="absolute inset-0 pointer-events-none"><LottiePlayer animationData={celebrate} autoplay loop={false} className="w-8 h-8 -ml-0 -mt-0" /></motion.div>}
                </AnimatePresence>
                <FiHeart size={16} className={`transition-all ${liked? "fill-red-500 text-red-500 scale-110" : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"}`} strokeWidth={liked? 0 : 2} />
              </motion.button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-bold text- leading-snug text-zinc-900 dark:text-white line-clamp-2 flex-1 group-hover:text-[#0a84ff] transition-colors">{task.title}</h3>
              {task.type === "task" && taskData.price!== undefined && (
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-extrabold tracking-tight" style={{ color: "#00C853", fontVariantNumeric: "tabular-nums" }}>{formatPrice(taskData.price, taskData.currency)}</div>
                </div>
              )}
            </div>

            {task.description && <p className="text- text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">{task.description}</p>}

            {/* Progress bar */}
            {(taskData.totalSlots || planData.maxParticipants) && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-">
                  <span className="flex items-center gap-1 text-zinc-500 font-medium"><FiUsers size={12} />{taskData.joined || planData.currentParticipants || 0}/{taskData.totalSlots || planData.maxParticipants} người</span>
                  <span className="text-zinc-400 font-medium">{progressPercent}%</span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="h-full rounded-full" style={{ background: `linear-gradient(90deg, #0a84ff, #5e5ce6)` }} />
                </div>
              </div>
            )}

            {/* Plan meta */}
            {isPlanMode && planData.eventDate && (
              <div className="flex items-center gap-3 text-">
                <span className="inline-flex items-center gap-1 px-2.5 h-6 rounded-lg bg-[#0a84ff]/10 text-[#0a84ff] font-medium"><FiCalendar size={12} />{new Date(planData.eventDate.seconds * 1000).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )}

            {/* Images */}
            {task.images?.length > 0 && (
              <div className={`grid gap-1.5 mt-1 ${task.images.length === 1? "grid-cols-1" : task.images.length === 2? "grid-cols-2" : "grid-cols-3"}`}>
                {task.images.slice(0, 3).map((img, i) => (
                  <div key={i} className={`relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 ${task.images.length === 1? "aspect-[16/9] rounded-2xl" : "aspect-[4/3] rounded-xl"} group/img`}>
                    <img src={img} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    {i === 2 && task.images.length > 3 && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm grid place-items-center text-white font-bold text-lg">+{task.images.length - 3}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-4">
              <button onClick={handleLike} className="flex items-center gap-1.5 group/like">
                <div className={`w-7 h-7 grid place-items-center rounded-full transition-colors ${liked? "bg-red-50 dark:bg-red-950/30" : "group-hover/like:bg-zinc-100 dark:group-hover/like:bg-zinc-800"}`}>
                  <FiHeart size={14} className={liked? "fill-red-500 text-red-500" : "text-zinc-400 group-hover/like:text-zinc-600 dark:group-hover/like:text-zinc-300"} />
                </div>
                <span className={`text-xs font-medium tabular-nums ${liked? "text-red-500" : "text-zinc-500"}`}>{likeCount}</span>
              </button>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <div className="w-7 h-7 grid place-items-center rounded-full group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 transition-colors">
                  <FiMessageCircle size={14} />
                </div>
                <span className="text-xs font-medium tabular-nums">{task.commentCount || 0}</span>
              </div>
            <div className="flex items-center gap-1">
              <button onClick={handleShare} className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 active:scale-90 transition-all">
                <FiShare2 size={14} />
              </button>
              {task.rating && (
                <div className="flex items-center gap-0.5 px-2 h-6 rounded-full bg-amber-50 dark:bg-amber-950/30">
                  <FiStar size={12} className="fill-amber-500 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{task.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover glow */}
        <div className="absolute inset-0 rounded- opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ boxShadow: "inset 0 1px rgba(10,132,255,0.1)" }} />
      </motion.article>
    </>
  );
}

function Skeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded- border border-zinc-100 dark:border-zinc-800 p-4 animate-pulse">
      <div className="flex gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-1/3" />
          <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
        </div>
      <div className="space-y-2">
        <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-lg w-3/4" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
      </div>
    </div>
  );
}

export default memo(TaskCard, (prev, next) => prev.task.id === next.task.id && prev.mode === next.mode && prev.task.likeCount === next.task.likeCount && prev.task.commentCount === next.task.commentCount && prev.task.status === next.task.status);