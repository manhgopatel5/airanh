"use client";

import Link from "next/link"; 
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import {
  doc, updateDoc, arrayRemove, Timestamp, setDoc, serverTimestamp,
  getDoc, getDocs, collection, limit, query, where, arrayUnion, deleteDoc
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import {
  FiSend, FiX, FiCheckCircle, FiMessageCircle, FiMessageSquare, FiPhone, FiAlertTriangle,
  FiStar, FiBookmark, FiMoreHorizontal, FiShare2, FiCheck, FiChevronDown, FiTrash2, FiEdit2
} from "react-icons/fi";
import ShareTaskModal from "@/components/ShareTaskModal";
import { incrementTaskView } from "@/lib/task";

import {
  createComment,
  toggleLikeComment,
  deleteComment,
  editComment,
} from "@/lib/taskCommentService";

import type { TaskComment } from "@/types/task";
import { isTask, isPlan, type Task, type TaskStatus } from "@/types/task";
import { applyToTask, cancelToTask } from "@/app/actions/task";
import DOMPurify from "isomorphic-dompurify";
import { toast, Toaster } from "sonner";
import Image from "next/image";
import Linkify from "linkify-react";

import { motion, AnimatePresence } from "framer-motion";
import { CommentList } from "@/components/task/CommentList";
import { ImageGallery } from "@/components/task/ImageGallery";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { createPortal } from "react-dom";

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

type Application = {
  id: string;
  taskId: string;
  taskOwnerId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

const Portal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted? createPortal(children, document.body) : null;
};



export default function TaskDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [db, setDb] = useState<any>(null);

  useEffect(() => {
    setDb(getFirebaseDB());
  }, []);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [owner, setOwner] = useState<UserData | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
const [commentSort, setCommentSort] = useState<'relevant' | 'newest' | 'all'>('newest');
const [visibleCount, setVisibleCount] = useState(5);
const [showSortMenu, setShowSortMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const isOwner = currentUser?.uid === task?.userId;
  const [applications, setApplications] = useState<Application[]>([]);
 
  const isFull = task && isTask(task)? (task.appliedCount || 0) >= task.totalSlots : false;
  const [text, setText] = useState("");
  
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showMention, setShowMention] = useState(false);
  const [mentionUsersList, setMentionUsersList] = useState<UserData[]>([]);
  const [mentionQuery, setMentionQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [showAllApps, setShowAllApps] = useState(false);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [joining, setJoining] = useState(false);

  const [showImageGallery, setShowImageGallery] = useState<number | null>(null);

  const [likingComments, setLikingComments] = useState<Set<string>>(new Set());
  const isApplied = applications.some(app => app.userId === currentUser?.uid && ['pending', 'accepted'].includes(app.status));

  const [isSaved, setIsSaved] = useState(false);
  
  const [saving, setSaving] = useState(false);
 
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const appsRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
    if (showAllApps && appsRef.current &&!appsRef.current.contains(e.target as Node)) {
      setShowAllApps(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [showAllApps]);
  const [shareTask, setShareTask] = useState<Task | null>(null);
    const loadTask = async () => {
    if (!db ||!id || typeof id!== "string") return;
    try {
      const snap = await getDoc(doc(db, "tasks", id));
      if (!snap.exists()) {
        toast.error("Không tìm thấy công việc");
        router.replace("/404");
        return;
      }
      const data = snap.data();
      if (data.banned) {
        toast.error("Công việc này đã bị khóa");
        router.replace("/");
        return;
      }
      const taskData = { id: snap.id,...data } as Task;
      setTask(taskData);
      setIsSaved(!!currentUser?.uid &&!!taskData.savedBy?.includes(currentUser.uid));
      
      incrementTaskView(taskData.id);
    } catch (err) {
      console.error("Load task error:", err);
      toast.error("Lỗi tải công việc");
      router.replace("/404");
    } finally {
      setLoading(false);
    }
  };

  const loadApplications = async () => {
    if (!db ||!task?.id) {
      setApplications([]);
      return;
    }
    const q = query(collection(db, 'applications'), where('taskId', '==', task.id));
    const snap = await getDocs(q);
    const apps = snap.docs.map(d => ({ id: d.id,...d.data() } as Application));
    setApplications(apps);
  };

  const loadComments = async () => {
    if (!task?.id) return;
    const q = query(
      collection(db, "tasks", task.id, "comments"),
      limit(20)
    );
    const snap = await getDocs(q);
    setComments(snap.docs.map(d => ({ id: d.id,...d.data() } as TaskComment)));
    setVisibleCount(5);
  };

  useEffect(() => {
    const firebaseAuth = getFirebaseAuth();
    if (!firebaseAuth) return;
    const unsub = onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    loadTask();
  }, [id, db]);

  useEffect(() => {
    if (!db ||!task?.userId) return;
    const loadOwner = async () => {
      const snap = await getDoc(doc(db, "users", task.userId));
      if (snap.exists()) setOwner({ uid: snap.id,...snap.data() } as UserData);
    };
    loadOwner();
  }, [task?.userId, db]);

  useEffect(() => {
    loadApplications();
  }, [task?.id, db, currentUser?.uid]);

  useEffect(() => {
    loadComments();
  }, [task?.id, db]);

  useEffect(() => {
    if (!db ||!showMention) return;
    const loadUsers = async () => {
      const q = query(collection(db, "users"), limit(20));
      const snap = await getDocs(q);
      setMentionUsersList(snap.docs.map(d => ({ uid: d.id,...d.data() } as UserData)));
    };
    loadUsers();
  }, [showMention, db]);

  useEffect(() => {
    if (!task ||!isTask(task) ||!task.deadline?.seconds || task.status === "completed") {
      setIsUrgent(false);
      return;
    }
    const tick = () => {
      const diff = task.deadline!.seconds * 1000 - Date.now();
      if (diff <= 0) {
        setTimeLeft("Đã hết hạn");
        setIsUrgent(true);
        return;
      }
      const totalHours = diff / 3600000;
      if (totalHours <= 1) {
        setIsUrgent(true);
      } else {
        setIsUrgent(false);
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`Còn ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [task]);

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

  useEffect(() => {
    const closeMenu = () => setShowMenu(false);
    if (showMenu) {
      window.addEventListener("scroll", closeMenu);
      window.addEventListener("resize", closeMenu);
    }
    return () => {
      window.removeEventListener("scroll", closeMenu);
      window.removeEventListener("resize", closeMenu);
    };
  }, [showMenu]);

  const handleSave = async () => {
    if (!currentUser) return router.push("/login");
    if (saving ||!task) return;
    setSaving(true);
    const newSaved =!isSaved;
    setIsSaved(newSaved);
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        savedBy: newSaved? arrayUnion(currentUser.uid) : arrayRemove(currentUser.uid),
      });
      toast.success(newSaved? "Đã lưu" : "Đã bỏ lưu");
    } catch {
      setIsSaved(!newSaved);
      toast.error("Lỗi");
    } finally {
      setSaving(false);
    }
  };

  const handleStartChat = async () => {
    if (!currentUser ||!task?.userId ||!db) return;
    try {
      const chatId = [currentUser.uid, task.userId].sort().join("_");
      const [currentUserDoc, ownerDoc] = await Promise.all([
        getDoc(doc(db, "users", currentUser.uid)),
        getDoc(doc(db, "users", task.userId)),
      ]);
      const currentData = currentUserDoc.data();
      const ownerData = ownerDoc.data();
      await setDoc(doc(db, "chats", chatId), {
        members: [currentUser.uid, task.userId],
        isGroup: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        membersInfo: {
          [currentUser.uid]: {
            name: currentData?.name || "User",
            avatar: currentData?.avatar || "",
            username: currentData?.username || "",
          },
          [task.userId]: {
            name: ownerData?.name || "User",
            avatar: ownerData?.avatar || "",
            username: ownerData?.username || "",
          },
        },
      }, { merge: true });
      router.push(`/chat/${chatId}`);
    } catch (err) {
      console.error(err);
      toast.error("Không thể mở chat");
    }
  };

  const handleDelete = async () => {
    if (!isOwner ||!task) return;
    if (!confirm("Xóa công việc này?")) return;
    try {
      await deleteDoc(doc(db, "tasks", task.id));
      toast.success("Đã xóa");
      router.push("/tasks");
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  const handleJoinTask = async () => {
    if (!currentUser ||!task || isApplied || isFull || joining || isOwner) return;
    setJoining(true);
    try {
      await applyToTask(task.id, currentUser.uid);
      toast.success("Đã gửi yêu cầu ứng tuyển!");
      navigator.vibrate?.(10);
      await loadTask();
      await loadApplications();
    } catch (err: any) {
      toast.error(err.message || "Ứng tuyển thất bại");
      console.error(err);
    } finally {
      setJoining(false);
    }
  };

  const handleCancelApply = async () => {
    if (!currentUser ||!task ||!isApplied || joining) return;
    setJoining(true);
    try {
      await cancelToTask(task.id, currentUser.uid);
      toast.success("Đã hủy ứng tuyển");
      navigator.vibrate?.(10);
      await loadTask();
      await loadApplications();
    } catch {
      toast.error("Hủy thất bại");
    } finally {
      setJoining(false);
    }
  };

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
      loadComments();
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
      loadComments();
    } catch {
      toast.error("Sửa thất bại");
    }
  };

  const timeAgo = (timestamp: any) => {
  if (!timestamp?.toDate) return "";
  const seconds = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
  if (seconds < 60) return "Vừa xong";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút trước`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ trước`;
  return `${Math.floor(seconds / 86400)} ngày trước`;
};

  const handleReply = (c: TaskComment) => { setReplyTo(c); inputRef.current?.focus(); };
  const handleSelectMention = (user: UserData) => {
    const lastAt = text.lastIndexOf("@");
    setText(text.slice(0, lastAt) + `@${user.name} `);
    setShowMention(false);
    inputRef.current?.focus();
  };

  if (loading) return <div className="p-4 text-center">Đang tải...</div>;
  if (!task) return <div className="p-4 text-center">Không tìm thấy task</div>;

  const parentComments = comments.filter((c) =>!c.parentId);

const sortedParents = [...parentComments].sort((a, b) => {
  if (commentSort === 'newest') {
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  }
  if (commentSort === 'relevant') {
    // Ưu tiên tác giả + nhiều like
    if (a.userId === task?.userId && b.userId!== task?.userId) return -1;
    if (b.userId === task?.userId && a.userId!== task?.userId) return 1;
    return (b.likeCount || 0) - (a.likeCount || 0);
  }
  return 0; // 'all' giữ nguyên
});

const visibleComments = sortedParents.slice(0, visibleCount);
const hasMoreComments = sortedParents.length > visibleCount;
  const getReplies = (id: string) => comments.filter((c) => c.parentId === id);

  const handleAcceptApp = async (appId: string, applicantId: string) => {
    if (!task) return;
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: 'accepted',
        updatedAt: serverTimestamp()
      });
      const chatId = [currentUser!.uid, applicantId].sort().join("_");
      await setDoc(doc(db, "chats", chatId), {
        members: [currentUser!.uid, applicantId],
        lastMessage: `Bạn đã được duyệt cho task "${task.title}"`,
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
      toast.success("Đã duyệt ứng viên");
      navigator.vibrate?.(10);
      loadApplications();
    } catch {
      toast.error("Duyệt thất bại");
    }
  };

  const handleRejectApp = async (appId: string) => {
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });
      toast.success("Đã từ chối");
      loadApplications();
    } catch {
      toast.error("Lỗi");
    }
  };



  const taskDate = isTask(task) && task.createdAt?.seconds
  ? new Date(task.createdAt.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : "Chưa xác định";

const taskDeadline = isTask(task) && task.deadline?.seconds
  ? new Date(task.deadline.seconds * 1000).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  : "";

  

  const statusMap: Record<TaskStatus, { label: string; color: string; dot: string }> = {
    open: { label: "Đang tuyển", color: "bg-[#E6F4EA] text-[#1E8E3E] dark:bg-[#1E8E3E]/20 dark:text-[#81C995]", dot: "bg-[#1E8E3E]" },
    full: { label: "Đã đủ", color: "bg-[#FEE8E8] text-[#D93025] dark:bg-[#D93025]/20 dark:text-[#F28B82]", dot: "bg-[#D93025]" },
    doing: { label: "Đang làm", color: "bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8]", dot: "bg-[#1A73E8]" },
    completed: { label: "Hoàn thành", color: "bg-[#F1F3F4] text-[#5F6368] dark:bg-zinc-800 dark:text-zinc-400", dot: "bg-[#5F6368]" },
    cancelled: { label: "Đã hủy", color: "bg-[#F1F3F4] text-[#5F6368] dark:bg-zinc-800 dark:text-zinc-400", dot: "bg-[#5F6368]" },
    deleted: { label: "Đã xóa", color: "bg-[#F1F3F4] text-[#5F6368] dark:bg-zinc-800 dark:text-zinc-400", dot: "bg-[#5F6368]" },
    expired: { label: "Hết hạn", color: "bg-[#FEF7E0] text-[#F9AB00] dark:bg-[#F9AB00]/20 dark:text-[#FDD663]", dot: "bg-[#F9AB00]" },
    pending: { label: "Chờ duyệt", color: "bg-[#FEF7E0] text-[#F9AB00] dark:bg-[#F9AB00]/20 dark:text-[#FDD663]", dot: "bg-[#F9AB00]" },
  };

  
  const isExpired = isTask(task) && task.deadline && task.deadline.seconds * 1000 < Date.now();
  const status = isExpired
   ? { label: "Đã hết hạn", color: "bg-[#FFE5E5] text-[#FF3B30] dark:bg-[#FF3B30]/20 dark:text-[#FF6B6B]", dot: "bg-[#FF3B30]" }
    : statusMap[task.status] || statusMap.open;
void status;
  return (
    <>
      <Toaster richColors position="top-center" />
<div className="max-w-xl mx-auto bg-white dark:bg-zinc-950 min-h-dvh pb-28 px-3 pt-2">

       {/* HEADER MỚI - ĐỒNG BỘ APP */}
<div className="bg-white dark:bg-zinc-950">
  <div className="px-4 pt-4 pb-3">
    {/* Hàng 1: Avatar + Info + Actions */}
    <div className="flex gap-3 items-start">
      <Link href={`/profile/${task.userId}`} className="relative shrink-0 active:opacity-70 transition-opacity">
        <UserAvatar src={owner?.avatar} name={owner?.name} size={52} />
        {owner?.rating && owner.rating >= 4.8 && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-[#00A86B] rounded-full p-0.5 ring-2 ring-white dark:ring-zinc-950">
            <FiCheckCircle className="text-white" size={12} />
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
       <Link href={`/profile/${task.userId}`} className="font-bold text-[16px] text-[#1C1C1E] dark:text-zinc-100 truncate block leading-5 active:opacity-70">
  {owner?.name || "Minh Tran"}
</Link>
            <div className="flex items-center gap-1 mt-0.5">
              <FiStar className="fill-[#FFB800] text-[#FFB800] shrink-0" size={14} />
              <span className="font-semibold text-[13px] text-[#1C1C1E] dark:text-zinc-100">{owner?.rating || "4.9"}</span>
              <span className="text-[13px] text-[#8E8E93]">({owner?.reviewCount || 21})</span>
              <span className="text-[13px] text-[#8E8E93]">•</span>
              <span className="text-[13px] text-[#00A86B] font-medium">Mới tham gia</span>
            </div>
          </div>

          {/* Actions: Bookmark + Share + Menu */}
          <div className="flex items-center gap-1 shrink-0 -mr-1">
            {!isOwner && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSave}
                disabled={saving}
                className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[#F2F2F7] dark:active:bg-zinc-800 disabled:opacity-50"
              >
                <FiBookmark 
                  size={20} 
                  strokeWidth={2}
                  className={isSaved? "fill-[#0A84FF] text-[#0A84FF]" : "text-[#8E8E93]"} 
                />
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => task && setShareTask(task)}
              className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[#F2F2F7] dark:active:bg-zinc-800"
            >
              <FiShare2 size={19} className="text-[#8E8E93]" strokeWidth={2} />
            </motion.button>

            <div className="relative">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuPos({ x: rect.right - 200, y: rect.bottom + 8 });
                  setShowMenu(!showMenu);
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center active:bg-[#F2F2F7] dark:active:bg-zinc-800"
              >
                <FiMoreHorizontal size={20} className="text-[#8E8E93]" strokeWidth={2.5} />
              </motion.button>
              {/* Menu giữ nguyên, chỉ đổi rounded-2xl -> rounded-[20px] */}
              <AnimatePresence>
                {showMenu && (
                  <Portal>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      transition={{ duration: 0.15 }}
                      className="fixed z-50 min-w-[200px] bg-white dark:bg-zinc-900 rounded-[20px] shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/10 py-2 overflow-hidden"
                      style={{ top: `${menuPos.y}px`, left: `${menuPos.x}px` }}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSave(); setShowMenu(false); }}
                        className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 w-full transition-all active:scale-95"
                      >
                        {isSaved? <FiCheck size={18} /> : <FiBookmark size={18} />}
                        {isSaved? "Đã lưu" : "Lưu công việc"}
                      </button>
                      {isOwner && (
                        <>
                          <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2" />
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(false); router.push(`/task/${task.id}/edit`); }}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 w-full transition-all active:scale-95"
                          >
                            <FiEdit2 size={18} />
                            Sửa công việc
                          </button>
                          <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2" />
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(false); handleDelete(); }}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 w-full transition-all active:scale-95"
                          >
                            <FiTrash2 size={18} />
                            Xóa
                          </button>
                        </>
                      )}
                    </motion.div>
                  </Portal>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>

</div>
  

<div className="mt-4">
  <h2 className="font-bold text- leading-snug text-[#1C1C1E] dark:text-zinc-100">{task.title}</h2>

{/* Gạch ngang full màn hình */}
<div className="h-px bg-[#E5E5EA] dark:bg-zinc-800 w-screen -ml-3 my-3" />

  {/* 2 cột info - không nền, không viền */}
  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
  {/* Cột trái */}
  <div className="space-y-3">
    {isTask(task) && task.price > 0 && (
      <div>
        <p className="text- text-[#8E8E93] dark:text-zinc-500">Tiền công</p>
        <p className="text- font-semibold text-[#0A84FF] mt-0.5">
          {task.price.toLocaleString("vi-VN")} đ
        </p>
      </div>
    )}
    {isTask(task) && (
      <div>
        <p className="text- text-[#8E8E93] dark:text-zinc-500">Ứng tuyển</p>
        <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100 mt-0.5">
          {task.appliedCount || 0}/{task.totalSlots}
        </p>
      </div>
    )}
    {isTask(task) && task.deadline?.seconds && (
      <div>
        <p className="text- text-[#8E8E93] dark:text-zinc-500">Hạn chót</p>
        <p className={`text- font-semibold mt-0.5 ${isUrgent? 'text-[#FF3B30]' : 'text-[#1C1C1E] dark:text-zinc-100'}`}>
          {timeLeft || taskDeadline}
        </p>
      </div>
    )}
  </div>

  {/* Cột phải */}
  <div className="space-y-3">
    <div>
      <p className="text- text-[#8E8E93] dark:text-zinc-500">Địa chỉ</p>
      <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100 mt-0.5 truncate">
        {task.location?.address || task.location?.city || "Online"}
      </p>
    </div>
    {isTask(task) && (
      <div>
        <p className="text- text-[#8E8E93] dark:text-zinc-500">Đã nhận</p>
        <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100 mt-0.5">
          {applications.filter(a => a.status === 'accepted').length} người
        </p>
      </div>
    )}
    {isPlan(task) && (
      <div>
        <p className="text- text-[#8E8E93] dark:text-zinc-500">Đã tham gia</p>
        <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100 mt-0.5">
          {task.currentParticipants} người
        </p>
      </div>
    )}
    <div>
      <p className="text- text-[#8E8E93] dark:text-zinc-500">Ngày đăng</p>
      <p className="text- font-semibold text-[#1C1C1E] dark:text-zinc-100 mt-0.5">
        {taskDate}
      </p>
    </div>
  </div>
</div>

  {/* Gạch ngang + tiêu đề Mô tả */}
{task.description && (
  <>
    {/* Gạch ngang full màn hình */}
    <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800 w-screen -ml-3 my-4" />
    
    <h3 className="font-bold text- text-[#1C1C1E] dark:text-zinc-100 mb-2">
      Mô tả công việc
    </h3>
    <Linkify options={{ target: "_blank", className: `text-[#0A84FF] hover:underline` }}>
      <p className="text- text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">{task.description}</p>
    </Linkify>
  </>
)}
</div>
{isOwner ? (
  <div ref={appsRef} className="bg-white dark:bg-zinc-900 -mx-3">
    <div className="px-5 py-4 flex items-center justify-between border-b border-[#F2F2F7] dark:border-zinc-800">
      <h3 className="font-semibold text-sm text-[#1C1C1E] dark:text-zinc-100">
        Ứng viên ({applications.length})
      </h3>
      {applications.length > 1 && (
        <button
          onClick={() => setShowAllApps(!showAllApps)}
          className="text-sm font-semibold text-[#0a84ff] active:opacity-60 transition-opacity"
        >
          {showAllApps? 'Thu gọn' : 'Xem tất cả'} ›
        </button>
      )}
    </div>

    {applications.length === 0? (
      <div className="px-5 py-12 text-center">
        <p className="text-sm text-[#8E8E93] dark:text-zinc-500">
          Chưa có ai ứng tuyển
        </p>
      </div>
    ) : (
      <div className="divide-y divide-[#F2F2F7] dark:divide-zinc-800">
        {(showAllApps? applications : applications.slice(0, 1)).map(app => (
          <motion.div 
            key={app.id} 
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between gap-3 px-5 py-3"
          >
            <Link
              href={`/profile/${app.userId}`}
              className="flex items-center gap-3 min-w-0 flex-1 active:opacity-70"
            >
              <UserAvatar src={app.userAvatar} name={app.userName} size={40} />
              <div className="min-w-0">
                <p className="font-semibold text-sm text-[#1C1C1E] dark:text-zinc-100 truncate">
                  {app.userName}
                </p>
                <p className="text-xs text-[#8E8E93] dark:text-zinc-500">
                  {app.createdAt?.toDate? app.createdAt.toDate().toLocaleDateString('vi-VN') : 'Vừa xong'} • Nộp {timeAgo(app.createdAt)}
                </p>
              </div>
            </Link>

            <div className="flex gap-2 shrink-0">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.vibrate?.(8);
                  handleAcceptApp(app.id, app.userId);
                }}
                className="h-8 px-3 rounded-full bg-[#E6F4EA] dark:bg-[#1E8E3E]/20 flex items-center gap-1.5 active:bg-[#D4EDDA] dark:active:bg-[#1E8E3E]/30 transition-all"
              >
                <div className="w-4 h-4 rounded-full bg-[#00A86B] flex items-center justify-center">
                  <FiCheck size={10} strokeWidth={3} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-[#00A86B]">Đồng ý</span>
              </motion.button>
              
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.vibrate?.(8);
                  handleRejectApp(app.id);
                }}
                className="h-8 px-3 rounded-full bg-[#FFE5E5] dark:bg-[#FF3B30]/20 flex items-center gap-1.5 active:bg-[#FFD6D6] dark:active:bg-[#FF3B30]/30 transition-all"
              >
                <div className="w-4 h-4 rounded-full bg-[#FF3B30] flex items-center justify-center">
                  <FiX size={10} strokeWidth={3} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-[#FF3B30]">Từ chối</span>
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    )}
  </div>
) : (
<>
  {/* Gạch ngang trên */}
  <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800 w-screen -ml-3 mt-4" />

  <div className="grid grid-cols-4 py-4">
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={handleStartChat}
      className="flex flex-col items-start gap-1 text-[#8E8E93] dark:text-zinc-500 active:opacity-60 transition-opacity"
    >
      <FiMessageSquare size={20} strokeWidth={2.2} className="text-[#0A84FF]" />
      <span className="text-sm font-semibold leading-none">Nhắn tin</span>
    </motion.button>

    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => owner?.phone && window.open(`tel:${owner.phone}`)}
      disabled={!owner?.phone}
      className="flex flex-col items-start gap-1 text-[#8E8E93] dark:text-zinc-500 active:opacity-60 disabled:opacity-40 transition-opacity"
    >
      <FiPhone size={20} strokeWidth={2.2} className="text-[#34C759]" />
      <span className="text-sm font-semibold leading-none">Gọi điện</span>
    </motion.button>

    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={isApplied? handleCancelApply : handleJoinTask}
      disabled={(!isApplied && (isFull || task.status!== "open")) || joining}
      className="flex flex-col items-start gap-1 text-[#8E8E93] dark:text-zinc-500 active:opacity-60 disabled:opacity-40 transition-opacity"
    >
      {joining? (
        <div className="w-5 h-5 border-2 border-[#00A86B] border-t-transparent rounded-full animate-spin" />
      ) : isApplied? (
        <FiCheckCircle size={20} strokeWidth={2.5} className="text-[#00A86B]" />
      ) : (
        <FiSend size={20} strokeWidth={2.5} className="text-[#00A86B]" />
      )}
      <span className="text-sm font-semibold leading-none">{isApplied? "Đã ứng tuyển" : "Ứng tuyển"}</span>
    </motion.button>

    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => toast.info("Đã gửi báo cáo")}
      className="flex flex-col items-start gap-1 text-[#8E8E93] dark:text-zinc-500 active:opacity-60 transition-opacity"
    >
      <FiAlertTriangle size={20} strokeWidth={2.2} className="text-[#FF9500]" />
      <span className="text-sm font-semibold leading-none">Báo cáo</span>
    </motion.button>
  </div>

  {/* Gạch ngang dưới */}
  <div className="h-px bg-[#E5E5EA] dark:bg-zinc-800 w-screen -ml-3" />
</>
)}
  </div>





 
<div className="h-px bg-[#E5E5EA] dark:bg-zinc-800 w-full" />
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
                    <div className="absolute top-2 left-2 bg-white dark:bg-zinc-900 px-2 py-1 rounded-lg text- font-medium shadow">
                      Bản đồ
                    </div>
                  </div>
                  <button className="w-full mt-2 text-[#0a84ff] font-semibold text-">
                    Xem chi tiết
                  </button>
                </div>
              </>
            )}

            {task.images && task.images.length > 0 && (
              <div className="px-4 pt-3 pb-2">
                {task.images.length === 1? (
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setShowImageGallery(0)}
                    className="relative w-20 h-20 rounded-xl overflow-hidden"
                  >
                    <Image
                      src={task.images[0]!}
                      alt="Ảnh đính kèm"
                      fill
                      sizes="80px"
                      className="object-cover"
                      priority
                    />
                  </motion.button>
                ) : task.images.length === 2? (
                  <div className="flex gap-2">
                    {task.images.slice(0, 2).map((img, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setShowImageGallery(i)}
                        className="relative w-20 h-20 rounded-xl overflow-hidden"
                      >
                        <Image
                          src={img!}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                          priority={i === 0}
                        />
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-w-[264px]">
                    {task.images.slice(0, 3).map((img, i) => (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setShowImageGallery(i)}
                        className="relative aspect-square rounded-xl overflow-hidden"
                      >
                        <Image
                          src={img!}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                          priority={i === 0}
                        />
                        {i === 2 && task.images!.length > 3 && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-white font-bold text-">
                              +{task.images!.length - 3}
                            </span>
                          </div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}

{/* Bình luận */}
{/* Bình luận */}
<div>
  <div className="bg-white dark:bg-zinc-950 overflow-hidden">
<div className="px-5 pt-4 pb-3 flex items-center justify-between">
  <h3 className="font-semibold text-sm text-[#1C1C1E] dark:text-zinc-100">
    Bình luận ({parentComments.length})
  </h3>
  
  <div className="relative">
    <button
      onClick={() => setShowSortMenu(!showSortMenu)}
      className="flex items-center gap-1 text-sm font-semibold text-zinc-600 dark:text-zinc-400 active:opacity-60"
    >
      {commentSort === 'relevant'? 'Phù hợp nhất' : commentSort === 'newest'? 'Mới nhất' : 'Tất cả bình luận'}
      <FiChevronDown size={16} />
    </button>

    <AnimatePresence>
      {showSortMenu && (
        <Portal>
          <div className="fixed inset-0 z-40" onClick={() => setShowSortMenu(false)} />
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl pb-safe"
          >
            <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-2" />
            <div className="px-5 py-3">
              <h4 className="font-bold text-lg mb-4">Sắp xếp theo</h4>
              
              <button
                onClick={() => { setCommentSort('relevant'); setShowSortMenu(false); setVisibleCount(5); }}
                className="w-full text-left py-3 flex items-start gap-3"
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 ${commentSort === 'relevant'? 'border-[#0a84ff] bg-[#0a84ff]' : 'border-zinc-300'}`}>
                  {commentSort === 'relevant' && <div className="w-2 h-2 bg-white rounded-full m-auto mt-[3px]" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">Phù hợp nhất</p>
                  <p className="text-xs text-zinc-500">Hiển thị bình luận tác giả và nhiều tương tác trước.</p>
                </div>
              </button>

              <button
                onClick={() => { setCommentSort('newest'); setShowSortMenu(false); setVisibleCount(5); }}
                className="w-full text-left py-3 flex items-start gap-3"
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 ${commentSort === 'newest'? 'border-[#0a84ff] bg-[#0a84ff]' : 'border-zinc-300'}`}>
                  {commentSort === 'newest' && <div className="w-2 h-2 bg-white rounded-full m-auto mt-[3px]" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">Mới nhất</p>
                  <p className="text-xs text-zinc-500">Hiển thị bình luận mới nhất trước tiên.</p>
                </div>
              </button>

              <button
                onClick={() => { setCommentSort('all'); setShowSortMenu(false); setVisibleCount(5); }}
                className="w-full text-left py-3 flex items-start gap-3"
              >
                <div className={`w-5 h-5 rounded-full border-2 mt-0.5 ${commentSort === 'all'? 'border-[#0a84ff] bg-[#0a84ff]' : 'border-zinc-300'}`}>
                  {commentSort === 'all' && <div className="w-2 h-2 bg-white rounded-full m-auto mt-[3px]" />}
                </div>
                <div>
                  <p className="font-semibold text-sm">Tất cả bình luận</p>
                  <p className="text-xs text-zinc-500">Hiển thị tất cả bình luận.</p>
                </div>
              </button>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  </div>
</div>

    <div className="px-5 py-4">
      {parentComments.length === 0? (
        <div className="text-center py-12 text-zinc-400 text-sm">
          <FiMessageCircle size={48} className="mx-auto mb-3 opacity-30" />
          Chưa có bình luận nào<br />Hãy là người đầu tiên
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
{visibleComments.map((c) => (
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


{hasMoreComments && (
  <button
    onClick={() => setVisibleCount(prev => prev + 5)}
    className="w-full py-3 text-sm font-semibold text-[#0a84ff] active:bg-zinc-50 dark:active:bg-zinc-800 rounded-xl mt-2"
  >
    Xem thêm bình luận
  </button>
)}
        </div>
      )}

      <div ref={bottomRef} />
    </div>

    <div className="sticky bottom-0 bg-white dark:bg-zinc-900 px-5 py-3 border-t border-[#F2F2F7] dark:border-zinc-800">
      {replyTo && (
        <div className="text-sm dark:text-zinc-400 mb-2 flex items-center justify-between bg-white dark:bg-zinc-900 border border-[#E5E5EA] dark:border-zinc-700 px-3.5 py-2 rounded-xl">
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
            className="w-full px-4 py-2.5 rounded-full bg-white dark:bg-zinc-900 border border-[#E5E5EA] dark:border-zinc-700 outline-none text-sm focus:ring-2 focus:ring-[#0a84ff]/20 focus:border-[#0a84ff] transition-all"
            disabled={sending ||!currentUser}
          />
          {showMention && mentionUsersList.length > 0 && (
            <div className="absolute bottom-12 left-0 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-[#E5E5EA] dark:border-zinc-800 max-h-60 overflow-auto z-50">
              <div className="p-2">
                <input
                  placeholder="Tìm người..."
                  value={mentionQuery}
                  onChange={(e) => setMentionQuery(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-[#F2F2F7] dark:bg-zinc-800 rounded-lg outline-none mb-2"
                />
                {mentionUsersList.map((user) => (
                  <button
                    key={user.uid}
                    onClick={() => handleSelectMention(user)}
                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#F2F2F7] dark:hover:bg-zinc-800 rounded-lg text-left"
                  >
                    <UserAvatar src={user.avatar} name={user.name} size={24} />
                    <span className="text-sm">{user.name}</span>
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
        </div>

        <ImageGallery open={showImageGallery!== null} images={task.images || []} initialIndex={showImageGallery || 0} onClose={() => setShowImageGallery(null)} />
        {shareTask && (
          <ShareTaskModal
            task={shareTask}
            onClose={() => setShareTask(null)}
          />
        )}

    </>
  );
}
                  