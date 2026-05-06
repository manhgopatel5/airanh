"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayRemove, Timestamp, setDoc, serverTimestamp } from "firebase/firestore";
import { FiMessageSquare, FiPhone, FiPlus, FiAlertTriangle, FiStar } from "react-icons/fi";
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
  FiChevronLeft, FiSend, FiClock, FiUsers, FiX, FiShare2,
  FiMapPin, FiDollarSign, FiCheckCircle,
  FiMessageCircle, FiCalendar
} from "react-icons/fi";
import DOMPurify from "isomorphic-dompurify";
import { toast, Toaster } from "sonner";
import Image from "next/image";
import Linkify from "linkify-react";


import { motion, AnimatePresence } from "framer-motion";
import { CommentList } from "@/components/task/CommentList";
import { ImageGallery } from "@/components/task/ImageGallery";
import { UserAvatar } from "@/components/ui/UserAvatar";

type UserData = {
  uid: string;
  name: string;
  avatar: string;
  online?: boolean;
  rating?: number;
  reviewCount?: number;
  joinedDate?: Timestamp;
  phone?: string;
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
  

  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [joining, setJoining] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
 
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


  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, );

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
      
      const userIds = [task.userId,...(task.applicants?? [])];
      const uniqueIds = [...new Set(userIds)];
      const snaps = await Promise.all(uniqueIds.map((uid) => getDoc(doc(db, "users", uid))));
      const users = snaps.filter(s => s.exists()).map(s => ({ uid: s.id,...s.data() } as UserData));
      setOwner(users.find((u) => u.uid === task.userId) || null);
      setApplicantsData(users.filter((u) => (task.applicants?? []).includes(u.uid)));
      
    };
    loadUsers();
  }, [task?.id, task?.userId, task?.applicants, db]);

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
    const unsub = listenComments(
      task.id,
      (data) => {
        setComments(data);
      },
      {
        limit: 20,
        onError: (err) => {
          console.error("Listen comments error:", err);
          toast.error("Lỗi tải bình luận");
        }
      }
    );
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
    if (!currentUser ||!task) return router.push("/login");
    if (likingComments.has(commentId)) return;
    setLikingComments(prev => new Set(prev).add(commentId));
    const liked = comments.find(c => c.id === commentId)?.likedBy?.includes(currentUser.uid);
    setComments(prev => prev.map(c => c.id === commentId? {...c, likedBy: liked? c.likedBy.filter(id => id!== currentUser.uid) : [...(c.likedBy || []), currentUser.uid], likeCount: liked? c.likeCount - 1 : c.likeCount + 1 } : c));
    try {
      await toggleLikeComment(commentId, currentUser.uid, task.id);
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
      await deleteComment(commentId, currentUser!.uid, task.id);
      toast.success("Đã xóa");
      navigator.vibrate?.(10);
    } catch {
      setComments(backup);
      toast.error("Xóa thất bại");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim() ||!task) return;
    try {
      await editComment(commentId, currentUser!.uid, DOMPurify.sanitize(editText), task.id);
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

  const handleQuickChat = async () => {
    if (!currentUser ||!owner || isOwner || creatingChat) return;
    setCreatingChat(true);
    try {
      const chatId = [currentUser.uid, owner.uid].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [currentUser.uid, owner.uid],
          lastMessage: "Job này còn tuyển không anh?",
          lastMessageAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });

        await setDoc(doc(db, "chats", chatId, "messages", `msg_${Date.now()}`), {
          text: `Hi anh, em thấy job "${task?.title}". Job này còn tuyển không ạ?`,
          senderId: currentUser.uid,
          createdAt: serverTimestamp(),
        });
      }

      router.push(`/tin-nhan/${chatId}`);
      navigator.vibrate?.(10);
    } catch (err) {
      toast.error("Không tạo được chat");
    } finally {
      setCreatingChat(false);
    }
  };

  if (loading) return <TaskSkeleton />;
  if (!task) return <div className="p-4 text-center">Không tìm thấy task</div>;

  const parentComments = comments.filter((c) =>!c.parentId);
  const getReplies = (id: string) => comments.filter((c) => c.parentId === id);
  

const taskDate = isTask(task) && task.deadline?.seconds 
  ? new Date(task.deadline.seconds * 1000).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  : isPlan(task) && task.eventDate?.seconds
  ? new Date(task.eventDate.seconds * 1000).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
  : "Chưa xác định";

const taskTime = isTask(task) && task.deadline?.seconds
  ? `${new Date(task.deadline.seconds * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(task.deadline.seconds * 1000 + 3*60*60*1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  : isPlan(task) && task.eventDate?.seconds
  ? `${new Date(task.eventDate.seconds * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(task.eventDate.seconds * 1000 + 3*60*60*1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
  : "";

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="max-w-xl mx-auto bg-[#F2F2F7] dark:bg-black min-h-screen pb-4">
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="sticky top-0 z-30 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-[#E5E5EA] dark:border-zinc-800 px-4 py-3 flex gap-3 items-center">
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 active:scale-90 transition-all">
            <FiChevronLeft size={24} />
          </button>
          <h1 className="font-semibold truncate flex-1 text-[17px]">Chi tiết</h1>
          <button onClick={handleShare} className="p-2 rounded-full hover:bg-zinc-900/5 dark:hover:bg-white/5 active:scale-90 transition-all">
            <FiShare2 size={18} className="text-zinc-600 dark:text-zinc-400" />
          </button>
          
  
        </motion.div>

        {/* Card Task chính - Style giống mẫu */}
     <div className="bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Header: Avatar + Info */}
          <div className="p-4">
            <div className="flex gap-3">
              <button onClick={() => router.push(`/profile/${task.userId}`)} className="shrink-0">
                <div className="relative">
                  <UserAvatar src={owner?.avatar} name={owner?.name} size={56} />
                  {owner?.rating && owner.rating >= 4.8 && (
                    <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
                      <FiCheckCircle className="text-white" size={14} />
                    </div>
                  )}
                </div>
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                 <span className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100">{owner?.name || "Minh Tran"}</span>
                  {owner?.rating && (
                    <div className="flex items-center gap-1 text-[17px]">
                    <FiStar className="fill-yellow-400 text-yellow-400" size={15} />
                   <span className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100">{owner.rating}</span>
<span className="text-zinc-500 text-[15px]">({owner.reviewCount || 21} đánh giá)</span>
                    </div>
                  )}
                <span className="text-zinc-500 text-[15px]">• Mới tham gia</span>
                </div>

                <h2 className="font-semibold text-[17px] leading-snug mb-2 text-zinc-900 dark:text-zinc-100">{task.title}</h2>

               <div className="flex items-center gap-3 text-[15px] text-zinc-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1">
                    <FiCalendar size={15} />
                    <span>{taskDate}</span>
                  </div>
                  <span className="text-[15px]">•</span>
                  <div className="flex items-center gap-1">
                    <FiClock size={15} />
                    <span>{taskTime}</span>
                  </div>
                  {isTask(task) && task.price > 0 && (
                    <>
                    <span className="px-2 py-0.5 rounded-md bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-900/30 dark:text-green-400 text-[15px] font-semibold">
                        {task.price.toLocaleString("vi-VN")} đ
                      </span>
                      <span className="text-[15px]">• Cố định</span>
                    </>
                  )}
                </div>

                <button
                  onClick={() => router.push(`/profile/${task.userId}`)}
                  className="text-[#0a84ff] text-[15px] font-normal underline mt-1"
                >
                  Xem hồ sơ
                </button>
              </div>
            </div>

            {/* Tags + Phần thưởng */}
            <div className="flex gap-2 mt-3">
              <div className="flex-1 flex flex-wrap gap-1.5">
                {task.tags?.map((tag, i) => (
                 <span key={i} className="px-3 py-1.5 rounded-lg bg-[#E3F2FD] text-[#1976D2] dark:bg-[#0a84ff]/10 dark:text-[#0a84ff] text-[15px] font-normal">
                    {tag}
                  </span>
                ))}
                {!task.tags?.length && (
                  <>
 <span className="px-3 py-1.5 rounded-lg bg-[#E3F2FD] text-[#1976D2] dark:bg-[#0a84ff]/10 dark:text-[#0a84ff] text-[15px] font-normal">Nhanh chóng</span>
<span className="px-3 py-1.5 rounded-lg bg-[#E3F2FD] text-[#1976D2] dark:bg-[#0a84ff]/10 dark:text-[#0a84ff] text-[15px] font-normal">Uy tín</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800" />

          {/* 4 nút action */}
          <div className="p-3 grid grid-cols-4 gap-2">
            <button
              onClick={handleQuickChat}
              disabled={creatingChat || isOwner}
              className="h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center justify-center gap-1.5 text-[15px] font-normal text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 active:scale-95 transition-all"
            >
              <FiMessageSquare size={18} />
              <span className="hidden sm:inline">Nhắn tin</span>
            </button>

            <button
              onClick={() => window.open(`tel:${owner?.phone || ''}`)}
              disabled={!owner?.phone}
              className="h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center justify-center gap-1.5 text-[15px] font-normal text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 active:scale-95 transition-all"
  >
              <FiPhone size={18} />
              <span className="hidden sm:inline">Gọi điện</span>
            </button>

            <button
              onClick={isApplied? handleCancelApply : handleJoinTask}
              disabled={(!isApplied && (isFull || task.status!== "open")) || joining || isOwner}
  className={`h-10 rounded-xl flex items-center justify-center gap-1.5 text-[15px] font-semibold active:scale-95 transition-all disabled:opacity-40 ${
    isApplied
    ? "bg-white dark:bg-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-zinc-700 dark:text-zinc-300"
      : "bg-[#00A86B] hover:bg-[#009960] text-white"
  }`}
            >
              <FiPlus size={18} />
              <span className="hidden sm:inline">{isApplied? "Hủy" : "Nhận việc"}</span>
            </button>

            <button
              onClick={() => toast.info("Đã gửi báo cáo")}
    className="h-10 rounded-xl bg-white dark:bg-zinc-800 shadow-[0_1px_2px_rgba(0,0,0,0.04)] flex items-center justify-center gap-1.5 text-[15px] font-normal text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-40 active:scale-95 transition-all"
>
              <FiAlertTriangle size={18} />
              <span className="hidden sm:inline">Báo cáo</span>
            </button>
          </div>

      {/* Map mini */}
{task.location?.lat && task.location?.lng && (
  <>
    <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800" />
    <div className="p-3">
      <div className="relative h-32 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        <iframe
          src={`https://www.google.com/maps?q=${task.location.lat},${task.location.lng}&output=embed`}
          className="w-full h-full border-0"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 bg-white dark:bg-zinc-900 px-2 py-1 rounded-lg text-[13px] font-medium shadow">
          Bản đồ
        </div>
      </div>
      <button className="w-full mt-2 text-[#0a84ff] font-semibold text-[17px]">
        Xem chi tiết
      </button>
    </div>
  </>
)}

          {/* Danh sách ứng viên */}
          {applicantsData.length > 0 && (
            <>
              <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800" />
              <div className="p-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {applicantsData.slice(0, 3).map((u) => (
                    <UserAvatar key={u.uid} src={u.avatar} name={u.name} size={28} className="border-2 border-white dark:border-zinc-900" />
                  ))}
                </div>
                <div className="flex items-center gap-1 text-[17px] text-zinc-600 dark:text-zinc-400">
                  <FiUsers size={16} />
                  <span>{applicantsData.length} người đang ứng tuyển</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mô tả chi tiết */}
        {task.description && (
         <div className="p-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl shadow-sm">
            <h3 className="font-semibold mb-2 text-[17px]">Mô tả chi tiết</h3>
            <Linkify options={{ target: "_blank", className: `text-[${PRIMARY}] hover:underline` }}>
             <p className="text-[15px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-[22px]">{task.description}</p>
            </Linkify>
          </div>
        )}

        {/* Ảnh task - THU NHỎ XÍU, ĐỂ DƯỚI MÔ TẢ */}
        {task.images && task.images.length > 0 && (
          <div className="mt-3 px-4">
            <div className={`grid gap-1.5 rounded-2xl overflow-hidden ${task.images.length === 1? "grid-cols-1" : "grid-cols-3"}`}>
              {task.images.slice(0, 3).map((img, i) => (
                <motion.div key={i} whileTap={{ scale: 0.95 }} className="relative aspect-square" onClick={() => setShowImageGallery(i)}>
                  <Image
                    src={img}
                    alt=""
                    width={400}
                    height={300}
                    className="w-full h-full object-cover bg-[#E5E5EA] dark:bg-zinc-800 cursor-pointer"
                  />
                  {i === 2 && task.images!.length > 3 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">
                      +{task.images!.length - 3}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}
      {/* Info chi tiết task */}
<div className="p-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl shadow-sm space-y-3 text-[15px]">
  {task.location && (task.location.address || task.location.city) && (
    <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
      <FiMapPin size={18} className="text-zinc-400" />
      <span className="text-[15px]">{[task.location.address, task.location.city, task.location.country].filter(Boolean).join(", ")}</span>
    </div>
  )}

  {isTask(task) && typeof task.price === 'number' && task.price > 0 && (
    <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
      <FiDollarSign size={18} className="text-zinc-400" />
      <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums text-[15px]">
        {task.price.toLocaleString("vi-VN")} {task.currency || "đ"}
      </span>
    </div>
  )}

  {isPlan(task) && task.costAmount && task.costType!== "free" && (
    <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
      <FiDollarSign size={18} className="text-zinc-400" />
     <span className="font-medium text-zinc-900 dark:text-zinc-100 tabular-nums text-[15px]">
        {task.costType === "share"? "Chia sẻ: " : "Chủ chi: "}
        {task.costAmount.toLocaleString("vi-VN")}đ
        {task.costDescription && ` - ${task.costDescription}`}
      </span>
    </div>
  )}

  <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
    <FiUsers size={18} className="text-zinc-400" />
<span className="text-[15px]">
  {applicants.length}/{isTask(task) && task.totalSlots? task.totalSlots : 1} người ứng tuyển
</span>
  </div>

  <div className="flex items-center gap-3 text-zinc-600 dark:text-zinc-400">
    <FiClock size={18} className="text-zinc-400" />
    <span className="tabular-nums text-[15px]">{timeLeft}</span>
  </div>
</div>
        {/* Khung bình luận */}
        <div className="p-4 space-y-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl shadow-sm">
         <div className="font-semibold text-[17px] text-zinc-900 dark:text-zinc-100">Bình luận ({comments.length})</div>
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
                  taskOwnerId={task.userId}
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

          {/* Ô nhập nằm trong khung bình luận */}
          <div className="sticky bottom-0 bg-white dark:bg-zinc-900 pt-3 -mx-4 px-4 pb-3 border-t border-[#E5E5EA] dark:border-zinc-800">
            {replyTo && (
              <div className="text-[15px] dark:text-zinc-400 mb-2 flex items-center justify-between bg-[#F2F2F7] dark:bg-zinc-800 px-3.5 py-2 rounded-xl">
                <span>Đang trả lời <b className="text-zinc-900 dark:text-zinc-100">{replyTo.userName}</b></span>
                <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg active:scale-90 transition-all"><FiX size={14} /></button>
              </div>
            )}
            <div className="flex gap-2 items-end relative">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" &&!e.shiftKey && handleSendComment()}
                  placeholder={currentUser? "Viết bình luận..." : "Đăng nhập để bình luận"}
                  className="w-full px-4 py-2.5 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 outline-none text-[15px] focus:ring-2 focus:ring-[#0a84ff]/20 transition-all"
                  disabled={sending ||!currentUser}
                />
                {showMention && mentionUsers.length > 0 && (
                  <div className="absolute bottom-12 left-0 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-[#E5E5EA] dark:border-zinc-800 max-h-60 overflow-auto z-50">
                    <div className="p-2">
                      <input
                        placeholder="Tìm người..."
                        value={mentionQuery}
                        onChange={(e) => setMentionQuery(e.target.value)}
                        className="w-full px-3 py-1.5 text-[15px] bg-[#F2F2F7] dark:bg-zinc-800 rounded-lg outline-none mb-2"
                      />
                      {mentionUsers.map((user) => (
                        <button
                          key={user.uid}
                          onClick={() => handleSelectMention(user)}
                          className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#F2F2F7] dark:hover:bg-zinc-800 rounded-lg text-left"
                        >
                          <UserAvatar src={user.avatar} name={user.name} size={24} />
                         <span className="text-[15px]">{user.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSendComment}
                disabled={!text.trim() || sending ||!currentUser}
                className={`p-2.5 rounded-full bg-[#0a84ff] hover:bg-[#0071e3] text-white disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed active:scale-90 transition-all`}
              >
                <FiSend size={18} />
              </motion.button>
            </div>
          </div>
        </div>

      </div>



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