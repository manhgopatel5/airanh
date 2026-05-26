"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getFirebaseAuth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { Toaster } from "sonner";

import { useTask } from "@/hooks/useTask";
import { useComments } from "@/hooks/useComments";

import TaskDetailHeader from "@/components/task/TaskDetailHeader";
import TaskInfoGrid from "@/components/task/TaskInfoGrid";
import TaskDescription from "@/components/task/TaskDescription";
import TaskApplications from "@/components/task/TaskApplications";
import TaskActionBar from "@/components/task/TaskActionBar";
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
    isFull,
    reloadTask,
    reloadApplications
  } = useTask(id, currentUser?.uid);

  const {
    comments,
    sending,
    likingComments,
    sendComment,
    likeComment,
    deleteComment,
    editComment
  } = useComments(task?.id);

  const [showImageGallery, setShowImageGallery] = useState<number | null>(null);
  const [shareTask, setShareTask] = useState<typeof task | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, setCurrentUser);
  }, []);

  if (loading) return <div className="p-4 text-center">Đang tải...</div>;
  if (!task) return <div className="p-4 text-center">Không tìm thấy task</div>;

  return (
    <>
      <Toaster richColors position="top-center" />
      {/* QUAN TRỌNG: Thêm overflow-hidden để chặn body scroll */}
      <div className="h-[100dvh] flex flex-col bg-white dark:bg-zinc-950 overflow-hidden">
        {/* Phần scroll: header + content + comment list */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="px-3 pt-2">
            <TaskDetailHeader
              task={task}
              owner={owner}
              currentUser={currentUser}
              isOwner={isOwner}
              onTaskDeleted={() => router.push("/tasks")}
            />

            <TaskInfoGrid task={task} applications={applications} />

            <TaskDescription
              description={task.description}
              images={task.images}
              onImageClick={setShowImageGallery}
            />

            {isOwner? (
              <TaskApplications
                applications={applications}
                task={task}
                currentUserId={currentUser!.uid}
                onUpdate={reloadApplications}
              />
            ) : (
              <TaskActionBar
                task={task}
                owner={owner}
                currentUser={currentUser}
                isApplied={isApplied}
                isFull={isFull}
                isOwner={isOwner}
                onApplied={reloadTask}
                onShare={() => setShareTask(task)}
              />
            )}
          </div>

          {/* CommentSection nằm trong scroll, input sticky */}
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
        open={showImageGallery!== null}
        images={task.images || []}
        initialIndex={showImageGallery || 0}
        onClose={() => setShowImageGallery(null)}
      />

      {shareTask && (
        <ShareTaskModal
          task={shareTask}
          onClose={() => setShareTask(null)}
        />
      )}
    </>
  );
}