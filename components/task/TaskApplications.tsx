"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiX, FiStar, FiUsers } from "react-icons/fi";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { FeedTask } from "@/types/task";
import { onJobCompleted } from "@/lib/xp";
import * as Dialog from "@radix-ui/react-dialog";

type Application = {
  id: string;
  taskId: string;
  taskOwnerId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: any;
  updatedAt?: any;
};

type Props = {
  applications: Application[];
  task: FeedTask;
  currentUserId: string;
  onUpdate: () => void;
};

export default function TaskApplications({ applications, task, currentUserId, onUpdate }: Props) {
  const [showAllApps, setShowAllApps] = useState(false);
  const [completingApp, setCompletingApp] = useState<Application | null>(null);
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);
  const appsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showAllApps && appsRef.current &&!appsRef.current.contains(e.target as Node)) {
        setShowAllApps(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAllApps]);

  const timeAgo = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const seconds = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
    if (seconds < 60) return "Vừa xong";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
    return `${Math.floor(seconds / 86400)} ngày trước`;
  };

  const acceptedApps = applications.filter(a => a.status === 'accepted');
const pendingApps = applications.filter(a => a.status === 'pending');
const rejectedApps = applications.filter(a => a.status === 'rejected');

const isFull = task.totalSlots > 0 && acceptedApps.length >= task.totalSlots;
const canAcceptMore =!isFull && task.status === 'open' && pendingApps.length > 0;

  const handleAcceptApp = async (appId: string, applicantId: string) => {
    if (!canAcceptMore) {
      toast.error("Task đã đủ người");
      return;
    }

    const db = getFirebaseDB();
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });

      await updateDoc(doc(db, 'tasks', task.id), {
        joined: acceptedApps.length + 1,
        status: acceptedApps.length + 1 >= task.totalSlots? 'full' : 'open'
      });

      const chatId = [currentUserId, applicantId].sort().join("_");
      await setDoc(doc(db, "chats", chatId), {
        members: [currentUserId, applicantId],
        lastMessage: `Bạn đã được duyệt cho task "${task.title}"`,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });

      toast.success("Đã duyệt ứng viên");
      navigator.vibrate?.(10);
      onUpdate();
    } catch {
      toast.error("Duyệt thất bại");
    }
  };

  const handleRejectApp = async (appId: string) => {
    const db = getFirebaseDB();
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
      toast.success("Đã từ chối");
      navigator.vibrate?.(8);
      onUpdate();
    } catch {
      toast.error("Lỗi");
    }
  };

  const handleCompleteJob = async () => {
    if (!completingApp) return;
    setLoading(true);
    const db = getFirebaseDB();

    try {
      await updateDoc(doc(db, "tasks", task.id), {
        status: "completed",
        rating: rating,
      });

      await onJobCompleted(completingApp.userId, rating, task.id);

      toast.success(`Đã hoàn thành + ${rating} sao + XP`);
      navigator.vibrate?.(15);
      setCompletingApp(null);
      onUpdate();
    } catch (err) {
      console.error(err);
      toast.error("Hoàn thành thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div ref={appsRef} className="bg-white dark:bg-zinc-950">
     <div className="py-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
  <div className="flex items-center gap-2 flex-wrap">
    <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
      Ứng viên ({applications.length})
    </h3>
    {acceptedApps.length > 0 && (
      <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-xs font-semibold text-green-600 dark:text-green-400">
        {acceptedApps.length} duyệt
      </span>
    )}
    {pendingApps.length > 0 && (
      <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-xs font-semibold text-amber-600 dark:text-amber-400">
        {pendingApps.length} chờ
      </span>
    )}
    {rejectedApps.length > 0 && (
      <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {rejectedApps.length} từ chối
      </span>
    )}
  </div>
  {applications.length > 1 && (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        setShowAllApps(!showAllApps);
        navigator.vibrate?.(5);
      }}
      className="text-sm font-semibold text-[#0A84FF] active:opacity-60 transition-opacity"
    >
      {showAllApps? 'Thu gọn' : 'Xem tất cả'} ›
    </motion.button>
  )}
</div>

        {isFull && (
          <div className="py-2 px-3 bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
            <FiUsers size={14} />
            <span>Task đã đủ {task.totalSlots} người</span>
          </div>
        )}

        {applications.length === 0? (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Chưa có ai ứng tuyển
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            <AnimatePresence mode="popLayout">
              {(showAllApps? applications : applications.slice(0, 1)).map(app => (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <Link
                    href={`/profile/${app.userId}`}
                    className="flex items-center gap-3 min-w-0 flex-1 active:opacity-70 transition-opacity"
                  >
                    <UserAvatar src={app.userAvatar} name={app.userName} size={40} />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {app.userName}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {app.createdAt?.toDate? app.createdAt.toDate().toLocaleDateString('vi-VN') : 'Vừa xong'} • {timeAgo(app.createdAt)}
                      </p>
                    </div>
                  </Link>

                  <div className="flex gap-2 shrink-0">
                    {app.status === 'pending' && (
                      <>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.vibrate?.(8);
                            handleAcceptApp(app.id, app.userId);
                          }}
                          disabled={!canAcceptMore}
                          className="h-8 px-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center gap-1.5 active:bg-green-200 dark:active:bg-green-900/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <div className="w-4 h-4 rounded-full bg-[#34C759] flex items-center justify-center">
                            <FiCheck size={10} strokeWidth={3} className="text-white" />
                          </div>
                          <span className="text-sm font-semibold text-[#34C759]">Duyệt</span>
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.vibrate?.(8);
                            handleRejectApp(app.id);
                          }}
                          className="h-8 px-3 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center gap-1.5 active:bg-red-200 dark:active:bg-red-900/50 transition-all"
                        >
                          <div className="w-4 h-4 rounded-full bg-[#FF3B30] flex items-center justify-center">
                            <FiX size={10} strokeWidth={3} className="text-white" />
                          </div>
                          <span className="text-sm font-semibold text-[#FF3B30]">Từ chối</span>
                        </motion.button>
                      </>
                    )}

                    {app.status === 'accepted' && (
                      <>
                        <span className="px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-xs font-semibold text-green-600 dark:text-green-400">
                          Đã duyệt
                        </span>
                        {task.status!== 'completed' && (
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setCompletingApp(app)}
                            className="h-8 px-3 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center gap-1.5 active:bg-blue-200 dark:active:bg-blue-900/50 transition-all"
                          >
                            <FiStar size={14} className="text-blue-500" />
                            <span className="text-sm font-semibold text-blue-500">Hoàn thành</span>
                          </motion.button>
                        )}
                      </>
                    )}

                    {app.status === 'rejected' && (
                      <span className="text-xs text-zinc-400">Đã từ chối</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Dialog.Root open={!!completingApp} onOpenChange={(open) =>!open && setCompletingApp(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-5 z-[70]">
            <Dialog.Title className="text-lg font-bold mb-2 text-zinc-900 dark:text-zinc-100">Hoàn thành job</Dialog.Title>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Đánh giá {completingApp?.userName}</p>

            <div className="flex justify-center gap-2 mb-5">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)}>
                  <FiStar
                    className={`w-10 h-10 transition-colors ${rating >= star? "fill-amber-400 text-amber-400" : "text-zinc-300 dark:text-zinc-700"}`}
                  />
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCompletingApp(null)}
                className="flex-1 h-11 rounded-2xl border border-zinc-200 dark:border-zinc-800 font-semibold text-zinc-900 dark:text-zinc-100"
              >
                Hủy
              </button>
              <button
                onClick={handleCompleteJob}
                disabled={loading}
                className="flex-1 h-11 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold disabled:opacity-50"
              >
                {loading? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}