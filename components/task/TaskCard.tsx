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
import { isTask, isPlan, type Task } from "@/types/task";
import { toast } from "sonner";

type Props = {
  task: Task;
  onDelete?: (id: string) => void;
};

export default function TaskCard({ task, onDelete }: Props) {
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

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return router.push("/login");
    if (saving) return;

    setSaving(true);
    const newSaved = !isSaved;
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

  const goToTask = () => router.push(`/task/${task.id}`);

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

const status = statusMap[task.status];

  const status = statusMap[task.status] || statusMap.open;

  return (
    <div
      onClick={goToTask}
      className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5E7] dark:border-zinc-800 p-4 active:scale-[0.98] transition-all cursor-pointer hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`px-2 py-0.5 rounded-md text- font-medium ${status.color}`}>
              {status.label}
            </span>
            {isTask(task) && task.price > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#1E8E3E] text- font-semibold">
                {task.price.toLocaleString("vi-VN")}đ
              </span>
            )}
          </div>
          <h3 className="font-semibold text- text-[#1C1C1E] dark:text-white line-clamp-2 leading-snug">
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
              className={isSaved? "fill-[#0a84ff] text-[#0a84ff]" : "text-[#8E8E93]"} 
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
                <div className="absolute right-0 top-8 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-[#E5E5E7] dark:border-zinc-700 py-1 z-10">
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-zinc-700 w-full whitespace-nowrap"
                  >
                    <FiTrash2 size={14} /> Xóa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 text- text-[#8E8E93] dark:text-zinc-400 flex-wrap">
        {taskDate && (
          <div className="flex items-center gap-1">
            <FiClock size={14} />
            <span>{taskDate}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <FiUsers size={14} />
          <span>{applicants.length}/{isTask(task)? task.totalSlots : 1}</span>
        </div>
        {task.location?.city && (
          <div className="flex items-center gap-1 truncate">
            <FiMapPin size={14} />
            <span className="truncate">{task.location.city}</span>
          </div>
        )}
      </div>

      {isApplied && (
        <div className="mt-2 pt-2 border-t border-[#E5E5E7] dark:border-zinc-800">
          <span className="text- text-[#0a84ff] font-medium">Đã ứng tuyển</span>
        </div>
      )}
    </div>
  );
}