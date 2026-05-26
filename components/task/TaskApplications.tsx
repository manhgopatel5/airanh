"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiX } from "react-icons/fi";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { Task } from "@/types/task";

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
  task: Task;
  currentUserId: string;
  onUpdate: () => void;
};

export default function TaskApplications({ applications, task, currentUserId, onUpdate }: Props) {
  const [showAllApps, setShowAllApps] = useState(false);
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

  const handleAcceptApp = async (appId: string, applicantId: string) => {
    const db = getFirebaseDB();
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
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

  return (
    <div ref={appsRef} className="bg-white dark:bg-zinc-950">
      <div className="py-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
          Ứng viên ({applications.length})
        </h3>
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
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.vibrate?.(8);
                      handleAcceptApp(app.id, app.userId);
                    }}
                    className="h-8 px-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center gap-1.5 active:bg-green-200 dark:active:bg-green-900/50 transition-all"
                  >
                    <div className="w-4 h-4 rounded-full bg-[#34C759] flex items-center justify-center">
                      <FiCheck size={10} strokeWidth={3} className="text-white" />
                    </div>
                    <span className="text-sm font-semibold text-[#34C759]">Đồng ý</span>
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
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}