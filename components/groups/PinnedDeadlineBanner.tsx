"use client";

import { useEffect, useState } from "react";
import { RiPushpinFill } from "react-icons/ri";
import { FiClock } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export type PinnedMessage = {
  id: string;
  text: string;
  senderName: string;
  deadline?: { toDate?: () => Date; seconds?: number } | Date | null;
  deadlineNotified?: boolean;
};

function toDate(deadline: PinnedMessage["deadline"]): Date | null {
  if (!deadline) return null;
  if (deadline instanceof Date) return deadline;
  if (typeof deadline === "object" && "toDate" in deadline && deadline.toDate) {
    return deadline.toDate();
  }
  if (typeof deadline === "object" && "seconds" in deadline && deadline.seconds) {
    return new Date(deadline.seconds * 1000);
  }
  return null;
}

type Props = {
  pinned: PinnedMessage;
  onUnpin?: () => void;
};

export default function PinnedDeadlineBanner({ pinned, onUnpin }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  const deadlineDate = toDate(pinned.deadline);
  const isUrgent = deadlineDate && deadlineDate.getTime() - now < 24 * 60 * 60 * 1000;
  const isPast = deadlineDate && deadlineDate.getTime() < now;

  return (
    <div className="flex justify-center px-3 py-2 border-b border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95">
      <button
        type="button"
        onClick={onUnpin}
        className={`w-full max-w-md rounded-2xl px-4 py-3 text-left shadow-md border transition-colors ${
          isPast
            ? "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800"
            : isUrgent
              ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
              : "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
        }`}
      >
        <div className="flex items-start gap-2">
          <RiPushpinFill className={`shrink-0 mt-0.5 ${isPast ? "text-red-500" : isUrgent ? "text-amber-500" : "text-blue-500"}`} size={18} />
          <div className="flex-1 min-w-0 text-center">
            <p className={`text-[10px] font-bold uppercase tracking-wide ${isPast ? "text-red-600" : isUrgent ? "text-amber-600" : "text-blue-600"}`}>
              Tin ghim · {pinned.senderName}
            </p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">{pinned.text}</p>
            {deadlineDate && (
              <p className={`text-xs mt-1 flex items-center justify-center gap-1 ${isPast ? "text-red-600" : isUrgent ? "text-amber-700" : "text-zinc-500"}`}>
                <FiClock size={12} />
                {isPast
                  ? "Đã quá hạn"
                  : `Còn ${formatDistanceToNow(deadlineDate, { locale: vi })}`}
              </p>
            )}
          </div>
        </div>
      </button>
    </div>
  );
}
