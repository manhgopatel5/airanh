"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, updateDoc, deleteDoc, arrayRemove, Timestamp } from "firebase/firestore";
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
  editComment,
} from "@/lib/taskCommentService";

import type { TaskComment } from "@/types/task";
import { isTask, isPlan, type Task } from "@/types/task";
import {
  FiChevronLeft, FiSend, FiClock, FiZap, FiUsers, FiX, FiShare2, FiMoreVertical,
  FiEdit2, FiTrash2, FiMapPin, FiDollarSign, FiCheckCircle, FiAlertCircle, 
  FiMessageCircle
} from "react-icons/fi";
import DOMPurify from "isomorphic-dompurify";
import { toast, Toaster } from "sonner";
import Image from "next/image";
import Linkify from "linkify-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";

import { motion, AnimatePresence } from "framer-motion";
import { CommentList } from "@/components/task/CommentList";
import { ImageGallery } from "@/components/task/ImageGallery";
import { UserAvatar } from "@/components/ui/UserAvatar";

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
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [joining, setJoining] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState<number | null>(null);
  const [likingComments, setLikingComments] = useState<Set<string>>(new Set());

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

  const mentionUsers = useMemo(() => {
    const users = [...applicantsData];
    if (owner &&!users.find(u => u.uid === owner.uid)) users.unshift(owner);
    return users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()));
  }, [applicantsData, owner, mentionQuery]);

  const taskStatus = useMemo(() => {
    if (!task) return null;
    if (task.status === "completed") return { text: "Đã hoàn thành", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: FiCheckCircle };
    if (task.status === "in_progress") return { text: "Đang thực hiện", color: `bg-[${PRIMARY}]/10 text-[${PRIMARY}]`, icon: FiClock };
    if (timeLeft === "Đã hết hạn" || task.status === "expired") return { text: "Hết hạn", color: "bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-400", icon: FiAlertCircle };
    if (isFull || task.status === "full") return { text: "Đã đủ người", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", icon: FiUsers };
    return { text: "Đang tuyển", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", icon: FiZap };
  }, [task, timeLeft, isFull]);

  useEffect(() => onAuthStateChanged(auth, setCurrentUser), []);

  useEffect(() => {
    if (!id || typeof id!== "string") return;
    const loadTask = async () => {
      try {
        const data = await getTaskBySlug(id);
        if (!data) return router.replace("/404");
        setTask(data);
        incrementTaskView(data.id);
      } catch {
        router.replace("/404");
      } finally {
        setLoading(false);
      }
    };
    loadTask();
  }, [id, router]);

useEffect(() => {
  if (!task) return;
  const loadUsers = async () => {
    setLoadingUsers(true);
    const userIds = [task.userId,...(task.applicants?? [])];
    const uniqueIds = [...new Set(userIds)];
    const snaps = await Promise.all(uniqueIds.map((uid) => getDoc(doc(db, "users", uid))));
    const users = snaps.filter(s => s.exists()).map(s => ({ uid: s.id,...s.data() } as UserData));
    setOwner(users.find((u) => u.uid === task.userId) || null);
    setApplicantsData(users.filter((u) => (task.applicants?? []).includes(u.uid)));
    setLoadingUsers(false);
  };
  loadUsers();
}, [task?.id, task?.userId, task?.applicants, db]); // ✅ Đổi dependency

  useEffect(() => {
    if (!task ||!isTask(task) ||!task.deadline?.seconds || task.status === "completed") return;
    const tick = () => {
      const diff = task.deadline!.seconds * 1000 - Date.now();
      if (diff <= 0) return setTimeLeft("Đã hết hạn");
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

useEffect(() => {
  if (!task?.id) return;
  const unsub = listenComments(task.id, (data) => {
    setComments(data);
    setHasMoreComments(data.length >= 20);
  }, { limit: 20 });
  return () => unsub && unsub();
}, [task?.id]);

  

  useEffect(() => {
    const lastAt = text.lastIndexOf("@");
    if (lastAt!== -1 && lastAt === text.length - 1) {
      setShowMention(true);
      setMentionQuery("");
    } else if (lastAt!== -1) {
      const query = text.slice(lastAt + 1);
      if (query.includes(" ")) {
        setShowMention(false);
      } else {
        setShowMention(true);
        setMentionQuery(query);
      }
    } else {
      setShowMention(false);
    }
  }, [text]);

  const handleJoinTask = async () => {
    if (!currentUser ||!task || isApplied || isFull || joining || isOwner) return;
    setJoining(true);
    setTask(prev => prev? {...prev, applicants: [...(prev.applicants || []), currentUser.uid] } : null);
    try {
      await joinTask(task.id, { uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL });
      toast.success("Ứng tuyển thành công!");
      navigator.vibrate?.(10);
    } catch (err: any) {
      setTask(prev => prev? {...prev, applicants: (prev.applicants || []).filter(id => id!== currentUser.uid) } : null);
      toast.error(err.message || "Ứng tuyển thất bại");
    } finally {
      setJoining(false);
    }
  };

  const handleCancelApply = async () => {
    if (!currentUser ||!task ||!isApplied || joining) return;
    setJoining(true);
    setTask(prev => prev? {...prev, applicants: (prev.applicants || []).filter(id => id!== currentUser.uid) } : null);
    try {
      await updateDoc(doc(db, "tasks", task.id), { applicants: arrayRemove(currentUser.uid) });
      toast.success("Đã hủy ứng tuyển");
      navigator.vibrate?.(10);
    } catch {
      setTask(prev => prev? {...prev, applicants: [...(prev.applicants || []), currentUser.uid] } : null);
      toast.error("Hủy thất bại");
    } finally {
      setJoining(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!isOwner ||!task) return;
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
      try { await navigator.share({ title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Đã copy link");
      navigator.vibrate?.(10);
    }
  }, [task?.title]);

  const handleSendComment = async () => {
    if (!currentUser ||!task ||!text.trim() || sending) return;
    const tempId = `temp-${Date.now()}`;
    const tempComment: TaskComment = {
      id: tempId, taskId: task.id, userId: currentUser.uid,
      userName: currentUser.displayName || "Bạn", userAvatar: currentUser.photoURL || "",
      text: text.trim(), createdAt: Timestamp.now(), likeCount: 0, likedBy: [],
     ...(replyTo && { parentId: replyTo.parentId || replyTo.id, replyToUserId: replyTo.userId, replyToUserName: replyTo.userName }),
    };
    setComments(prev => [...prev, tempComment]);
    setText(""); setReplyTo(null); setSending(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      await createComment(task.id, { uid: currentUser.uid, displayName: currentUser.displayName, photoURL: currentUser.photoURL }, {
        text: DOMPurify.sanitize(tempComment.text),
       ...(replyTo && { parentId: replyTo.parentId || replyTo.id, replyToUserId: replyTo.userId, replyToUserName: replyTo.userName }),
      });
    } catch (err: any) {
      setComments(prev => prev.filter(c => c.id!== tempId));
      setText(tempComment.text);
      toast.error(err.message || "Gửi thất bại");
    } finally {
      setSending(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!currentUser) return router.push("/login");
    if (likingComments.has(commentId)) return;
    setLikingComments(prev => new Set(prev).add(commentId));
    const liked = comments.find(c => c.id === commentId)?.likedBy?.includes(currentUser.uid);
    setComments(prev => prev.map(c => c.id === commentId? {...c, likedBy: liked? c.likedBy.filter(id => id!== currentUser.uid) : [...(c.likedBy || []), currentUser.uid], likeCount: liked? c.likeCount - 1 : c.likeCount + 1 } : c));
    try {
      await toggleLikeComment(commentId, currentUser.uid);
      navigator.vibrate?.(10);
    } catch {
      setComments(prev => prev.map(c => c.id === commentId? {...c, likedBy: liked? [...(c.likedBy || []), currentUser.uid] : c.likedBy.filter(id => id!== currentUser.uid), likeCount: liked? c.likeCount + 1 : c.likeCount - 1 } : c));
      toast.error("Lỗi");
    } finally {
      setLikingComments(prev => { const next = new Set(prev); next.delete(commentId); return next; });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!task?.id) return;
    const backup = comments;
    setComments(prev => prev.filter(c => c.id!== commentId && c.parentId!== commentId));
    try {
      await deleteComment(commentId, currentUser!.uid);
      toast.success("Đã xóa");
      navigator.vibrate?.(10);
    } catch {
      setComments(backup);
      toast.error("Xóa thất bại");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      await editComment(commentId, currentUser!.uid, DOMPurify.sanitize(editText));
      setEditingComment(null); setEditText("");
      toast.success("Đã sửa");
    } catch {
      toast.error("Sửa thất bại");
    }
  };

  const handleReply = (c: TaskComment) => { setReplyTo(c); inputRef.current?.focus(); };
  const handleSelectMention = (user: UserData) => {
    const lastAt = text.lastIndexOf("@");
    setText(text.slice(0, lastAt) + `@${user.name} `);
    setShowMention(false);
    inputRef.current?.focus();
  };

  if (loading) return <TaskSkeleton />;
  if (!task) return <div className="p-4 text-center">Không tìm thấy task</div>;

  const parentComments = comments.filter((c) =>!c.parentId);
  const getReplies = (id: string) => comments.filter((c) => c.parentId === id);
  const StatusIcon = taskStatus?.icon;

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="max-w-xl mx-auto bg-[#F2F2F7] dark:bg-black min-h-screen pb-24">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-zinc-800 px-4 py-3 flex gap-3 items-center">
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 active:scale-90 transition-all">
            <FiChevronLeft size={24} />
          </button>
          <h1 className="font-semibold truncate flex-1 text-[17px]">{task.title}</h1>
          <button onClick={handleShare} className="p-2 rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 active:scale-90 transition-all">
            <FiShare2 size={18} className="text-zinc-600 dark:text-zinc-400" />
          </button>
          {isOwner && (
            <Drawer open={showMenu} onOpenChange={setShowMenu}>
              <DrawerTrigger asChild>
                <button className="p-2 rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 active:scale-90 transition-all">
                  <FiMoreVertical size={18} className="text-zinc-600 dark:text-zinc-400" />
                </button>
              </DrawerTrigger>
              <DrawerContent>
                <div className="p-4 space-y-2">
                  <button onClick={() => { router.push(`/nhiem-vu/edit/${task.id}`); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 text-[17px] hover:bg-[#F2F2F7] dark:hover:bg-zinc-800 w-full rounded-xl active:scale-95 transition-all">
                    <FiEdit2 size={20} /> Chỉnh sửa
                  </button>
                  <button onClick={() => { setShowDeleteDialog(true); setShowMenu(false); }} className="flex items-center gap-3 px-4 py-3 text-[17px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 w-full rounded-xl active:scale-95 transition-all">
                    <FiTrash2 size={20} /> Xóa task
                  </button>
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </motion.div>

        {taskStatus && StatusIcon && (
          <div className="px-4 pt-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium ${taskStatus.color}`}>
              <StatusIcon size={14} />
              {taskStatus.text}
            </motion.div>
          </div>
        )}

        {task.images && task.images.length > 0 && (
          <div className="mt-4 px-4">
            <div className={`grid gap-1.5 rounded-2xl overflow-hidden ${task.images.length === 1? "grid-cols-1" : "grid-cols-2"}`}>
              {task.images.slice(0, 4).map((img, i) => (
                <motion.div key={i} whileTap={{ scale: 0.95 }} className="relative" onClick={() => setShowImageGallery(i)}>
                  <Image src={img} alt="" width={400} height={300} className={`w-full object-cover bg-[#E5E5EA] dark:bg-zinc-800 cursor-pointer ${task.images!.length === 1? "h-64" : "h-32"}`} />
                  {i === 3 && task.images!.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-xl">
                      +{task.images!.length - 4}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {task.description && (
          <div className="p-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800">
            <h3 className="font-semibold mb-2 text-[15px]">Mô tả công việc</h3>
            <Linkify options={{ target: "_blank", className: `text-[${PRIMARY}] hover:underline` }}>
              <p className="text-[15px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{task.description}</p>
            </Linkify>
          </div>
        )}

        <div className="p-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800 space-y-3 text-[15px]">
          {task.location && (task.location.address || task.location.city) && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
              <FiMapPin size={18} className="text-zinc-400" />
              <span>{[task.location.address, task.location.city, task.location.country].filter(Boolean).join(", ")}</span>
            </div>
          )}
          {isTask(task) && task.price > 0 && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
              <FiDollarSign size={18} className="text-zinc-400" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">{task.price.toLocaleString("vi-VN")} {task.currency || "đ"}</span>
            </div>
          )}
          {isPlan(task) && task.costAmount && task.costType!== "free" && (
            <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
              <FiDollarSign size={18} className="text-zinc-400" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{task.costType === "share"? "Chia sẻ: " : "Chủ chi: "}{task.costAmount.toLocaleString("vi-VN")}đ{task.costDescription && ` - ${task.costDescription}`}</span>
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

        <div className="p-4 flex items-center justify-between bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800">
          {loadingUsers? (
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="w-11 h-11 rounded-full" />
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-16" /></div>
            </div>
          ) : (
            <button onClick={() => router.push(`/profile/${task.userId}`)} className="flex items-center gap-3 flex-1 active:scale-95 transition-transform">
              <UserAvatar src={owner?.avatar} name={owner?.name} size={44} />
              <div className="text-left">
                <div className="font-semibold text-[15px]">{owner?.name}</div>
                <div className="text-[13px] text-zinc-500">Chủ task</div>
              </div>
            </button>
          )}
          {!isOwner && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={isApplied? handleCancelApply : handleJoinTask} disabled={(!isApplied && (isFull || task.status!== "open")) || joining} className={`px-5 py-2.5 rounded-xl text-[15px] font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isApplied? "bg-[#F2F2F7] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300" : `bg-[${PRIMARY}] hover:bg-[#0071e3] text-white shadow-lg shadow-[${PRIMARY}]/20`}`}>
              {joining? "Đang xử lý..." : isApplied? "Hủy ứng tuyển" : isFull? "Đã đủ người" : task.status!== "open"? "Đã đóng" : "Ứng tuyển"}
            </motion.button>
          )}
        </div>

        {applicantsData.length > 0 && (
          <div className="p-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800">
            <div className="text-[15px] font-semibold mb-3">Đã ứng tuyển ({applicantsData.length})</div>
            <div className="flex -space-x-2">
              {applicantsData.slice(0, 8).map((u) => (
                <motion.button key={u.uid} whileHover={{ scale: 1.1 }} onClick={() => router.push(`/profile/${u.uid}`)}>
                  <UserAvatar src={u.avatar} name={u.name} size={36} className="border-2 border-white dark:border-zinc-900" />
                </motion.button>
              ))}
              {applicantsData.length > 8 && (
                <div className="w-9 h-9 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[12px] font-semibold tabular-nums">
                  +{applicantsData.length - 8}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="p-4 space-y-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl border border-[#E5E5EA] dark:border-zinc-800">
          <div className="font-semibold text-[15px]">Bình luận ({comments.length})</div>
          {parentComments.length === 0? (
            <div className="text-center py-12 text-zinc-400 text-[15px]">
              <FiMessageCircle size={48} className="mx-auto mb-3 opacity-30" />
              Chưa có bình luận nào<br />Hãy là người đầu tiên
            </div>
          ) : (
            <AnimatePresence>
              {parentComments.map((c) => (
                <CommentList
                  key={c.id}
                  comment={c}
                  replies={getReplies(c.id)}
                  currentUserId={currentUser?.uid}
                  onLike={handleLikeComment}
                  onReply={handleReply}
                  onDelete={handleDeleteComment}
                  onEdit={(id) => { setEditingComment(id); setEditText(c.text); }}
                  isEditing={editingComment === c.id}
                  editText={editText}
                  setEditText={setEditText}
                  onSaveEdit={handleEditComment}
                  onCancelEdit={() => { setEditingComment(null); setEditText(""); }}
                  likingComments={likingComments}
                />
              ))}
            </AnimatePresence>
          )}
          
          <div ref={bottomRef} />
        </div>

        <div className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-[#E5E5EA] dark:border-zinc-800 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {replyTo && (
            <div className="text-[13px] text-zinc-600 dark:text-zinc-400 mb-2 flex items-center justify-between bg-[#F2F2F7] dark:bg-zinc-800 px-3.5 py-2 rounded-xl">
              <span>Đang trả lời <b className="text-zinc-900 dark:text-zinc-100">{replyTo.userName}</b></span>
              <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg active:scale-90 transition-all"><FiX size={14} /></button>
            </div>
          )}
          <div className="flex gap-2 items-end relative">
            <Popover open={showMention} onOpenChange={setShowMention}>
              <PopoverTrigger asChild>
                <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" &&!e.shiftKey && handleSendComment()} placeholder="Viết bình luận..." className="flex-1 px-4 py-2.5 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 outline-none text-[15px] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all" disabled={sending} />
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <Command>
                  <CommandInput placeholder="Tìm người..." value={mentionQuery} onValueChange={setMentionQuery} />
                  <CommandEmpty>Không tìm thấy</CommandEmpty>
                  <CommandGroup>
                    {mentionUsers.map((user) => (
                      <CommandItem key={user.uid} onSelect={() => handleSelectMention(user)} className="flex items-center gap-2">
                        <UserAvatar src={user.avatar} name={user.name} size={24} />
                        <span>{user.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            <motion.button whileTap={{ scale: 0.9 }} onClick={handleSendComment} disabled={!text.trim() || sending} className={`p-2.5 rounded-full bg-[${PRIMARY}] hover:bg-[#0071e3] text-white disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed active:scale-90 transition-all`}>
              <FiSend size={18} />
            </motion.button>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Xóa task?</DialogTitle></DialogHeader>
          <p className="text-[15px] text-zinc-600 dark:text-zinc-400">Hành động này không thể hoàn tác. Tất cả dữ liệu sẽ bị xóa vĩnh viễn.</p>
          <div className="flex gap-2 justify-end mt-4">
            <button onClick={() => setShowDeleteDialog(false)} className="px-4 py-2 rounded-xl bg-[#F2F2F7] dark:bg-zinc-800 text-[15px] font-medium active:scale-95 transition-all">Hủy</button>
            <button onClick={() => { handleDeleteTask(); setShowDeleteDialog(false); }} className="px-4 py-2 rounded-xl bg-red-500 text-white text-[15px] font-medium active:scale-95 transition-all">Xóa</button>
          </div>
        </DialogContent>
      </Dialog>

      <ImageGallery open={showImageGallery!== null} images={task.images || []} initialIndex={showImageGallery || 0} onClose={() => setShowImageGallery(null)} />
    </>
  );
}

function TaskSkeleton() {
  return (
    <div className="max-w-xl mx-auto bg-[#F2F2F7] dark:bg-black min-h-screen animate-pulse">
      <div className="h-14 bg-white dark:bg-black border-b border-[#E5E5EA] dark:border-zinc-800"></div>
      <div className="p-4 space-y-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}