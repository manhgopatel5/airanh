"use client";

import { useRouter } from "next/navigation";
import { FiUsers, FiClock, FiMapPin, FiBookmark, FiMoreHorizontal, FiTrash2, FiEdit2, FiShare2, FiEye } from "react-icons/fi";
import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { type TaskStatus, type Task, isTask } from "@/types/task";
import { AppMode } from "@/types/app";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";

type Props = {
  task: Task;
  mode: AppMode;
  theme: "task" | "plan";
  onDelete?: (id: string) => void;
  onShare?: (task: Task) => void;
  onTaskUpdate?: (taskId: string, updates: Partial<Task>) => void;
};

const Portal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted? createPortal(children, document.body) : null;
};

export default function TaskCard({ task, theme, onDelete, onShare, onTaskUpdate }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const db = getFirebaseDB();

  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!task?.id) return;
    setIsSaved(!!user?.uid &&!!task.savedBy?.includes(user.uid));
  }, [user?.uid, task?.savedBy, task?.id]);

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
  const applicants = task.applicants?? [];

  const themeColor = {
    task: { primary: "#0042B2", light: "bg-[#E8F1FF]", text: "text-[#0042B2]", fill: "fill-[#0042B2]" },
    plan: { primary: "#00C853", light: "bg-[#E8F5E9]", text: "text-[#00C853]", fill: "fill-[#00C853]" }
  }[theme];

  const vibrate = (ms = 8) => { if ("vibrate" in navigator) navigator.vibrate(ms); };

  const handleSave = useCallback(async () => {
    if (!user) return router.push("/login");
    if (saving) return;
    vibrate(10);
    setSaving(true);
    const newSaved =!isSaved;
    const oldSavedBy = task.savedBy || [];
    setIsSaved(newSaved);
    onTaskUpdate?.(task.id, { savedBy: newSaved? [...oldSavedBy, user.uid] : oldSavedBy.filter(id => id!== user.uid) });
    try {
      await updateDoc(doc(db, "tasks", task.id), { savedBy: newSaved? arrayUnion(user.uid) : arrayRemove(user.uid) });
      toast.success(newSaved? "Đã lưu vào HUHA" : "Đã bỏ lưu");
    } catch {
      setIsSaved(!newSaved);
      onTaskUpdate?.(task.id, { savedBy: oldSavedBy });
      toast.error("Lỗi");
    } finally {
      setSaving(false);
    }
  }, [user, isSaved, saving, task, router, db, onTaskUpdate]);

  const handleDelete = useCallback(async () => {
    if (!isOwner) return;
    if (!confirm("Xóa task này?")) return;
    vibrate(10);
    try {
      await deleteDoc(doc(db, "tasks", task.id));
      onDelete?.(task.id);
      toast.success("Đã xóa");
    } catch {
      toast.error("Xóa thất bại");
    }
  }, [isOwner, task.id, onDelete, db]);

  const goToTask = () => { vibrate(); router.push(`/task/${task.id}`); };

  const taskDate = task.type === "task" && task.deadline?.seconds? new Date(task.deadline.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : "";

  const statusMap: Record<TaskStatus, { label: string; color: string; dot: string }> = {
    open: { label: "Đang tuyển", color: "bg-[#E8F1FF] text-[#0042B2] dark:bg-[#0042B2]/20 dark:text-[#8AB4F8]", dot: "bg-[#0042B2]" },
    full: { label: "Đã đủ", color: "bg-[#FEE8E8] text-[#D93025] dark:bg-[#D93025]/20", dot: "bg-[#D93025]" },
    doing: { label: "Đang làm", color: "bg-[#E8F1FF] text-[#0042B2] dark:bg-[#0042B2]/20", dot: "bg-[#0042B2]" },
    completed: { label: "Hoàn thành", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800", dot: "bg-zinc-500" },
    cancelled: { label: "Đã hủy", color: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-500" },
    deleted: { label: "Đã xóa", color: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-500" },
    expired: { label: "Hết hạn", color: "bg-[#FEF7E0] text-[#F9AB00]", dot: "bg-[#F9AB00]" },
    pending: { label: "Chờ duyệt", color: "bg-[#FEF7E0] text-[#F9AB00]", dot: "bg-[#F9AB00]" },
  };

  const isExpired = isTask(task) && task.deadline && task.deadline.seconds * 1000 < Date.now();
  const status = isExpired? { label: "Đã hết hạn", color: "bg-[#FFE5E5] text-[#FF3B30]", dot: "bg-[#FF3B30]" } : statusMap[task.status] || statusMap.open;
  const maxSlots = task.type === "task"? task.totalSlots?? 0 : task.maxParticipants?? 0;

  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} whileHover={{y:-2}} className="bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200/60 dark:border-zinc-900 p-4 shadow-sm hover:shadow-lg transition-all">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={goToTask}>
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${status.color}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${status.dot} animate-pulse`} />
              {status.label}
            </div>
            {task.type === "task" && (task.price?? 0) > 0 && (
              <div className="px-2.5 py-1 rounded-xl text-xs font-bold" style={{background:'rgba(0,66,178,0.1)',color:'#0042B2'}}>
                {task.price.toLocaleString("vi-VN")}đ
              </div>
            )}
            {(task.viewCount?? 0) > 10 && (
              <div className="flex items-center gap-1 text-xs text-zinc-500"><FiEye size={12} /><span>{task.viewCount}</span></div>
            )}
          </div>
          <h3 className="font-bold text-[15px] text-zinc-900 dark:text-white line-clamp-2 leading-snug">{task.title}</h3>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <motion.button whileTap={{scale:0.9}} onClick={(e)=>{e.preventDefault();e.stopPropagation();handleSave();}} disabled={saving} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 active:scale-90 transition-all disabled:opacity-50">
            {saving? <LottiePlayer animationData={celebrate} autoplay loop className="w-[18px] h-[18px]" /> : <FiBookmark size={18} className={isSaved? `${themeColor.fill} ${themeColor.text}` : "text-zinc-400"} />}
          </motion.button>

          <motion.button whileTap={{scale:0.9}} onClick={(e)=>{e.preventDefault();e.stopPropagation();vibrate(8);onShare?.(task);}} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
            <FiShare2 size={18} className="text-zinc-400" />
          </motion.button>

          {isOwner && (
            <div className="relative">
              <motion.button ref={menuBtnRef} whileTap={{scale:0.9}} onClick={(e)=>{e.preventDefault();e.stopPropagation();const rect=e.currentTarget.getBoundingClientRect();setMenuPos({x:rect.right-180,y:rect.bottom+8});vibrate();setShowMenu(!showMenu);}} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900">
                <FiMoreHorizontal size={18} className="text-zinc-400" />
              </motion.button>
              <AnimatePresence>
                {showMenu && (
                  <Portal>
                    <div className="fixed inset-0 z-[9998]" onClick={()=>setShowMenu(false)} />
                    <motion.div initial={{opacity:0,scale:0.95,y:-10}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:-10}} className="fixed z-[9999] min-w-[180px] bg-white dark:bg-zinc-950 rounded-2xl shadow-2xl ring-1 ring-black/5 py-2 overflow-hidden" style={{top:`${menuPos.y}px`,left:`${menuPos.x}px`}}>
                      <button onClick={(e)=>{e.stopPropagation();vibrate();setShowMenu(false);router.push(`/task/${task.id}/edit`);}} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-[#E8F1FF] dark:hover:bg-[#0042B2]/20 hover:text-[#0042B2] w-full">
                        <FiEdit2 size={18} />Sửa
                      </button>
                      <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2" />
                      <button onClick={(e)=>{e.stopPropagation();setShowMenu(false);handleDelete();}} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 w-full">
                        <FiTrash2 size={18} />Xóa
                      </button>
                    </motion.div>
                  </Portal>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      <div className="cursor-pointer" onClick={goToTask}>
        <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
          {taskDate && <div className="flex items-center gap-1"><FiClock size={13} /><span className="font-medium">{taskDate}</span></div>}
          <div className="flex items-center gap-1"><FiUsers size={13} /><span className="font-medium">{applicants.length}/{maxSlots}</span></div>
          {task.location?.city && <div className="flex items-center gap-1 truncate"><FiMapPin size={13} /><span className="truncate font-medium">{task.location.city}</span></div>}
        </div>
      </div>
    </motion.div>
  );
}