"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import type { FeedTask } from "@/types/task";
import { isPlan } from "@/types/task";
import { FiArrowLeft, FiInbox } from "react-icons/fi";

import { useTask } from "@/hooks/useTask";
import { useComments } from "@/hooks/useComments";
import { onJobCompleted, onPlanCompleted } from "@/lib/xp";

import TaskDetailHeader from "@/components/task/TaskDetailHeader";
import TaskInfoGrid from "@/components/task/TaskInfoGrid";
import TaskDescription from "@/components/task/TaskDescription";
import TaskApplications from "@/components/task/TaskApplications";
import TaskActionBar from "@/components/task/TaskActionBar";
import PlanSection from "@/components/task/PlanSection";
import CommentSection from "@/components/task/CommentSection";
import { ImageGallery } from "@/components/task/ImageGallery";
import ShareTaskModal from "@/components/ShareTaskModal";

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const {
    task,
    owner,
    applications,
    loading,
    isOwner,
    isApplied,
    isParticipant,
    isFull,
    reloadTask,
    reloadApplications,
  } = useTask(id, currentUser?.uid);

  const {
    comments,
    sending,
    likingComments,
    sendComment,
    likeComment,
    deleteComment,
    editComment,
  } = useComments(task?.id);

  const [showImageGallery, setShowImageGallery] = useState<number | null>(null);
  const [shareTask, setShareTask] = useState<FeedTask | null>(null);

  const theme = task?.type === "plan" ? "plan" : "task";
  const accent = theme === "plan" ? "#30D158" : "#0A84FF";

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, setCurrentUser);
  }, []);

  useEffect(() => {
    if (!task || task.xpClaimed) return;

    if (task.type === "task" && task.status === "completed") {
      onJobCompleted(task.userId, task.rating || 5, task.id).catch(console.error);
    }

    if (task.type === "plan" && task.status === "completed") {
      onPlanCompleted(task.userId, task.rating || 5, task.id).catch(console.error);
    }
  }, [task?.status, task?.userId, task?.rating, task?.xpClaimed, task?.id, task?.type]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-white px-4 py-5 dark:bg-zinc-950">
        <div className="mx-auto max-w-[600px] space-y-4">
          <div className="h-12 rounded-2xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-900" />
          <div className="h-56 rounded-3xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-900" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 rounded-3xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-900" />
            <div className="h-24 rounded-3xl bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-900" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white px-5 dark:bg-zinc-950">
        <div className="w-full max-w-sm rounded-[2rem] border border-zinc-200 bg-white p-8 text-center shadow-xl shadow-black/[0.04] dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
            <FiInbox className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-xl font-black text-zinc-950 dark:text-white">Không tìm thấy</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Mục này có thể đã bị xóa hoặc không còn hiển thị.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-6 h-11 rounded-2xl bg-zinc-950 px-5 text-sm font-bold text-white active:scale-95 dark:bg-white dark:text-zinc-950"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="h-[100dvh] flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/86 px-3 py-2 backdrop-blur-2xl dark:border-zinc-800/70 dark:bg-zinc-950/86">
          <div className="mx-auto flex max-w-[600px] items-center gap-3">
            <button
              type="button"
              aria-label="Quay lại"
              onClick={() => router.back()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-700 active:scale-95 dark:bg-zinc-900 dark:text-zinc-200"
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                {theme === "plan" ? "Sự kiện" : "Công việc"}
              </p>
              <h1 className="truncate text-sm font-black text-zinc-950 dark:text-white">{task.title}</h1>
            </div>
            <div
              className="ml-auto h-2 w-2 rounded-full shrink-0"
              style={{ background: accent }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 pt-2">
            <TaskDetailHeader
              task={task}
              owner={owner}
              currentUser={currentUser}
              isOwner={isOwner}
              onTaskDeleted={() => router.push("/tasks")}
            />

            <TaskInfoGrid task={task} applications={applications} theme={theme} />

            <TaskDescription
              description={task.description}
              images={task.images}
              onImageClick={setShowImageGallery}
              theme={theme}
            />

            {isPlan(task) && (
              <PlanSection
                taskId={task.id}
                milestones={task.milestones || []}
                participants={task.participants || []}
                maxParticipants={task.maxParticipants ?? task.totalSlots ?? 0}
                currentUser={currentUser}
                ownerId={task.userId}
                onUpdate={reloadTask}
              />
            )}

            {isOwner ? (
              <TaskApplications
                applications={applications}
                item={task}
                currentUserId={currentUser!.uid}
                onUpdate={reloadApplications}
                type={theme}
              />
            ) : (
              <TaskActionBar
                task={task}
                owner={owner}
                currentUser={currentUser}
                isApplied={isApplied}
                isParticipant={isParticipant}
                isFull={isFull}
                isOwner={isOwner}
                onApplied={reloadTask}
                onShare={() => setShareTask(task)}
              />
            )}
          </div>

          <CommentSection
            taskOwnerId={task.userId}
            comments={comments}
            currentUser={currentUser}
            sending={sending}
            likingComments={likingComments}
            onSend={sendComment}
            onLike={likeComment}
            onDelete={deleteComment}
            onEdit={editComment}
          />
        </div>
      </div>

      <ImageGallery
        open={showImageGallery !== null}
        images={task.images || []}
        initialIndex={showImageGallery || 0}
        onClose={() => setShowImageGallery(null)}
      />

      {shareTask && <ShareTaskModal task={shareTask} onClose={() => setShareTask(null)} />}
    </>
  );
}
