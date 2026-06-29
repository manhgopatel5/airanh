"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB, getFirebaseStorage } from "@/lib/firebase";
import { uploadBytes } from "firebase/storage";
import {
  collection, query, onSnapshot, doc,
  orderBy, addDoc, serverTimestamp, Timestamp, updateDoc, deleteDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Image as ImageIcon, MapPin, Paperclip, Phone, Send,
  ArrowLeft, Loader2, X, Pause, Video, CheckCheck,
  Smile, Reply, Play, Trash2, Pencil, Shield, Pin, Copy, Mic, Square, Search
} from "lucide-react";
import { toast, Toaster } from "sonner";
import imageCompression from "browser-image-compression";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";

type UserData = {
  uid: string;
  name: string;
  username: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: Timestamp;
  userId: string;
};

type Reaction = {
  emoji: string;
  users: string[];
};

type Message = {
  id: string;
  text: string;
  senderId: string;
  createdAt: Timestamp | null;
  seenBy?: string[];
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  };
  image?: string;
  file?: string;
  fileName?: string;
  location?: { lat: number; lng: number };
  type: "text" | "image" | "file" | "location" | "voice" | "task_share";
  voice?: string;
  duration?: number;
  reactions?: Reaction[];
  edited?: boolean;
  editedAt?: Timestamp;
  pinned?: boolean;
  linkPreview?: {
    title: string;
    desc: string;
    image: string;
    url: string;
  };
  members?: string[];
  taskId?: string;
  taskTitle?: string;
  taskPrice?: number;
};

type ChatData = {
  members: string[];
  membersInfo: Record<string, { name: string; avatar: string; username: string }>;
  pinnedMessage?: string;
  typing?: Record<string, boolean>;
  blockedUsers?: string[];
  deletedFor?: string[];
  type?: string;
};

const EMOJI_LIST = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export default function ChatDetailPage() {
  const params = useParams();
  const idFromUrl = Array.isArray(params?.id)? params.id[0] : params?.id || null;
  const router = useRouter();

  const db = useMemo(() => getFirebaseDB(), []);
  const storage = useMemo(() => getFirebaseStorage(), []);
  const { user, loading: authLoading } = useAuth();

  const [friend, setFriend] = useState<UserData | null>(null);
  const [friendId, setFriendId] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(true);
  const [chatData, setChatData] = useState<ChatData | null>(null);

  const isBlocked = chatData?.blockedUsers?.includes(user?.uid || "");
  const isDeleted = chatData?.deletedFor?.includes(user?.uid || "");
  const canSendMessage =!!friendId && isFriend &&!isBlocked &&!isDeleted;
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
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // MP3 refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const chatId = idFromUrl as string;

  /* ================= LOAD CHAT + FRIEND ================= */
  useEffect(() => {
    if (!chatId) return;
    if (authLoading) return;
    if (!user) {
      router.replace("/chat");
      return;
    }

    setLoadingFriend(true);

    const unsub = onSnapshot(
      doc(db, "chats", chatId),
      async (snap) => {
        if (!snap.exists()) return;

        const data = snap.data() as ChatData;

        if (data.deletedFor?.includes(user.uid)) {
          try {
            await updateDoc(doc(db, "chats", chatId), {
              deletedFor: arrayRemove(user.uid)
            });
          } catch (e) {
            console.error("Lỗi mở lại chat:", e);
          }
          return;
        }

        if (!data.members?.includes(user.uid)) {
          toast.error("Bạn không có quyền truy cập");
          router.replace("/chat");
          return;
        }

        const otherUid = data.members?.find((id: string) => id!== user.uid);

        if (!otherUid) {
          toast.error("Không tìm thấy người dùng");
          router.replace("/chat");
          return;
        }

        const [friendSnap, friendDoc] = await Promise.all([
          getDoc(doc(db, "users", otherUid)),
          getDoc(doc(db, "users", user.uid, "friends", otherUid))
        ]);

        const friendData = friendSnap.data();
        const isFriend = friendDoc.exists() && friendDoc.data()?.status!== "removed";
        const membersInfo = data.membersInfo?.[otherUid];

        const realName = friendData?.displayName || friendData?.name || membersInfo?.name || "User";
        const realAvatar = friendData?.photoURL || friendData?.avatar || membersInfo?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(realName)}&background=random`;
        const realUsername = friendData?.username || membersInfo?.username || "";

        setFriend({
          uid: otherUid,
          name: realName,
          username: realUsername,
          avatar: realAvatar,
          isOnline: isFriend? (friendData?.isOnline || false) : false,
          lastSeen: friendData?.lastSeen,
          userId: friendData?.userId || ""
        });

        setIsFriend(isFriend);
        setChatData(data);
        setFriendId(otherUid);
        setLoadingFriend(false);
      },
      (error) => {
        console.error("Lỗi load chat:", error);
        if (error.code === 'permission-denied') {
          setLoadingFriend(false);
        } else {
          toast.error("Lỗi tải thông tin");
          router.replace("/chat");
          setLoadingFriend(false);
        }
      }
    );

    return () => unsub();
  }, [chatId, user, authLoading, router, db]);

  /* ================= REALTIME FRIEND STATUS ================= */
  useEffect(() => {
    if (!friendId) return;
    const unsub = onSnapshot(doc(db, "users", friendId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setFriend(prev => prev? {
       ...prev,
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen
        } : null);
      }
    });
    return () => unsub();
  }, [friendId, db]);

  /* ================= REALTIME MESSAGES ================= */
  useEffect(() => {
    if (!chatId ||!user) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id,...d.data() } as Message));
      setMessages(msgs);

      snap.docs.forEach((docSnap) => {
        const msg = docSnap.data() as Message;
        if (
          friendId &&
          msg.senderId === friendId &&
        !msg.seenBy?.includes(user.uid)
        ) {
          updateDoc(doc(db, "chats", chatId, "messages", docSnap.id), {
            seenBy: arrayUnion(user.uid)
          }).catch(() => {});
        }
      });
    });

    return () => unsub();
  }, [chatId, user, friendId, db]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleTyping = useCallback(async () => {
    return;
  }, []);

  const sendMessage = useCallback(async () => {
    if (isBlocked || isDeleted) {
      toast.error("Không thể nhắn tin");
      return;
    }
    if (!text.trim() ||!user ||!friend ||!chatId || sending ||!friendId ||!chatData) {
      if (!chatData) toast.error("Đang tải dữ liệu chat...");
      return;
    }

    const tempText = text;
    const tempReply = replyTo;
    const tempEdit = editingMsg;

    setText("");
    setReplyTo(null);
    setEditingMsg(null);
    setSending(true);
    inputRef.current?.focus();

    try {
      if (tempEdit) {
        await updateDoc(doc(db, "chats", chatId, "messages", tempEdit.id), {
          text: tempText,
          edited: true,
          editedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, "chats", chatId, "messages"), {
          text: tempText,
          senderId: user.uid,
          createdAt: serverTimestamp(),
          seenBy: [user.uid],
          type: "text",
          members: chatData.members,
       ...(tempReply && {
            replyTo: {
              id: tempReply.id,
              text: tempReply.text,
              senderName: tempReply.senderId === user.uid? "Bạn" : friend.name,
            },
          }),
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Gửi thất bại: ${e.code}`);
      setText(tempText);
      setReplyTo(tempReply);
      setEditingMsg(tempEdit);
    } finally {
      setSending(false);
    }
  }, [user, text, friend, chatId, sending, replyTo, editingMsg, friendId, db, chatData, isBlocked, isDeleted]);

  const sendImage = async (file: File) => {
    if (isBlocked || isDeleted) {
      toast.error("Không thể nhắn tin");
      return;
    }
    if (!user ||!chatId ||!friendId ||!chatData) {
      if (!chatData) toast.error("Đang tải dữ liệu chat...");
      return;
    }
    setUploading(true);
    setUploadProgress(0);

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const storageRef = ref(storage, `chat-images/${chatId}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, compressed);

      uploadTask.on(
        "state_changed",
        (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => {
          console.error(err);
          toast.error("Upload ảnh thất bại");
          setUploading(false);
          setUploadProgress(0);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(db, "chats", chatId, "messages"), {
              senderId: user.uid,
              image: url,
              type: "image",
              createdAt: serverTimestamp(),
              seenBy: [user.uid],
              members: chatData.members,
            });
          } catch (err: any) {
            console.error(err);
            toast.error(`Lỗi gửi ảnh: ${err.code}`);
          } finally {
            setUploading(false);
            setUploadProgress(0);
          }
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Lỗi nén ảnh");
      setUploading(false);
    }
  };

  const sendFile = async (file: File) => {
    if (!canSendMessage || isBlocked || isDeleted) {
      toast.error("Không thể nhắn tin");
      return;
    }
    if (!user ||!chatId ||!friendId ||!chatData) {
      if (!chatData) toast.error("Đang tải dữ liệu chat...");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File không được vượt quá 10MB");
      return;
    }

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
        members: chatData.members,
      });
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi gửi file: ${err.code}`);
    } finally {
      setUploading(false);
    }
  };

// ============ WAV RECORDING ============
  const startRecording = async () => {
    if (isBlocked || isDeleted) {
      toast.error("Không thể nhắn tin");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 }
      });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      pcmChunksRef.current = [];

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        pcmChunksRef.current.push(new Float32Array(input));
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setRecording(true);
      setRecordingTime(0);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);

    } catch (err: any) {
      toast.error(err.name === 'NotAllowedError'? "Chưa cấp quyền micro" : "Không thể ghi âm");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    try {
      processorRef.current?.disconnect();
      audioContextRef.current?.close();
      streamRef.current?.getTracks().forEach(t => t.stop());

      const samples = pcmChunksRef.current.flat();
      const sampleRate = 44100;
      const buffer = new ArrayBuffer(44 + samples.length * 2);
      const view = new DataView(buffer);

      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + samples.length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, samples.length * 2, true);

      let offset = 44;
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i] || 0));
        view.setInt16(offset, s * 0x7FFF, true);
        offset += 2;
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      setAudioBlob(blob);
      pcmChunksRef.current = [];
    } catch (e: any) {
      console.error('Encode error', e);
      toast.error("Lỗi: " + e.message);
    }
  };

  const sendVoice = async () => {
    if (!audioBlob ||!user ||!chatId ||!chatData) {
      if (!chatData) toast.error("Đang tải dữ liệu chat...");
      return;
    }

    setUploading(true);
    try {
      const fileName = `voice_${Date.now()}.wav`;
      const storageRef = ref(storage, `chat-voice/${chatId}/${fileName}`);

      await uploadBytes(storageRef, audioBlob, {
        contentType: 'audio/wav',
        cacheControl: 'public, max-age=31536000',
        customMetadata: { uid: user.uid, duration: String(recordingTime) }
      });

      const url = await getDownloadURL(storageRef);

      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
        voice: url,
        duration: Math.round(recordingTime),
        type: "voice",
        mimeType: 'audio/wav',
        createdAt: serverTimestamp(),
        seenBy: [user.uid],
        members: chatData.members,
      });

      setAudioBlob(null);
      setRecordingTime(0);
      setIsPreviewPlaying(false);
      toast.success("Đã gửi voice");
    } catch (err: any) {
      console.error("Voice error:", err);
      toast.error(`Lỗi gửi voice: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const sendLocation = async () => {
    if (!canSendMessage || isBlocked || isDeleted) {
      toast.error("Không thể nhắn tin");
      return;
    }
    if (!user ||!chatId ||!friendId ||!chatData) {
      if (!chatData) toast.error("Đang tải dữ liệu chat...");
      return;
    }
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị");
      return;
    }

    setUploading(true);
    toast.info("Đang lấy vị trí...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          await addDoc(collection(db, "chats", chatId, "messages"), {
            senderId: user.uid,
            location: { lat: latitude, lng: longitude },
            type: "location",
            createdAt: serverTimestamp(),
            seenBy: [user.uid],
            members: chatData.members,
          });
          toast.success("Đã gửi vị trí");
        } catch (err: any) {
          console.error(err);
          toast.error(`Lỗi gửi vị trí: ${err.code}`);
        } finally {
          setUploading(false);
        }
      },
      (err) => {
        console.error(err);
        toast.error("Không lấy được vị trí. Bật định vị trong trình duyệt");
        setUploading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!user ||!chatId) return;
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;
    const reactions = msg.reactions || [];
    const existing = reactions.find(r => r.emoji === emoji);
    try {
      if (existing?.users.includes(user.uid)) {
        const newUsers = existing.users.filter(u => u!== user.uid);
        if (newUsers.length === 0) {
          await updateDoc(doc(db, "chats", chatId, "messages", msgId), {
            reactions: arrayRemove(existing)
          });
        } else {
          const newReactions = reactions.map(r =>
            r.emoji === emoji? {...r, users: newUsers } : r
          );
          await updateDoc(doc(db, "chats", chatId, "messages", msgId), {
            reactions: newReactions
          });
        }
      } else {
        if (existing) {
          const newReactions = reactions.map(r =>
            r.emoji === emoji? {...r, users: [...r.users, user.uid] } : r
          );
          await updateDoc(doc(db, "chats", chatId, "messages", msgId), {
            reactions: newReactions
          });
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
  };

  const deleteMessage = async (msgId: string) => {
    if (!chatId ||!user) return;
    if (isDeleted) {
      toast.error("Không thể xóa tin nhắn trong cuộc trò chuyện đã xóa");
      return;
    }
    if (!confirm("Xoá tin nhắn này?")) return;
    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", msgId));
      toast.success("Đã xoá");
    } catch (err: any) {
      console.error("Delete message error:", err);
      if (err.code === 'permission-denied') {
        toast.error("Bạn chỉ có thể xóa tin nhắn của mình");
      } else {
        toast.error("Lỗi xoá tin nhắn");
      }
    }
  };

  const pinMessage = async (_msgId: string) => {
    toast.info("Tính năng ghim sẽ cập nhật sau");
  };

  const unpinMessage = async () => {
    toast.info("Tính năng ghim sẽ cập nhật sau");
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(m =>
      m.text?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  const getSeenAvatars = (msg: Message) => {
    if (!chatData || msg.senderId!== user?.uid) return [];
    return (msg.seenBy || [])
  .filter(uid => uid!== user?.uid)
  .map(uid => chatData.membersInfo[uid])
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
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!friend) {
    return (
      <div className="h-screen flex-col items-center justify-center bg-white dark:bg-zinc-950 gap-4">
        <p className="text-lg font-bold text-gray-900 dark:text-white">Không tìm thấy người dùng</p>
        <button
          onClick={() => router.replace("/chat")}
          className="px-6 py-2 bg-blue-500 text-white rounded-xl font-bold active:scale-95 transition-transform"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const pinnedMsg = messages.find(m => m.id === chatData?.pinnedMessage);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <Toaster richColors position="top-center" />

      {showSearch && (
        <div className="px-4 py-2 border-b border-gray-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tin nhắn..."
              className="flex-1 bg-transparent outline-none text-sm"
              autoFocus
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
              <X size={18} />
            </button>
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
          {friend.isOnline? (
            "Đang hoạt động"
          ) : friend.lastSeen? (
            formatDistanceToNow(friend.lastSeen.toDate(), { addSuffix: true, locale: vi })
          ) : (
            "Offline"
          )}
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
          <button onClick={unpinMessage} className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded">
            <X size={14} />
          </button>
        </div>
      )}

<div className="flex-1 min-h-0 overflow-y-auto px-4 pt-[68px] pb-[100px] space-y-0.5">
        {filteredMessages.map((m, i) => {
          const isMe = m.senderId === user.uid;
          const prev = filteredMessages[i - 1];
          const next = filteredMessages[i + 1];
          const showAvatar =!isMe && (!next || next.senderId!== m.senderId);
          const isFirstInGroup =!prev || prev.senderId!== m.senderId;
          const isLastInGroup =!next || next.senderId!== m.senderId;
          const showDate =
          !prev ||
            (m.createdAt &&
              prev.createdAt &&
              m.createdAt.toDate().toDateString()!== prev.createdAt.toDate().toDateString());

          const seenAvatars = getSeenAvatars(m);

          return (
            <div key={m.id} id={`msg-${m.id}`}>
              {showDate && m.createdAt && (
                <div className="flex items-center justify-center my-6">
                  <div className="px-4 py-1.5 bg-gray-200/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-full">
                    <p className="text-xs font-bold text-gray-600 dark:text-zinc-400">
                      {formatDateDivider(m.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              <div className={`flex items-end gap-2 group ${isMe? "justify-end" : "justify-start"} ${isFirstInGroup? "mt-3" : ""}`}>
                {!isMe && (
                  <div className="w-7 flex-shrink-0">
                    {showAvatar && <img src={friend.avatar} className="w-7 h-7 rounded-full shadow-sm" alt={friend.name} />}
                  </div>
                )}
                <div className={`max-w-[75%] flex flex-col ${isMe? "items-end" : "items-start"}`}>
                  {m.replyTo && (
                    <button
                      onClick={() => scrollToMessage(m.replyTo!.id)}
                      className={`px-3 py-1.5 mb-1 rounded-2xl text-xs ${
                        isMe? "bg-blue-400/30 text-white/80" : "bg-gray-200/60 dark:bg-zinc-700/60 text-gray-600 dark:text-zinc-300"
                      }`}
                    >
                      <p className="font-bold text-xs">{m.replyTo.senderName}</p>
                      <p className="truncate">{m.replyTo.text}</p>
                    </button>
                  )}

                  <div className="relative">
                    {m.type === "task_share"? (
                      <div
                        onClick={() => router.push(`/task/${m.taskId}`)}
                        className={`px-4 py-3 shadow-sm cursor-pointer active:scale-95 transition ${
                          isMe
                          ? `bg-gradient-to-br from-blue-500 to-indigo-600 text-white ${
                                isFirstInGroup && isLastInGroup
                                ? "rounded-3xl"
                                  : isFirstInGroup
                                ? "rounded-3xl rounded-br-lg"
                                  : isLastInGroup
                                ? "rounded-3xl rounded-tr-lg"
                                  : "rounded-r-lg rounded-l-3xl"
                              }`
                            : `bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border-2 border-blue-200 dark:border-blue-900 ${
                                isFirstInGroup && isLastInGroup
                                ? "rounded-3xl"
                                  : isFirstInGroup
                                ? "rounded-3xl rounded-bl-lg"
                                  : isLastInGroup
                                ? "rounded-3xl rounded-tl-lg"
                                  : "rounded-l-lg rounded-r-3xl"
                              }`
                        }`}
                      >
                        <p className="text-xs font-bold mb-1 opacity-80">
                          📋 Đã chia sẻ {m.taskPrice && m.taskPrice > 0? 'công việc' : 'kế hoạch'}
                        </p>
                        <p className="font-semibold leading-snug">{m.taskTitle}</p>
                        <p className={`text-sm font-bold mt-1 ${isMe? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                          {m.taskPrice && m.taskPrice > 0? `${m.taskPrice.toLocaleString()}đ` : 'Miễn phí'}
                        </p>
                        <p className={`text-xs mt-2 opacity-70`}>
                          Nhấn để xem chi tiết →
                        </p>
                      </div>
                    ) : (
<div
  className={`px-3.5 py-2 min-w-[36px] min-h-[36px] flex items-center justify-center shadow-sm cursor-pointer ${
                          isMe
                          ? `bg-gradient-to-br from-blue-500 to-indigo-600 text-white ${
                                isFirstInGroup && isLastInGroup
                                ? "rounded-3xl"
                                  : isFirstInGroup
                                ? "rounded-3xl rounded-br-lg"
                                  : isLastInGroup
                                ? "rounded-3xl rounded-tr-lg"
                                  : "rounded-r-lg rounded-l-3xl"
                              }`
                            : `bg-white dark:bg-zinc-800 text-gray-900 dark:text-white ${
                                isFirstInGroup && isLastInGroup
                                ? "rounded-3xl"
                                  : isFirstInGroup
                                ? "rounded-3xl rounded-bl-lg"
                                  : isLastInGroup
                                ? "rounded-3xl rounded-tl-lg"
                                  : "rounded-l-lg rounded-r-3xl"
                              }`
                        }`}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setShowEmojiPicker(m.id);
                        }}
                      >
                        {m.image && <img src={m.image} className="rounded-2xl max-w-full mb-1" alt="sent" />}
                        {m.file && (
                          <a href={m.file} target="_blank" className="flex items-center gap-2 p-2 bg-black/10 rounded-xl">
                            <Paperclip size={16} />
                            <span className="text-sm truncate">{m.fileName}</span>
                          </a>
                        )}
{m.voice && (
  <div className="flex items-center gap-2.5 w-[210px] py-1">
    <button
      onClick={async (e) => {
        const btn = e.currentTarget;
        const audio = btn.parentElement?.querySelector('audio') as HTMLAudioElement;
        if (!audio) return;
document.querySelectorAll<HTMLAudioElement>('audio.voice-audio').forEach(a => {
          if (a!== audio) { a.pause(); a.currentTime = 0; }
        });
        try {
          if (audio.paused) {
            await audio.play();
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
          } else {
            audio.pause();
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
          }
        } catch (err: any) {
          alert('Play lỗi: ' + err.message);
        }
      }}
      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition active:scale-90 ${isMe? 'bg-white/25 hover:bg-white/35 text-white' : 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-600 dark:text-blue-400'}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><polygon points="5,3 19,12 5,21"/></svg>
    </button>
    <div className="voice-player flex-1 relative">
      <audio
        src={m.voice}
        className="voice-audio"
        crossOrigin="anonymous"
        preload="metadata"
        playsInline
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        onEnded={(e) => {
          const btn = (e.target as HTMLAudioElement).parentElement?.parentElement?.querySelector('button');
          if (btn) btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>';
        }}
      />
      <div className="flex items-end gap-[1.8px] h-6">
        {Array.from({ length: 22 }).map((_, i) => (
          <div key={i} className={`w-[2px] rounded-full ${isMe? 'bg-white/40' : 'bg-gray-400/50'}`} style={{ height: `${8 + Math.random()*12}px` }} />
        ))}
      </div>
    </div>
    <span className={`text-[11px] font-mono min-w-[32px] text-right ${isMe? 'text-white/80' : 'text-gray-500'}`}>
      {m.duration? `${Math.floor(m.duration/60)}:${String(m.duration%60).padStart(2,'0')}` : '0:00'}
    </span>
  </div>
)}
                        {m.location && (
                          <a
                            href={`https://maps.google.com/?q=${m.location.lat},${m.location.lng}`}
                            target="_blank"
                            className="flex items-center gap-2 p-3 bg-black/10 rounded-xl"
                          >
                            <MapPin size={20} />
                            <div>
                              <p className="text-sm font-bold">Vị trí đã chia sẻ</p>
                              <p className="text-xs opacity-70">Nhấn để mở Google Maps</p>
                            </div>
                          </a>
                        )}
                        {m.text && (
<p className="text-[15px] leading-none whitespace-pre-wrap break-words text-center">
                            {m.text}
                            {m.edited && <span className="text-xs opacity-60 ml-1">(đã sửa)</span>}
                          </p>
                        )}
                      </div>
                    )}
                    {m.reactions && m.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1 px-1">
                        {m.reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => toggleReaction(m.id, r.emoji)}
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              r.users.includes(user.uid)
                              ? "bg-blue-100 dark:bg-blue-900/50"
                                : "bg-gray-100 dark:bg-zinc-800"
                            }`}
                          >
                            {r.emoji} {r.users.length}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className={`absolute ${isMe? "right-0" : "left-0"} top-0 hidden group-hover:flex gap-1 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-1`}>
                      <button onClick={() => setShowEmojiPicker(m.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded">
                        <Smile size={16} />
                      </button>
                      <button onClick={() => setReplyTo(m)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded">
                        <Reply size={16} />
                      </button>
                      {isMe && (
                        <>
                          <button onClick={() => { setEditingMsg(m); setText(m.text); inputRef.current?.focus(); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded">
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => deleteMessage(m.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                      <button onClick={() => pinMessage(m.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded">
                        <Pin size={16} />
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(m.text); toast.success("Đã copy"); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded">
                        <Copy size={16} />
                      </button>
                    </div>
                    {showEmojiPicker === m.id && (
                      <div className="absolute bottom-full mb-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-2 flex gap-1 z-10">
                        {EMOJI_LIST.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(m.id, emoji)}
                            className="text-2xl hover:scale-125 transition-transform"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isLastInGroup && (
                <div className="flex w-full justify-center items-center gap-1.5 mt-1.5">
                  <p className="text-[11px] text-gray-400 dark:text-zinc-500">{formatTime(m.createdAt)}</p>
                  {isMe && seenAvatars.length > 0 && (
                    <div className="flex -space-x-1">
                      {seenAvatars.slice(0,3).map((u,i)=>(
                        <img key={i} src={u.avatar} className="w-3 h-3 rounded-full ring-1 ring-white dark:ring-zinc-950" alt={u.name}/>
                      ))}
                    </div>
                  )}
                  {isMe && seenAvatars.length===0 && m.seenBy && m.seenBy.length>1 && <CheckCheck className="text-blue-500" size={12} />}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {(replyTo || editingMsg) && (
        <div className="px-4 pt-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-t border-gray-200/50 dark:border-zinc-800/50">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {editingMsg? "Chỉnh sửa" : `Trả lời ${replyTo?.senderId === user.uid? "bạn" : friend.name}`}
              </p>
              <p className="text-sm text-gray-600 dark:text-zinc-400 truncate">
                {editingMsg? editingMsg.text : replyTo?.text}
              </p>
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
            <Loader2 size={16} className="animate-spin" />
            Đang tải lên... {uploadProgress}%
          </div>
        </div>
      )}

      {!isFriend &&!isBlocked &&!isDeleted && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200/50 dark:border-amber-900/50">
          <div className="flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <Shield size={14} />
            Các bạn chưa kết bạn. Hãy cẩn thận khi chia sẻ thông tin cá nhân
          </div>
        </div>
      )}

<div className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-zinc-950 border-t border-gray-200 dark:border-zinc-800">
  <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
    {audioBlob &&!recording? (
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => {
            setAudioBlob(null);
            setIsPreviewPlaying(false);
          }}
          className="w-10 h-10 flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full active:scale-90"
        >
          <Trash2 size={20} />
        </button>
        <button
          onClick={() => {
            const audio = previewAudioRef.current;
            if (!audio) return;
            if (audio.paused) {
              audio.play();
              setIsPreviewPlaying(true);
            } else {
              audio.pause();
              setIsPreviewPlaying(false);
            }
          }}
          className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center active:scale-90"
        >
          {isPreviewPlaying? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-0.5" />}
        </button>
        <div className="flex-1 flex items-center gap-[2px] h-8 px-2 bg-gray-100 dark:bg-zinc-900 rounded-full overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className={`w-0.5 rounded-full ${isPreviewPlaying? 'bg-blue-500' : 'bg-gray-400 dark:bg-zinc-600'}`}
              style={{ height: `${6 + Math.random() * 16}px` }}
            />
          ))}
        </div>
        <span className="text-xs font-mono w-11 text-center">
          {String(Math.floor(recordingTime / 60)).padStart(2, '0')}:{String(recordingTime % 60).padStart(2, '0')}
        </span>
        <button
          onClick={sendVoice}
          disabled={uploading}
          className="px-4 h-10 bg-blue-600 text-white rounded-full text-sm font-medium active:scale-95 disabled:opacity-50"
        >
          {uploading? <Loader2 size={16} className="animate-spin" /> : 'Gửi'}
        </button>
      <audio
  ref={previewAudioRef}
  src={audioBlob? URL.createObjectURL(audioBlob) : ''}
  onEnded={() => setIsPreviewPlaying(false)}
  className="hidden"
  crossOrigin="anonymous"
  preload="metadata"
  playsInline
/>
      </div>
    ) : recording? (
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 h-11 px-4 bg-red-50 dark:bg-red-950/30 rounded-full">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div className="flex-1 flex items-center gap-[2px]">
            {Array.from({ length: 22 }).map((_, i) => (
              <div
                key={i}
                className="w-0.5 h-4 bg-red-500/70 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
          <span className="text-sm font-mono text-red-600">{recordingTime}s</span>
        </div>
        <button
          onMouseUp={stopRecording}
          onTouchEnd={stopRecording}
          className="w-11 h-11 bg-red-600 text-white rounded-full flex items-center justify-center active:scale-90"
        >
          <Square size={18} fill="white" />
        </button>
      </div>
    ) : (
      <div className="flex items-end gap-2">
        <input
          type="file"
          hidden
          ref={imageInputRef}
          accept="image/*"
          onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])}
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={isBlocked || isDeleted}
          className={`w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full active:scale-90 ${isBlocked || isDeleted? 'opacity-50' : ''}`}
        >
          <ImageIcon size={22} className="text-gray-600 dark:text-zinc-400" />
        </button>
        <input type="file" hidden ref={fileInputRef} onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isBlocked || isDeleted}
          className={`w-10 h-10 hidden sm:flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full active:scale-90 ${isBlocked || isDeleted? 'opacity-50' : ''}`}
        >
          <Paperclip size={20} className="text-gray-600 dark:text-zinc-400" />
        </button>
        <button
          onClick={sendLocation}
          disabled={isBlocked || isDeleted}
          className={`w-10 h-10 hidden sm:flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full active:scale-90 ${isBlocked || isDeleted? 'opacity-50' : ''}`}
        >
          <MapPin size={20} className="text-gray-600 dark:text-zinc-400" />
        </button>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' &&!e.shiftKey) {
                e.preventDefault();
                if (!isBlocked &&!isDeleted && text.trim()) sendMessage();
              }
            }}
            disabled={isBlocked || isDeleted}
            placeholder={isBlocked? 'Bạn không thể nhắn tin' : isDeleted? 'Đã xóa cuộc trò chuyện' : 'Nhắn tin...'}
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-zinc-900 rounded-full outline-none focus:ring-2 focus:ring-blue-500/20 text-[15px]"
          />
        </div>
        {text.trim()? (
          <button
            onClick={sendMessage}
            disabled={sending || isBlocked || isDeleted}
            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center active:scale-90 disabled:opacity-50"
          >
            {sending? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        ) : (
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isBlocked || isDeleted}
            className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center active:scale-90 disabled:opacity-50"
          >
            <Mic size={18} />
          </button>
        )}
      </div>
    )}
  </div>
</div>
</div>
  );
}