"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  getTaskBySlug,
  joinTask,
  toggleLikeTask,
  incrementTaskView,
  addReactionToTask,
} from "@/lib/task";
import {
  createComment,
  listenComments,
  deleteComment,
  toggleLikeComment,
  Comment as TaskComment,
} from "@/lib/taskCommentService";
import { Task } from "@/types/task";
import { FiChevronLeft, FiSend, FiHeart, FiShare2, FiClock, FiMapPin, FiUsers, FiX, FiCheck } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { HiSparkles } from "react-icons/hi";
import DOMPurify from "isomorphic-dompurify";
import { toast, Toaster } from "sonner";
import { Timestamp } from "firebase/firestore";

type UserData = { uid: string; name: string; avatar: string; online?: boolean };

export default function TaskDetailPage() {
  const { id } = useParams(); // đây là slug
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

  const isFull = useMemo(() => (task?.applicants?.length?? 0) >= (task?.totalSlots?? 1), [task]);
  const isApplied = useMemo(() =>!!currentUser && task?.applicants?.includes(currentUser.uid), [task, currentUser]);
  const isOwner = useMemo(() => currentUser?.uid === task?.userId, [currentUser, task]);

  /* ================= AUTH ================= */
  useEffect(() => onAuthStateChanged(auth, setCurrentUser), []);

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

  /* ================= LOAD OWNER + APPLICANTS ================= */
  useEffect(() => {
    if (!task) return;
    const loadUsers = async () => {
      const userIds = [task.userId,...(task.applicants || [])];
      const uniqueIds = [...new Set(userIds)];
      const snaps = await Promise.all(uniqueIds.map(uid => getDoc(doc(db, "users", uid))));
      const users = snaps.filter(s => s.exists()).map(s => ({ uid: s.id,...s.data() } as UserData));

      setOwner(users.find(u => u.uid === task.userId) || null);
      setApplicantsData(users.filter(u => task.applicants?.includes(u.uid)));
    };
    loadUsers();
  }, [task]);

  /* ================= COUNTDOWN ================= */
  useEffect(() => {
    if (!task?.deadline?.seconds) return;
    const interval = setInterval(() => {
      const diff = task.deadline!.seconds * 1000 - Date.now();
      if (diff <= 0) return setTimeLeft("Đã hết hạn");
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [task?.deadline]);

  /* ================= COMMENTS - Dùng taskCommentService ================= */
  useEffect(() => {
    if (!task?.id) return;
    const unsub = listenComments(task.id, (data) => {
      setComments(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return () => unsub();
  }, [task?.id]);

  /* ================= ACTIONS ================= */
  const handleJoinTask = async () => {
    if (!currentUser ||!task || isApplied || isFull || joining) return;
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

  const handleLike = async () => {
    if (!currentUser ||!task) return;
    try {
      await toggleLikeTask(task.id, currentUser.uid);
    } catch (err) {
      toast.error("Thao tác thất bại");
    }
  };

  const handleReaction = async (type: string) => {
    if (!currentUser ||!task) return;
    setShowReactBox(false);
    try {
      await addReactionToTask(task.id, currentUser.uid, type);
    } catch (err) {
      toast.error("Thao tác thất bại");
    }
  };

  const handleSendComment = async () => {
    if (!currentUser ||!task ||!text.trim() || sending) return;
    setSending(true);
    const tempText = text;
    setText("");
    setReplyTo(null);
    try {
      await createComment(task.id, {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
      }, {
        text: DOMPurify.sanitize(tempText),
        parentId: replyTo?.id,
        replyToUserId: replyTo?.userId,
        replyToUserName: replyTo?.userName,
      });
    } catch (err: any) {
      setText(tempText);
      toast.error(err.message || "Gửi bình luận thất bại");
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) return;
    try {
      await toggleLikeComment(commentId, currentUser.uid);
    } catch (err) {
      toast.error("Thao tác thất bại");
    }
  };

  const getTopReactions = useCallback(() => {
    const r = task?.reactions || {};
    return Object.entries(r)
  .map(([type, users]: any) => [type, users?.length || 0])
  .filter(([, v]) => v > 0)
  .sort((a, b) => (b[1] as number) - (a[1] as number))
  .slice(0, 3);
  }, [task?.reactions]);

  const reactionIcon: Record<string, string> = { like: "👍", love: "❤️", haha: "😂", wow: "😮", sad: "😢" };

  if (loading) return <div className="max-w-xl mx-auto p-4 space-y-4 animate-pulse"><div className="h-14 bg-gray-200 dark:bg-zinc-800 rounded-2xl" /><div className="h-32 bg-gray-200 dark:bg-zinc-800 rounded-3xl" /></div>;
  if (!task) return <div className="flex flex-col items-center justify-center min-h-screen text-gray-400 dark:text-zinc-500"><div className="text-6xl mb-4">😢</div><p className="font-semibold">Không tìm thấy nhiệm vụ</p></div>;

  const parentComments = comments.filter((c) =>!c.parentId);
  const childComments = comments.filter((c) => c.parentId);

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="max-w-xl mx-auto bg-gray-50 dark:bg-zinc-950 min-h-screen pb-24">
        {/* HEADER */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-zinc-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 active:scale-90"><FiChevronLeft size={24} /></button>
          <h1 className="font-bold text-lg truncate">{task.title}</h1>
        </div>

        {/* OWNER CARD */}
        <div className="bg-white dark:bg-zinc-900 p-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-start">
          <div className="flex gap-3 items-center cursor-pointer" onClick={() => router.push(`/user/${task.userId}`)}>
            <img src={owner?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(owner?.name || "U")}`} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-50 dark:ring-zinc-800" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">{owner?.name || "User"}</span>
                <span className="text- bg-yellow-400 text-white px-2 py-0.5 rounded-full font-bold">Chủ</span>
                {owner?.online && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
              </div>
              <div className="text-xs text-gray-500 dark:text-zinc-400">{owner?.online? "Đang online" : "Offline"}</div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-lg font-extrabold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">{Number(task.price).toLocaleString("vi-VN")}đ</div>
            {!isOwner && (
              <button onClick={handleJoinTask} disabled={isFull || isApplied || joining} className={`px-5 py-2 text-sm rounded-2xl font-semibold shadow-lg active:scale-[0.98] transition-all ${isFull? "bg-gray-300 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400" : isApplied? "bg-blue-500 text-white shadow-blue-500/30" : "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/30"}`}>
                {joining? "Đang xử lý..." : isFull? "Đã đủ" : isApplied? "Đã ứng tuyển" : "Ứng tuyển"}
              </button>
            )}
          </div>
        </div>

        {/* INFO */}
        <div className="bg-white dark:bg-zinc-900 p-4 space-y-3 border-b border-gray-100 dark:border-zinc-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{task.title}</h2>
          <p className="text-gray-600 dark:text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
        </div>

        {/* META */}
        <div className="bg-white dark:bg-zinc-900 p-4 grid grid-cols-2 gap-4 text-sm border-b border-gray-100 dark:border-zinc-800">
          {[{ icon: FiMapPin, label: "Địa chỉ", value: task.address || "Remote" }, { icon: FiClock, label: "Thời hạn", value: timeLeft }, { icon: FiUsers, label: "Tuyển", value: `${task.totalSlots} người` }, { icon: FiHeart, label: "Ứng tuyển", value: task.applicants?.length || 0 }].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <Icon className="text-gray-400 dark:text-zinc-500 mt-0.5" size={16} />
              <div>
                <div className="text-gray-400 dark:text-zinc-500 text-xs">{label}</div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* APPLICANTS */}
        {applicantsData.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 p-4 flex items-center gap-2 border-b border-gray-100 dark:border-zinc-800">
            {applicantsData.slice(0, 5).map((u) => (
              <div key={u.uid} className="relative -ml-2 first:ml-0">
                <img src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`} className="w-9 h-9 rounded-full border-2 border-white dark:border-zinc-900 hover:scale-110 transition" />
                {u.uid === currentUser?.uid && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] bg-blue-500 text-white px-1.5 rounded-full font-bold">Bạn</span>}
              </div>
            ))}
            {task.applicants.length > 5 && <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">+{task.applicants.length - 5}</span>}
          </div>
        )}

        {/* IMAGES */}
        {task.images?.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 p-2 grid grid-cols-3 gap-2 border-b border-gray-100 dark:border-zinc-800">
            {task.images.map((img, i) => <img key={i} src={img} className="h-24 w-full object-cover rounded-2xl" onError={(e) => { e.currentTarget.src = "/img-error.png" }} />)}
          </div>
        )}

        {/* ACTIONS */}
        <div className="bg-white dark:bg-zinc-900 py-3 px-4 flex justify-between items-center text-sm text-gray-600 dark:text-zinc-400 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex gap-5">
            <div className="relative" ref={reactRef}>
              <button onClick={() => setShowReactBox(!showReactBox)} className="flex items-center gap-1.5 active:scale-90">
                <FaHeart className="text-red-500" size={18} />
                <span className="font-semibold">{Object.values(task.reactions || {}).reduce((a: number, b: any) => a + (b?.length || 0), 0)}</span>
              </button>
              {showReactBox && (
                <div className="absolute -top-14 left-0 bg-white dark:bg-zinc-800 shadow-xl rounded-full px-3 py-2 flex gap-3 animate-in slide-in-from-bottom">
                  {Object.keys(reactionIcon).map((type) => <button key={type} onClick={() => handleReaction(type)} className="text-2xl hover:scale-125 transition">{reactionIcon[type]}</button>)}
                </div>
              )}
            </div>
            <button onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })} className="flex items-center gap-1.5 active:scale-90"><FiSend size={18} /><span className="font-semibold">{comments.length}</span></button>
            <button className="flex items-center gap-1.5 active:scale-90"><FiShare2 size={18} /><span className="font-semibold">{task.shares || 0}</span></button>
          </div>
          <div className="flex gap-1">{getTopReactions().map(([type]) => <span key={type}>{reactionIcon[type]}</span>)}</div>
        </div>

        {/* COMMENTS */}
        <div className="px-4 space-y-3 mt-3 pb-20">
          {parentComments.length === 0 && <div className="text-center text-gray-400 dark:text-zinc-500 text-sm py-8"><HiSparkles size={32} className="mx-auto mb-2 opacity-50" />Chưa có bình luận</div>}
          {parentComments.map((cmt) => {
            const replies = childComments.filter((r) => r.parentId === cmt.id);
            const isLiked = cmt.likedBy?.includes(currentUser?.uid || "");
            return (
              <div key={cmt.id} className="space-y-2">
                <div className="flex gap-2">
                  <img src={cmt.userAvatar} className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <div className="bg-gray-100 dark:bg-zinc-800 px-3 py-2 rounded-2xl">
                      <div className="flex items-center gap-1.5 text-xs font-semibold mb-0.5">
                        <span className="text-gray-900 dark:text-gray-100">{cmt.userName}</span>
                        {cmt.userId === task.userId && <span className="bg-yellow-400 text-white px-1.5 rounded text- font-bold">Chủ</span>}
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">{cmt.text}</div>
                    </div>
                    <div className="flex items-center gap-3 mt-1 ml-1">
                      <button onClick={() => setReplyTo(cmt)} className="text-xs text-gray-500 dark:text-zinc-400 font-semibold">Trả lời</button>
                      <button onClick={() => handleLikeComment(cmt.id)} className={`text-xs font-semibold ${isLiked? "text-blue-500" : "text-gray-500 dark:text-zinc-400"}`}>
                        Thích {cmt.likeCount > 0 && `(${cmt.likeCount})`}
                      </button>
                    </div>
                  </div>
                </div>
                {replies.map((rep) => {
                  const isRepLiked = rep.likedBy?.includes(currentUser?.uid || "");
                  return (
                    <div key={rep.id} className="flex gap-2 ml-10">
                      <img src={rep.userAvatar} className="w-7 h-7 rounded-full" />
                      <div className="flex-1">
                        <div className="bg-gray-100 dark:bg-zinc-800 px-3 py-2 rounded-2xl text-sm">
                          <div className="flex items-center gap-1.5 text-xs font-semibold mb-0.5">
                            <span className="text-gray-900 dark:text-gray-100">{rep.userName}</span>
                            {rep.userId === task.userId && <span className="bg-yellow-400 text-white px-1 rounded text- font-bold">Chủ</span>}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-zinc-400 mb-0.5">trả lời {cmt.userName}</div>
                          <div className="text-gray-900 dark:text-gray-100">{rep.text}</div>
                        </div>
                        <button onClick={() => handleLikeComment(rep.id)} className={`text-xs font-semibold mt-1 ml-1 ${isRepLiked? "text-blue-500" : "text-gray-500 dark:text-zinc-400"}`}>
                          Thích {rep.likeCount > 0 && `(${rep.likeCount})`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* INPUT */}
        <div className="border-t border-gray-100 dark:border-zinc-800 px-4 py-3 sticky bottom-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
          {replyTo && (
            <div className="flex justify-between items-center text-xs text-gray-500 dark:text-zinc-400 mb-2">
              <span>Đang trả lời: {replyTo.userName}</span>
              <button onClick={() => setReplyTo(null)} className="text-red-400 font-semibold"><FiX size={16} /></button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <img src={currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.displayName || "U")}`} className="w-9 h-9 rounded-full" />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={replyTo? `Trả lời ${replyTo.userName}` : "Viết bình luận..."} onKeyDown={(e) => { if (e.key === "Enter" &&!e.shiftKey) { e.preventDefault(); handleSendComment(); } }} className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-2xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
            <button disabled={!text.trim() || sending} onClick={handleSendComment} className="text-blue-500 font-semibold disabled:opacity-40 p-2"><FiSend size={22} /></button>
          </div>
        </div>
      </div>
    </>
  );
}
