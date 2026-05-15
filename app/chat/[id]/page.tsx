"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB, getFirebaseStorage } from "@/lib/firebase";
import {
  collection, query, onSnapshot, doc, orderBy, addDoc, serverTimestamp,
  Timestamp, updateDoc, deleteDoc, arrayUnion, arrayRemove, getDoc
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Image as ImageIcon, MapPin, Paperclip, Phone, Send, ArrowLeft, Loader2, X,
  Video, CheckCheck, Smile, Reply, Trash2, Pencil, Shield, Pin, Copy, Mic, Square, Search
} from "lucide-react";
import { toast, Toaster } from "sonner";
import imageCompression from "browser-image-compression";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import LottiePlayer from "@/components/ui/LottiePlayer";
import loadingPull from "@/public/lotties/huha-loading-pull.json";

type UserData = {
  uid: string; name: string; username: string; avatar: string;
  isOnline: boolean; lastSeen?: Timestamp; userId: string;
};

type Reaction = { emoji: string; users: string[] };

type Message = {
  id: string; text: string; senderId: string; createdAt: Timestamp | null;
  seenBy?: string[]; replyTo?: { id: string; text: string; senderName: string };
  image?: string; file?: string; fileName?: string; location?: { lat: number; lng: number };
  type: "text" | "image" | "file" | "location" | "voice" | "task_share";
  voice?: string; duration?: number; reactions?: Reaction[];
  edited?: boolean; editedAt?: Timestamp; pinned?: boolean;
  members?: string[]; taskId?: string; taskTitle?: string; taskPrice?: number;
};

type ChatData = {
  members: string[];
  membersInfo: Record<string, { name: string; avatar: string; username: string }>;
  pinnedMessage?: string; typing?: Record<string, boolean>;
  blockedUsers?: string[]; deletedFor?: string[];
};

const EMOJI_LIST = ["❤️", "😂", "😮", "😢", "😡", "👍", "🔥", "👏"];

export default function ChatDetailPage() {
  const params = useParams();
  const chatId = (Array.isArray(params?.id)? params.id[0] : params?.id) as string;
  const router = useRouter();
  const db = useMemo(() => getFirebaseDB(), []);
  const storage = useMemo(() => getFirebaseStorage(), []);
  const { user, loading: authLoading } = useAuth();

  const [friend, setFriend] = useState<UserData | null>(null);
  const [friendId, setFriendId] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(true);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [loadingFriend, setLoadingFriend] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showActions, setShowActions] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isBlocked = chatData?.blockedUsers?.includes(user?.uid || "");
  const isDeleted = chatData?.deletedFor?.includes(user?.uid || "");
  const canSend =!!friendId && isFriend &&!isBlocked &&!isDeleted;

  useEffect(() => {
    if (!chatId || authLoading ||!user) return;
    setLoadingFriend(true);
    const unsub = onSnapshot(doc(db, "chats", chatId), async (snap) => {
      if (!snap.exists()) return;
      const data = snap.data() as ChatData;
      if (data.deletedFor?.includes(user.uid)) {
        await updateDoc(doc(db, "chats", chatId), { deletedFor: arrayRemove(user.uid) });
        return;
      }
      if (!data.members?.includes(user.uid)) {
        toast.error("Không có quyền truy cập");
        router.replace("/chat");
        return;
      }
   const otherUid = data.members.find((id) => id !== user.uid)!;

const otherUser = data.membersInfo?.[otherUid] ?? {
  name: "User",
  username: "",
  avatar: "",
};
      const [friendSnap, friendDoc] = await Promise.all([
        getDoc(doc(db, "users", otherUid)),
        getDoc(doc(db, "users", user.uid, "friends", otherUid))
      ]);
      const fd = friendSnap.data();
      const isFr = friendDoc.exists() && friendDoc.data()?.status!== "removed";
      setFriend({
        uid: otherUid,
        name: otherUser.name || "User",
        username: otherUser.username || "",
        avatar: otherUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=random`,
        isOnline: isFr? (fd?.isOnline || false) : false,
        lastSeen: fd?.lastSeen,
        userId: fd?.userId || ""
      });
      setIsFriend(isFr);
      setChatData(data);
      setFriendId(otherUid);
      setLoadingFriend(false);
      navigator.vibrate?.(5);
    });
    return () => unsub();
  }, [chatId, user, authLoading, db, router]);

  useEffect(() => {
    if (!friendId) return;
    return onSnapshot(doc(db, "users", friendId), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setFriend((p) => p? {...p, isOnline: d.isOnline || false, lastSeen: d.lastSeen } : null);
      }
    });
  }, [friendId, db]);

  useEffect(() => {
    if (!chatId ||!user) return;
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id,...d.data() } as Message));
      setMessages(msgs);
      snap.docs.forEach((d) => {
        const m = d.data() as Message;
        if (friendId && m.senderId === friendId &&!m.seenBy?.includes(user.uid)) {
          updateDoc(doc(db, "chats", chatId, "messages", d.id), { seenBy: arrayUnion(user.uid) });
        }
      });
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
  }, [chatId, user, friendId, db]);

  const sendMessage = useCallback(async () => {
    if (!canSend ||!text.trim() ||!user ||!friend ||!chatData) return;
    const temp = text;
    const tempReply = replyTo;
    const tempEdit = editingMsg;
    setText("");
    setReplyTo(null);
    setEditingMsg(null);
    setSending(true);
    navigator.vibrate?.(10);
    try {
      if (tempEdit) {
        await updateDoc(doc(db, "chats", chatId, "messages", tempEdit.id), {
          text: temp,
          edited: true,
          editedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "chats", chatId, "messages"), {
          text: temp,
          senderId: user.uid,
          createdAt: serverTimestamp(),
          seenBy: [user.uid],
          type: "text",
          members: chatData.members,
         ...(tempReply && {
            replyTo: {
              id: tempReply.id,
              text: tempReply.text,
              senderName: tempReply.senderId === user.uid? "Bạn" : friend.name
            }
          })
        });
      }
    } catch (e: any) {
      toast.error(`Gửi thất bại: ${e.code}`);
      setText(temp);
      setReplyTo(tempReply);
      setEditingMsg(tempEdit);
    } finally {
      setSending(false);
    }
  }, [canSend, text, user, friend, chatData, chatId, replyTo, editingMsg, db]);

  const sendImage = async (file: File) => {
    if (!canSend ||!chatData ||!user) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
      const storageRef = ref(storage, `chat-images/${chatId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, compressed);
      uploadTask.on("state_changed", (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)));
      await uploadTask;
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
        image: url,
        type: "image",
        createdAt: serverTimestamp(),
        seenBy: [user.uid],
        members: chatData.members
      });
      navigator.vibrate?.(10);
    } catch (err: any) {
      toast.error(`Lỗi gửi ảnh: ${err.code}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const sendFile = async (file: File) => {
    if (!canSend ||!chatData ||!user) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("File không được vượt quá 10MB");
    setUploading(true);
    try {
      const storageRef = ref(storage, `chat-files/${chatId}/${Date.now()}_${file.name}`);
      await uploadBytesResumable(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
        file: url,
        fileName: file.name,
        type: "file",
        createdAt: serverTimestamp(),
        seenBy: [user.uid],
        members: chatData.members
      });
    } catch (err: any) {
      toast.error(`Lỗi gửi file: ${err.code}`);
    } finally {
      setUploading(false);
    }
  };

  const sendLocation = async () => {
    if (!canSend ||!chatData ||!user) return;
    if (!navigator.geolocation) return toast.error("Trình duyệt không hỗ trợ định vị");
    setUploading(true);
    toast.info("Đang lấy vị trí...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await addDoc(collection(db, "chats", chatId, "messages"), {
            senderId: user.uid,
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            type: "location",
            createdAt: serverTimestamp(),
            seenBy: [user.uid],
            members: chatData.members
          });
          toast.success("Đã gửi vị trí");
        } catch (err: any) {
          toast.error(`Lỗi gửi vị trí: ${err.code}`);
        } finally {
          setUploading(false);
        }
      },
      () => {
        toast.error("Không lấy được vị trí");
        setUploading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const startRecording = async () => {
    if (!canSend) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } catch {
      toast.error("Không thể truy cập microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const sendVoice = async () => {
    if (!audioBlob ||!user ||!chatData) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `chat-voice/${chatId}/${Date.now()}.webm`);
      await uploadBytesResumable(storageRef, audioBlob);
      const url = await getDownloadURL(storageRef);
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
        voice: url,
        duration: recordingTime,
        type: "voice",
        createdAt: serverTimestamp(),
        seenBy: [user.uid],
        members: chatData.members
      });
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (err: any) {
      toast.error(`Lỗi gửi voice: ${err.code}`);
    } finally {
      setUploading(false);
    }
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!user) return;
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    const reactions = msg.reactions || [];
    const existing = reactions.find((r) => r.emoji === emoji);
    try {
      if (existing?.users.includes(user.uid)) {
        const newUsers = existing.users.filter((u) => u!== user.uid);
        if (newUsers.length === 0) {
          await updateDoc(doc(db, "chats", chatId, "messages", msgId), {
            reactions: arrayRemove(existing)
          });
        } else {
          const newReactions = reactions.map((r) => (r.emoji === emoji? {...r, users: newUsers } : r));
          await updateDoc(doc(db, "chats", chatId, "messages", msgId), { reactions: newReactions });
        }
      } else {
        if (existing) {
          const newReactions = reactions.map((r) => (r.emoji === emoji? {...r, users: [...r.users, user.uid] } : r));
          await updateDoc(doc(db, "chats", chatId, "messages", msgId), { reactions: newReactions });
        } else {
          await updateDoc(doc(db, "chats", chatId, "messages", msgId), {
            reactions: arrayUnion({ emoji, users: [user.uid] })
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
    setShowEmojiPicker(null);
    navigator.vibrate?.(5);
  };

  const deleteMessage = async (msgId: string) => {
    if (!chatId ||!user) return;
    if (!confirm("Xoá tin nhắn này?")) return;
    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", msgId));
      toast.success("Đã xoá");
    } catch (err: any) {
      if (err.code === "permission-denied") {
        toast.error("Bạn chỉ có thể xóa tin nhắn của mình");
      } else {
        toast.error("Lỗi xoá tin nhắn");
      }
    }
  };

 const pinMessage = async (msgId: string) => {
  if (!chatId) return;

  try {
    await updateDoc(doc(db, "chats", chatId), {
      pinnedMessage: msgId,
    });

    toast.success("Đã ghim tin nhắn");
  } catch (error) {
    console.error(error);
    toast.error("Không thể ghim tin nhắn");
  }
};

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter((m) => m.text?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  const getSeenAvatars = (msg: Message) => {
    if (!chatData || msg.senderId!== user?.uid) return [];
    return (msg.seenBy || [])
     .filter((uid) => uid!== user?.uid)
     .map((uid) => chatData.membersInfo[uid])
     .filter((u): u is { name: string; avatar: string; username: string } => Boolean(u));
  };

  const formatTime = (time?: Timestamp | null) => {
    if (!time) return "";
    try {
      return format(time.toDate(), "HH:mm", { locale: vi });
    } catch {
      return "";
    }
  };

  const formatDateDivider = (time: Timestamp) => {
    const date = time.toDate();
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Hôm nay";
    if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
    return format(date, "dd/MM/yyyy", { locale: vi });
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (authLoading || loadingFriend ||!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <LottiePlayer animationData={loadingPull} loop autoplay className="w-20 h-20" />
      </div>
    );
  }

  if (!friend) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 gap-4">
        <p className="text-lg font-bold text-gray-900 dark:text-white">Không tìm thấy người dùng</p>
        <button onClick={() => router.replace("/chat")} className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold active:scale-95 transition-transform">
          Quay lại
        </button>
      </div>
    );
  }

  const pinnedMsg = messages.find((m) => m.id === chatData?.pinnedMessage);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black" onClick={() => setShowActions(null)}>
      <Toaster richColors position="top-center" />

      {showSearch && (
        <div className="px-4 py-2 border-b border-gray-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm tin nhắn..." className="flex-1 bg-transparent outline-none text-sm" autoFocus />
            <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}><X size={18} /></button>
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-b border-gray-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl flex items-center gap-3 sticky top-0 z-20">
        <button onClick={() => router.back()} className="md:hidden p-2 -ml-2 active:scale-90 transition-transform rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900">
          <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
        </button>
        <div className="relative">
          <img src={friend.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-zinc-950 shadow-lg" alt={friend.name} />
          {friend.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-zinc-950">
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate">{friend.name}</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
            {friend.isOnline? "Đang hoạt động" : friend.lastSeen? formatDistanceToNow(friend.lastSeen.toDate(), { addSuffix: true, locale: vi }) : "Offline"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSearch(true)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90">
            <Search size={20} className="text-gray-700 dark:text-zinc-300" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90">
            <Phone size={20} className="text-gray-700 dark:text-zinc-300" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90">
            <Video size={20} className="text-gray-700 dark:text-zinc-300" />
          </button>
        </div>
      </div>

      {pinnedMsg && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/50 flex items-center gap-2">
          <Pin size={16} className="text-amber-600 flex-shrink-0" />
          <p className="flex-1 text-sm text-amber-900 dark:text-amber-200 truncate">{pinnedMsg.text}</p>
          <button onClick={() => toast.info("Tính năng ghim sẽ cập nhật sau")} className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-0.5">
        {filteredMessages.map((m, i) => {
          const isMe = m.senderId === user.uid;
          const prev = filteredMessages[i - 1];
          const next = filteredMessages[i + 1];
          const showAvatar =!isMe && (!next || next.senderId!== m.senderId);
          const isFirstInGroup =!prev || prev.senderId!== m.senderId;
          const isLastInGroup =!next || next.senderId!== m.senderId;
          const showDate =!prev || (m.createdAt && prev.createdAt && m.createdAt.toDate().toDateString()!== prev.createdAt.toDate().toDateString());
          const seenAvatars = getSeenAvatars(m);

          return (
            <div key={m.id} id={`msg-${m.id}`}>
              {showDate && m.createdAt && (
                <div className="flex items-center justify-center my-6">
                  <div className="px-4 py-1.5 bg-gray-200/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-full">
                    <p className="text-xs font-bold text-gray-600 dark:text-zinc-400">{formatDateDivider(m.createdAt)}</p>
                  </div>
                </div>
              )}
              <div className={`flex items-end gap-2 group ${isMe? "justify-end" : "justify-start"} ${isFirstInGroup? "mt-3" : ""}`}>
                {!isMe && <div className="w-7 flex-shrink-0">{showAvatar && <img src={friend.avatar} className="w-7 h-7 rounded-full shadow-sm" alt={friend.name} />}</div>}
                <div className={`max-w-[75%] flex flex-col ${isMe? "items-end" : "items-start"}`}>
                  {m.replyTo && (
                    <button onClick={() => scrollToMessage(m.replyTo!.id)} className={`px-3 py-1.5 mb-1 rounded-2xl text-xs ${isMe? "bg-blue-400/30 text-white/80" : "bg-gray-200/60 dark:bg-zinc-700/60 text-gray-600 dark:text-zinc-300"}`}>
                      <p className="font-bold text-xs">{m.replyTo.senderName}</p>
                      <p className="truncate">{m.replyTo.text}</p>
                    </button>
                  )}
                  <div className="relative">
                    <div
                      className={`px-4 py-2.5 shadow-sm cursor-pointer ${isMe? `bg-gradient-to-br from-blue-500 to-indigo-600 text-white ${isFirstInGroup && isLastInGroup? "rounded-3xl" : isFirstInGroup? "rounded-3xl rounded-br-lg" : isLastInGroup? "rounded-3xl rounded-tr-lg" : "rounded-r-lg rounded-l-3xl"}` : `bg-white dark:bg-zinc-800 text-gray-900 dark:text-white ${isFirstInGroup && isLastInGroup? "rounded-3xl" : isFirstInGroup? "rounded-3xl rounded-bl-lg" : isLastInGroup? "rounded-3xl rounded-tl-lg" : "rounded-l-lg rounded-r-3xl"}`}`}
                      onContextMenu={(e) => { e.preventDefault(); setShowEmojiPicker(m.id); }}
                      onClick={(e) => { e.stopPropagation(); setShowActions(showActions === m.id? null : m.id); }}
                    >
                      {m.type === "task_share"? (
                        <div onClick={() => router.push(`/task/${m.taskId}`)} className="cursor-pointer">
                          <p className="text-xs font-bold mb-1 opacity-80">📋 Đã chia sẻ {m.taskPrice && m.taskPrice > 0? "công việc" : "kế hoạch"}</p>
                          <p className="font-semibold leading-snug">{m.taskTitle}</p>
                          <p className={`text-sm font-bold mt-1 ${isMe? "text-white" : "text-blue-600 dark:text-blue-400"}`}>{m.taskPrice && m.taskPrice > 0? `${m.taskPrice.toLocaleString()}đ` : "Miễn phí"}</p>
                          <p className="text-xs mt-2 opacity-70">Nhấn để xem chi tiết →</p>
                        </div>
                      ) : (
                        <>
                          {m.image && <img src={m.image} className="rounded-2xl max-w-full mb-1" alt="sent" />}
                          {m.file && <a href={m.file} target="_blank" className="flex items-center gap-2 p-2 bg-black/10 rounded-xl"><Paperclip size={16} /><span className="text-sm truncate">{m.fileName}</span></a>}
                          {m.voice && <div className="flex items-center gap-2"><button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><Mic size={16} /></button><div className="flex-1 h-1 bg-white/30 rounded-full"><div className="h-full bg-white rounded-full" style={{ width: "30%" }} /></div><span className="text-xs">{m.duration}s</span></div>}
                          {m.location && <a href={`https://maps.google.com/?q=${m.location.lat},${m.location.lng}`} target="_blank" className="flex items-center gap-2 p-3 bg-black/10 rounded-xl"><MapPin size={20} /><div><p className="text-sm font-bold">Vị trí đã chia sẻ</p><p className="text-xs opacity-70">Nhấn để mở Google Maps</p></div></a>}
                          {m.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}{m.edited && <span className="text-xs opacity-60 ml-1">(đã sửa)</span>}</p>}
                        </>
                      )}
                    </div>
                    {m.reactions && m.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1 px-1">
                        {m.reactions.map((r) => (
                          <button key={r.emoji} onClick={() => toggleReaction(m.id, r.emoji)} className={`px-2 py-0.5 rounded-full text-xs ${r.users.includes(user.uid)? "bg-blue-100 dark:bg-blue-900/50" : "bg-gray-100 dark:bg-zinc-800"}`}>{r.emoji} {r.users.length}</button>
                        ))}
                      </div>
                    )}
                    <AnimatePresence>
                      {showActions === m.id && (
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className={`absolute ${isMe? "right-0" : "left-0"} -top-12 flex gap-1 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-1 z-10`} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setShowEmojiPicker(m.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"><Smile size={16} /></button>
                          <button onClick={() => { setReplyTo(m); setShowActions(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"><Reply size={16} /></button>
                          {isMe && (
                            <>
                              <button onClick={() => { setEditingMsg(m); setText(m.text); inputRef.current?.focus(); setShowActions(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"><Pencil size={16} /></button>
                              <button onClick={() => { deleteMessage(m.id); setShowActions(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded text-red-500"><Trash2 size={16} /></button>
                            </>
                          )}
                          <button onClick={() => { pinMessage(m.id); setShowActions(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"><Pin size={16} /></button>
                          <button onClick={() => { navigator.clipboard.writeText(m.text); toast.success("Đã copy"); setShowActions(null); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"><Copy size={16} /></button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {showEmojiPicker === m.id && (
                      <div className="absolute bottom-full mb-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-2 flex gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                        {EMOJI_LIST.map((emoji) => (
                          <button key={emoji} onClick={() => toggleReaction(m.id, emoji)} className="text-2xl hover:scale-125 transition-transform">{emoji}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  {isLastInGroup && (
                    <div className={`flex items-center gap-1 mt-1 px-1 ${isMe? "flex-row-reverse" : ""}`}>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">{formatTime(m.createdAt)}</p>
                      {isMe && seenAvatars.length > 0 && (
                        <div className="flex -space-x-2">
                          {seenAvatars.slice(0, 3).map((u, idx) => <img key={idx} src={u.avatar} className="w-4 h-4 rounded-full ring-2 ring-white dark:ring-zinc-950" alt={u.name} />)}
                        </div>
                      )}
                      {isMe && seenAvatars.length === 0 && m.seenBy && m.seenBy.length > 1 && <CheckCheck className="text-blue-500" size={14} />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {(replyTo || editingMsg) && (
        <div className="px-4 pt-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-t border-gray-200/50 dark:border-zinc-800/50">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{editingMsg? "Chỉnh sửa" : `Trả lời ${replyTo?.senderId === user.uid? "bạn" : friend.name}`}</p>
              <p className="text-sm text-gray-600 dark:text-zinc-400 truncate">{editingMsg? editingMsg.text : replyTo?.text}</p>
            </div>
            <button onClick={() => { setReplyTo(null); setEditingMsg(null); setText(""); }} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors">
              <X size={18} className="text-blue-600 dark:text-blue-400" />
            </button>
          </div>
        </div>
      )}

      {uploading && (
        <div className="bg-white dark:bg-zinc-900 px-4 py-2 border-t border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
            <Loader2 size={16} className="animate-spin" />Đang tải lên... {uploadProgress}%
          </div>
        </div>
      )}

      {audioBlob &&!recording && (
        <div className="px-4 py-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-t border-gray-200/50 dark:border-zinc-800/50">
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-2xl">
            <Mic size={20} className="text-green-600" />
            <span className="flex-1 text-sm">Tin nhắn thoại {recordingTime}s</span>
            <button onClick={() => setAudioBlob(null)} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full"><X size={18} /></button>
            <button onClick={sendVoice} className="px-4 py-1.5 bg-green-600 text-white rounded-full text-sm font-medium">Gửi</button>
          </div>
        </div>
      )}

      {!isFriend &&!isBlocked &&!isDeleted && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200/50 dark:border-amber-900/50">
          <div className="flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <Shield size={14} />Các bạn chưa kết bạn. Hãy cẩn thận khi chia sẻ thông tin cá nhân
          </div>
        </div>
      )}

      <div className="p-4 border-t border-gray-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl">
        <div className="flex items-end gap-2">
          <input type="file" hidden ref={imageInputRef} accept="image/*" onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])} />
          <button onClick={() => imageInputRef.current?.click()} disabled={isBlocked || isDeleted} className={`w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90 ${isBlocked || isDeleted? "opacity-50 cursor-not-allowed" : ""}`}>
            <ImageIcon size={22} className="text-gray-600 dark:text-zinc-400" />
          </button>
          <input type="file" hidden ref={fileInputRef} onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isBlocked || isDeleted} className={`w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90 ${isBlocked || isDeleted? "opacity-50 cursor-not-allowed" : ""}`}>
            <Paperclip size={22} className="text-gray-600 dark:text-zinc-400" />
          </button>
          <button onClick={sendLocation} disabled={isBlocked || isDeleted} className={`w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90 ${isBlocked || isDeleted? "opacity-50 cursor-not-allowed" : ""}`}>
            <MapPin size={22} className="text-gray-600 dark:text-zinc-400" />
          </button>
          <div className="flex-1 relative">
            <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" &&!e.shiftKey) { e.preventDefault(); if (!isBlocked &&!isDeleted && text.trim()) sendMessage(); } }} disabled={isBlocked || isDeleted} placeholder={isBlocked? "Bạn không thể nhắn tin" : isDeleted? "Bạn đã xóa cuộc trò chuyện" : "Nhắn tin..."} className={`w-full px-5 py-3 bg-gray-100 dark:bg-zinc-900 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-all ${isBlocked || isDeleted? "opacity-50 cursor-not-allowed" : ""}`} />
          </div>
          {text.trim()? (
            <button onClick={sendMessage} disabled={sending || isBlocked || isDeleted} className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30">
              {sending? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          ) : (
            <button onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} disabled={isBlocked || isDeleted} className={`w-11 h-11 ${recording? "bg-red-500" : "bg-gradient-to-br from-blue-500 to-indigo-600"} text-white rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg ${isBlocked || isDeleted? "opacity-50 cursor-not-allowed" : ""}`}>
              {recording? <Square size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>
        {recording && <div className="mt-2 flex items-center justify-center gap-2 text-red-500 text-sm font-medium"><div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />Đang ghi âm {recordingTime}s</div>}
      </div>
    </div>
  );
}