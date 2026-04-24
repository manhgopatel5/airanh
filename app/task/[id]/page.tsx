"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  getTaskBySlug,
  joinTask,
  incrementTaskView,
} from "@/lib/task";
import {
  createComment,
  listenComments,
  toggleLikeComment,
} from "@/lib/taskCommentService";

import type { TaskComment } from "@/lib/taskCommentService";
import { Task } from "@/types/task";
import {
  FiChevronLeft,
  FiSend,
  FiClock,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import DOMPurify from "isomorphic-dompurify";
import { toast, Toaster } from "sonner";
import Image from "next/image";

type UserData = {
  uid: string;
  name: string;
  avatar: string;
  online?: boolean;
};

export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const bottomRef = useRef<HTMLDivElement>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [owner, setOwner] = useState<UserData | null>(null);
  const [applicantsData, setApplicantsData] = useState<UserData[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [joining, setJoining] = useState(false);

  const applicants = task?.applicants ?? [];

  const isFull = useMemo(
    () => applicants.length >= (task?.totalSlots ?? 1),
    [applicants, task]
  );

  const isApplied = useMemo(
    () => !!currentUser && applicants.includes(currentUser.uid),
    [applicants, currentUser]
  );

  const isOwner = useMemo(
    () => currentUser?.uid === task?.userId,
    [currentUser, task]
  );

  /* ================= AUTH ================= */
  useEffect(() => onAuthStateChanged(auth, setCurrentUser), []);

  /* ================= LOAD TASK ================= */
  useEffect(() => {
    if (!id || typeof id !== "string") return;

    const loadTask = async () => {
      try {
        const data = await getTaskBySlug(id);
        if (!data) {
          router.replace("/404");
          return;
        }
        setTask(data);
        await incrementTaskView(data.id);
      } catch (err) {
        console.error(err);
        router.replace("/404");
      } finally {
        setLoading(false);
      }
    };

    loadTask();
  }, [id, router]);

  /* ================= LOAD USERS ================= */
  useEffect(() => {
    if (!task) return;

    const loadUsers = async () => {
      const userIds = [task.userId, ...applicants];
      const uniqueIds = [...new Set(userIds)];

      const snaps = await Promise.all(
        uniqueIds.map((uid) => getDoc(doc(db, "users", uid)))
      );

      const users = snaps
        .filter((s) => s.exists())
        .map((s) => ({ uid: s.id, ...(s.data() as any) } as UserData));

      setOwner(users.find((u) => u.uid === task.userId) || null);
      setApplicantsData(users.filter((u) => applicants.includes(u.uid)));
    };

    loadUsers();
  }, [task, applicants]);

  /* ================= COUNTDOWN ================= */
  useEffect(() => {
    if (!task?.deadline?.seconds) return;

    const tick = () => {
      const diff = task.deadline!.seconds * 1000 - Date.now();
      if (diff <= 0) {
        setTimeLeft("Đã hết hạn");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [task?.deadline]);

  /* ================= COMMENTS ================= */
  useEffect(() => {
    if (!task?.id) return;

    const unsub = listenComments(
      task.id,
      (data) => {
        setComments(data);
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      },
      {
        onError: (err) => console.error(err),
      }
    );

    return () => unsub && unsub();
  }, [task?.id]);

  /* ================= ACTIONS ================= */
  const handleJoinTask = async () => {
    if (!currentUser || !task || isApplied || isFull || joining || isOwner) return;

    try {
      setJoining(true);
      await joinTask(task.id, {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
      });
      toast.success("Ứng tuyển thành công!");
    } catch (err: any) {
      toast.error(err.message || "Ứng tuyển thất bại");
    } finally {
      setJoining(false);
    }
  };

  const handleSendComment = async () => {
    if (!currentUser || !task || !text.trim() || sending) return;

    setSending(true);
    const temp = text;
    setText("");
    setReplyTo(null);

    try {
      await createComment(
        task.id,
        {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
        },
        {
          text: DOMPurify.sanitize(temp),
          ...(replyTo && {
            parentId: replyTo.id,
            replyToUserId: replyTo.userId,
            replyToUserName: replyTo.userName,
          }),
        }
      );
    } catch (err: any) {
      setText(temp);
      toast.error(err.message || "Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) return;
    try {
      await toggleLikeComment(commentId, currentUser.uid);
    } catch {
      toast.error("Lỗi");
    }
  };

  /* ================= RENDER ================= */
  if (loading)
    return <div className="p-4 animate-pulse">Đang tải...</div>;

  if (!task)
    return <div className="p-4">Không tìm thấy task</div>;

  const parentComments = comments.filter((c) => !c.parentId);

  return (
    <>
      <Toaster richColors position="top-center" />

      <div className="max-w-xl mx-auto bg-gray-50 dark:bg-zinc-950 min-h-screen pb-24">
        {/* HEADER */}
        <div className="sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b px-4 py-3 flex gap-3 items-center">
          <button onClick={() => router.back()}>
            <FiChevronLeft size={24} />
          </button>
          <h1 className="font-bold truncate flex-1">{task.title}</h1>
          {isOwner && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              Của bạn
            </span>
          )}
        </div>

        {/* OWNER */}
        <div className="p-4 flex items-center justify-between bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            {owner?.avatar && (
              <Image
                src={owner.avatar}
                alt={owner.name || "Owner avatar"}
                width={40}
                height={40}
                className="rounded-full"
              />
            )}
            <div>
              <div className="font-semibold">{owner?.name}</div>
              <div className="text-xs text-gray-500">Chủ task</div>
            </div>
          {!isOwner && (
            <button
              onClick={handleJoinTask}
              disabled={isFull || isApplied || joining}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed text-sm font-medium"
            >
              {joining
                ? "Đang xử lý..."
                : isApplied
                ? "Đã ứng tuyển"
                : isFull
                ? "Đã đủ người"
                : "Ứng tuyển"}
            </button>
          )}
        </div>

        {/* META */}
        <div className="p-4 grid grid-cols-2 gap-4 text-sm bg-white dark:bg-zinc-900 mt-2">
          <div className="flex items-center gap-2">
            <FiUsers className="text-gray-500" />
            <span>
              {applicants.length}/{task.totalSlots ?? 1} ứng tuyển
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FiClock className="text-gray-500" />
            <span>{timeLeft}</span>
          </div>
        </div>

        {/* APPLICANTS */}
        {applicantsData.length > 0 && (
          <div className="p-4 bg-white dark:bg-zinc-900 mt-2">
            <div className="text-sm font-semibold mb-2">Đã ứng tuyển</div>
            <div className="flex -space-x-2">
              {applicantsData.slice(0, 5).map((u) => (
                <Image
                  key={u.uid}
                  src={u.avatar || "/default-avatar.png"}
                  alt={u.name || "Applicant avatar"}
                  width={32}
                  height={32}
                  className="rounded-full border-2 border-white dark:border-zinc-900"
                />
              ))}
              {applicantsData.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-700 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-xs">
                  +{applicantsData.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMMENTS */}
        <div className="p-4 space-y-4 bg-white dark:bg-zinc-900 mt-2">
          <div className="font-semibold">Bình luận ({comments.length})</div>
          {parentComments.map((c) => {
            const liked = c.likes?.includes(currentUser?.uid || "");
            return (
              <div key={c.id} className="flex gap-2 text-sm">
                <Image
                  src={c.userAvatar || "/default-avatar.png"}
                  alt={c.userName || "User avatar"}
                  width={32}
                  height={32}
                  className="rounded-full h-8 w-8"
                />
                <div className="flex-1">
                  <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg px-3 py-2">
                    <div className="font-semibold">{c.userName}</div>
                    <div>{c.text}</div>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <button
                      onClick={() => handleLikeComment(c.id)}
                      className="flex items-center gap-1"
                    >
                      {liked ? (
                        <FaHeart className="text-red-500" />
                      ) : (
                        <FaRegHeart />
                      )}
                      {c.likes?.length || 0}
                    </button>
                    <button onClick={() => setReplyTo(c)}>Trả lời</button>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white dark:bg-zinc-900 border-t p-3">
          {replyTo && (
            <div className="text-xs text-gray-500 mb-2 flex items-center justify-between bg-gray-50 dark:bg-zinc-800 p-2 rounded">
              <span>Đang trả lời {replyTo.userName}</span>
              <button onClick={() => setReplyTo(null)}>
                <FiX />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendComment()}
              placeholder="Viết bình luận..."
              className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-zinc-800 outline-none text-sm"
              disabled={sending}
            />
            <button
              onClick={handleSendComment}
              disabled={!text.trim() || sending}
              className="p-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-300"
            >
              <FiSend />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}