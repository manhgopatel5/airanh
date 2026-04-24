"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  getTaskBySlug,
  joinTask,
  incrementTaskView,
  addReactionToTask,
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
  FiHeart,
  FiShare2,
  FiClock,
  FiMapPin,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";
import DOMPurify from "isomorphic-dompurify";
import { toast, Toaster } from "sonner";

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
  const reactRef = useRef<HTMLDivElement>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [owner, setOwner] = useState<UserData | null>(null);
  const [applicantsData, setApplicantsData] = useState<UserData[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null);
  const [showReactBox, setShowReactBox] = useState(false);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [joining, setJoining] = useState(false);

  // ✅ FIX CHÍNH: luôn đảm bảo array
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

    const interval = setInterval(() => {
      const diff = task.deadline!.seconds * 1000 - Date.now();

      if (diff <= 0) {
        setTimeLeft("Đã hết hạn");
        return;
      }

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);

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
    if (!currentUser || !task || isApplied || isFull || joining) return;

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

  const handleReaction = async (type: string) => {
    if (!currentUser || !task) return;

    setShowReactBox(false);

    try {
      await addReactionToTask(task.id, currentUser.uid, type);
    } catch {
      toast.error("Thao tác thất bại");
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

  const handleLikeComment = async (id: string) => {
    if (!currentUser) return;

    try {
      await toggleLikeComment(id, currentUser.uid);
    } catch {
      toast.error("Lỗi");
    }
  };

  const reactionIcon: Record<string, string> = {
    like: "👍",
    love: "❤️",
    haha: "😂",
    wow: "😮",
    sad: "😢",
  };

  const getTopReactions = useCallback(() => {
    const r = task?.reactions || {};
    return Object.entries(r)
      .map(([k, v]: any) => [k, v?.length || 0])
      .filter(([, v]) => v > 0)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 3);
  }, [task?.reactions]);

  /* ================= RENDER ================= */

  if (loading)
    return <div className="p-4 animate-pulse">Loading...</div>;

  if (!task)
    return <div className="p-4">Không tìm thấy</div>;

  const parentComments = comments.filter((c) => !c.parentId);
  const childComments = comments.filter((c) => c.parentId);

  return (
    <>
      <Toaster richColors position="top-center" />

      <div className="max-w-xl mx-auto bg-gray-50 dark:bg-zinc-950 min-h-screen pb-24">
        {/* HEADER */}
        <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex gap-3">
          <button onClick={() => router.back()}>
            <FiChevronLeft size={24} />
          </button>
          <h1 className="font-bold truncate">{task.title}</h1>
        </div>

        {/* OWNER */}
        <div className="p-4 flex justify-between">
          <div>{owner?.name}</div>
          <button onClick={handleJoinTask} disabled={isFull || isApplied}>
            {isApplied ? "Đã ứng tuyển" : "Ứng tuyển"}
          </button>
        </div>

        {/* META */}
        <div className="p-4 grid grid-cols-2 gap-4 text-sm">
          <div>{applicants.length} ứng tuyển</div>
          <div>{timeLeft}</div>
        </div>

        {/* APPLICANTS */}
        {applicants.length > 5 && (
          <div>+{applicants.length - 5}</div>
        )}

        {/* COMMENTS */}
        <div className="p-4">
          {parentComments.map((c) => (
            <div key={c.id}>{c.text}</div>
          ))}
        </div>

        {/* INPUT */}
        <div className="p-4">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button onClick={handleSendComment}>
            <FiSend />
          </button>
        </div>
      </div>
    </>
  );
}