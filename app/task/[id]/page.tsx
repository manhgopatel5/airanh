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
  FiSend, FiClock, FiUsers, FiX, FiCheckCircle, FiMessageCircle,
  FiCalendar, FiMessageSquare, FiPhone, FiAlertTriangle,
  FiStar, FiBookmark, FiMoreHorizontal, FiShare2, FiCheck, FiTrash2, FiEdit2
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
import { isTask, type Task, type TaskStatus } from "@/types/task";
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

const PRIMARY = "#0a84ff";

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

  const handleMessageApp = (uid: string) => {
    const chatId = [currentUser!.uid, uid].sort().join('_');
    router.push(`/chat/${chatId}`);
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

  return (
    <>
      <Toaster richColors position="top-center" />
      <div className="max-w-xl mx-auto bg-[#F2F2F7] dark:bg-black min-h-screen pb-4 px-3 pt-2">
        <div className="bg-white dark:bg-zinc-900 rounded-3xl border-zinc-100 dark:border-zinc-800 shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="p-5">
            <div className="flex gap-3 items-start">
              <div className="relative shrink-0">
                <UserAvatar src={owner?.avatar} name={owner?.name} size={56} />
                {owner?.rating && owner.rating >= 4.8 && (
                  <div className="absolute -bottom-1 -right-1 bg-[#00A86B] rounded-full p-0.5">
                    <FiCheckCircle className="text-white" size={14} />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sm text-[#1C1C1E] truncate">{owner?.name || "Minh Tran"}</span>
                  <div className="flex items-center gap-2.5 shrink-0">
                    {!isOwner && (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={handleSave}
                        disabled={saving}
                        className="w-10 h-10 rounded-2xl bg-transparent flex items-center justify-center hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 active:scale-90 transition-all disabled:opacity-50"
                      >
                        <FiBookmark 
                          size={20} 
                          className={isSaved? "fill-[#0A84FF] text-[#0A84FF]" : "text-zinc-600 dark:text-zinc-300"} 
                        />
                      </motion.button>
                    )}

                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={() => task && setShareTask(task)}
                      className="w-10 h-10 rounded-2xl bg-transparent flex items-center justify-center hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 active:scale-90 transition-all"
                    >
                      <FiShare2 size={20} className="text-zinc-600 dark:text-zinc-300" strokeWidth={2} />
                    </motion.button>

                    <div className="relative">
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({
                            x: rect.right - 200,
                            y: rect.bottom + 8
                          });
                          setShowMenu(!showMenu);
                        }}
                        className="w-10 h-10 rounded-2xl bg-transparent flex items-center justify-center hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 active:scale-90 transition-all"
                      >
                        <FiMoreHorizontal size={20} className="text-zinc-600 dark:text-zinc-300" strokeWidth={2.5} />
                      </motion.button>
                      <AnimatePresence>
                        {showMenu && (
                          <Portal>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowMenu(false)}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              transition={{ duration: 0.15 }}
                              className="fixed z-50 min-w-[200px] bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:ring-white/10 py-2 overflow-hidden"
                              style={{
                                top: `${menuPos.y}px`,
                                left: `${menuPos.x}px`,
                              }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSave();
                                  setShowMenu(false);
                                }}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 w-full transition-all active:scale-95"
                              >
                                {isSaved? <FiCheck size={18} /> : <FiBookmark size={18} />}
                                {isSaved? "Đã lưu" : "Lưu công việc"}
                              </button>
                              <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMenu(false);
                                  router.push(`/task/${task.id}/edit`);
                                }}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-600 dark:hover:text-blue-400 w-full transition-all active:scale-95"
                              >
                                <FiEdit2 size={18} />
                                Sửa công việc
                              </button>
                              <div className="h-px bg-zinc-100 dark:bg-zinc-800 mx-2" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMenu(false);
                                  handleDelete();
                                }}
                                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600 w-full transition-all active:scale-95"
                              >
                                <FiTrash2 size={18} />
                                Xóa
                              </button>
                            </motion.div>
                          </Portal>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm">
                  <FiStar className="fill-[#FFB800] text-[#FFB800]" size={16} />
                  <span className="font-semibold text-[#1C1C1E]">{owner?.rating || "4.9"}</span>
                  <span className="text-[#8E8E93]">({owner?.reviewCount || 21} đánh giá)</span>
                  <span className="text-[#8E8E93]">•</span>
                  <span className="text-[#00A86B]">Mới tham gia</span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-1.5 mb-3 flex-nowrap overflow-hidden">
                <span className={`flex-1 min-w-0 px-2 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 ${status.color}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.dot}`} />
                  <span className="truncate">{status.label}</span>
                </span>

                {isTask(task) && (
                  <span className="flex-1 min-w-0 px-2 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#1A73E8]/20 dark:text-[#8AB4F8] flex items-center justify-center gap-1">
                    <FiUsers size={12} className="shrink-0" />
                    <span className="truncate">{task.appliedCount || 0}/{task.totalSlots}</span>
                  </span>
                )}

                {isTask(task) && task.price > 0 && (
                  <span className="flex-1 min-w-0 px-2 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#E3F2FD] text-[#0A84FF] dark:bg-[#0A84FF]/20 dark:text-[#5AC8FA] flex items-center justify-center">
                    <span className="truncate">{task.price.toLocaleString("vi-VN")} đ</span>
                  </span>
                )}

                {isTask(task) && task.deadline?.seconds && task.status!== "completed" && (
                  <span className={`flex-1 min-w-0 px-2 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center ${
                    isUrgent 
                     ? "bg-[#FFE5E5] text-[#FF3B30] dark:bg-[#FF3B30]/20 dark:text-[#FF6B6B] animate-pulse" 
                      : "bg-[#FEF7E0] text-[#F9AB00] dark:bg-[#F9AB00]/20 dark:text-[#FDD663]"
                  }`}>
                    <span className="tabular-nums truncate">{timeLeft?.replace('Còn ', '') || "Hết hạn"}</span>
                  </span>
                )}
              </div>

              <h2 className="font-semibold text-base leading-snug mb-2 text-[#1C1C1E]">{task.title}</h2>
              
              {task.description && (
                               <Linkify options={{ target: "_blank", className: `text-[${PRIMARY}] hover:underline` }}>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed mb-3">{task.description}</p>
                </Linkify>
              )}
              
              {/* 2 khung: Ngày đăng - Hạn chót */}
<div className="flex items-center gap-3 mt-4">
  {/* 1. Ngày đăng */}
  <div className="flex-1 px-4 py-3.5 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800/60 border border-[#E5E5E7] dark:border-zinc-700">
    <div className="flex items-center justify-center gap-2.5">
      <FiCalendar size={18} className="shrink-0 text-[#8E8E93]" />
      <div className="text-center">
        <p className="text-xs text-[#8E8E93] leading-none">Ngày đăng</p>
        <p className="text-sm font-semibold text-[#1C1C1E] dark:text-zinc-100 tabular-nums leading-none mt-1">
          {taskDate}
        </p>
      </div>
    </div>
  </div>

  {/* 2. Hạn chót */}
  <div className="flex-1 px-4 py-3.5 rounded-2xl bg-[#FFE5E5] dark:bg-[#FF3B30]/10 border border-[#FECACA] dark:border-[#FF3B30]/30">
    <div className="flex items-center justify-center gap-2.5">
      <FiClock size={18} className="shrink-0 text-[#FF3B30]" />
      <div className="text-center">
        <p className="text-xs text-[#FF3B30] leading-none">Hạn chót</p>
        <p className="text-sm font-semibold text-[#FF3B30] tabular-nums leading-none mt-1">
          {taskDeadline || "Chưa có"}
        </p>
      </div>
    </div>
  </div>
</div>

</div>

<div className="pt-4 pb-2">
  {isOwner? (
    <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-white dark:border-zinc-800 shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#F2F2F7] dark:border-zinc-800">
        <h3 className="font-semibold text-sm text-[#1C1C1E] dark:text-zinc-100">
          Ứng viên ({applications.length})
        </h3>
      </div>

      {applications.length === 0? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm text-[#8E8E93] dark:text-zinc-500">
            Chưa có ai ứng tuyển
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[#F2F2F7] dark:divide-zinc-800">
          {applications.map(app => (
            <div key={app.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <Link
                href={`/profile/${app.userId}`}
                className="flex items-center gap-3 min-w-0 flex-1 active:opacity-70"
              >
                <UserAvatar src={app.userAvatar} name={app.userName} size={44} />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#1C1C1E] dark:text-zinc-100 truncate">
                    {app.userName}
                  </p>
                  <p className="text-xs text-[#8E8E93] dark:text-zinc-500">
                    {app.createdAt?.toDate? app.createdAt.toDate().toLocaleDateString('vi-VN') : 'Vừa xong'}
                  </p>
                </div>
              </Link>

              <div className="flex gap-2 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMessageApp(app.userId);
                  }}
                  className="w-9 h-9 rounded-xl bg-[#F2F2F7] dark:bg-zinc-800 text-[#0a84ff] flex items-center justify-center active:scale-90 transition-all"
                >
                  <FiMessageSquare size={18} strokeWidth={2} />
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAcceptApp(app.id, app.userId);
                  }}
                  className="w-9 h-9 rounded-xl bg-[#E8F5E9] dark:bg-green-950/40 text-[#00A86B] flex items-center justify-center active:scale-90 transition-all"
                >
                  <FiCheck size={20} strokeWidth={2.5} />
                </motion.button>
                
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRejectApp(app.id);
                  }}
                  className="w-9 h-9 rounded-xl bg-[#FFE5E5] dark:bg-red-950/40 text-[#FF3B30] flex items-center justify-center active:scale-90 transition-all"
                >
                  <FiX size={20} strokeWidth={2.5} />
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : (
    <div className="grid grid-cols-4 gap-2">
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={handleStartChat}
        disabled={isOwner}
        className="h-14 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 flex flex-col items-center justify-center gap-0.5 text-[#1C1C1E] dark:text-zinc-100 active:bg-[#E5E5EA] dark:active:bg-zinc-700 disabled:opacity-40 transition-all"
      >
        <FiMessageSquare size={22} strokeWidth={2} />
        <span className="text-[11px] font-medium">Nhắn tin</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => owner?.phone && window.open(`tel:${owner.phone}`)}
        disabled={!owner?.phone || isOwner}
        className="h-14 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 flex flex-col items-center justify-center gap-0.5 text-[#1C1C1E] dark:text-zinc-100 active:bg-[#E5E5EA] dark:active:bg-zinc-700 disabled:opacity-40 transition-all"
      >
        <FiPhone size={22} strokeWidth={2} />
        <span className="text-[11px] font-medium">Gọi điện</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={isApplied? handleCancelApply : handleJoinTask}
        disabled={(!isApplied && (isFull || task.status!== "open")) || joining || isOwner}
        className={`h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 font-semibold active:scale-95 disabled:opacity-40 transition-all ${
          isApplied
       ? "bg-[#E8F5E9] dark:bg-green-950/40 text-[#00A86B] active:bg-[#D4EDDA] dark:active:bg-green-900/60"
            : "bg-[#00A86B] active:bg-[#009960] text-white shadow-[0_4px_12px_rgba(0,168,107,0.25)]"
        }`}
      >
        {joining? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isApplied? (
          <FiCheckCircle size={22} strokeWidth={2.5} />
        ) : (
          <FiSend size={22} strokeWidth={2.5} />
        )}
        <span className="text-[11px]">{isApplied? "Đã ứng tuyển" : "Ứng tuyển"}</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => toast.info("Đã gửi báo cáo")}
        className="h-14 rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 flex flex-col items-center justify-center gap-0.5 text-[#FF9500] active:bg-[#E5E5EA] dark:active:bg-zinc-700 transition-all"
      >
        <FiAlertTriangle size={22} strokeWidth={2} />
        <span className="text-[11px] font-medium">Báo cáo</span>
      </motion.button>
    </div>
  )}
</div>

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
<div className="mt-4">
  <div className="rounded-3xl bg-white dark:bg-zinc-900 border border-white dark:border-zinc-800 shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.3)] overflow-hidden">
    <div className="px-5 py-4 border-b border-[#F2F2F7] dark:border-zinc-800">
      <h3 className="font-semibold text-sm text-[#1C1C1E] dark:text-zinc-100">
        Bình luận ({comments.length})
      </h3>
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
        </div>
      )}

      <div ref={bottomRef} />
    </div>

    <div className="sticky bottom-0 bg-white dark:bg-zinc-900 px-5 py-3 border-t border-[#F2F2F7] dark:border-zinc-800">
      {replyTo && (
        <div className="text-sm dark:text-zinc-400 mb-2 flex items-center justify-between bg-[#F2F2F7] dark:bg-zinc-800 px-3.5 py-2 rounded-xl">
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
            className="w-full px-4 py-2.5 rounded-full bg-[#F2F2F7] dark:bg-zinc-800 outline-none text-sm focus:ring-2 focus:ring-[#0a84ff]/20 transition-all"
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
      </div>
    </>
  );
}
                  