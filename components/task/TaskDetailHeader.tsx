"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import {
  FiBookmark, FiMoreHorizontal, FiCheck, FiEdit2, FiTrash2,
  FiStar, FiCheckCircle, FiX, FiInfo
} from "react-icons/fi";
import { doc, deleteDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore"; 
import { getFirebaseDB } from "@/lib/firebase";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { Task } from "@/types/task";

type UserData = {
  uid: string;
  name: string;
  avatar: string;
  rating?: number;
  reviewCount?: number;
  verified?: boolean;
};

type Props = {
  task: Task;
  owner: UserData | null;
  currentUser: any;
  isOwner: boolean;
  onTaskDeleted: () => void;
};

const Portal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted? createPortal(children, document.body) : null;
};

export default function TaskDetailHeader({ task, owner, currentUser, isOwner, onTaskDeleted }: Props) {
  const router = useRouter();
  
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isSaved, setIsSaved] = useState(!!currentUser?.uid &&!!task.savedBy?.includes(currentUser.uid));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentUser) return router.push("/login");
    if (saving) return;
    setSaving(true);
    const db = getFirebaseDB();

    const newSaved =!isSaved;
    setIsSaved(newSaved);
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        savedBy: newSaved? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid),
      });
      toast.success(newSaved? "Đã lưu" : "Đã bỏ lưu");
    } catch {
      setIsSaved(!newSaved);
      toast.error("Lỗi");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    if (!confirm("Xóa công việc này?")) return;
    const db = getFirebaseDB();
    try {
      await deleteDoc(doc(db, "tasks", task.id));
      toast.success("Đã xóa");
      onTaskDeleted();
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-950">
<div className="pt-4 pb-3">
        <div className="flex gap-3">
          <Link href={`/profile/${task.userId}`} className="relative shrink-0 active:opacity-70 transition-opacity">
<UserAvatar src={owner?.avatar} name={owner?.name} size={56} />
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 grid grid-rows-3 gap-0.5">
                <Link href={`/profile/${task.userId}`} className="font-semibold text-[15px] text-[#1C1C1E] dark:text-zinc-100 truncate leading-5 active:opacity-70">
                  {owner?.name || "Minh Tran"}
                </Link>

                <div className="flex items-center gap-1">
                  <FiStar className="fill-[#FFB800] text-[#FFB800] shrink-0" size={14} />
                  <span className="font-semibold text-[13px] text-[#1C1C1E] dark:text-zinc-100">{owner?.rating || "4.9"}</span>
                  <span className="text-[13px] font-semibold text-[#8E8E93]">({owner?.reviewCount || 21})</span>
                  <span className="text-[13px] font-semibold text-[#8E8E93]">•</span>
                  <span className="text-[13px] font-semibold text-[#00A86B]">Mới tham gia</span>
                </div>

                <div className="flex items-center gap-1">
                  {owner?.verified? (
                    <>
                      <FiCheckCircle className="text-[#0A84FF] shrink-0" size={14} />
                      <span className="text-[13px] font-semibold text-[#0A84FF]">Đã xác thực</span>
                    </>
                  ) : (
                    <>
                      <FiX className="text-[#8E8E93] shrink-0" size={14} />
                      <span className="text-[13px] text-[#8E8E93] font-semibold">Chưa xác thực</span>
                      {!isOwner && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toast.warning("Cẩn thận với tài khoản chưa xác thực", {
                              description: (
                                <div className="space-y-1">
                                  <p>Hãy kiểm tra kỹ thông tin trước khi giao dịch.</p>
                                  <p>Không chuyển tiền trước.</p>
                                  <p>Ưu tiên gặp mặt trực tiếp hoặc gọi video xác minh.</p>
                                  <p>Báo cáo ngay nếu phát hiện dấu hiệu lừa đảo.</p>
                                </div>
                              ),
                              duration: 5000,
                            });
                            navigator.vibrate?.(8);
                          }}
                          className="ml-0.5 p-0.5 rounded-full active:bg-zinc-200 dark:active:bg-zinc-700"
                        >
                          <FiInfo className="text-[#8E8E93]" size={13} />
                        </motion.button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!isOwner? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSave}
                    disabled={saving}
                    className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[#F2F2F7] dark:active:bg-zinc-800 disabled:opacity-50"
                  >
                    <FiBookmark
                      size={20}
                      strokeWidth={2}
                      className={isSaved? "fill-[#0A84FF] text-[#0A84FF]" : "text-[#8E8E93]"}
                    />
                  </motion.button>
                ) : (
                  <div className="relative">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPos({ x: rect.right - 200, y: rect.bottom + 8 });
                        setShowMenu(!showMenu);
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[#F2F2F7] dark:active:bg-zinc-800"
                    >
                      <FiMoreHorizontal size={20} className="text-[#8E8E93]" strokeWidth={2.5} />
                    </motion.button>
                    <AnimatePresence>
                      {showMenu && (
                        <Portal>
                          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="fixed z-50 min-w-[200px] bg-white dark:bg-zinc-900 rounded shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/10 py-2 overflow-hidden"
                            style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
                          >
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSave(); setShowMenu(false); }}
                              className="flex items-center gap-3 px-4 py-3 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 w-full transition-all active:scale-95"
                            >
                              {isSaved? <FiCheck size={18} /> : <FiBookmark size={18} />}
                              {isSaved? "Đã lưu" : "Lưu công việc"}
                            </button>
                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2" />
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowMenu(false); router.push(`/task/${task.id}/edit`); }}
                              className="flex items-center gap-3 px-4 py-3 text-[13px] font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 w-full transition-all active:scale-95"
                            >
                              <FiEdit2 size={18} />
                              Sửa công việc
                            </button>
                            <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2" />
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowMenu(false); handleDelete(); }}
                              className="flex items-center gap-3 px-4 py-3 text-[13px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 w-full transition-all active:scale-95"
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
          </div>
        </div>
      </div>
    </div>
  );
}