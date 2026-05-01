"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB, getFirebaseStorage } from "@/lib/firebase";
import {
  collection, query, onSnapshot, doc,
  orderBy, limit, addDoc, serverTimestamp, Timestamp, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, startAfter, getDocs
} from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Image as ImageIcon, MapPin, Paperclip, Phone, Send,
  ArrowLeft, Loader2, X, Video, CheckCheck,
  Smile, Reply, Trash2, Pencil, Pin, Copy, Mic, Square, Search
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
  type: "text" | "image" | "file" | "location" | "voice";
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
  optimistic?: boolean;
  members?: string[]; // THÊM FIELD NÀY CHO RULE MỚI
};

type ChatData = {
  members: string[];
  membersInfo: Record<string, { name: string; avatar: string; username: string }>;
  pinnedMessage?: string;
  typing?: Record<string, boolean>;
};

const EMOJI_LIST = ["❤️", "😂", "😮", "😢", "😡", "👍"];
const MSG_LIMIT = 30;

export default function ChatDetailPage() {
  const params = useParams();
  const idFromUrl = Array.isArray(params?.id)? params.id[0] : params?.id || null;
  const router = useRouter();
  const db = getFirebaseDB();
  const storage = getFirebaseStorage();
  const { user, loading: authLoading } = useAuth();

  const [friend, setFriend] = useState<UserData | null>(null);
  const [friendId, setFriendId] = useState<string | null>(null);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingFriend, setLoadingFriend] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMsgDocRef = useRef<any>(null);

  const chatId = idFromUrl as string;

  /* ================= LOAD CHAT + FRIEND ================= */
  useEffect(() => {
    if (!chatId) return;
    if (authLoading) return;
    if (!user) {
      router.replace("/chat");
      return;
    }

    const unsub = onSnapshot(doc(db, "chats", chatId), async (snap) => {
      if (!snap.exists()) {
        toast.error("Cuộc trò chuyện không tồn tại");
        setTimeout(() => router.replace("/chat"), 1500);
        return;
      }

      const data = snap.data() as ChatData;

      if (!data.members?.includes(user.uid)) {
        toast.error("Bạn không có quyền truy cập");
        router.replace("/chat");
        return;
      }

      const otherUid = data.members?.find((id: string) => id!== user.uid);

      if (!otherUid ||!data.membersInfo?.[otherUid]) {
        toast.error("Không tìm thấy người dùng");
        router.replace("/chat");
        return;
      }

      const otherUser = data.membersInfo[otherUid];
      const friendSnap = await getDoc(doc(db, "users", otherUid));
      const friendData = friendSnap.data();

      setFriend({
        uid: otherUid,
        name: otherUser.name || "User",
        username: otherUser.username || "",
        avatar: otherUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser.name)}&background=random`,
        isOnline: friendData?.isOnline || false,
        userId: friendData?.userId || ""
      });
      setFriendId(otherUid);
      setChatData(data);
      setLoadingFriend(false);
    }, (error) => {
      console.error(error);
      toast.error("Lỗi tải thông tin");
      router.replace("/chat");
      setLoadingFriend(false);
    });

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

  /* ================= LOAD MESSAGES WITH PAGINATION ================= */
  const loadMessages = useCallback(async (loadMore = false) => {
    if (!chatId ||!user ||!friendId) return;
    if (loadMore &&!hasMore) return;

    setLoadingMore(true);

    let q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(MSG_LIMIT)
    );

    if (loadMore && lastMsgDocRef.current) {
      q = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("createdAt", "desc"),
        startAfter(lastMsgDocRef.current),
        limit(MSG_LIMIT)
      );
    }

    const snap = await getDocs(q);
    const msgs = snap.docs.map((d) => ({ id: d.id,...d.data() } as Message)).reverse();

    if (snap.docs.length > 0) {
      lastMsgDocRef.current = snap.docs[snap.docs.length - 1];
    }

    setHasMore(snap.docs.length === MSG_LIMIT);

    if (loadMore) {
      setMessages(prev => [...msgs,...prev]);
    } else {
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }

    setLoadingMore(false);
  }, [chatId, user, friendId, db, hasMore]);

  useEffect(() => {
    loadMessages(false);
  }, [loadMessages]);

  /* ================= REALTIME NEW MESSAGES ================= */
  useEffect(() => {
    if (!chatId ||!user ||!friendId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const msg = { id: change.doc.id,...change.doc.data() } as Message;

          setMessages(prev => {
            if (msg.optimistic || prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          if (msg.senderId === friendId &&!msg.seenBy?.includes(user.uid)) {
            updateDoc(doc(db, "chats", chatId, "messages", msg.id), {
              seenBy: arrayUnion(user.uid)
            }).catch(() => {});
          }
        }
        if (change.type === "modified") {
          const msg = { id: change.doc.id,...change.doc.data() } as Message;
          setMessages(prev => prev.map(m => m.id === msg.id? msg : m));
        }
        if (change.type === "removed") {
          setMessages(prev => prev.filter(m => m.id!== change.doc.id));
        }
      });
    });

    return () => unsub();
  }, [chatId, user, friendId, db]);

  /* ================= TYPING INDICATOR ================= */
  useEffect(() => {
    if (!chatId ||!friendId) return;
    const unsub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setIsTyping(data?.typing?.[friendId] === true);
      }
    });
    return () => unsub();
  }, [chatId, friendId, db]);

  const handleTyping = useCallback(async () => {
    if (!user ||!chatId) return;
    try {
      await setDoc(doc(db, "chats", chatId), {
        [`typing.${user.uid}`]: true
      }, { merge: true });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        await setDoc(doc(db, "chats", chatId), {
          [`typing.${user.uid}`]: false
        }, { merge: true });
      }, 3000);
    } catch (e) {
      console.log("Typing error:", e);
    }
  }, [user, chatId, db]);

  /* ================= SEND MESSAGE - OPTIMISTIC UI ================= */
  const sendMessage = useCallback(async () => {
    if (!text.trim() ||!user ||!friend ||!chatId || sending ||!friendId ||!chatData) {
      if (!chatData) toast.error("Đang tải dữ liệu chat...");
      return;
    }

    const tempText = text;
    const tempReply = replyTo;
    const tempEdit = editingMsg;

    const optimisticMsg: Message = {
      id: `temp_${Date.now()}`,
      text: tempText,
      senderId: user.uid,
      createdAt: Timestamp.now(),
      seenBy: [user.uid],
      type: "text",
      optimistic: true,
     ...(tempReply && {
        replyTo: {
          id: tempReply.id,
          text: tempReply.text,
          senderName: tempReply.senderId === user.uid? "Bạn" : friend.name,
        },
      }),
    };

    if (tempEdit) {
      setMessages(prev => prev.map(m => m.id === tempEdit.id? {...m, text: tempText, edited: true } : m));
    } else {
      setMessages(prev => [...prev, optimisticMsg]);
    }

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

        await setDoc(
          doc(db, "chats", chatId),
          {
            lastMessage: tempText,
            updatedAt: serverTimestamp(),
            [`typing.${user.uid}`]: false,
          },
          { merge: true }
        );
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Gửi thất bại: ${e.code}`);
      if (tempEdit) {
        setMessages(prev => prev.map(m => m.id === tempEdit.id? tempEdit : m));
      } else {
        setMessages(prev => prev.filter(m => m.id!== optimisticMsg.id));
      }
      setText(tempText);
      setReplyTo(tempReply);
      setEditingMsg(tempEdit);
    } finally {
      setSending(false);
    }
  }, [user, text, friend, chatId, sending, replyTo, editingMsg, friendId, db, chatData]);

  /* ================= SEND IMAGE ================= */
  const sendImage = async (file: File) => {
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

            await setDoc(
              doc(db, "chats", chatId),
              {
                lastMessage: "📷 Ảnh",
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
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

  /* ================= SEND FILE ================= */
  const sendFile = async (file: File) => {
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

      await setDoc(
        doc(db, "chats", chatId),
        {
          lastMessage: `📎 ${file.name}`,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi gửi file: ${err.code}`);
    } finally {
      setUploading(false);
    }
  };

  /* ================= VOICE RECORDING ================= */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
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
    if (!audioBlob ||!user ||!chatId ||!friendId ||!chatData) {
      if (!chatData) toast.error("Đang tải dữ liệu chat...");
      return;
    }
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
        members: chatData.members,
      });

      await setDoc(
        doc(db, "chats", chatId),
        {
          lastMessage: "🎤 Tin nhắn thoại",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setAudioBlob(null);
      setRecordingTime(0);
    } catch (err: any) {
      console.error(err);
      toast.error(`Lỗi gửi voice: ${err.code}`);
    } finally {
      setUploading(false);
    }
  };

  /* ================= SEND LOCATION ================= */
  const sendLocation = async () => {
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

          await setDoc(
            doc(db, "chats", chatId),
            {
              lastMessage: "📍 Vị trí",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
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
  /* ================= REACTIONS ================= */
  const toggleReaction = async (msgId: string, emoji: string) => {
    if (!user ||!chatId) return;

    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    const reactions = msg.reactions || [];
    const existing = reactions.find(r => r.emoji === emoji);

    try {
      if (existing?.users.includes(user.uid)) {
        // Remove reaction
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
        // Add reaction
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

  /* ================= DELETE MESSAGE ================= */
  const deleteMessage = async (msgId: string) => {
    if (!chatId) return;
    if (!confirm("Xoá tin nhắn này?")) return;

    try {
      await deleteDoc(doc(db, "chats", chatId, "messages", msgId));
      toast.success("Đã xoá");
    } catch (err) {
      toast.error("Lỗi xoá tin nhắn");
    }
  };

  /* ================= PIN MESSAGE ================= */
  const pinMessage = async (msgId: string) => {
    if (!chatId) return;
    try {
      await setDoc(doc(db, "chats", chatId), {
        pinnedMessage: msgId
      }, { merge: true });
      toast.success("Đã ghim tin nhắn");
    } catch (err) {
      toast.error("Lỗi ghim tin nhắn");
    }
  };

  const unpinMessage = async () => {
    if (!chatId) return;
    try {
      await setDoc(doc(db, "chats", chatId), {
        pinnedMessage: null
      }, { merge: true });
      toast.success("Đã bỏ ghim");
    } catch (err) {
      toast.error("Lỗi bỏ ghim");
    }
  };

  /* ================= FILTER SEARCH ================= */
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter(m =>
      m.text?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  /* ================= SEEN AVATAR STACK ================= */
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

      {/* SEARCH BAR */}
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

      {/* HEADER */}
      <div className="px-4 py-3 border-b border-gray-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl flex items-center gap-3 sticky top-0 z-20">
        <button onClick={() => router.back()} className="md:hidden p-2 -ml-2 active:scale-90 transition-transform rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900">
          <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
        </button>
        <div className="relative">
          <img src={friend.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-zinc-950 shadow-lg" alt={friend.name} />
          {friend.isOnline && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring- ring-white dark:ring-zinc-950">
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 dark:text-white truncate">{friend.name}</p>
          <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
            {isTyping? (
              <span className="flex items-center gap-1">
                Đang nhập
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1 h-1 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </span>
 ) : friend.isOnline? (
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

      {/* PINNED MESSAGE */}
      {pinnedMsg && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/50 flex items-center gap-2">
          <Pin size={16} className="text-amber-600 flex-shrink-0" />
          <p className="flex-1 text-sm text-amber-900 dark:text-amber-200 truncate">{pinnedMsg.text}</p>
          <button onClick={unpinMessage} className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded">
            <X size={14} />
          </button>
        </div>
      )}

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-0.5" onScroll={(e) => {
        if (e.currentTarget.scrollTop === 0 && hasMore &&!loadingMore) {
          loadMessages(true);
        }
      }}>
        {loadingMore && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

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
                    <div
                      className={`px-4 py-2.5 shadow-sm cursor-pointer ${
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
                        <div className="flex items-center gap-2">
                          <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                            <Mic size={16} />
                          </button>
                          <div className="flex-1 h-1 bg-white/30 rounded-full">
                            <div className="h-full bg-white rounded-full" style={{ width: "30%" }} />
                          </div>
                          <span className="text-xs">{m.duration}s</span>
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
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {m.text}
                          {m.edited && <span className="text-xs opacity-60 ml-1">(đã sửa)</span>}
                        </p>
                      )}
                    </div>

                    {/* Reactions */}
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

                    {/* Context Menu */}
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

                    {/* Emoji Picker */}
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

                  {isLastInGroup && (
                    <div className={`flex items-center gap-1 mt-1 px-1 ${isMe? "flex-row-reverse" : ""}`}>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">{formatTime(m.createdAt)}</p>
                      {isMe && seenAvatars.length > 0 && (
                        <div className="flex -space-x-2">
                          {seenAvatars.slice(0, 3).map((u, idx) => (
                            <img
                              key={idx}
                              src={u.avatar}
                              className="w-4 h-4 rounded-full ring-2 ring-white dark:ring-zinc-950"
                              alt={u.name}
                            />
                          ))}
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

      {/* REPLY/EDIT BAR */}
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

      {/* UPLOAD PROGRESS */}
      {uploading && (
        <div className="bg-white dark:bg-zinc-900 px-4 py-2 border-t border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
            <Loader2 size={16} className="animate-spin" />
            Đang tải lên... {uploadProgress}%
          </div>
        </div>
      )}

      {/* AUDIO PREVIEW */}
      {audioBlob &&!recording && (
        <div className="px-4 py-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-t border-gray-200/50 dark:border-zinc-800/50">
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-2xl">
            <Mic size={20} className="text-green-600" />
            <span className="flex-1 text-sm">Tin nhắn thoại {recordingTime}s</span>
            <button onClick={() => setAudioBlob(null)} className="p-1.5 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-full">
              <X size={18} />
            </button>
            <button onClick={sendVoice} className="px-4 py-1.5 bg-green-600 text-white rounded-full text-sm font-medium">
              Gửi
            </button>
          </div>
        </div>
      )}

      {/* INPUT */}
      <div className="p-4 border-t border-gray-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl">
        <div className="flex items-end gap-2">
          <input type="file" hidden ref={imageInputRef} accept="image/*" onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])} />
          <button onClick={() => imageInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90">
            <ImageIcon size={22} className="text-gray-600 dark:text-zinc-400" />
          </button>
          <input type="file" hidden ref={fileInputRef} onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])} />
          <button onClick={() => fileInputRef.current?.click()} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90">
            <Paperclip size={22} className="text-gray-600 dark:text-zinc-400" />
          </button>

<button onClick={sendLocation} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90">
  <MapPin size={22} className="text-gray-600 dark:text-zinc-400" />
</button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleTyping();
              }}
              onKeyDown={(e) => e.key === "Enter" &&!e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Nhắn tin..."
              className="w-full px-5 py-3 bg-gray-100 dark:bg-zinc-900 rounded-3xl outline-none focus:ring-2 focus:ring-blue-500/30 text-sm font-medium text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-zinc-500 transition-all"
            />
          </div>
          {text.trim()? (
            <button
              onClick={sendMessage}
              disabled={sending}
              className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
            >
              {sending? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          ) : (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`w-11 h-11 ${recording? "bg-red-500" : "bg-gradient-to-br from-blue-500 to-indigo-600"} text-white rounded-full flex items-center justify-center active:scale-90 transition-all shadow-lg`}
            >
              {recording? <Square size={18} /> : <Mic size={18} />}
            </button>
          )}
        </div>
        {recording && (
          <div className="mt-2 flex items-center justify-center gap-2 text-red-500 text-sm font-medium">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Đang ghi âm {recordingTime}s
          </div>
        )}
      </div>
    </div>
  );
}
