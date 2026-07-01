"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  
  FiMoreHorizontal,
  FiShare2,
  FiTrash2,
  FiUsers,
  FiWifi,
} from "react-icons/fi";
import { HiHeart, HiOutlineHeart } from "react-icons/hi2";
import { TbCurrencyDong } from "react-icons/tb";
import { toast } from "sonner";
import { getFirebaseAuth } from "@/lib/firebase";
import { type FeedTask, getFeedItemDueMillis } from "@/types/task";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { getTaskAuthorId, getTaskAuthorName, getTaskAuthorAvatar } from "@/lib/task/author";
import { useProvinces } from "@/lib/useProvinces";
import { getCategoryMeta } from "@/lib/taskCategories";
import { formatShortLocation } from "@/lib/mapboxGeocode";
import TaskAssigneeActions from "@/components/task/TaskAssigneeActions";


type Props = {
  task: FeedTask;
  theme: "task" | "plan";
  currentUserId?: string | undefined;
  provinceMap?: Map<string, string>;
  onDelete?: (id: string) => void;
  onShare?: (task: FeedTask) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<FeedTask>) => void;
  className?: string;
  showAssigneeActions?: boolean;
  onAssigneeAction?: () => void;
};

const Portal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted? createPortal(children, document.body) : null;
};

const vibrate = (ms: number | number[] = 8) => {
  if (typeof navigator!== "undefined" && "vibrate" in navigator) navigator.vibrate(ms);
};

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
function TaskCard({
  task,
  theme,
  currentUserId,
  provinceMap: provinceMapProp,
  onDelete,
  onShare,
  onTaskUpdate,
  className,
  showAssigneeActions = false,
  onAssigneeAction,
}: Props) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const fallbackProvinceMap = useProvinceMap();
  const provinceMap = provinceMapProp ?? fallbackProvinceMap;

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
    setIsSaved(!!currentUserId && !!task.savedBy?.includes(currentUserId));
    setLiked(!!currentUserId && !!task.likes?.includes(currentUserId));
  }, [currentUserId, task?.savedBy, task?.likes, task?.id]);

  useEffect(() => {
    if (!showMenu) return;
    const handleKey = (e: KeyboardEvent) => e.key === "Escape" && setShowMenu(false);
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuBtnRef.current?.contains(target) ||
        menuPanelRef.current?.contains(target)
      ) {
        return;
      }
      setShowMenu(false);
    };
    const handleScroll = () => setShowMenu(false);
    let resizeTimer: ReturnType<typeof setTimeout>;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setShowMenu(false), 150);
    };

    window.addEventListener("keydown", handleKey);
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [showMenu]);

  const derived = useMemo(() => {
  const maxSlots = task.type === "task"? task.totalSlots?? 0 : task.maxParticipants?? task.totalSlots?? 0;
  const currentCount = task.type === "task"? task.joined?? 0 : task.currentParticipants?? 0;
  const created = task.createdAt? new Date(task.createdAt) : new Date();
  const dueRaw = task.type === "task"? task.deadline : task.eventDate;
  const dueMs = getFeedItemDueMillis(task);
  const now = Date.now();
  const hoursLeft = dueMs != null ? (dueMs - now) / (1000 * 60 * 60) : null;
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
      : task.costType === "host"
    ? "Host trả"
      : task.costType === "ticket"
    ? "Vé"
      : task.costAmount
    ? `${task.costAmount.toLocaleString("vi-VN")} VNĐ`
      : "Linh hoạt";

  const cityKey = task.location?.city || "";
  const rawProvinceName = provinceMap.get(cityKey) || cityKey || "";
  const provinceName =
    formatShortLocation({
      ...(task.location?.ward ? { ward: task.location.ward } : {}),
      ...(rawProvinceName || task.location?.city
        ? { city: rawProvinceName || task.location?.city }
        : {}),
    }) ||
    rawProvinceName.replace(/^(Thành phố|Tỉnh|TP\.|T\.)\s*/i, "").trim();
  
  const categoryData = getCategoryMeta(task.category, task.type === "plan" ? "plan" : "task");
  const coverImage = task.images?.[0];
  const description = task.description?.trim() || "";

  return {
    maxSlots,
    currentCount,
    due,
    dueMs,
    hoursLeft,
    price,
    timeAgo: formatDistanceToNow(created, { addSuffix: true, locale: vi }),
    provinceName,
    categoryLabel: categoryData?.label || task.category,
    categoryIcon: categoryData?.icon || "📋",
    categoryColor: categoryData?.color || "#8E8E93",
    isFull: maxSlots > 0 && currentCount >= maxSlots,
    isUrgent: task.type === "task" && ((task as { urgency?: string }).urgency === "urgent" || (hoursLeft != null && hoursLeft > 0 && hoursLeft <= 24)),
    isNearDeadline: hoursLeft != null && hoursLeft > 0 && hoursLeft <= 72,
    isRemote: task.type === "task" && !!(task as { isRemote?: boolean }).isRemote,
    coverImage,
    description,
  };
}, [task, provinceMap]);

  const isOwner = currentUserId === task.userId;
  const isAssignee =
    !!currentUserId &&
    !!task.assignees?.includes(currentUserId) &&
    !isOwner &&
    task.status !== "completed";

  const authorId = getTaskAuthorId(task);
  const authorName = getTaskAuthorName(task);
  const authorAvatar = getTaskAuthorAvatar(task);

const goToTask = useCallback(async () => {
  vibrate();
  // update UI ngay
  onTaskUpdate?.(task.id, { viewCount: (task.viewCount || 0) + 1 });
  // gọi API (không cần đợi)
  try {
    const token = await getAuthToken();
    fetch(`/api/tasks/${task.id}/view`, {
      method: "POST",
      headers: token? { Authorization: `Bearer ${token}` } : {},
      keepalive: true,
    }).catch(()=>{});
  } catch {}
  router.push(`/task/${task.id}`);
}, [router, task.id, task.viewCount, onTaskUpdate, getAuthToken]);

  const goToProfile = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!authorId) {
        toast.error("Không có thông tin người đăng");
        return;
      }
      vibrate();
      router.push(`/profile/${authorId}`);
    },
    [router, authorId]
  );

  const getAuthToken = useCallback(async () => {
    const authUser = getFirebaseAuth().currentUser;
    if (!authUser) return null;
    return authUser.getIdToken();
  }, []);

  const handleLike = useCallback(async () => {
    if (!currentUserId) return router.push("/login");
    if (liking) return;
    vibrate(10);
    setLiking(true);
    const newLiked = !liked;
    const oldLikes = task.likes || [];
    const oldCount = task.likeCount || 0;

    setLiked(newLiked);
    onTaskUpdate?.(task.id, {
      likes: newLiked ? [...oldLikes, currentUserId] : oldLikes.filter((id) => id !== currentUserId),
      likeCount: oldCount + (newLiked ? 1 : -1),
    });

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("no auth");
      const res = await fetch(`/api/tasks/${task.id}/like`, {
        method: newLiked ? "POST" : "DELETE",
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
  }, [currentUserId, liked, liking, task, router, onTaskUpdate, getAuthToken]);

  const handleSave = useCallback(async () => {
    if (!currentUserId) return router.push("/login");
    if (saving) return;
    vibrate(10);
    setSaving(true);
    const newSaved = !isSaved;
    const oldSavedBy = task.savedBy || [];

    setIsSaved(newSaved);
    onTaskUpdate?.(task.id, {
      savedBy: newSaved ? [...oldSavedBy, currentUserId] : oldSavedBy.filter((id) => id !== currentUserId),
    });

    try {
      const token = await getAuthToken();
      if (!token) throw new Error("no auth");
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
  }, [currentUserId, isSaved, saving, task, router, onTaskUpdate, getAuthToken]);

  const handleDelete = useCallback(async () => {
    if (!isOwner) return;
    if (!confirm("Xóa mục này? Hành động không thể hoàn tác.")) return;
    vibrate(10);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("no auth");
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
  }, [isOwner, task.id, onDelete, getAuthToken]);

  const openMenu = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 188;
    const menuHeight = 180;
    const x = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8);
    const y = rect.bottom + 8 + menuHeight > window.innerHeight ? rect.top - menuHeight - 8 : rect.bottom + 8;
    setMenuPos({ x, y });
    setShowMenu((v) => !v);
  }, []);

  if (!task?.id || !task?.title || !task?.type || !task?.status) return null;

  const ringClass = isTaskTheme
  ? "focus-visible:ring-[#0A84FF]"
    : "focus-visible:ring-[#30D158]";

  return (
    <article className={cn("group w-full mb-3", className)}>
      <div className="relative">
        <div
          className="absolute -inset-px rounded-[18px] opacity-90"
          style={{ background: accent }}
        />

        <div className="relative overflow-hidden rounded-[18px] border border-zinc-200/90 bg-white shadow-[0_10px_32px_-10px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.06] transition-[transform,box-shadow] duration-200 active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/50 dark:ring-white/[0.08]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-black/[0.02] dark:from-white/[0.03]" />

          <div className="relative p-2.5 pb-2">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={goToProfile}
                  className={cn("relative shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2", ringClass)}
                >
                  <UserAvatar
                    src={authorAvatar}
                    name={authorName}
                    size={34}
                    className="rounded-lg ring-2 ring-white shadow-sm dark:ring-zinc-950"
                  />
                  {task.userVerified && <FiCheckCircle className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white dark:bg-zinc-950" style={{ color: accent }} />}
                </button>
                <div className="min-w-0">
                  <button type="button" onClick={goToProfile} className="block text-left">
                    <p className="truncate text-[13px] font-bold text-zinc-950 hover:underline dark:text-white">{authorName}</p>
                  </button>
                  <p className="truncate text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{derived.timeAgo}</p>
                </div>
              </div>

          <div className="flex items-center gap-1 shrink-0">
  {/* Không phải chủ: hiện Share + Save ở trên */}
  {!isOwner && (
    <>
      <button
        type="button"
        aria-label="Chia sẻ"
        onClick={(e) => { e.stopPropagation(); vibrate(8); onShare?.(task); }}
        className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 active:scale-95 dark:text-zinc-400 dark:hover:bg-zinc-900", ringClass)}
      >
        <FiShare2 className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label={isSaved? "Bỏ lưu" : "Lưu"}
        aria-pressed={isSaved}
        onClick={(e) => { e.stopPropagation(); handleSave(); }}
        disabled={saving}
        className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 active:scale-95 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-900", ringClass)}
      >
        <FiBookmark className={cn("h-4 w-4", isSaved && "fill-current")} style={{ color: isSaved? accent : undefined }} />
      </button>
    </>
  )}

  {/* Chủ bài: chỉ hiện nút... */}
  {isOwner && (
    <button
      ref={menuBtnRef}
      type="button"
      aria-label="Mở menu"
      aria-expanded={showMenu}
      aria-haspopup="menu"
      aria-controls={showMenu? menuId : undefined}
      onClick={openMenu}
      className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition active:scale-95 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 dark:text-zinc-400 dark:hover:bg-zinc-900", ringClass)}
    >
      <FiMoreHorizontal className="h-4 w-4" />
    </button>
  )}
</div>
            </div>

            <button type="button" onClick={goToTask} className={cn("block w-full cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 rounded-lg", ringClass)}>
              <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-zinc-950 dark:text-white">
                {task.title}
              </h3>
              {derived.description && (
                <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  {derived.description}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {derived.isNearDeadline && !derived.isUrgent && isTaskTheme && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    <FiClock className="h-2.5 w-2.5" /> Sắp hết hạn
                  </span>
                )}
                {derived.isRemote && (
                  <span className="inline-flex items-center gap-0.5 rounded-md bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                    <FiWifi className="h-2.5 w-2.5" /> Từ xa
                  </span>
                )}
              </div>
            </button>

            {derived.coverImage && (
              <button type="button" onClick={goToTask} className="relative mt-2 block w-full overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2" style={{ outlineColor: accent }}>
                <div className="relative h-28 w-full">
                  <Image
                    src={derived.coverImage}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 680px) 100vw, 680px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                </div>
              </button>
            )}

            <div className="mt-2 grid grid-cols-3 gap-1">
              <div className="rounded-lg bg-zinc-50/90 p-1.5 ring-1 ring-black/[0.03] dark:bg-zinc-900/50 dark:ring-white/5">
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-zinc-400">
                  <TbCurrencyDong className="h-2.5 w-2.5" /> Giá trị
                </div>
                <p className="mt-0.5 truncate text-xs font-bold leading-tight text-zinc-950 dark:text-white">{derived.price}</p>
              </div>
              <div className="rounded-lg bg-zinc-50/90 p-1.5 ring-1 ring-black/[0.03] dark:bg-zinc-900/50 dark:ring-white/5">
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-zinc-400">
                  <FiClock className="h-2.5 w-2.5" /> {isTaskTheme ? "Hạn chót" : "Thời gian"}
                </div>
                <p className="mt-0.5 truncate text-xs font-bold leading-tight text-zinc-950 dark:text-white">{derived.due}</p>
              </div>
              <div className={cn("rounded-lg bg-zinc-50/90 p-1.5 ring-1 ring-black/[0.03] dark:bg-zinc-900/50 dark:ring-white/5", derived.isFull && "bg-red-50 ring-red-500/20 dark:bg-red-950/20")}>
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-zinc-400">
                  <FiUsers className="h-2.5 w-2.5" /> Số người
                </div>
                <p className={cn("mt-0.5 text-xs font-bold leading-tight text-zinc-950 dark:text-white", derived.isFull && "text-red-600 dark:text-red-400")}>
                  {derived.maxSlots? `${derived.currentCount}/${derived.maxSlots}` : "Mở"}
                </p>
              </div>
            </div>
          </div>

          {showAssigneeActions && isAssignee && currentUserId && (
            <TaskAssigneeActions
              task={task}
              currentUserId={currentUserId}
              {...(onAssigneeAction ? { onUpdated: onAssigneeAction } : {})}
            />
          )}

  <div className="flex items-center justify-between gap-2 border-t border-zinc-100 px-2 py-1 dark:border-zinc-800/80">
  <div className="flex items-center gap-3">
    {/* TIM */}
    <button
      type="button"
      aria-label={liked? "Bỏ thích" : "Thích"}
      aria-pressed={liked}
      onClick={(e) => { e.stopPropagation(); handleLike(); }}
      disabled={liking}
      className={cn("flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 transition active:scale-95 hover:bg-zinc-100 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 dark:text-zinc-300 dark:hover:bg-zinc-900", ringClass)}
    >
      {liked? <HiHeart className="h-4 w-4 text-red-500" /> : <HiOutlineHeart className="h-4 w-4" />}
    </button>

    {/* MẮT - MỚI CHUYỂN QUA ĐÂY */}
<div
  onClick={(e) => e.stopPropagation()}
  className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 cursor-default select-none"
>
  <FiEye className="h-3.5 w-3.5" />
  <span>{task.viewCount?? 0}</span>
</div>
      <FiEye className="h-3.5 w-3.5" />
      <span>{task.viewCount || 0}</span>
    </div>
  </div>

  <div className="flex min-w-0 items-center justify-end gap-1">
    {derived.isFull && (
      <span className="inline-flex shrink-0 items-center rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
        Đầy
      </span>
    )}
    {!isTaskTheme && derived.isNearDeadline && (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400 shrink-0">
        <FiClock className="h-2.5 w-2.5" /> Sắp hết hạn
      </span>
    )}
    {derived.categoryLabel && (
      <div
        className="flex max-w-[72px] items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] font-bold text-white shadow-sm"
        style={{ background: `linear-gradient(135deg, ${derived.categoryColor}, ${derived.categoryColor}dd)` }}
        title={derived.categoryLabel}
      >
        <span className="text-[11px] leading-none">{derived.categoryIcon}</span>
        <span className="truncate">{derived.categoryLabel}</span>
      </div>
    )}
    {derived.provinceName && (
      <div title={derived.provinceName} className="flex max-w-[64px] items-center gap-0.5 text-[10px] font-bold text-zinc-500 dark:text-zinc-400">
        <FiMapPin className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate">{derived.provinceName}</span>
      </div>
    )}

  </div>
</div>
      </div> {/* đóng relative */}
    </div> {/* đóng overflow-wrapper */}

    <AnimatePresence>
      {showMenu && isOwner && (
        <Portal>
          <div className="fixed inset-0 z-50" onClick={() => setShowMenu(false)} />
          <motion.div
            id={menuId}
            ref={menuPanelRef}
            role="menu"
            initial={reduceMotion? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
            animate={reduceMotion? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="fixed z-50 w-[188px] overflow-hidden rounded-2xl border border-zinc-200 bg-white/95 py-2 shadow-2xl shadow-black/15 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95"
            style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
          >
            <button
              role="menuitem"
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); vibrate(8); onShare?.(task); }}
              className="flex min-h-11 w-full items-center gap-3 px-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus-visible:bg-zinc-900"
            >
              <FiShare2 /> Chia sẻ
            </button>

            <button
              role="menuitem"
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); handleSave(); }}
              className="flex min-h-11 w-full items-center gap-3 px-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus-visible:bg-zinc-900"
            >
              <FiBookmark className={cn(isSaved && "fill-current")} style={{ color: isSaved? accent : undefined }} />
              {isSaved? "Bỏ lưu" : "Lưu"}
            </button>

            <button
              role="menuitem"
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); router.push(`/task/${task.id}/edit`); }}
              className="flex min-h-11 w-full items-center gap-3 px-4 text-sm font-bold text-zinc-800 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-900 dark:focus-visible:bg-zinc-900"
            >
              <FiEdit2 /> Sửa mục này
            </button>

            <button
              role="menuitem"
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowMenu(false); handleDelete(); }}
              className="flex min-h-11 w-full items-center gap-3 px-4 text-sm font-bold text-red-500 transition hover:bg-red-50 focus-visible:outline-none focus-visible:bg-red-50 dark:hover:bg-red-500/10 dark:focus-visible:bg-red-500/10"
            >
              <FiTrash2 /> Xóa
            </button>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  </article>
);
}

export const TaskCardSkeleton = memo(() => (
  <div className="w-full animate-pulse">
    <div className="overflow-hidden rounded-[18px] border border-zinc-200/80 bg-white shadow-[0_6px_20px_-6px_rgba(0,0,0,0.12)] dark:border-zinc-800 dark:bg-zinc-950">
      <div className="p-2.5">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-2.5 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="mb-2 h-3.5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-3 gap-1">
          <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900/50" />
          <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900/50" />
          <div className="h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900/50" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-0.5 border-t border-zinc-100 px-1.5 py-1 dark:border-zinc-800">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 rounded-lg bg-zinc-100 dark:bg-zinc-900/50" />
        ))}
      </div>
    </div>
  </div>
));
TaskCardSkeleton.displayName = "TaskCardSkeleton";

export default memo(TaskCard);