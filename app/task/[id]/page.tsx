"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, arrayRemove } from "firebase/firestore";
import {
  getTaskBySlug,
  joinTask,
  incrementTaskView,
} from "@/lib/task";
import {
  createComment,
  listenComments,
  toggleLikeComment,
  deleteComment,
} from "@/lib/taskCommentService";

import type { TaskComment } from "@/lib/taskCommentService";
import { Task, isTask } from "@/types/task";
import {
  FiChevronLeft,
  FiSend,
  FiClock,
  FiZap,
  FiUsers,
  FiX,
  FiShare2,
  FiMoreVertical,
  FiEdit2,
  FiTrash2,
  FiMapPin,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import DOMPurify from "isomorphic-dompurify";
import { toast, Toaster } from "sonner";
import Image from "next/image";
import Linkify from "linkify-react";

type UserData = {
  uid: string;
  name: string;
  avatar: string;
  online?: boolean;
};

const PRIMARY = "#0a84ff";

export default function TaskDetailPage() {
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const { id } = useParams();
  const router = useRouter();

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
  const [showMenu, setShowMenu] = useState(false);
  const [showImageModal, setShowImageModal] = useState<string | null>(null);

  const applicants = task?.applicants?? [];

const isFull = useMemo(
  () => applicants.length >= (task && isTask(task)? task.totalSlots : 1) || task?.status === "full",
  [applicants, task]
);

  const isApplied = useMemo(
    () =>!!currentUser && applicants.includes(currentUser.uid),
    [applicants, currentUser]
  );

  const isOwner = useMemo(
    () => currentUser?.uid === task?.userId,
    [currentUser, task]
  );

const taskStatus = useMemo(() => {
  if (!task) return null;
  if (task.status === "completed") return { text: "Đã hoàn thành", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: FiCheckCircle };
  if (task.status === "in_progress") return { text: "Đang thực hiện", color: `bg-[${PRIMARY}]/10 text-[${PRIMARY}]`, icon: FiClock };
  if (timeLeft === "Đã hết hạn" || task.status === "expired") return { text: "Hết hạn", color: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400", icon: FiAlertCircle };
  if (isFull || task.status === "full") return { text: "Đã đủ người", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: FiUsers };
  return { text: "Đang tuyển", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: FiZap };
}, [task, timeLeft, isFull]);

  /* ================= AUTH ================= */
  useEffect(() => onAuthStateChanged(auth, setCurrentUser), [auth]);

  /* ================= LOAD TASK ================= */
  useEffect(() => {
    if (!id || typeof id!== "string") return;

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
      const userIds = [task.userId,...applicants];
      const uniqueIds = [...new Set(userIds)];

      const snaps = await Promise.all(
        uniqueIds.map((uid) => getDoc(doc(db, "users", uid)))
      );

      const users = snaps
      .filter((s) => s.exists())
      .map((s) => ({ uid: s.id,...(s.data() as any) } as UserData));

      setOwner(users.find((u) => u.uid === task.userId) || null);
      setApplicantsData(users.filter((u) => applicants.includes(u.uid)));
    };

    loadUsers();
  }, [task, applicants, db]);

  /* ================= COUNTDOWN ================= */
useEffect(() => {
  if (!task ||!isTask(task) ||!task.deadline?.seconds || task.status === "completed") return;

  const tick = () => {
    const diff = task.deadline!.seconds * 1000 - Date.now();
    if (diff <= 0) {
      setTimeLeft("Đã hết hạn");
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    setTimeLeft(d > 0? `${d} ngày ${h}h` : `${h}h ${m}m ${s}s`);
  };

  tick();
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval);
}, [task]);
  /* ================= COMMENTS ================= */
  useEffect(() => {
    if (!task?.id) return;

    const unsub = listenComments(
      task.id,
      (data) => {
        setComments(data);
      },
      {
        onError: (err) => console.error(err),
      }
    );

    return () => unsub && unsub();
  }, [task?.id]);

  /* ================= ACTIONS ================= */
  const handleJoinTask = async () => {
    if (!currentUser ||!task || isApplied || isFull || joining || isOwner) return;

    try {
      setJoining(true);
      await joinTask(task.id, {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
      });
      toast.success("Ứng tuyển thành công!");
      setTask(prev => prev? {...prev, applicants: [...(prev.applicants || []), currentUser.uid] } : null);
    } catch (err: any) {
      toast.error(err.message || "Ứng tuyển thất bại");
    } finally {
      setJoining(false);
    }
  };

  const handleCancelApply = async () => {
    if (!currentUser ||!task ||!isApplied || joining) return;
    if (!confirm("Hủy ứng tuyển task này?")) return;

    try {
      setJoining(true);
      await updateDoc(doc(db, "tasks", task.id), {
        applicants: arrayRemove(currentUser.uid)
      });
      toast.success("Đã hủy ứng tuyển");
      setTask(prev => prev? {...prev, applicants: (prev.applicants || []).filter(id => id!== currentUser.uid) } : null);
    } catch {
      toast.error("Hủy thất bại");
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!isOwner ||!task) return;
    if (!confirm("Xóa task này? Hành động không thể hoàn tác.")) return;
    
    try {
      await deleteDoc(doc(db, "tasks", task.id));
      toast.success("Đã xóa task");
      router.push("/nhiem-vu");
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = task?.title || "Xem task";

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link");
    }
  }, [task?.title]);

  const handleSendComment = async () => {
    if (!currentUser ||!task ||!text.trim() || sending) return;

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
            parentId: replyTo.parentId || replyTo.id,
            replyToUserId: replyTo.userId,
            replyToUserName: replyTo.userName,
          }),
        }
      );
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      setText(temp);
      toast.error(err.message || "Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) return router.push("/login");
    try {
      await toggleLikeComment(commentId, currentUser.uid);
    } catch {
      toast.error("Lỗi");
    }
  };

const handleDeleteComment = async (commentId: string) => {
  if (!task?.id) return;
  if (!confirm("Xóa bình luận này?")) return;
  try {
    await deleteComment(task.id, commentId);
    toast.success("Đã xóa");
  } catch {
    toast.error("Xóa thất bại");
  }
};

  const handleReply = (c: TaskComment) => {
    setReplyTo(c);
    inputRef.current?.focus();
  };

  /* ================= RENDER ================= */
  if (loading) return <TaskSkeleton />;

  if (!task) return <div className="p-4 text-center">Không tìm thấy task</div>;

  const parentComments = comments.filter((c) =>!c.parentId);
  const getReplies = (id: string) => comments.filter((c) => c.parentId === id);
  const StatusIcon = taskStatus?.icon;

  return (
    <>
      <Toaster richColors position="top-center" />

      <div className="max-w-xl mx-auto bg-[#F2F2F7] dark:bg-black min-h-screen pb-24">
        {/* HEADER */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-zinc-800 px-4 py-3 flex gap-3 items-center">
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 active:scale-90 transition-all">
            <FiChevronLeft size={24} />
          </button>
          <h1 className="font-semibold truncate flex-1 text-[17px]">{task.title}</h1>
          <button onClick={handleShare} className="p-2 rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 active:scale-90 transition-all">
            <FiShare2 size={18} className="text-zinc-600 dark:text-zinc-400" />
          </button>
          {isOwner && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 active:scale-90 transition-all">
                <FiMoreVertical size={18} className="text-zinc-600 dark:text-zinc-400" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-10 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-[#E5E5EA] dark:border-zinc-800 py-1.5 z-10 w-44 overflow-hidden">
                  <button
                    onClick={() => router.push(`/nhiem-vu/edit/${task.id}`)}
                    className="flex items-center gap-3 px-4 py-2.5 text-[15px] hover:bg-[#F2F2F7] dark:hover:bg-zinc-800 w-full active:bg-[#E5E5EA] dark:active:bg-zinc-700 transition-colors"
                  >
                    <FiEdit2 size={16} /> Sửa
                  </button>
                  <button
                    onClick={handleDeleteTask}
                    className="flex items-center gap-3 px-4 py-2.5 text-[15px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 w-full active:bg-red-100 dark:active:bg-red-950/30 transition-colors"
                  >
                    <FiTrash2 size={16} /> Xóa
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* STATUS BADGE */}
        {taskStatus && StatusIcon && (
          <div className="px-4 pt-4">
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium ${taskStatus.color}`}>
              <StatusIcon size={14} />
              {taskStatus.text}
            </div>
          </div>
        )}

        {/* IMAGES */}
        {task.images && task.images.length > 0 && (
          <div className="mt-4 px-4">
            <div className={`grid gap-1.5 rounded-2xl overflow-hidden ${task.images.length === 1? "grid-cols-1" : "grid-cols-2"}`}>
              {task.images.slice(0, 4).map((img, i) => (
                <div key={i} className="relative active:scale-95 transition-transform" onClick={() => setShowImageModal(img)}>
                  <Image
                    src={img}
                    alt=""
                    width={400}
                    height={300}
                    className={`w-full object-cover bg-[#E5E5EA] dark:bg-zinc-800 cursor-pointer ${
                      task.images!.length === 1? "h-64" : "h-32"
                    }`}
                  />
                  {i === 3 && task.images!.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl">
                      +{task.images!.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DESCRIPTION */}
        {task.description && (
          <div className="p-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800">
            <h3 className="font-semibold mb-2 text-[15px]">Mô tả công việc</h3>
            <Linkify options={{ target: "_blank", className: `text-[${PRIMARY}] hover:underline` }}>
              <p className="text-[15px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {task.description}
              </p>
            </Linkify>
          </div>
        )}

        {/* META INFO */}
        <div className="p-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 space-y-3 text-[15px]">
{task.location && (task.location.address || task.location.city) && (
  <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
    <FiMapPin size={18} className="text-zinc-400" />
    <span>
      {[task.location.address, task.location.city, task.location.country]
        .filter(Boolean)
        .join(", ")}
    </span>
  </div>
)}
          {task.budget && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
              <FiDollarSign size={18} className="text-zinc-400" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{task.budget.toLocaleString("vi-VN")}đ</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
            <FiUsers size={18} className="text-zinc-400" />
            <span>{applicants.length}/{task && isTask(task)? task.totalSlots : 1} người ứng tuyển</span>
          </div>
          <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
            <FiClock size={18} className="text-zinc-400" />
            <span className="tabular-nums">{timeLeft}</span>
          </div>
        </div>

        {/* OWNER */}
        <div className="p-4 flex items-center justify-between bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800">
          <button onClick={() => router.push(`/profile/${task.userId}`)} className="flex items-center gap-3 flex-1 active:scale-95 transition-transform">
            <Image
              src={owner?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(owner?.name || "U")}&background=0a84ff&color=fff`}
              alt={owner?.name || "Owner avatar"}
              width={44}
              height={44}
              className="rounded-full"
            />
            <div className="text-left">
              <div className="font-semibold text-[15px]">{owner?.name}</div>
              <div className="text-[13px] text-zinc-500">Chủ task</div>
            </div>
          </button>
          {!isOwner && (
<button
  onClick={isApplied? handleCancelApply : handleJoinTask}
  disabled={(!isApplied && (isFull || task.status!== "open")) || joining}
  className={`px-5 py-2.5 rounded-xl text- font-semibold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
    isApplied
   ? "bg-[#F2F2F7] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
      : `bg-[${PRIMARY}] hover:bg-[#0071e3] text-white shadow-lg shadow-[${PRIMARY}]/20`
  }`}
>
  {joining? "Đang xử lý..." : isApplied? "Hủy ứng tuyển" : isFull? "Đã đủ người" : task.status!== "open"? "Đã đóng" : "Ứng tuyển"}
</button>
          )}
        </div>

        {/* APPLICANTS */}
        {applicantsData.length > 0 && (
          <div className="p-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800">
            <div className="text-[15px] font-semibold mb-3">Đã ứng tuyển ({applicantsData.length})</div>
            <div className="flex -space-x-2">
              {applicantsData.slice(0, 8).map((u) => (
                <button key={u.uid} onClick={() => router.push(`/profile/${u.uid}`)} className="hover:scale-110 transition-transform">
                  <Image
                    src={u.avatar || "/default-avatar.png"}
                    alt={u.name || "Applicant avatar"}
                    width={36}
                    height={36}
                    className="rounded-full border-2 border-white dark:border-zinc-900"
                  />
                </button>
              ))}
              {applicantsData.length > 8 && (
                <div className="w-9 h-9 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[12px] font-semibold tabular-nums">
                  +{applicantsData.length - 8}
                </div>
              )}
            </div>
          </div>
        )}

        {/* COMMENTS */}
        <div className="p-4 space-y-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800">
          <div className="font-semibold text-[15px]">Bình luận ({comments.length})</div>
          {parentComments.length === 0? (
            <div className="text-center py-12 text-zinc-400 text-[15px]">Chưa có bình luận nào</div>
          ) : (
            parentComments.map((c) => {
              const liked = currentUser && c.likes?.includes(currentUser.uid);
              const replies = getReplies(c.id);
              return (
                <div key={c.id} className="text-[15px]">
                  <div className="flex gap-2.5">
                    <Image
                      src={c.userAvatar || "/default-avatar.png"}
                      alt={c.userName || "User avatar"}
                      width={32}
                      height={32}
                      className="rounded-full h-8 w-8 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="bg-[#F2F2F7] dark:bg-zinc-800 rounded-2xl px-3.5 py-2.5">
                        <div className="font-semibold text-[14px]">{c.userName}</div>
                        <div className="break-words text-[15px] leading-relaxed mt-0.5">{c.deleted? <i className="text-zinc-500">Đã xóa</i> : c.text}</div>
                      </div>
                      {!c.deleted && (
                        <div className="flex gap-4 mt-1.5 text-[13px] text-zinc-500 px-3.5">
                          <button onClick={() => handleLikeComment(c.id)} className="flex items-center gap-1.5 hover:text-red-500 active:scale-90 transition-all">
                            {liked? <FaHeart className="text-red-500" size={13} /> : <FaRegHeart size={13} />}
                            <span className="tabular-nums">{c.likeCount || ""}</span>
                          </button>
                          <button onClick={() => handleReply(c)} className="hover:text-[#0a84ff] active:scale-90 transition-all">Trả lời</button>
                          {currentUser?.uid === c.userId && (
                            <button onClick={() => handleDeleteComment(c.id)} className="hover:text-red-500 active:scale-90 transition-all">Xóa</button>
                          )}
                        </div>
                      )}
                      {/* REPLIES */}
                      {replies.map((r) => (
                        <div key={r.id} className="flex gap-2.5 mt-3 ml-4">
                          <Image
                            src={r.userAvatar || "/default-avatar.png"}
                            alt=""
                            width={28}
                            height={28}
                            className="rounded-full h-7 w-7 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="bg-[#F2F2F7] dark:bg-zinc-800 rounded-2xl px-3.5 py-2.5">
                              <div className="font-semibold text-[13px]">{r.userName}</div>
                              <div className="text-[14px] leading-relaxed mt-0.5">
                                <span className={`text-[${PRIMARY}]`}>@{r.replyToUserName}</span> {r.text}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-[#E5E5EA] dark:border-zinc-800 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {replyTo && (
            <div className="text-[13px] text-zinc-600 dark:text-zinc-400 mb-2 flex items-center justify-between bg-[#F2F2F7] dark:bg-zinc-800 px-3.5 py-2 rounded-xl">
              <span>Đang trả lời <b className="text-zinc-900 dark:text-zinc-100">{replyTo.userName}</b></span>
              <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg active:scale-90 transition-all">
                <FiX size={14} />
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" &&!e.shiftKey && handleSendComment()}
              placeholder="Viết bình luận..."
              className="flex-1 px-4 py-2.5 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 outline-none text-[15px] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all"
              disabled={sending}
            />
            <button
              onClick={handleSendComment}
              disabled={!text.trim() || sending}
              className={`p-2.5 rounded-full bg-[${PRIMARY}] hover:bg-[#0071e3] text-white disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed active:scale-90 transition-all`}
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* IMAGE MODAL */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowImageModal(null)}>
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full active:scale-90 transition-all" onClick={() => setShowImageModal(null)}>
            <FiX size={28} />
          </button>
          <img src={showImageModal} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </>
  );
}

function TaskSkeleton() {
  return (
    <div className="max-w-xl mx-auto bg-[#F2F2F7] dark:bg-black min-h-screen animate-pulse">
      <div className="h-14 bg-white dark:bg-black border-b border-[#E5E5EA] dark:border-zinc-800"></div>
      <div className="p-4 space-y-4">
        <div className="h-6 w-32 bg-[#E5E5EA] dark:bg-zinc-800 rounded-lg"></div>
        <div className="h-48 bg-[#E5E5EA] dark:bg-zinc-800 rounded-2xl"></div>
        <div className="h-24 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800"></div>
        <div className="h-32 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800"></div>
      </div>
    </div>
  );
}