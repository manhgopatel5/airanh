"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
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
      onUpdate();
    } catch {
      toast.error("Lỗi");
    }
  };

  return (
    <div ref={appsRef} className="bg-white dark:bg-zinc-900">
      <div className="py-4 flex items-center justify-between border-b border-[#F2F2F7] dark:border-zinc-800">
        <h3 className="font-semibold text- text-[#1C1C1E] dark:text-zinc-100">
          Ứng viên ({applications.length})
        </h3>
        {applications.length > 1 && (
          <button
            onClick={() => setShowAllApps(!showAllApps)}
            className="text- font-semibold text-[#0a84ff] active:opacity-60 transition-opacity"
          >
            {showAllApps? 'Thu gọn' : 'Xem tất cả'} ›
          </button>
        )}
      </div>

      {applications.length === 0? (
        <div className="px-5 py-12 text-center">
          <p className="text- text-[#8E8E93] dark:text-zinc-500">
            Chưa có ai ứng tuyển
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#F2F2F7] dark:divide-zinc-800">
          {(showAllApps? applications : applications.slice(0, 1)).map(app => (
            <motion.div
              key={app.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between gap-3 px-5 py-3"
            >
              <Link
                href={`/profile/${app.userId}`}
                className="flex items-center gap-3 min-w-0 flex-1 active:opacity-70"
              >
                <UserAvatar src={app.userAvatar} name={app.userName} size={40} />
                <div className="min-w-0">
                  <p className="font-semibold text- text-[#1C1C1E] dark:text-zinc-100 truncate">
                    {app.userName}
                  </p>
                  <p className="text- text-[#8E8E93] dark:text-zinc-500">
                    {app.createdAt?.toDate? app.createdAt.toDate().toLocaleDateString('vi-VN') : 'Vừa xong'} • Nộp {timeAgo(app.createdAt)}
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
                  className="h-8 px-3 rounded-full bg-[#E6F4EA] dark:bg-[#1E8E3E]/20 flex items-center gap-1.5 active:bg-[#D4EDDA] dark:active:bg-[#1E8E3E]/30 transition-all"
                >
                  <div className="w-4 h-4 rounded-full bg-[#00A86B] flex items-center justify-center">
                    <FiCheck size={10} strokeWidth={3} className="text-white" />
                  </div>
                  <span className="text- font-semibold text-[#00A86B]">Đồng ý</span>
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.vibrate?.(8);
                    handleRejectApp(app.id);
                  }}
                  className="h-8 px-3 rounded-full bg-[#FFE5E5] dark:bg-[#FF3B30]/20 flex items-center gap-1.5 active:bg-[#FFD6D6] dark:active:bg-[#FF3B30]/30 transition-all"
                >
                  <div className="w-4 h-4 rounded-full bg-[#FF3B30] flex items-center justify-center">
                    <FiX size={10} strokeWidth={3} className="text-white" />
                  </div>
                  <span className="text- font-semibold text-[#FF3B30]">Từ chối</span>
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}