"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Flag, CheckCircle, Send } from "lucide-react";
import { toast } from "sonner";
import * as Dialog from "@radix-ui/react-dialog";
import { FiStar } from "react-icons/fi";
import type { FeedTask } from "@/types/task";
import { sendTaskShareToChat, submitTaskUserReport } from "@/lib/taskChat";
import { getFirebaseAuth } from "@/lib/firebase";

type Props = {
  task: FeedTask;
  currentUserId: string;
  onUpdated?: () => void;
};

const REPORT_REASONS = [
  { id: "quay_roi", label: "Quấy rối / Bắt nạt" },
  { id: "spam", label: "Spam" },
  { id: "fake", label: "Gian lận" },
  { id: "other", label: "Khác" },
];

export default function TaskAssigneeActions({ task, currentUserId, onUpdated }: Props) {
  const router = useRouter();
  const [progressOpen, setProgressOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [progress, setProgress] = useState(50);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [reportReason, setReportReason] = useState("quay_roi");
  const [reportNote, setReportNote] = useState("");
  const [loading, setLoading] = useState(false);

  const isTask = task.type === "task";
  const ownerId = task.userId;
  const ownerName = task.userName || "Chủ task";

  const getToken = async () => {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new Error("Chưa đăng nhập");
    return user.getIdToken();
  };

  const handleSendProgress = async () => {
    setLoading(true);
    try {
      const chatId = await sendTaskShareToChat({
        task,
        senderId: currentUserId,
        senderName: getFirebaseAuth().currentUser?.displayName || "User",
        recipientId: ownerId,
        progress,
      });
      toast.success(`Đã gửi tiến độ ${progress}%`);
      setProgressOpen(false);
      router.push(`/chat/${chatId}`);
    } catch {
      toast.error("Gửi tiến độ thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!feedback.trim()) {
      toast.error("Vui lòng viết feedback");
      return;
    }
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/tasks/${task.id}/complete-review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rating,
          feedback: feedback.trim(),
          role: "assignee",
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Thất bại");
      toast.success(body.message || "Đã gửi đánh giá");
      setCompleteOpen(false);
      onUpdated?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Hoàn thành thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleReport = async () => {
    setLoading(true);
    try {
      await submitTaskUserReport({
        reporterId: currentUserId,
        reporterName: getFirebaseAuth().currentUser?.displayName || "User",
        targetId: ownerId,
        targetName: ownerName,
        ...(task.userShortId ? { targetShortId: task.userShortId } : {}),
        taskId: task.id,
        taskTitle: task.title,
        reason: reportReason,
        note: reportNote,
      });
      toast.success("Đã gửi báo cáo cho admin");
      setReportOpen(false);
    } catch {
      toast.error("Gửi báo cáo thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 px-2.5 pb-2.5 pt-0 border-t border-zinc-100">
      {isTask && (
        <button
          type="button"
          onClick={() => setProgressOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600"
        >
          <Send className="h-3.5 w-3.5" />
          Gửi tiến độ
        </button>
      )}
      <button
        type="button"
        onClick={() => setCompleteOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-green-50 px-3 py-2 text-xs font-bold text-green-600"
      >
        <CheckCircle className="h-3.5 w-3.5" />
        Hoàn thành
      </button>
      <button
        type="button"
        onClick={() => setReportOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
      >
        <Flag className="h-3.5 w-3.5" />
        Báo cáo
      </button>

      <Dialog.Root open={progressOpen} onOpenChange={setProgressOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-5">
            <Dialog.Title className="text-lg font-bold">Gửi tiến độ</Dialog.Title>
            <p className="mt-1 text-sm text-zinc-500">Chọn % hoàn thành gửi cho {ownerName}</p>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="mt-4 w-full"
            />
            <p className="mt-2 text-center text-2xl font-black text-blue-600">{progress}%</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setProgressOpen(false)} className="flex-1 rounded-2xl border py-2.5 font-semibold">
                Hủy
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleSendProgress()}
                className="flex-1 rounded-2xl bg-blue-600 py-2.5 font-bold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Gửi"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={completeOpen} onOpenChange={setCompleteOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-5">
            <Dialog.Title className="text-lg font-bold">Hoàn thành & đánh giá</Dialog.Title>
            <p className="mt-1 text-sm text-zinc-500">Đánh giá {ownerName}</p>
            <div className="mt-3 flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setRating(s)}>
                  <FiStar className={`h-8 w-8 ${rating >= s ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
                </button>
              ))}
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Viết feedback cho đối phương..."
              className="mt-3 w-full rounded-2xl border border-zinc-200 p-3 text-sm min-h-[88px]"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setCompleteOpen(false)} className="flex-1 rounded-2xl border py-2.5 font-semibold">
                Hủy
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleComplete()}
                className="flex-1 rounded-2xl bg-zinc-900 py-2.5 font-bold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Gửi"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={reportOpen} onOpenChange={setReportOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[80] w-[90%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-5">
            <Dialog.Title className="text-lg font-bold">Báo cáo</Dialog.Title>
            <p className="mt-1 text-sm text-zinc-500">Báo cáo gửi tới admin xử lý</p>
            <div className="mt-3 space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={reportReason === r.id} onChange={() => setReportReason(r.id)} />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea
              value={reportNote}
              onChange={(e) => setReportNote(e.target.value)}
              placeholder="Ghi chú thêm (tuỳ chọn)"
              className="mt-3 w-full rounded-2xl border border-zinc-200 p-3 text-sm min-h-[72px]"
            />
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setReportOpen(false)} className="flex-1 rounded-2xl border py-2.5 font-semibold">
                Hủy
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleReport()}
                className="flex-1 rounded-2xl bg-red-600 py-2.5 font-bold text-white disabled:opacity-50"
              >
                Gửi báo cáo
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
