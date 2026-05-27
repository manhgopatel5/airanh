"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMessageSquare, FiPhone, FiSend, FiCheckCircle,
  FiShare2, FiAlertTriangle
} from "react-icons/fi";
import { toast } from "sonner";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useTask } from "@/hooks/useTask";
import type { FeedTask } from "@/types/task"; // FIX: Task -> FeedTask

type UserData = {
  uid: string;
  name: string;
  phone?: string;
};

type Props = {
  task: FeedTask; // FIX: Task -> FeedTask
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
      navigator.vibrate?.(8);
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

  const ActionButton = ({ 
    icon: Icon, 
    label, 
    onClick, 
    disabled = false, 
    active = false,
    color = "text-zinc-500 dark:text-zinc-400"
  }: {
    icon: any;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    active?: boolean;
    color?: string;
  }) => (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => {
        navigator.vibrate?.(8);
        onClick();
      }}
      disabled={disabled}
      className="flex flex-col items-center gap-1 active:opacity-60 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
    >
      <Icon size={22} strokeWidth={active? 2.5 : 2} className={color} />
      <span className={`text-xs font-semibold leading-none ${color}`}>
        {label}
      </span>
    </motion.button>
  );

  return (
    <>
      <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-screen -ml-4 my-4" />
      
      <div className="grid grid-cols-5 py-3">
        <ActionButton
          icon={FiMessageSquare}
          label="Nhắn tin"
          onClick={handleStartChat}
        />

        <ActionButton
          icon={FiPhone}
          label="Gọi điện"
          onClick={() => owner?.phone && window.open(`tel:${owner.phone}`)}
          disabled={!owner?.phone}
        />

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleApplyClick}
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
          <span className={`text-xs font-semibold leading-none ${isApplied? 'text-[#34C759]' : 'text-[#0A84FF]'}`}>
            {isApplied? "Đã ứng tuyển" : "Ứng tuyển"}
          </span>
        </motion.button>

        <ActionButton
          icon={FiShare2}
          label="Chia sẻ"
          onClick={onShare}
        />

        <ActionButton
          icon={FiAlertTriangle}
          label="Báo cáo"
          onClick={() => toast.info("Đã gửi báo cáo")}
        />
      </div>

      <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-screen -ml-4 my-4" />

      <AnimatePresence>
        {showApplyModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm"
              onClick={() => setShowApplyModal(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl p-6 max-w-sm w-full shadow-2xl ring-1 ring-black/5 dark:ring-white/10 pointer-events-auto"
              >
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                  Xác nhận ứng tuyển
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  Bạn có chắc muốn ứng tuyển công việc "{task.title}"?
                </p>
                <div className="flex gap-2 mt-5">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowApplyModal(false);
                      navigator.vibrate?.(5);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-zinc-100 active:scale-95 transition-all"
                  >
                    Hủy
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      confirmApply();
                      navigator.vibrate?.(5);
                    }}
                    disabled={joining}
                    className="flex-1 py-2.5 rounded-xl bg-[#0A84FF] text-white text-sm font-semibold active:scale-95 transition-all disabled:opacity-50"
                  >
                    {joining? 'Đang gửi...' : 'Xác nhận'}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}