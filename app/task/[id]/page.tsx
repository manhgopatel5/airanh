"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth, getFirebaseDB } from "@/lib/firebase";
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection, query, where, QueryDocumentSnapshot, DocumentData } from "firebase/firestore";
import { doc, getDoc, updateDoc, arrayRemove, Timestamp, setDoc, serverTimestamp, onSnapshot, addDoc, getDocs } from "firebase/firestore";
import {
  FiSend, FiClock, FiUsers, FiX, FiCheckCircle, FiMessageCircle, 
  FiCalendar, FiMessageSquare, FiPhone, FiAlertTriangle, 
  FiStar, FiBookmark, FiMoreHorizontal, FiShare2 
} from "react-icons/fi";
import ShareTaskModal from "@/components/ShareTaskModal";
import {
  
  
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

import DOMPurify from "isomorphic-dompurify";
import { toast, Toaster } from "sonner";
import Image from "next/image";
import Linkify from "linkify-react";


import { motion, AnimatePresence } from "framer-motion";
import { CommentList } from "@/components/task/CommentList";
import { ImageGallery } from "@/components/task/ImageGallery";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { createPortal } from "react-dom";
import { FiCheck, FiTrash2, FiEdit2 } from "react-icons/fi";
import { arrayUnion, deleteDoc } from "firebase/firestore";




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
  const auth = getFirebaseAuth();
  const db = getFirebaseDB();
  const { id } = useParams();
  const router = useRouter();

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [owner, setOwner] = useState<UserData | null>(null);
 
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
  const [isUrgent, setIsUrgent] = useState(false);
  const [joining, setJoining] = useState(false);
  const [creatingChat, setCreatingChat] = useState(false);
 
  const [showImageGallery, setShowImageGallery] = useState<number | null>(null);
  const [likingComments, setLikingComments] = useState<Set<string>>(new Set());

  

  const [isApplied, setIsApplied] = useState(false);

useEffect(() => {
  if (!currentUser?.uid || !task?.id) return;
  const q = query(
    collection(db, 'applications'),
    where('taskId', '==', task.id),
    where('userId', '==', currentUser.uid),
    where('status', 'in', ['pending', 'accepted'])
  );
  const unsub = onSnapshot(q, (snap) => {
    setIsApplied(!snap.empty);
  });
  return () => unsub();
}, [currentUser?.uid, task?.id]);

  const isOwner = useMemo(
    () => currentUser?.uid === task?.userId,
    [currentUser, task]
  );

  const [mentionUsersList, setMentionUsersList] = useState<UserData[]>([]);

useEffect(() => {
  if (!task?.id ||!task?.userId) return;
  const loadMentionUsers = async () => {
    try {
      const appSnaps = await getDocs(query(
        collection(db, 'applications'),
        where('taskId', '==', task.id),
        where('status', 'in', ['pending', 'accepted'])
      ));
      
      const userIds = [task.userId,...appSnaps.docs.map(d => d.data()?.userId).filter(Boolean)];
      const uniqueIds = [...new Set(userIds)];
      if (uniqueIds.length === 0) return;
      
      const userSnaps = await Promise.all(
        uniqueIds.map(uid => getDoc(doc(db, "users", uid)))
      );
      
      const users = userSnaps
       .filter(s => s.exists())
       .map(s => ({ uid: s.id,...s.data() } as UserData));
      
      setMentionUsersList(users);
    } catch (err) {
      console.error("Load mention users error:", err);
    }
  };
  loadMentionUsers();
}, [task?.id, task?.userId, db]);

const mentionUsers = useMemo(() => {
  return mentionUsersList.filter(u => 
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );
}, [mentionUsersList, mentionQuery]);
  const [isSaved, setIsSaved] = useState(false);
const [saving, setSaving] = useState(false);
const [showMenu, setShowMenu] = useState(false);
const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
const [shareTask, setShareTask] = useState<Task | null>(null);
const appConverter = {
  toFirestore(app: Application): DocumentData {
    return app;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Application {
    return { id: snapshot.id,...snapshot.data() } as Application;
  }
};
const [applicationsSnap, applicationsLoading, applicationsError] = useCollection<Application>(
  task?.id? query(
    collection(db, 'applications').withConverter(appConverter),
    where('taskId', '==', task.id)
  ) : null
);

const [acceptedCount, setAcceptedCount] = useState(0);

useEffect(() => {
  if (!task?.id) return;
  const q = query(
    collection(db, 'applications'),
    where('taskId', '==', task.id),
    where('status', '==', 'accepted')
  );
  const unsub = onSnapshot(q, (snap) => {
    setAcceptedCount(snap.size);
  });
  return () => unsub();
}, [task?.id]);

const isFull = useMemo(
  () => acceptedCount >= (task && isTask(task)? task.totalSlots : 1),
  [acceptedCount, task]
);

const applications = applicationsSnap?.docs.map(d => d.data()) || [];

useEffect(() => {
  if (!task?.id) return;
  setIsSaved(!!currentUser?.uid &&!!task.savedBy?.includes(currentUser.uid));
}, [currentUser?.uid, task?.savedBy, task?.id]);

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
      // ✅ Dùng getDoc với ID trực tiếp
      const snap = await getDoc(doc(db, "tasks", id));
      console.log("Task ID:", id, "Exists:", snap.exists());

      if (!snap.exists()) {
        toast.error("Không tìm thấy công việc");
        router.replace("/404");
        return;
      }

      const data = snap.data();
      
      // ✅ Chỉ chặn nếu bị ban, cho xem hết các status khác
      if (data.banned) {
        toast.error("Công việc này đã bị khóa");
        router.replace("/");
        return;
      }

      const taskData = { id: snap.id,...data } as Task;
      setTask(taskData);
      incrementTaskView(taskData.id);
    } catch (err) {
      console.error("Load task error:", err);
      toast.error("Lỗi tải công việc");
      router.replace("/404");
    } finally {
      setLoading(false);
    }
  };
  
  loadTask();
}, [id, router, db]);

 useEffect(() => {
  if (!task?.userId) return;
  const loadOwner = async () => {
    const snap = await getDoc(doc(db, "users", task.userId));
    if (snap.exists()) setOwner({ uid: snap.id,...snap.data() } as UserData);
  };
  loadOwner();
}, [task?.userId, db]);

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

    if (totalHours <= 5) {
      setIsUrgent(true);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`Còn ${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`);
    } else {
      setIsUrgent(false);
    }
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
  
  try {
    await addDoc(collection(db, 'applications'), {
      taskId: task.id,
      taskOwnerId: task.userId,
      userId: currentUser.uid,
      userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User', // thêm fallback
      userAvatar: currentUser.photoURL || '',
      status: 'pending',
      createdAt: serverTimestamp()
    });
    toast.success("Ứng tuyển thành công!");
    navigator.vibrate?.(10);
  } catch (err: any) {
    console.error(err);
    toast.error("Ứng tuyển thất bại");
  } finally {
    setJoining(false);
  }
};

  const handleCancelApply = async () => {
  if (!currentUser ||!task ||!isApplied || joining) return;
  setJoining(true);
  try {
    // Tìm application của user này
    const q = query(
      collection(db, 'applications'),
      where('taskId', '==', task.id),
      where('userId', '==', currentUser.uid),
      where('status', 'in', ['pending', 'accepted'])
    );
    const snap = await getDocs(q);
    if (!snap.empty && snap.docs[0]) {
  await deleteDoc(doc(db, 'applications', snap.docs[0].id));
}
    toast.success("Đã hủy ứng tuyển");
    navigator.vibrate?.(10);
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
    // Tạo chat tự động
    const chatId = [currentUser!.uid, applicantId].sort().join("_");
    await setDoc(doc(db, "chats", chatId), {
      participants: [currentUser!.uid, applicantId],
      lastMessage: `Bạn đã được duyệt cho task "${task.title}"`,
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
    toast.success("Đã duyệt ứng viên");
    navigator.vibrate?.(10);
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
  } catch {
    toast.error("Lỗi");
  }
};

const handleMessageApp = (uid: string) => {
  const chatId = [currentUser!.uid, uid].sort().join('_');
  router.push(`/tin-nhan/${chatId}`);
};

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


       {/* Card Task chính */}
<div className="bg-white mt-3 mx-4 rounded-2xl border border-[#E5E5E7] overflow-hidden">
  <div className="p-4">
    <div className="flex gap-3">
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
    <span className="font-semibold text-[17px] text-[#1C1C1E] truncate">{owner?.name || "Minh Tran"}</span>
<div className="flex items-center gap-2 shrink-0">
<button
  onClick={() => task && setShareTask(task)}
  className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 transition-all"
>
  <FiShare2 size={18} className="text-zinc-600 dark:text-zinc-300" />
</button>

  {!isOwner? (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={handleSave}
      disabled={saving}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
        isSaved
      ? "bg-blue-50 dark:bg-blue-950/50 text-[#0A84FF] dark:text-blue-400"
        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
      }`}
    >
      {isSaved? <FiCheck size={18} /> : <FiBookmark size={18} />}
      {isSaved? "Đã lưu" : "Lưu"}
    </motion.button>
  ) : (
    <div className="relative">
      <button
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
        className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-90 transition-all"
      >
        <FiMoreHorizontal size={18} className="text-zinc-600 dark:text-zinc-300" />
      </button>
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
  )}
</div>
  </div>

        <div className="flex items-center gap-1.5 mb-2 text-[15px]">
          <FiStar className="fill-[#FFB800] text-[#FFB800]" size={16} />
          <span className="font-semibold text-[#1C1C1E]">{owner?.rating || "4.9"}</span>
          <span className="text-[#8E8E93]">({owner?.reviewCount || 21} đánh giá)</span>
          <span className="text-[#8E8E93]">•</span>
          <span className="text-[#00A86B]">Mới tham gia</span>
        </div>

        <h2 className="font-semibold text-[17px] leading-snug mb-3 text-[#1C1C1E]">{task.title}</h2>

       <div className="flex items-center gap-2 text- text-[#8E8E93] flex-wrap">
  {isUrgent? (
    <div className="flex items-center gap-1 text-[#FF3B30] font-bold animate-pulse">
      <FiClock size={16} />
      <span className="tabular-nums">{timeLeft}</span>
    </div>
  ) : (
    <>
      <div className="flex items-center gap-1">
        <FiCalendar size={16} />
        <span>{taskDate}</span>
      </div>
      <span>•</span>
      <div className="flex items-center gap-1">
        <FiClock size={16} />
        <span>{taskTime}</span>
      </div>
    </>
  )}
  {isTask(task) && task.price > 0 && (
    <>
      <span className="px-2 py-0.5 rounded-md bg-[#E6F4EA] text-[#1E8E3E] text- font-semibold">
        {task.price.toLocaleString("vi-VN")} đ
      </span>
      <span>• Cố định</span>
      <span>•</span>
<div className="flex items-center gap-1">
  <FiUsers size={16} />
  <span>{applications.length}/{task.totalSlots || 1}</span> 
</div>
    </>
  )}
</div>
      </div>
    </div>
  </div>

  <div className="h-px bg-[#E5E5E7]" />

{/* Action Bar - Chủ task vs Ứng viên */}
<div className="px-4 pt-4 pb-2">
  {isOwner? (
    // CHỦ TASK: HIỆN LIST ỨNG VIÊN
    <div className="rounded-2xl bg-[#F2F2F7] dark:bg-zinc-800 p-4">
      <h3 className="font-semibold text-[17px] mb-3 text-[#1C1C1E] dark:text-zinc-100">
        Ứng viên ({applications.length})
      </h3>

      {applications.length === 0? (
        <p className="text-center text-[15px] text-zinc-500 dark:text-zinc-400 py-4">
          Chưa có ai ứng tuyển
        </p>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <div key={app.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <UserAvatar src={app.userAvatar} name={app.userName} size={40} />
                <div className="min-w-0">
                  <p className="font-semibold text-[15px] text-[#1C1C1E] dark:text-zinc-100 truncate">
                    {app.userName}
                  </p>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
                    {app.createdAt?.toDate().toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleMessageApp(app.userId)}
                  className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-700 text-[#0a84ff] font-semibold text-[13px] active:scale-95 transition-all"
                >
                  Nhắn tin
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleAcceptApp(app.id, app.userId)}
                  className="px-3 py-2 rounded-xl bg-[#00A86B] text-white font-semibold text-[13px] active:scale-95 transition-all"
                >
                  Duyệt
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleRejectApp(app.id)}
                  className="px-3 py-2 rounded-xl bg-[#FF3B30] text-white font-semibold text-[13px] active:scale-95 transition-all"
                >
                  Từ chối
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  ) : (
    // ỨNG VIÊN: 4 NÚT CŨ
    <div className="grid grid-cols-4 gap-2">
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={handleQuickChat}
        disabled={creatingChat || isOwner}
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

   
        

        {/* Mô tả chi tiết */}
        {task.description && (
         <div className="p-4 bg-white dark:bg-zinc-900 mt-3 mx-4 rounded-2xl shadow-sm">
            <h3 className="font-semibold mb-2 text-[17px]">Mô tả chi tiết</h3>
            <Linkify options={{ target: "_blank", className: `text-[${PRIMARY}] hover:underline` }}>
             <p className="text-[15px] text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-[22px]">{task.description}</p>
            </Linkify>
          </div>
        )}

{/* Ảnh task - Perfect Thumbnail Grid */}
{task.images && task.images.length > 0 && (
  <div className="px-4 pt-3 pb-2">
    {task.images.length === 1? (
      // 1 ảnh
      <motion.button
        whileTap={{ scale: 0.94 }}
        onClick={() => setShowImageGallery(0)}
        className="relative w-20 h-20 rounded- overflow-hidden"
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
      // 2 ảnh
      <div className="flex gap-2">
        {task.images.slice(0, 2).map((img, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowImageGallery(i)}
            className="relative w-20 h-20 rounded- overflow-hidden"
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
      // 3+ ảnh
      <div className="grid grid-cols-3 gap-2 max-w-[264px]">
        {task.images.slice(0, 3).map((img, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowImageGallery(i)}
            className="relative aspect-square rounded- overflow-hidden"
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

      



      <ImageGallery open={showImageGallery!== null} images={task.images || []} initialIndex={showImageGallery || 0} onClose={() => setShowImageGallery(null)} />
      {shareTask && (
           
        <ShareTaskModal
          task={shareTask}
          onClose={() => setShareTask(null)}
        />
      )}
    </div>
  </div>
</>
  );
}