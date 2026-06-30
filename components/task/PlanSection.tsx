"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { FiCheckCircle, FiCircle, FiUsers } from "react-icons/fi";
import { toast } from "sonner";
import { toggleMilestone } from "@/lib/task";
import { type PlanMilestone, type PlanParticipant } from "@/types/task";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { User } from "firebase/auth";

type Props = {
  taskId: string;
  milestones: PlanMilestone[];
  participants: PlanParticipant[];
  maxParticipants: number;
  currentUser: User | null;
  ownerId: string;
  onUpdate: () => void;
};

export default function PlanSection({
  taskId,
  milestones,
  participants,
  maxParticipants,
  currentUser,
  ownerId,
  onUpdate,
}: Props) {
  const [toggling, setToggling] = useState<string | null>(null);
  const progress = milestones.length
    ? Math.round((milestones.filter((m) => m.completed).length / milestones.length) * 100)
    : 0;
  const canEdit = currentUser && milestones.length > 0 && (
    currentUser.uid === ownerId ||
    participants.some((p) => p.userId === currentUser.uid && p.permissions?.canManageTasks)
  );

  const handleToggle = useCallback(
    async (milestoneId: string) => {
      if (!currentUser || !canEdit) return;
      setToggling(milestoneId);
      try {
        await toggleMilestone(taskId, currentUser.uid, milestoneId);
        onUpdate();
        navigator.vibrate?.(8);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Không thể cập nhật");
      } finally {
        setToggling(null);
      }
    },
    [currentUser, canEdit, taskId, onUpdate]
  );

  const activeParticipants = participants.filter((p) => p.status === "active");

  return (
    <div className="space-y-4 pb-4">
      <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-screen -ml-4" />

      {milestones.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Tiến độ kế hoạch
            </h3>
            <span className="text-sm font-bold text-[#30D158]">{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-4">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#30D158] to-[#248A3D]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
          <div className="space-y-2">
            {[...milestones]
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={!canEdit || toggling === m.id}
                  onClick={() => handleToggle(m.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-2xl text-left transition active:scale-[0.99] ${
                    m.completed
                      ? "bg-[#30D158]/10 ring-1 ring-[#30D158]/20"
                      : "bg-zinc-50 dark:bg-zinc-900 ring-1 ring-zinc-200/80 dark:ring-zinc-800"
                  } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                >
                  {m.completed ? (
                    <FiCheckCircle className="h-5 w-5 shrink-0 text-[#30D158] mt-0.5" />
                  ) : (
                    <FiCircle className="h-5 w-5 shrink-0 text-zinc-400 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${m.completed ? "line-through text-zinc-500" : "text-zinc-900 dark:text-zinc-100"}`}>
                      {m.title}
                    </p>
                    {m.description && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                        {m.description}
                      </p>
                    )}
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <FiUsers className="h-4 w-4 text-[#30D158]" />
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Thành viên ({activeParticipants.length}/{maxParticipants})
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeParticipants.length === 0 ? (
            <p className="text-sm text-zinc-500">Chưa có ai tham gia. Hãy là người đầu tiên!</p>
          ) : (
            activeParticipants.map((p) => (
              <div
                key={p.userId}
                className="flex items-center gap-2 rounded-2xl bg-zinc-50 dark:bg-zinc-900 px-3 py-2 ring-1 ring-zinc-200/80 dark:ring-zinc-800"
              >
                <UserAvatar
                  src={p.userAvatar || undefined}
                  name={p.userName}
                  size={32}
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                    {p.userName}
                  </p>
                  <p className="text-xs text-zinc-500 capitalize">{p.role}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
