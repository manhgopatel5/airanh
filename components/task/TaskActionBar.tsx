"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiMessageSquare,
  FiPhone,
  FiSend,
  FiCheckCircle,
  FiShare2,
  FiAlertTriangle,
  FiUserPlus,
  FiClock,
} from "react-icons/fi";
import { toast } from "sonner";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { joinPlan } from "@/lib/task";
import { isPlan, type FeedTask } from "@/types/task";
import { useAuth } from "@/lib/AuthContext";

type UserData = {
  uid: string;
  name: string;
  phone?: string;
};

type Props = {
  task: FeedTask;
  owner: UserData | null;
  currentUser: { uid: string; displayName?: string | null; photoURL?: string | null; email?: string | null } | null;
  isApplied: boolean;
  isParticipant?: boolean;
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
  isParticipant = false,
  isFull,
  isOwner,
  onApplied,
  onShare,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [joining, setJoining] = useState(false);

  const isPlanMode = isPlan(task);
  const accent = isPlanMode ? "#30D158" : "#0A84FF";
  const successColor = isPlanMode ? "#30D158" : "#34C759";

  const handleStartChat = async () => {
    if (!currentUser || !task?.userId) return;
    const db = getFirebaseDB();
    try {
      const chatId = [currentUser.uid, task.userId].sort().join("_");
      const [currentUserDoc, ownerDoc] = await Promise.all([
        getDoc(doc(db, "users", currentUser.uid)),
        getDoc(doc(db, "users", task.userId)),
      ]);
      const currentData = currentUserDoc.data();
      const ownerData = ownerDoc.data();
      await setDoc(
        doc(db, "chats", chatId),
        {
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
        },
        { merge: true }
      );
      router.push(`/chat/${chatId}`);
      navigator.vibrate?.(8);
    } catch (err) {
      console.error(err);
      toast.error("Không thể mở chat");
    }
  };

  const handleJoinPlan = useCallback(async () => {
    if (!user || joining) return;
    setJoining(true);
    try {
      await joinPlan(task.id, {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        onboardingCompleted: true,
      });
      const needsApproval = (task as FeedTask & { requireApproval?: boolean }).requireApproval;
      toast.success(needsApproval ? "Đã gửi yêu cầu tham gia!" : "Tham gia sự kiện thành công!");
      navigator.vibrate?.(10);
      onApplied();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Tham gia thất bại");
    } finally {
      setJoining(false);
    }
  }, [user, joining, task.id, onApplied]);

  const handleApplyClick = async () => {
    if (isPlanMode) {
      if (isParticipant) {
        toast.info("Bạn đã tham gia sự kiện này");
        return;
      }
      if (isApplied) {
        toast.info("Yêu cầu tham gia đang chờ duyệt");
        return;
      }
      setShowApplyModal(true);
      return;
    }
    if (isApplied) {
      toast.info("Bạn đã ứng tuyển. Vào mục công việc của tôi để hủy.");
      return;
    }
    setShowApplyModal(true);
  };

  const confirmApply = async () => {
    setShowApplyModal(false);
    if (isPlanMode) {
      await handleJoinPlan();
    } else {
      try {
        setJoining(true);
        const { applyToTask } = await import("@/app/actions/task");
        if (!currentUser) return;
        await applyToTask(task.id, currentUser.uid);
        toast.success("Đã gửi yêu cầu ứng tuyển!");
        onApplied();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Ứng tuyển thất bại");
      } finally {
        setJoining(false);
      }
    }
  };

  const isPendingApproval = isPlanMode && isApplied && !isParticipant;
  const hasJoined = isPlanMode ? isParticipant : isApplied;
  const canJoin = !hasJoined && !isPendingApproval && !isFull && task.status === "open" && !isOwner;

  const ActionButton = ({
    icon: Icon,
    label,
    onClick,
    disabled = false,
    color = "text-zinc-500 dark:text-zinc-400",
  }: {
    icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
    label: string;
    onClick: () => void;
    disabled?: boolean;
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
      <Icon size={22} strokeWidth={2} className={color} />
      <span className={`text-xs font-semibold leading-none ${color}`}>{label}</span>
    </motion.button>
  );

  const JoinIcon = isPlanMode ? FiUserPlus : FiSend;

  return (
    <>
      <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-screen -ml-4 my-4" />

      <div className="grid grid-cols-5 py-3">
        <ActionButton icon={FiMessageSquare} label="Nhắn tin" onClick={handleStartChat} />

        <ActionButton
          icon={FiPhone}
          label="Gọi điện"
          onClick={() => owner?.phone && window.open(`tel:${owner.phone}`)}
          disabled={!owner?.phone}
        />

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleApplyClick}
          disabled={(!canJoin && !hasJoined && !isPendingApproval) || joining}
          className="flex flex-col items-center gap-1 active:opacity-60 transition-opacity disabled:opacity-40 disabled:pointer-events-none"
        >
          {joining ? (
            <div
              className="w-[22px] h-[22px] border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: accent, borderTopColor: "transparent" }}
            />
          ) : hasJoined ? (
            <FiCheckCircle size={22} strokeWidth={2.5} style={{ color: successColor }} />
          ) : isPendingApproval ? (
            <FiClock size={22} strokeWidth={2.5} style={{ color: "#FF9F0A" }} />
          ) : (
            <JoinIcon size={22} strokeWidth={2.5} style={{ color: accent }} />
          )}
          <span className="text-xs font-semibold leading-none" style={{ color: hasJoined ? successColor : isPendingApproval ? "#FF9F0A" : accent }}>
            {hasJoined
              ? (isPlanMode ? "Đã tham gia" : "Đã ứng tuyển")
              : isPendingApproval
                ? "Chờ duyệt"
                : isPlanMode
                  ? "Tham gia"
                  : "Ứng tuyển"}
          </span>
        </motion.button>

        <ActionButton icon={FiShare2} label="Chia sẻ" onClick={onShare} />

        <ActionButton icon={FiAlertTriangle} label="Báo cáo" onClick={() => toast.info("Đã gửi báo cáo")} />
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
                  {isPlanMode ? "Xác nhận tham gia" : "Xác nhận ứng tuyển"}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                  {isPlanMode
                    ? `Bạn có chắc muốn tham gia sự kiện "${task.title}"?`
                    : `Bạn có chắc muốn ứng tuyển công việc "${task.title}"?`}
                </p>
                <div className="flex gap-2 mt-5">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowApplyModal(false);
                      navigator.vibrate?.(5);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
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
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-50"
                    style={{ background: accent }}
                  >
                    {joining ? "Đang gửi..." : "Xác nhận"}
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
