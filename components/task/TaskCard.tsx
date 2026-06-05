"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  FiBookmark,
  FiCheckCircle,
  FiClock,
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
import { TbCurrencyDong } from "react-icons/tb";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { type FeedTask } from "@/types/task";
import { cn } from "@/lib/utils";
import { useProvinces } from "@/lib/provinces"; // Hook đã cache ở layout

type Props = {
  task: FeedTask;
  theme: "task" | "plan";
  onDelete?: (id: string) => void;
  onShare?: (task: FeedTask) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<FeedTask>) => void;
  className?: string;
};

const Portal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted? createPortal(children, document.body) : null;
};

const vibrate = (ms: number | number[] = 8) => {
  if (typeof navigator!== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
};

// Map city -> province name, O(1)
const useProvinceMap = () => {
  const provinces = useProvinces();
  return useMemo(() => {
    const map = new Map<string, string>();
    provinces.forEach((p) => {
      const short = p.name.replace("Thành phố ", "").replace("Tỉnh ", "");
      map.set(short, p.name);
      map.set(p.name, p.name);
      map.set(p.code, p.name);
    });
    return map;
  }, [provinces]);
};

function TaskCard({ task, theme, onDelete, onShare, onTaskUpdate, className }: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { user } = useAuth();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const provinceMap = useProvinceMap();

  const [isSaved, setIsSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const isTaskTheme = theme === "task";
  const accent = isTaskTheme? "#0A84FF" : "#30D158";

  useEffect(() => {
    if (!task?.id) return;
    setIsSaved(!!user?.uid &&!!task.savedBy?.includes(user.uid));
    setLiked(!!user?.uid &&!!task.likes?.includes(user.uid));
  }, [user?.uid, task?.savedBy, task?.likes, task?.id]);

  useEffect(() => {
    if (!showMenu) return;
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && setShowMenu(false);
    const handleClick = (e: MouseEvent) => {
      if (menuBtnRef.current &&!menuBtnRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setShowMenu(false), 150);
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", () => setShowMenu(false), true);
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", () => setShowMenu(false), true);
      window.removeEventListener("resize", handleResize);
    };
  }, [showMenu]);

  const derived = useMemo(() => {
    const maxSlots = task.type === "task"? task.totalSlots?? 0 : task.maxParticipants?? task.totalSlots?? 0;
    const currentCount = task.type === "task"? task.joined?? 0 : task.currentParticipants?? 0;
    const created = task.createdAt? new Date(task.createdAt) : new Date();
    const dueRaw = task.type === "task"? task.deadline : task.eventDate;
    const due = dueRaw
? format(new Date(dueRaw), "EEE dd/MM", { locale: vi })
      : "Linh hoạt";
    const price =
      task.type === "task"
 ? task.price && task.price > 0
   ? `${task.price.toLocaleString("vi-VN")} VNĐ${task.budgetType === "hourly"? "/h" : ""}`
          : "Thỏa thuận"
        : task.costType === "free"
 ? "Miễn phí"
        : task.costType === "share"
 ? "Chia đều"
        : task.costAmount
 ? `${task.costAmount.toLocaleString("vi-VN")} VNĐ`
        : "Linh hoạt";

    const cityKey = task.location?.city || "";
    const provinceName = provinceMap.get(cityKey) || cityKey || "Chưa rõ";

    return {
      maxSlots,
      currentCount,
      due,
      price,
      timeAgo: formatDistanceToNow(created, { addSuffix: true, locale: vi }),
      provinceName,
      isFull: maxSlots > 0 && currentCount >= maxSlots,
    };
  }, [task, provinceMap]);

  if (!task?.id ||!task?.title ||!task?.type ||!task?.status) return null;

  const isOwner = user?.uid === task.userId;
  const avatarUrl = task.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.userName || "AIR")}&background=0A84FF&color=fff&bold=true&size=96`;

  const goToTask = useCallback(() => {
    vibrate();
    router.push(`/task/${task.id}`);
  }, [router, task.id]);

  const handleLike = useCallback(async () => {
    if (!user) return router.push("/login");
    if (liking) return;
    vibrate(10);
    setLiking(true);
    const newLiked =!liked;
    const oldLikes = task.likes || [];
    const oldCount = task.likeCount || 0;

    setLiked(newLiked);
    onTaskUpdate?.(task.id, {
      likes: newLiked? [...oldLikes, user.uid] : oldLikes.filter((id) => id!== user.uid),
      likeCount: oldCount + (newLiked? 1 : -1),
    });

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/tasks/${task.id}/like`, {
        method: newLiked? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("like failed");
    } catch {
      setLiked(!newLiked);
      onTaskUpdate?.(task.id, { likes: oldLikes, likeCount: oldCount });
      toast.error("Không thể cập nhật lượt thích");
    } finally {
      setLiking(false);
    }
  }, [user, liked, liking, task, router, onTaskUpdate]);

  const handleSave = useCallback(async () => {
    if (!user) return router.push("/login");
    if (saving) return;
    vibrate(10);
    setSaving(true);
    const newSaved =!isSaved;
    const oldSavedBy = task.savedBy || [];

    setIsSaved(newSaved);
    onTaskUpdate?.(task.id, { savedBy: newSaved? [...oldSavedBy, user.uid] : oldSavedBy.filter((id) => id!== user.uid) });

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/tasks/${task.id}/save`, {
        method: newSaved? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("save failed");
      toast.success(newSaved? "Đã lưu" : "Đã bỏ lưu");
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
    if (!confirm("Xóa mục này? Hành động không thể hoàn tác.")) return;
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

  const openMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 188;
    const menuHeight = 120;
    const x = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    const y = rect.bottom + 8 + menuHeight > window.innerHeight? rect.top - menuHeight - 8 : rect.bottom + 8;
    setMenuPos({ x, y });
    setShowMenu((v) =>!v);
  }, []);

  const ringClass = isTaskTheme
? "focus-visible:ring-[#0A84FF]"
    : "focus-visible:ring-[#30D158]";

  return (
    <motion.article
      initial={reduceMotion? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      {...(reduceMotion? {} : { whileHover: { y: -2 } })}
      transition={{ duration: 0.22 }}
      className={cn("group w-full max-w-sm mx-auto", className)}
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-lg ring-1 ring-black/[0.03] transition-all duration-300 active:scale-[0.992] dark:border-white/10 dark:bg-zinc-950 dark:shadow-black/30"
        style={{ boxShadow: `inset 0 2px 0 0 ${accent}, 0 8px 24px rgba(15,23,42,0.06)` }}
      >
        <div className="relative p-3 pb-2">
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={goToTask}
                className={cn("relative shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2", ringClass)}
              >
                <img src={avatarUrl} alt={task.userName || "Avatar"} loading="lazy" decoding="async" className="h-10 w-10 rounded-xl object-cover ring-2 ring-white shadow-md dark:ring-zinc-950" />
                {task.userVerified && <FiCheckCircle className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full bg-white text-[#0A84FF] dark:bg-zinc-950" />}
              </button>
              <div className="min-w-0">
                <button type="button" onClick={goToTask} className="block text-left">
                  <p className="truncate text-sm font-bold text-zinc-950 hover:underline dark:text-white">{task.userName || "AIR user"}</p>
                </button>
                <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  <span className="truncate">{derived.timeAgo}</span>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  ref={menuBtnRef}
                  type="button"
                  aria-label="Mở menu"
                  aria-expanded={showMenu}
                  aria-haspopup="menu"
                  aria-controls={showMenu? menuId : undefined}
                  onClick={openMenu}
                  className={cn("flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition active:scale-95 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 dark:text-zinc-400 dark:hover:bg-zinc-900", ringClass)}
                >
                  <FiMoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <button type="button" onClick={goToTask} className={cn("block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 rounded-lg", ringClass)}>
            <h3 className="text-base font-bold leading-snug tracking-tight text-zinc-950 dark:text-white line-clamp-2">{task.title}</h3>
          </button>

          <div className="mt-3 grid grid-cols-3 gap-1">
            <div className="rounded-lg bg-zinc-50 p-1 ring-1 ring-black/[0.03] dark:bg-zinc-900/50 dark:ring-white/5">
              <div className="flex items-center gap-1 text- font-semibold text-zinc-400">
                <TbCurrencyDong className="h-2 w-2" /> Giá trị
              </div>
              <p className="mt-0 truncate text-[11px] font-bold text-zinc-950 dark:text-white">{derived.price}</p>
            </div>
            <div className="rounded-lg bg-zinc-50 p-1 ring-1 ring-black/[0.03] dark:bg-zinc-900/50 dark:ring-white/5">
              <div className="flex items-center gap-1 text- font-semibold text-zinc-400">
                <FiClock className="h-2 w-2" /> Hạn chót
              </div>
              <p className="mt-0 text-[11px] font-bold text-zinc-950 dark:text-white">{derived.due}</p>
            </div>
            <div className={cn("rounded-lg bg-zinc-50 p-1 ring-1 ring-black/[0.03] dark:bg-zinc-900/50 dark:ring-white/5", derived.isFull && "ring-red-500/20 bg-red-50 dark:bg-red-950/20")}>
              <div className="flex items-center gap-1 text- font-semibold text-zinc-400">
                <FiUsers className="h-2 w-2" /> Số người
              </div>
              <p className={cn("mt-0 text-[11px] font-bold text-zinc-950 dark:text-white", derived.isFull && "text-red-600 dark:text-red-400")}>
                {derived.maxSlots? `${derived.currentCount}/${derived.maxSlots}` : "Mở"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center min-w-0">
            <button
              type="button"
              aria-label={liked? "Bỏ thích" : "Thích"}
              aria-pressed={liked}
              onClick={(e) => { e.stopPropagation(); handleLike(); }}
              disabled={liking}
              className={cn("flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-zinc-700 transition active:scale-95 hover:bg-zinc-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 dark:text-zinc-300 dark:hover:bg-zinc-900", ringClass)}
            >
              {liked? <HiHeart className="h-4 w-4 text-red-500" /> : <HiOutlineHeart className="h-4 w-4" />}
              {task.likeCount || 0}
            </button>
            <button type="button" aria-label="Bình luận" onClick={goToTask} className={cn("flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-bold text-zinc-700 transition active:scale-95 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 dark:text-zinc-300 dark:hover:bg-zinc-900", ringClass)}>
              <FiMessageCircle className="h-4 w-4" />
              {task.commentCount || 0}
            </button>
            <button type="button" aria-label="Chia sẻ" onClick={(e) => { e.stopPropagation(); vibrate(8); onShare?.(task); }} className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition active:scale-95 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 dark:text-zinc-300 dark:hover:bg-zinc-900", ringClass)}>
              <FiShare2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={isSaved? "Bỏ lưu" : "Lưu"}
              aria-pressed={isSaved}
              onClick={(e) => { e.stopPropagation(); handleSave(); }}
              disabled={saving}
              className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition active:scale-95 disabled:opacity-50 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 dark:text-zinc-400 dark:hover:bg-zinc-900", ringClass)}
            >
              <FiBookmark className={cn("h-4 w-4", isSaved && "fill-current")} style={{ color: isSaved? accent : undefined }} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {derived.provinceName && (
              <div title={derived.provinceName} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 max-w-">
                <FiMapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{derived.provinceName}</span>
              </div>
            )}
            <div className="flex items-center gap-1 pr-1 text- font-semibold text-zinc-400">
              <FiEye className="h-3 w-3" /> {task.viewCount || 0}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showMenu && isOwner && (
          <Portal>
            <div className="fixed inset-0 z-50" onClick={() => setShowMenu(false)} />
            <motion.div
              id={menuId}
              role="menu"
              initial={reduceMotion? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
              animate={reduceMotion? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
              transition={{ duration: 0.15 }}
              className="fixed z-50 w-[188px] overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 py-2 shadow-2xl shadow-black/15 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95"
              style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
            >
              <button role="menuitem" type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); router.push(`/task/${task.id}/edit`); }} className="flex min-h-11 w-full items-center gap-3 px-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus-visible:bg-zinc-900">
                <FiEdit2 /> Sửa mục này
              </button>
              <button role="menuitem" type="button" onClick={(e) => { e.stopPropagation(); setShowMenu(false); handleDelete(); }} className="flex min-h-11 w-full items-center gap-3 px-4 text-sm font-bold text-red-500 transition hover:bg-red-50 focus-visible:outline-none focus-visible:bg-red-50 dark:hover:bg-red-500/10 dark:focus-visible:bg-red-500/10">
                <FiTrash2 /> Xóa
              </button>
            </motion.div>
          </Portal>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export const TaskCardSkeleton = memo(() => (
  <div className="w-full max-w-sm mx-auto animate-pulse">
    <div className="rounded-2xl border-zinc-200/70 bg-white p-3 dark:border-white/10 dark:bg-zinc-950">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="h-10 w-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-2 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800 mb-3" />
      <div className="grid grid-cols-3 gap-1">
        <div className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-900/50" />
        <div className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-900/50" />
        <div className="h-12 rounded-lg bg-zinc-100 dark:bg-zinc-900/50" />
      </div>
    </div>
  </div>
));
TaskCardSkeleton.displayName = "TaskCardSkeleton";

export default memo(TaskCard);