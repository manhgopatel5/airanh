"use client";

import { useRouter } from "next/navigation";
import {
  FiUsers, FiClock, FiMapPin, FiBookmark, FiMoreHorizontal,
  FiTrash2, FiEdit2, FiCheck, FiShare2, FiEye
} from "react-icons/fi";

import { useState, useCallback, useRef } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { type TaskStatus, type TaskListItem, type PlanListItem } from "@/types/task";
import { toast } from "sonner";
import { motion, useMotionValue, useTransform, AnimatePresence, type PanInfo } from "framer-motion";

type Props = {
  task: TaskListItem | PlanListItem;
  theme: "task" | "plan";
  onDelete?: (id: string) => void;
  onShare?: (task: TaskListItem | PlanListItem) => void;
};

export default function TaskCard({ task, theme, onDelete, onShare }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();

  const [isSaved, setIsSaved] = useState(task.savedBy?.includes(user?.uid || "") || false);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const x = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const swipeThreshold = -80;
  const background = useTransform(
    x,
    [-100, 0],
    ["linear-gradient(90deg, #0A84FF 0%, #0066CC 100%)", "transparent"]
  );
  const opacity = useTransform(x, [-100, -50, 0], [1, 0.5, 0]);

  if (!task) return null;

  const isOwner = user?.uid === task.userId;
  const applicants = task.applicants || [];
  const isApplied = user && applicants.includes(user.uid);

  const themeColor = {
    task: {
      primary: "#0A84FF",
      gradient: "from-[#0A84FF] to-[#0066CC]",
      light: "bg-[#E8F0FE]",
      text: "text-[#0A84FF]",
      fill: "fill-[#0A84FF]",
      shadow: "shadow-[0_4px_20px_rgba(10,132,255,0.25)]"
    },
    plan: {
      primary: "#30D158",
      gradient: "from-[#30D158] to-[#28B44C]",
      light: "bg-[#E8F5E9]",
      text: "text-[#30D158]",
      fill: "fill-[#30D158]",
      shadow: "shadow-[0_4px_20px_rgba(48,209,88,0.25)]"
    }
  }[theme];

  const vibrate = (ms = 8) => {
    if ("vibrate" in navigator) navigator.vibrate(ms);
  };

  const handleSave = useCallback(async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) return router.push("/login");
    if (saving) return;

    vibrate(10);
    setSaving(true);
    const newSaved =!isSaved;
    setIsSaved(newSaved);

    try {
      await updateDoc(doc(db, "tasks", task.id), {
        savedBy: newSaved? arrayUnion(user.uid) : arrayRemove(user.uid),
      });
      toast.success(newSaved? "Đã lưu" : "Đã bỏ lưu", { icon: "📌" });
    } catch (err) {
      setIsSaved(!newSaved);
      toast.error("Lỗi");
    } finally {
      setSaving(false);
    }
  }, [user, isSaved, saving, task.id, router, db]);

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOwner) return;
    if (!confirm("Xóa task này?")) return;
    vibrate(10);
    await deleteDoc(doc(db, "tasks", task.id));
    onDelete?.(task.id);
    toast.success("Đã xóa");
  }, [isOwner, task.id, onDelete, db]);

  const goToTask = () => {
    vibrate();
    router.push(`/task/${task.id}`);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    vibrate(15);
    setShowMenu(true);
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x < swipeThreshold) {
      handleSave();
      vibrate(15);
    }
    x.set(0);
  };

  const taskDate = task.type === "task" && task.deadline?.seconds
  ? new Date(task.deadline.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : "";

  const statusMap: Record<TaskStatus, { label: string; color: string; dot: string }> = {
    open: { label: "Đang tuyển", color: "bg-[#E6F4EA] text-[#1E8E3E] dark:bg-[#1E8E3E]/20 dark:text-[#81C995]", dot: "bg-[#1E8E3E]" },
    full: { label: "Đã đủ", color: "bg-[#FEE8E8] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F28B82]", dot: "bg-[#D93025]" },
    doing: { label: "Đang làm", color: "bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]", dot: "bg-[#1A73E8]" },
    completed: { label: "Hoàn thành", color: "bg-[#F1F3F4] text-[#5F6368] dark:bg-zinc-800 dark:text-zinc-400", dot: "bg-[#5F6368]" },
    cancelled: { label: "Đã hủy", color: "bg-[#F1F3F4] text-[#5F6368] dark:bg-zinc-800 dark:text-zinc-400", dot: "bg-[#5F6368]" },
    deleted: { label: "Đã xóa", color: "bg-[#F1F3F4] text-[#5F6368] dark:bg-zinc-800 dark:text-zinc-400", dot: "bg-[#5F6368]" },
    expired: { label: "Hết hạn", color: "bg-[#FEF7E0] text-[#F9AB00] dark:bg-[#F9AB00]/20 dark:text-[#FDD663]", dot: "bg-[#F9AB00]" },
    pending: { label: "Chờ duyệt", color: "bg-[#FEF7E0] text-[#F9AB00] dark:bg-[#F9AB00]/20 dark:text-[#FDD663]", dot: "bg-[#F9AB00]" },
  };

  const status = statusMap[task.status] || statusMap.open;

  return (
    <div className="relative">
      <motion.div
        style={{ background, opacity }}
        className="absolute inset-0 rounded-2xl flex items-center justify-end pr-6"
      >
        <motion.div style={{ opacity }}>
          <FiBookmark size={24} className="text-white" />
        </motion.div>
      </motion.div>

      <motion.div
        ref={cardRef}
        drag="x"
        dragListener={false}
        dragConstraints={{ left: -120, right: 0 }}
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
        onContextMenu={handleContextMenu}
        onClick={goToTask}
        className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 p-4 cursor-pointer relative z-10 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${status.color}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
                {status.label}
              </div>
              {task.type === "task" && task.price > 0 && (
                <div className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#0A84FF]/10 to-[#0066CC]/10 dark:from-[#0A84FF]/20 dark:to-[#0066CC]/20 text-[#0A84FF] dark:text-[#8AB4F8] text-xs font-bold">
                  {task.price.toLocaleString("vi-VN")}đ
                </div>
              )}
              {task.viewCount && task.viewCount > 10 && (
                <div className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <FiEye size={12} />
                  <span>{task.viewCount}</span>
                </div>
              )}
            </div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-2 leading-snug">
              {task.title}
            </h3>
          </div>

          <div
            className="flex items-center gap-1 shrink-0 relative z-20"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSave();
              }}
              disabled={saving}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all disabled:opacity-50"
            >
              <FiBookmark
                size={18}
                className={isSaved? `${themeColor.fill} ${themeColor.text}` : "text-zinc-400 dark:text-zinc-500"}
              />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.8 }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                vibrate(8);
                onShare?.(task);
              }}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all"
            >
              <FiShare2 size={18} className="text-zinc-400 dark:text-zinc-500" />
            </motion.button>

            {isOwner && (
              <div className="relative">
                <motion.button
                  whileTap={{ scale: 0.8 }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    vibrate();
                    setShowMenu(!showMenu);
                  }}
                  className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <FiMoreHorizontal size={18} className="text-zinc-400 dark:text-zinc-500" />
                </motion.button>
                <AnimatePresence>
                  {showMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                        }}
                      />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-10 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-2xl border border-zinc-200/50 dark:border-zinc-700/50 py-1 z-20 min-w-[160px]"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            vibrate();
                            router.push(`/task/${task.id}/edit`);
                          }}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 w-full transition-colors"
                        >
                          <FiEdit2 size={16} /> Sửa
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-colors"
                        >
                          <FiTrash2 size={16} /> Xóa
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
          {taskDate && (
            <div className="flex items-center gap-1">
              <FiClock size={13} />
              <span className="font-medium">{taskDate}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <FiUsers size={13} />
            <span className="font-medium">{applicants.length}/{task.type === "task"? task.totalSlots : 1}</span>
          </div>
          {task.location?.city && (
            <div className="flex items-center gap-1 truncate">
              <FiMapPin size={13} />
              <span className="truncate font-medium">{task.location.city}</span>
            </div>
          )}
        </div>

        <AnimatePresence>
          {isApplied && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-zinc-200/50 dark:border-zinc-800/50"
            >
              <div className={`flex items-center gap-1.5 text-xs ${themeColor.text} font-semibold`}>
                <FiCheck size={14} className="shrink-0" />
                <span>Đã ứng tuyển</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}