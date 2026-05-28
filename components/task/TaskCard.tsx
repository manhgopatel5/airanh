"use client";

import { useRouter } from "next/navigation";
import {
  FiUsers, FiClock, FiMapPin, FiBookmark, FiMoreHorizontal,
  FiTrash2, FiEdit2, FiShare2, FiEye, FiMessageCircle, FiGift, FiDollarSign, FiTag
} from "react-icons/fi";
import { HiHeart, HiOutlineHeart } from "react-icons/hi2";
import { memo, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/lib/AuthContext";
import { type FeedTask } from "@/types/task";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

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
  return mounted? createPortal(children, document.body) : null;
};

const vibrate = (ms = 8) => {
  if ("vibrate" in navigator) navigator.vibrate(ms);
};

function TaskCard({ task, theme, onDelete, onShare, onTaskUpdate }: Props) {
  const router = useRouter();
  const { user } = useAuth();

  const [isSaved, setIsSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const isTaskTheme = theme === "task";
  const primaryColor = isTaskTheme? "#0A84FF" : "#30D158";

  useEffect(() => {
    if (!task?.id) return;
    setIsSaved(!!user?.uid &&!!task.savedBy?.includes(user.uid));
    setLiked(!!user?.uid &&!!task.likes?.includes(user.uid));
  }, [user?.uid, task?.savedBy, task?.likes, task?.id]);

  useEffect(() => {
    const closeMenu = () => setShowMenu(false);
    if (showMenu) {
      window.addEventListener("scroll", closeMenu);
      window.addEventListener("resize", closeMenu);
    }
    return () => {
      window.removeEventListener("scroll", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, [showMenu]);

  if (!task?.id ||!task?.title ||!task?.type ||!task?.status) return null;

  const isOwner = user?.uid === task.userId;

  const handleLike = useCallback(async () => {
    if (!user) return router.push("/login");
    vibrate(10);
    const newLiked =!liked;
    const oldLikes = task.likes || [];

    setLiked(newLiked);
    onTaskUpdate?.(task.id, {
      likes: newLiked? [...oldLikes, user.uid] : oldLikes.filter(id => id!== user.uid),
      likeCount: (task.likeCount || 0) + (newLiked? 1 : -1)
    });

    try {
      const token = await user.getIdToken();
      await fetch(`/api/tasks/${task.id}/like`, {
        method: newLiked? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch {
      setLiked(!newLiked);
      onTaskUpdate?.(task.id, { likes: oldLikes, likeCount: task.likeCount });
      toast.error("Lỗi");
    }
  }, [user, liked, task, router, onTaskUpdate]);

  const handleSave = useCallback(async () => {
    if (!user) return router.push("/login");
    if (saving) return;

    vibrate(10);
    setSaving(true);
    const newSaved =!isSaved;
    const oldSavedBy = task.savedBy || [];

    setIsSaved(newSaved);
    onTaskUpdate?.(task.id, {
      savedBy: newSaved? [...oldSavedBy, user.uid] : oldSavedBy.filter(id => id!== user.uid)
    });

    try {
      const token = await user.getIdToken();
      await fetch(`/api/tasks/${task.id}/save`, {
        method: newSaved? 'POST' : 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(newSaved? "Đã lưu" : "Đã bỏ lưu");
    } catch {
      setIsSaved(!newSaved);
      onTaskUpdate?.(task.id, { savedBy: oldSavedBy });
      toast.error("Lỗi");
    } finally {
      setSaving(false);
    }
  }, [user, isSaved, saving, task, router, onTaskUpdate]);

  const handleDelete = useCallback(async () => {
    if (!isOwner) return;
    if (!confirm("Xóa task này?")) return;
    vibrate(10);
    try {
      const token = await user?.getIdToken();
      await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      onDelete?.(task.id);
      toast.success("Đã xóa");
    } catch {
      toast.error("Xóa thất bại");
    }
  }, [isOwner, task.id, onDelete, user]);

  const goToTask = useCallback(() => {
    vibrate();
    router.push(`/task/${task.id}`);
  }, [router, task.id]);

  const taskDate = task.type === "task" && task.deadline
   ? new Date(task.deadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : task.type === "plan" && task.eventDate
   ? new Date(task.eventDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : "";

  const createdDate = task.createdAt? new Date(task.createdAt) : new Date();
  const timeAgo = formatDistanceToNow(createdDate, { addSuffix: true, locale: vi });

  const maxSlots = task.type === "task"? task.totalSlots?? 0 : task.maxParticipants?? 0;
  const currentCount = task.type === "task"? task.joined?? 0 : task.currentParticipants?? 0;

  // FIX: Dùng avatar từ task nhưng fallback blur + lazy
  const avatarUrl = task.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.userName)}&background=0A84FF&color=fff&bold=true&size=88`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="group"
    >
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 overflow-hidden active:scale-[0.985] transition-all duration-200 shadow-xl shadow-black/5 dark:shadow-black/20 ring-1 ring-black/5 dark:ring-white/5 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/30 mb-4">

        {/* HEADER */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="relative">
            <img
              src={avatarUrl}
              alt={task.userName}
              loading="lazy"
              decoding="async"
              className="w-11 h-11 rounded-2xl object-cover ring-2 ring-white dark:ring-zinc-900 shadow-md bg-zinc-200 dark:bg-zinc-800"
            />
            {task.userVerified && (
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#0A84FF] rounded-full border-2 border-white dark:border-zinc-900 shadow-sm" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-bold text-zinc-900 dark:text-zinc-100">
                {task.userName}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              <span>{timeAgo}</span>
              {task.location?.city && (
                <>
                  <span>•</span>
                  <FiMapPin size={12} />
                  <span className="truncate max-w-[120px]">{task.location.city}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
              }}
              disabled={saving}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all disabled:opacity-50 touch-manipulation select-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <FiBookmark
                size={18}
                strokeWidth={1.5}
                className={isSaved? `fill-current` : "text-zinc-500 dark:text-zinc-400"}
                style={{ color: isSaved? primaryColor : undefined }}
              />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                vibrate(8);
                onShare?.(task);
              }}
              className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all touch-manipulation select-none"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <FiShare2 size={18} className="text-zinc-500 dark:text-zinc-400" />
            </motion.button>

            {isOwner && (
              <div className="relative">
                <motion.button
                  ref={menuBtnRef}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setMenuPos({
                      x: rect.right - 180,
                      y: rect.bottom + 8
                    });
                    vibrate();
                    setShowMenu(!showMenu);
                  }}
                  className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all touch-manipulation select-none"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <FiMoreHorizontal size={18} className="text-zinc-500 dark:text-zinc-400" />
                </motion.button>
                <AnimatePresence>
                  {showMenu && (
                    <Portal>
                      <div
                        className="fixed inset-0 z-50"
                        onClick={() => setShowMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="fixed z-50 min-w-[180px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/10 py-2 overflow-hidden"
                        style={{
                          top: `${menuPos.y}px`,
                          left: `${menuPos.x}px`,
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            vibrate();
                            setShowMenu(false);
                            router.push(`/task/${task.id}/edit`);
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 w-full transition-all active:scale-95"
                        >
                          <FiEdit2 size={18} />
                          Sửa công việc
                        </button>
                        <div className="h-px bg-zinc-200 dark:bg-zinc-800 mx-2" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(false);
                            handleDelete();
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#FF3B30] hover:bg-red-50 dark:hover:bg-red-950/50 w-full transition-all active:scale-95"
                        >
                          <FiTrash2 size={18} />
                          Xóa
                        </button>
                      </motion.div>
                    </Portal>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div className="px-4 pb-4 cursor-pointer" onClick={goToTask}>
          <div className="flex items-start justify-between gap-3 mb-2.5">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 leading-snug flex-1">
              {task.title}
            </h3>

            {task.type === "task" && task.price > 0 && (
              <div className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 ring-1 ring-blue-200/50 dark:ring-blue-800/50">
                <span className="font-bold text-sm text-[#0A84FF]">
                  {task.price.toLocaleString("vi-VN")}đ
                </span>
                {task.budgetType === "hourly" && <span className="text-[#0A84FF]/70 text-xs ml-0.5">/h</span>}
              </div>
            )}

            {task.type === "plan" && task.costType === "free" && (
              <div className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/40 dark:to-green-900/40 ring-1 ring-green-200/50 dark:ring-green-800/50">
                <span className="font-bold text-sm text-green-600 dark:text-green-400">Miễn phí</span>
              </div>
            )}

            {task.type === "plan" && task.costType === "share" && (
              <div className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/40 dark:to-zinc-700/40 ring-1 ring-zinc-200/50 dark:ring-zinc-700/50">
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Chia đều</span>
              </div>
            )}

            {task.type === "plan" && task.costType === "host" && task.costAmount && task.costAmount > 0 && (
              <div className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/40 dark:to-orange-900/40 ring-1 ring-orange-200/50 dark:ring-orange-800/50">
                <span className="font-bold text-sm text-[#FF9500]">
                  {task.costAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            )}

            {task.type === "plan" && task.costType === "ticket" && task.costAmount > 0 && (
              <div className="shrink-0 px-3 py-1.5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/40 dark:to-blue-900/40 ring-1 ring-blue-200/50 dark:ring-blue-800/50">
                <span className="font-bold text-sm text-[#0A84FF]">
                  {task.costAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            )}
          </div>

          {task.description && (
            <p className="text-zinc-600 dark:text-zinc-300 leading-[1.6] line-clamp-4 mb-3.5">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {maxSlots > 0 && (
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <FiUsers size={15} />
                <span className="font-semibold">{currentCount}/{maxSlots} người</span>
              </div>
            )}
            {taskDate && (
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <FiClock size={15} />
                <span className="font-semibold">{taskDate}</span>
              </div>
            )}

            {task.type === "plan" && task.costType === "free" && (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <FiGift size={15} />
                <span className="font-semibold">Miễn phí</span>
              </div>
            )}
            {task.type === "plan" && task.costType === "share" && (
              <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <FiUsers size={15} />
                <span className="font-semibold">Chia đều</span>
              </div>
            )}
            {task.type === "plan" && task.costType === "host" && (
              <div className="flex items-center gap-1.5 text-[#FF9500]">
                <FiDollarSign size={15} />
                <span className="font-semibold">Chủ bao</span>
              </div>
            )}
            {task.type === "plan" && task.costType === "ticket" && (
              <div className="flex items-center gap-1.5 text-[#0A84FF]">
                <FiTag size={15} />
                <span className="font-semibold">Có vé</span>
              </div>
            )}

            {task.category && (
              <span className="font-semibold text-zinc-500 dark:text-zinc-500">• {task.category}</span>
            )}
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200/60 dark:via-zinc-800/60 to-transparent" />

        {/* FOOTER */}
        <div className="flex items-center justify-between px-2 py-2.5">
          <div className="flex items-center gap-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              className="flex items-center gap-2 px-3.5 h-10 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all"
            >
              {liked? (
                <HiHeart size={22} className="text-red-500" />
              ) : (
                <HiOutlineHeart size={22} className="text-zinc-600 dark:text-zinc-400" />
              )}
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {task.likeCount || 0}
              </span>
            </button>

            <button
              onClick={goToTask}
              className="flex items-center gap-2 px-3.5 h-10 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all"
            >
              <FiMessageCircle size={20} className="text-zinc-600 dark:text-zinc-400" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                {task.commentCount || 0}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                vibrate(8);
                onShare?.(task);
              }}
              className="flex items-center gap-2 px-3.5 h-10 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 active:scale-90 transition-all"
            >
              <FiShare2 size={19} className="text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>

          <div className="flex items-center gap-3 pr-2">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <FiEye size={17} />
              <span className="text-xs font-semibold">{task.viewCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(TaskCard);