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
import { getTaskAuthorName, getTaskAuthorAvatar } from "@/lib/task/author";
import { publishTask } from "@/lib/task";
import VipDisplayName from "@/components/vip/VipDisplayName";
import type { FeedTask } from "@/types/task";

type UserData = {
  uid: string;
  name: string;
  avatar: string;
  online?: boolean | undefined;
  rating?: number | undefined;
  reviewCount?: number | undefined;
  verified?: boolean;
  isNewUser?: boolean;
};

type Props = {
  task: FeedTask; // FIX: Task -> FeedTask
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

export default function TaskDetailHeader({
  task,
  owner,
  currentUser,
  isOwner,
  onTaskDeleted,
}: Props) {
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
      navigator.vibrate?.(5);
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
      navigator.vibrate?.([10, 20, 10]);
      onTaskDeleted();
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  const handlePublish = async () => {
    if (!currentUser?.uid || !task.hidden) return;
    try {
      await publishTask(task.id, currentUser.uid);
      toast.success("Đã hiện công khai trên feed");
      setShowMenu(false);
    } catch {
      toast.error("Không thể hiện công khai");
    }
  };

  const ownerName = owner?.name || getTaskAuthorName(task);
  const ownerAvatar = owner?.avatar || getTaskAuthorAvatar(task);
  const profileUid = task.userId;
  const authorVip = {
    tier: (task as FeedTask & { authorVipTier?: string | null }).authorVipTier ?? null,
    expiresAt: (task as FeedTask & { authorVipExpiresAt?: unknown }).authorVipExpiresAt ?? null,
  };

  return (
    <div className="bg-white dark:bg-zinc-950">
      <div className="pt-4 pb-3">
        <div className="flex gap-3">
          {profileUid ? (
            <Link href={`/profile/${profileUid}`} className="relative shrink-0 active:opacity-70 transition-opacity">
              <UserAvatar src={ownerAvatar} name={ownerName} size={48} />
            </Link>
          ) : (
            <UserAvatar src={ownerAvatar} name={ownerName} size={48} />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {profileUid ? (
                  <Link
                    href={`/profile/${profileUid}`}
                    className="text-base leading-5 active:opacity-70"
                  >
                    <VipDisplayName name={ownerName} vip={authorVip} />
                  </Link>
                ) : (
                  <VipDisplayName name={ownerName} vip={authorVip} className="text-base leading-5" />
                )}

                <div className="flex items-center gap-1 mt-0.5">
                  <FiStar className="fill-[#FFB800] text-[#FFB800] shrink-0" size={14} />
                  <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                    {owner?.rating?.toFixed(1) || "5.0"}
                  </span>
                  <span className="text-sm text-zinc-500">
                    ({owner?.reviewCount || 0})
                  </span>
                  {owner?.isNewUser && (
                    <>
                      <span className="text-sm text-zinc-500">·</span>
                      <span className="text-sm text-[#34C759] font-medium">Mới tham gia</span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1 mt-0.5">
                  {owner?.verified? (
                    <>
                      <FiCheckCircle className="text-[#0A84FF] shrink-0" size={14} />
                      <span className="text-sm font-semibold text-[#0A84FF]">Đã xác thực</span>
                    </>
                  ) : (
                    <>
                      <FiX className="text-zinc-500 shrink-0" size={14} />
                      <span className="text-sm text-zinc-500 font-semibold">Chưa xác thực</span>
                      {!isOwner && (
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toast.warning("Cẩn thận với tài khoản chưa xác thực", {
                              description: (
                                <div className="space-y-1 text-sm">
                                  <p>• Kiểm tra kỹ thông tin trước khi giao dịch</p>
                                  <p>• Không chuyển tiền trước</p>
                                  <p>• Ưu tiên gặp mặt trực tiếp hoặc gọi video</p>
                                  <p>• Báo cáo nếu phát hiện lừa đảo</p>
                                </div>
                              ),
                              duration: 5000,
                            });
                            navigator.vibrate?.(8);
                          }}
                          className="ml-0.5 p-0.5 rounded-full active:bg-zinc-100 dark:active:bg-zinc-800"
                        >
                          <FiInfo className="text-zinc-500" size={13} />
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
                    className="w-9 h-9 rounded-full flex items-center justify-center active:bg-zinc-100 dark:active:bg-zinc-800 disabled:opacity-50 transition-colors"
                  >
                    <FiBookmark
                      size={20}
                      strokeWidth={1.5}
                      className={isSaved? "fill-zinc-900 text-zinc-900 dark:fill-zinc-100 dark:text-zinc-100" : "text-zinc-500"}
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
                        navigator.vibrate?.(5);
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center active:bg-zinc-100 dark:active:bg-zinc-800"
                    >
                      <FiMoreHorizontal size={20} className="text-zinc-500" strokeWidth={2} />
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
                            className="fixed z-50 min-w-[200px] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/10 py-2 overflow-hidden"
                            style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
                          >
                            {task.hidden && (
                              <>
                                <button
                                  onClick={(e) => { e.stopPropagation(); void handlePublish(); }}
                                  className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-[#0A84FF] hover:bg-zinc-100 dark:hover:bg-zinc-800 w-full transition-all active:scale-95"
                                >
                                  <FiCheck size={18} />
                                  Hiện công khai
                                </button>
                                <div className="h-px bg-zinc-200 dark:bg-zinc-800 mx-2" />
                              </>
                            )}
                            <button
                              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 w-full transition-all active:scale-95"
                            >
                              {isSaved? <FiCheck size={18} /> : <FiBookmark size={18} />}
                              {isSaved? "Đã lưu" : "Lưu công việc"}
                            </button>
                            <div className="h-px bg-zinc-200 dark:bg-zinc-800 mx-2" />
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowMenu(false); router.push(`/task/${task.id}/edit`); }}
                              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 w-full transition-all active:scale-95"
                            >
                              <FiEdit2 size={18} />
                              Sửa công việc
                            </button>
                            <div className="h-px bg-zinc-200 dark:bg-zinc-800 mx-2" />
                            <button
                              onClick={(e) => { e.stopPropagation(); setShowMenu(false); handleDelete(); }}
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
          </div>
        </div>
      </div>
    </div>
  );
}