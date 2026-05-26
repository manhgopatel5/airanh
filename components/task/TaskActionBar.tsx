"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  FiMessageSquare, FiPhone, FiSend, FiCheckCircle,
  FiShare2, FiAlertTriangle
} from "react-icons/fi";
import { toast } from "sonner";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useTask } from "@/hooks/useTask";
import type { Task } from "@/types/task";

type UserData = {
  uid: string;
  name: string;
  phone?: string;
};

type Props = {
  task: Task;
  owner: UserData | null;
  currentUser: any;
  isApplied: boolean;
  isFull: boolean;
  isOwner: boolean;
  onApplied: () => void;
  onShare: () => void;
};

export default function TaskActionBar({
  task,
  owner,
  currentUser,
  isApplied,
  isFull,
  isOwner,
  onApplied,
  onShare
}: Props) {
  const router = useRouter();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const { handleJoinTask, handleCancelApply, joining } = useTask(task.id, currentUser?.uid);

  const handleStartChat = async () => {
    if (!currentUser ||!task?.userId) return;
    const db = getFirebaseDB();
    try {
      const chatId = [currentUser.uid, task.userId].sort().join("_");
      const [currentUserDoc, ownerDoc] = await Promise.all([
        getDoc(doc(db, "users", currentUser.uid)),
        getDoc(doc(db, "users", task.userId)),
      ]);
      const currentData = currentUserDoc.data();
      const ownerData = ownerDoc.data();
      await setDoc(doc(db, "chats", chatId), {
        members: [currentUser.uid, task.userId],
        isGroup: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        membersInfo: {
          [currentUser.uid]: {
            name: currentData?.name || "User",
            avatar: currentData?.avatar || "",
            username: currentData?.username || "",
          },
          [task.userId]: {
            name: ownerData?.name || "User",
            avatar: ownerData?.avatar || "",
            username: ownerData?.username || "",
          },
        },
      }, { merge: true });
      router.push(`/chat/${chatId}`);
    } catch (err) {
      console.error(err);
      toast.error("Không thể mở chat");
    }
  };

  const handleApplyClick = async () => {
    if (isApplied) {
      await handleCancelApply();
      onApplied();
    } else {
      setShowApplyModal(true);
    }
  };

  const confirmApply = async () => {
    setShowApplyModal(false);
    await handleJoinTask();
    onApplied();
  };

  const canApply =!isApplied &&!isFull && task.status === "open" &&!isOwner;

  return (
    <>
      <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800 mt-4" />
      <div className="grid grid-cols-5 py-3">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            navigator.vibrate?.(8);
            handleStartChat();
          }}
          className="flex flex-col items-center gap-1 active:opacity-60 transition-opacity"
        >
          <FiMessageSquare size={22} strokeWidth={2} className="text-[#8E8E93] dark:text-zinc-500" />
          <span className="text-[13px] font-semibold leading-none text-[#8E8E93] dark:text-zinc-500">
            Nhắn tin
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            navigator.vibrate?.(8);
            owner?.phone && window.open(`tel:${owner.phone}`);
          }}
          disabled={!owner?.phone}
          className="flex flex-col items-center gap-1 active:opacity-60 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
        >
          <FiPhone size={22} strokeWidth={2} className="text-[#8E8E93] dark:text-zinc-500" />
          <span className="text-[13px] font-semibold leading-none text-[#8E8E93] dark:text-zinc-500">
            Gọi điện
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            navigator.vibrate?.(8);
            handleApplyClick();
          }}
          disabled={!canApply &&!isApplied || joining}
          className="flex flex-col items-center gap-1 active:opacity-60 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
        >
          {joining? (
            <div className="w-[22px] h-[22px] border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
          ) : isApplied? (
            <FiCheckCircle size={22} strokeWidth={2.5} className="text-[#34C759]" />
          ) : (
            <FiSend size={22} strokeWidth={2.5} className="text-[#0A84FF]" />
          )}
          <span className={`text-[13px] font-semibold leading-none ${isApplied? 'text-[#34C759]' : 'text-[#0A84FF]'}`}>
            {isApplied? "Đã ứng tuyển" : "Ứng tuyển"}
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            navigator.vibrate?.(8);
            onShare();
          }}
          className="flex flex-col items-center gap-1 active:opacity-60 transition-opacity"
        >
          <FiShare2 size={22} strokeWidth={2} className="text-[#8E8E93] dark:text-zinc-500" />
          <span className="text-[13px] font-semibold leading-none text-[#8E8E93] dark:text-zinc-500">
            Chia sẻ
          </span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            navigator.vibrate?.(8);
            toast.info("Đã gửi báo cáo");
          }}
          className="flex flex-col items-center gap-1 active:opacity-60 transition-opacity"
        >
          <FiAlertTriangle size={22} strokeWidth={2} className="text-[#8E8E93] dark:text-zinc-500" />
          <span className="text-[13px] font-semibold leading-none text-[#8E8E93] dark:text-zinc-500">
            Báo cáo
          </span>
        </motion.button>
      </div>
      <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800" />

      {showApplyModal && (
        <div className="fixed inset-0 bg-black/30 z-50" onClick={() => setShowApplyModal(false)} />
      )}
      {showApplyModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <h3 className="font-bold text-lg text-[#1C1C1E] dark:text-zinc-100">
              Xác nhận ứng tuyển
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2">
              Bạn có chắc muốn ứng tuyển công việc "{task.title}"?
            </p>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowApplyModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-semibold active:scale-95 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={confirmApply}
                disabled={joining}
                className="flex-1 py-2.5 rounded-xl bg-[#0A84FF] text-white font-semibold active:scale-95 transition-all disabled:opacity-50"
              >
                {joining? 'Đang gửi...' : 'Xác nhận'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}