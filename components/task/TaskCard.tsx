"use client";

import { useRouter } from "next/navigation";
import { 
  FiUsers, FiClock, FiMapPin, 
  FiBookmark, FiMoreHorizontal, FiTrash2 
} from "react-icons/fi";
import { useState, useCallback } from "react";
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { isTask, isPlan, type Task, type TaskStatus } from "@/types/task";
import { toast } from "sonner";

type Props = {
  task: Task;
  theme: "task" | "plan";
  onDelete?: (id: string) => void;
};

export default function TaskCard({ task, theme, onDelete }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();

  const [isSaved, setIsSaved] = useState(task.savedBy?.includes(user?.uid || "") || false);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  if (!task) return null;

  const isOwner = user?.uid === task.userId;
  const applicants = task.applicants || [];
  const isApplied = user && applicants.includes(user.uid);

  const themeColor = {
    task: {
      primary: "#1A73E8",
      bg: "bg-[#E8F0FE]",
      text: "text-[#1A73E8]",
      fill: "fill-[#1A73E8]"
    },
    plan: {
      primary: "#1E8E3E",
      bg: "bg-[#E6F4EA]",
      text: "text-[#1E8E3E]",
      fill: "fill-[#1E8E3E]"
    }
  }[theme];

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return router.push("/login");
    if (saving) return;

    setSaving(true);
    const newSaved =!isSaved;
    setIsSaved(newSaved);

    try {
      await updateDoc(doc(db, "tasks", task.id), {
        savedBy: newSaved? arrayUnion(user.uid) : arrayRemove(user.uid),
      });
      toast.success(newSaved? "Đã lưu" : "Đã bỏ lưu");
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
    await deleteDoc(doc(db, "tasks", task.id));
    onDelete?.(task.id);
    toast.success("Đã xóa");
  }, [isOwner, task.id, onDelete, db]);

 const goToTask = () => router.push(`/task/${task.slug || task.id}`);

  const taskDate = isTask(task) && task.deadline?.seconds 
? new Date(task.deadline.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : isPlan(task) && task.eventDate?.seconds
? new Date(task.eventDate.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    : "";

  const statusMap: Record<TaskStatus, { label: string; color: string }> = {
    open: { label: "Đang tuyển", color: "bg-[#E6F4EA] text-[#1E8E3E]" },
    full: { label: "Đã đủ", color: "bg-[#FEE8E8] text-[#D93025]" },
    doing: { label: "Đang làm", color: "bg-[#E8F0FE] text-[#1A73E8]" },
    completed: { label: "Hoàn thành", color: "bg-[#F1F3F4] text-[#5F6368]" },
    cancelled: { label: "Đã hủy", color: "bg-[#F1F3F4] text-[#5F6368]" },
    deleted: { label: "Đã xóa", color: "bg-[#F1F3F4] text-[#5F6368]" },
    expired: { label: "Hết hạn", color: "bg-[#FEF7E0] text-[#F9AB00]" },
    pending: { label: "Chờ duyệt", color: "bg-[#FEF7E0] text-[#F9AB00]" },
  };

  const status = statusMap[task.status] || statusMap.open;

  return (
    <div
      onClick={goToTask}
      className="bg-white dark:bg-zinc-900 rounded-xl border border-[#E5E5EA] dark:border-zinc-800 p-4 active:scale-[0.98] transition-all cursor-pointer"
      style={{ fontFamily: 'Georgia, serif' }}
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`px-2.5 py-1 rounded-md text-[12px] font-semibold ${status.color}`}>
              {status.label}
            </span>
            {isTask(task) && task.price > 0 && (
              <span className={`px-2.5 py-1 rounded-md bg-[#E8F0FE] dark:bg-[#1A73E8]/20 text-[#1A73E8] dark:text-[#8AB4F8] text-[12px] font-semibold`}>
                {task.price.toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>
          <h3 className="font-bold text-[17px] text-[#1C1C1E] dark:text-white line-clamp-2 leading-snug tracking-tight">
            {task.title}
          </h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all disabled:opacity-50"
          >
            <FiBookmark 
              size={18} 
              className={isSaved? `${themeColor.fill} ${themeColor.text}` : "text-[#8E8E93]"} 
            />
          </button>
          {isOwner && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
              >
                <FiMoreHorizontal size={18} className="text-[#8E8E93]" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-10">
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-[14px] text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-700 w-full whitespace-nowrap"
                  >
                    <FiTrash2 size={14} /> Xóa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text-[13px] text-[#8E8E93] dark:text-zinc-400 flex-wrap">
        {taskDate && (
          <div className="flex items-center gap-1">
            <FiClock size={13} />
            <span>{taskDate}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <FiUsers size={13} />
          <span>{applicants.length}/{isTask(task)? task.totalSlots : 1}</span>
        </div>
        {task.location?.city && (
          <div className="flex items-center gap-1 truncate">
            <FiMapPin size={13} />
            <span className="truncate">{task.location.city}</span>
          </div>
        )}
      </div>

      {isApplied && (
        <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <span className={`text-[13px] ${themeColor.text} font-medium`}>Đã ứng tuyển</span>
        </div>
      )}
    </div>
  );
}