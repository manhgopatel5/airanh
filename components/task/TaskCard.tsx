"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  FiBookmark,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiEdit2,
  FiEye,
  FiMapPin,
  FiMessageCircle,
  FiMoreHorizontal,
  FiShare2,
  FiTrash2,
  FiUsers,
} from "react-icons/fi";
import { HiHeart, HiOutlineHeart } from "react-icons/hi2";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { type FeedTask } from "@/types/task";

type Props = {
  task: FeedTask;
  theme: "task" | "plan";
  onDelete?: (id: string) => void;
  onShare?: (task: FeedTask) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<FeedTask>) => void;
};

const Portal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
};

const vibrate = (ms: number | number[] = 8) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
};

function TaskCard({ task, theme, onDelete, onShare, onTaskUpdate }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const isTaskTheme = theme === "task";
  const accent = isTaskTheme ? "#0A84FF" : "#30D158";
  const accentGradient = isTaskTheme ? "from-[#0A84FF] to-[#0051D5]" : "from-[#30D158] to-[#248A3D]";

  useEffect(() => {
    if (!task?.id) return;
    setIsSaved(!!user?.uid && !!task.savedBy?.includes(user.uid));
    setLiked(!!user?.uid && !!task.likes?.includes(user.uid));
  }, [user?.uid, task?.savedBy, task?.likes, task?.id]);

  useEffect(() => {
    const closeMenu = () => setShowMenu(false);
    if (showMenu) {
      window.addEventListener("scroll", closeMenu, true);
      window.addEventListener("resize", closeMenu);
    }
    return () => {
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
    };
  }, [showMenu]);

  const derived = useMemo(() => {
    const maxSlots = task.type === "task" ? task.totalSlots ?? 0 : task.maxParticipants ?? task.totalSlots ?? 0;
    const currentCount = task.type === "task" ? task.joined ?? 0 : task.currentParticipants ?? 0;
    const progress = maxSlots > 0 ? Math.min(100, Math.round((currentCount / maxSlots) * 100)) : 0;
    const created = task.createdAt ? new Date(task.createdAt) : new Date();
    const dueRaw = task.type === "task" ? task.deadline : task.eventDate;
    const due = dueRaw ? new Date(dueRaw).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "Linh hoạt";
    const price = task.type === "task"
      ? task.price && task.price > 0 ? `${task.price.toLocaleString("vi-VN")}đ${task.budgetType === "hourly" ? "/h" : ""}` : "Thỏa thuận"
      : task.costType === "free" ? "Miễn phí" : task.costType === "share" ? "Chia đều" : task.costAmount ? `${task.costAmount.toLocaleString("vi-VN")}đ` : "Linh hoạt";
    return {
      maxSlots,
      currentCount,
      progress,
      due,
      price,
      timeAgo: formatDistanceToNow(created, { addSuffix: true, locale: vi }),
    };
  }, [task]);

  if (!task?.id || !task?.title || !task?.type || !task?.status) return null;

  const isOwner = user?.uid === task.userId;
  const avatarUrl = task.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.userName || "AIR")}&background=0A84FF&color=fff&bold=true&size=96`;

  const goToTask = useCallback(() => {
    vibrate();
    router.push(`/task/${task.id}`);
  }, [router, task.id]);

  const handleLike = useCallback(async () => {
    if (!user) return router.push("/login");
    vibrate(10);
    const newLiked = !liked;
    const oldLikes = task.likes || [];
    setLiked(newLiked);
    onTaskUpdate?.(task.id, {
      likes: newLiked ? [...oldLikes, user.uid] : oldLikes.filter((id) => id !== user.uid),
      likeCount: (task.likeCount || 0) + (newLiked ? 1 : -1),
    });
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/tasks/${task.id}/like`, {
        method: newLiked ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("like failed");
    } catch {
      setLiked(!newLiked);
      onTaskUpdate?.(task.id, { likes: oldLikes, likeCount: task.likeCount });
      toast.error("Không thể cập nhật lượt thích");
    }
  }, [user, liked, task, router, onTaskUpdate]);

  const handleSave = useCallback(async () => {
    if (!user) return router.push("/login");
    if (saving) return;
    vibrate(10);
    setSaving(true);
    const newSaved = !isSaved;
    const oldSavedBy = task.savedBy || [];
    setIsSaved(newSaved);
    onTaskUpdate?.(task.id, { savedBy: newSaved ? [...oldSavedBy, user.uid] : oldSavedBy.filter((id) => id !== user.uid) });
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/tasks/${task.id}/save`, {
        method: newSaved ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("save failed");
      toast.success(newSaved ? "Đã lưu" : "Đã bỏ lưu");
    } catch {
      setIsSaved(!newSaved);
      onTaskUpdate?.(task.id, { savedBy: oldSavedBy });
      toast.error("Không thể lưu mục này");
    } finally {
      setSaving(false);
    }
  }, [user, isSaved, saving, task, router, onTaskUpdate]);

  const handleDelete = useCallback(async () => {
    if (!isOwner) return;
    if (!confirm("Xóa mục này?")) return;
    vibrate(10);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("delete failed");
      onDelete?.(task.id);
      toast.success("Đã xóa");
    } catch {
      toast.error("Xóa thất bại");
    }
  }, [isOwner, task.id, onDelete, user]);

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      {...(reduceMotion ? {} : { whileHover: { y: -2 } })}
      transition={{ duration: 0.22 }}
      className="group"
    >
<div className="relative overflow-hidden rounded-[2rem] border border-zinc-200/70 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)] ring-1 ring-black/[0.03] transition-all duration-300 active:scale-[0.992] dark:border-white/10 dark:bg-zinc-950 dark:shadow-black/30" style={{ boxShadow: `inset 0 3px 0 0 ${accent}, 0 18px 50px rgba(15,23,42,0.07)` }}>
        <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full opacity-10 blur-3xl" style={{ background: accent }} />

        <div className="relative p-4 pb-3">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <img src={avatarUrl} alt={task.userName || "Avatar"} loading="lazy" decoding="async" className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white shadow-lg shadow-black/10 dark:ring-zinc-950" />
                {task.userVerified && <FiCheckCircle className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white text-[#0A84FF] dark:bg-zinc-950" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-zinc-950 dark:text-white">{task.userName || "AIR user"}</p>
                <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  <span>{derived.timeAgo}</span>
                  {task.location?.city && (
                    <>
                      <span>•</span>
                      <FiMapPin className="h-3 w-3" />
                      <span className="truncate">{task.location.city}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button type="button" aria-label={isSaved ? "Bỏ lưu" : "Lưu"} onClick={(e) => { e.stopPropagation(); handleSave(); }} disabled={saving} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-500 transition active:scale-95 disabled:opacity-50 dark:bg-zinc-900 dark:text-zinc-400">
                <FiBookmark className={isSaved ? "fill-current" : ""} style={{ color: isSaved ? accent : undefined }} />
              </button>
              {isOwner && (
                <button
                  ref={menuBtnRef}
                  type="button"
                  aria-label="Mở menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const menuWidth = 188;
                    setMenuPos({ x: Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8), y: rect.bottom + 8 });
                    setShowMenu((value) => !value);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-50 text-zinc-500 transition active:scale-95 dark:bg-zinc-900 dark:text-zinc-400"
                >
                  <FiMoreHorizontal />
                </button>
              )}
            </div>
          </div>

          <button type="button" onClick={goToTask} className="block w-full text-left">


            <h3 className="text-[1.08rem] font-black leading-snug tracking-tight text-zinc-950 dark:text-white">{task.title}</h3>
            {task.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{task.description}</p>}
          </button>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-black/[0.03] dark:bg-zinc-900 dark:ring-white/5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400"><FiDollarSign /> Giá trị</div>
              <p className="mt-1 truncate text-sm font-black text-zinc-950 dark:text-white">{derived.price}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-black/[0.03] dark:bg-zinc-900 dark:ring-white/5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400"><FiClock /> Thời gian</div>
              <p className="mt-1 text-sm font-black text-zinc-950 dark:text-white">{derived.due}</p>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-3 ring-1 ring-black/[0.03] dark:bg-zinc-900 dark:ring-white/5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400"><FiUsers /> Slot</div>
              <p className="mt-1 text-sm font-black text-zinc-950 dark:text-white">{derived.maxSlots ? `${derived.currentCount}/${derived.maxSlots}` : "Mở"}</p>
            </div>
          </div>

         
        </div>

<div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1">
            <button type="button" aria-label={liked ? "Bỏ thích" : "Thích"} onClick={(e) => { e.stopPropagation(); handleLike(); }} className="flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-black text-zinc-700 transition active:scale-95 dark:text-zinc-300">
              {liked ? <HiHeart className="h-5 w-5 text-red-500" /> : <HiOutlineHeart className="h-5 w-5" />}
              {task.likeCount || 0}
            </button>
            <button type="button" aria-label="Bình luận" onClick={goToTask} className="flex h-11 items-center gap-2 rounded-2xl px-3 text-sm font-black text-zinc-700 transition active:scale-95 dark:text-zinc-300">
              <FiMessageCircle className="h-5 w-5" />
              {task.commentCount || 0}
            </button>
            <button type="button" aria-label="Chia sẻ" onClick={(e) => { e.stopPropagation(); vibrate(8); onShare?.(task); }} className="flex h-11 items-center justify-center rounded-2xl px-3 text-zinc-600 transition active:scale-95 dark:text-zinc-300">
              <FiShare2 className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 pr-2 text-xs font-bold text-zinc-400">
            <FiEye /> {task.viewCount || 0}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showMenu && (
          <Portal>
            <div className="fixed inset-0 z-50" onClick={() => setShowMenu(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 w-[188px] overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 py-2 shadow-2xl shadow-black/15 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95"
              style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
            >
              <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); router.push(`/task/${task.id}/edit`); }} className="flex min-h-11 w-full items-center gap-3 px-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900">
                <FiEdit2 /> Sửa mục này
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); handleDelete(); }} className="flex min-h-11 w-full items-center gap-3 px-4 text-sm font-bold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-500/10">
                <FiTrash2 /> Xóa
              </button>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default memo(TaskCard);
