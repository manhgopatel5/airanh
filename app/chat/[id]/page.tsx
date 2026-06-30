"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB, getFirebaseStorage } from "@/lib/firebase";
import { BACKGROUNDS, BACKGROUND_GROUPS, getBgUrl, getBgSrcSet, isGradient, type BgId } from '@/lib/backgrounds';
import {
  collection, query, onSnapshot, doc,
  orderBy, addDoc, deleteField, serverTimestamp, Timestamp, updateDoc, deleteDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Image as ImageIcon, Navigation, ChevronDown, ChevronUp, Flag, MapPin, BellOff, Paperclip, Phone, Send, Loader2, X, Video, CheckCheck,
  Smile, Reply, Trash2, Pencil, Shield, Pin, Copy, Search
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
  text?: string; // <-- sửa: cho phép rỗng với location
  senderId: string;
  senderName?: string; // <-- thêm
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
  
  // location cũ (giữ để tương thích)
  location?: { lat: number; lng: number };
  
  // location mới (cho UI map đẹp)
  lat?: number;
  lng?: number;
  address?: string;
  accuracy?: number;

  type: "text" | "image" | "file" | "location" | "task_share";
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
  pinnedMessage?: {
    id: string;
    text?: string;
    image?: string | null;
    file?: string | null;
    fileName?: string | null;
    sender?: string;
    senderName?: string;
    by?: string;
    createdAt?: any;
    pinnedAt?: any;
  } | null;
  typing?: Record<string, boolean>;
  blockedUsers?: string[];
  deletedFor?: string[];
  type?: string;
  backgroundId?: string; // <-- dùng cho nền mới, chỉ lưu id
  background?: string; // <-- giữ lại để đọc dữ liệu cũ
};

const EMOJI_LIST = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export default function ChatDetailPage() {
  const params = useParams();
  const idFromUrl = Array.isArray(params?.id)? params.id[0] : params?.id || null;
  const router = useRouter();
  const [longPressMsg, setLongPressMsg] = useState<any>(null);
  const db = useMemo(() => getFirebaseDB(), []);
  const storage = useMemo(() => getFirebaseStorage(), []);
  const { user, loading: authLoading } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [friend, setFriend] = useState<UserData | null>(null);
  const [friendId, setFriendId] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(true);
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [failedBg, setFailedBg] = useState<string[]>([]);

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
const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
const [showBgPicker, setShowBgPicker] = useState(false);

  const handleDeleteMessage = async (msgId: string) => {
  if (!chatId) return;
  await deleteDoc(doc(db, "chats", chatId, "messages", msgId));
  setLongPressMsg(null);
};
const handlePinMessage = async (msg: any) => {
  if (!chatId ||!msg?.id) return;

  try {
    const pinned = (chatData as any)?.pinnedMessage;
    const isAlreadyPinned = pinned && typeof pinned === 'object' && pinned.id === msg.id;

    // DÙNG USER CÓ SẴN - không cần getAuth
    const myName = user?.displayName || user?.email?.split('@')[0] || 'Bạn';

    if (isAlreadyPinned) {
      await updateDoc(doc(db, "chats", chatId), {
        pinnedMessage: null
      });
      toast.success('Đã bỏ ghim');
    } else {
      await updateDoc(doc(db, "chats", chatId), {
        pinnedMessage: {
          id: msg.id,
          text: msg.text || '',
          image: msg.image || null,
          file: msg.file || null,
          fileName: msg.fileName || null,
          sender: msg.senderId,
          senderName: msg.senderName || myName,
          by: myName,
          createdAt: msg.createdAt || null,
          pinnedAt: serverTimestamp()
        }
      });
      toast.success('Đã ghim tin nhắn');
    }

    setLongPressMsg(null);
    if (navigator.vibrate) navigator.vibrate(10);

  } catch (error) {
    console.error('Lỗi ghim:', error);
    toast.error('Không thể ghim tin nhắn');
    setLongPressMsg(null);
  }
};



  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);



  const chatId = idFromUrl as string;

  /* ================= LOAD CHAT + FRIEND - ĐÃ FIX ================= */
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
        if (!snap.exists()) {
          return;
        }

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

        // FIX: Load từ users collection trước, fallback về membersInfo
        const [friendSnap, friendDoc] = await Promise.all([
          getDoc(doc(db, "users", otherUid)),
          getDoc(doc(db, "users", user.uid, "friends", otherUid))
        ]);

        const friendData = friendSnap.data();
        const isFriend = friendDoc.exists() && friendDoc.data()?.status!== "removed";
        const membersInfo = data.membersInfo?.[otherUid];

        // Ưu tiên lấy từ users, nếu không có mới lấy từ membersInfo
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

  /* ================= REALTIME MESSAGES - DUY NHẤT ================= */
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

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const handleTyping = useCallback(async () => {
  if (!user ||!chatId ||!chatData || isBlocked || isDeleted) return;

  try {
    // Set đang nhập
    await updateDoc(doc(db, "chats", chatId), {
      [`typing.${user.uid}`]: true
    });

    // Clear timeout cũ
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Tự tắt sau 3s không gõ
    typingTimeoutRef.current = setTimeout(async () => {
      await updateDoc(doc(db, "chats", chatId), {
        [`typing.${user.uid}`]: false
      });
    }, 3000);
  } catch (e) {
    console.error("Typing error:", e);
  }
}, [user, chatId, chatData, db, isBlocked, isDeleted]);

// Cleanup
useEffect(() => {
  return () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };
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
  const toastId = toast.loading("Đang lấy vị trí...");

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      try {
        // Reverse geocode OSM
        let address = '';
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'vi' } }
          );
          const data = await res.json();
          address = data.address?.road
           ? `${data.address.road}, ${data.address.city || data.address.town || data.address.village || ''}`
            : data.display_name?.split(',').slice(0,2).join(', ');
        } catch {}

        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: user.uid,
          senderName: user.displayName || user.email?.split('@')[0] || 'Bạn',
          type: "location",
          text: '', // <-- thêm để tránh lỗi text undefined
          lat: latitude,
          lng: longitude,
          location: { lat: latitude, lng: longitude }, // <-- thêm để tương thích UI cũ
          address: address || 'Vị trí đã chia sẻ',
          accuracy,
          createdAt: serverTimestamp(),
          seenBy: [user.uid],
          members: chatData.members,
        });

        await updateDoc(doc(db, "chats", chatId), {
          lastMessage: '📍 Vị trí',
          lastMessageAt: serverTimestamp(),
        });

        toast.dismiss(toastId);
        toast.success("Đã gửi vị trí");
      } catch (err: any) {
        console.error(err);
        toast.dismiss(toastId);
        toast.error(`Lỗi gửi vị trí`);
      } finally {
        setUploading(false);
      }
    },
    (err) => {
      console.error(err);
      toast.dismiss(toastId);
      toast.error("Không lấy được vị trí. Hãy bật GPS");
      setUploading(false);
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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

  

  const searchInputRef = useRef<HTMLInputElement>(null);
const [currentResultIndex, setCurrentResultIndex] = useState(0);

const filteredMessages = useMemo(() =>
  messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase())),
  [searchQuery, messages]
);

const goToNextResult = () => {
  if (filteredMessages.length === 0) return;
  const nextIndex = (currentResultIndex + 1) % filteredMessages.length;
  setCurrentResultIndex(nextIndex);
  const nextId = filteredMessages[nextIndex]?.id;
  if (nextId) {
    const el = document.getElementById(`msg-${nextId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // highlight nhẹ
    el?.classList.add('scale-[1.02]');
    setTimeout(() => el?.classList.remove('scale-[1.02]'), 300);
  }
};

const goToPrevResult = () => {
  if (filteredMessages.length === 0) return;
  const prevIndex = (currentResultIndex - 1 + filteredMessages.length) % filteredMessages.length;
  setCurrentResultIndex(prevIndex);
  const prevId = filteredMessages[prevIndex]?.id;
  if (prevId) {
    const el = document.getElementById(`msg-${prevId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.classList.add('scale-[1.02]');
    setTimeout(() => el?.classList.remove('scale-[1.02]'), 300);
  }
};

// Phím tắt Cmd+K
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setShowSearch(true);
    }
  };
  window.addEventListener('keydown', handleKey);
  return () => window.removeEventListener('keydown', handleKey);
}, []);

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



  return (
<div className="fixed inset-0 flex flex-col bg-transparent">
{/* NỀN ẢNH CHUẨN RETINA - KHÔNG MỜ */}
{/* NỀN MỚI - dùng backgroundId */}
{(() => {
  const bgId = (chatData?.backgroundId || 'default') as BgId;
  const bg = BACKGROUNDS[bgId];

  if (!bg?.url) {
    return <div className="fixed inset-0 -z-10 bg-white dark:bg-zinc-950" />;
  }

  if (isGradient(bgId)) {
    return (
      <div
        className="fixed inset-0 -z-10"
        style={{ background: bg.url.replace('gradient:', '') }}
      />
    );
  }

  return (
    <>
  <img
  src={getBgUrl(bgId, 2000)}
  srcSet={getBgSrcSet(bgId)}
  className="fixed inset-0 -z-10 w-full h-full object-cover"
  alt=""
  draggable={false}
  onError={(e) => {
    // 1. ẩn ảnh hỏng
    e.currentTarget.style.display = 'none';
    // 2. tự động reset về nền mặc định
    if (bgId !== 'default') {
      setChatData(prev => prev ? { ...prev, backgroundId: '' } : prev);
      // optional: cập nhật Firestore luôn
      updateDoc(doc(db, "chats", chatId), { backgroundId: '' }).catch(()=>{});
    }
  }}
/>
      <div className="fixed inset-0 -z-10 bg-black/10 dark:bg-black/30 pointer-events-none" />
    </>
  );
})()}

  <Toaster richColors position="top-center" />
{showSearch && (
  <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/70 backdrop-blur-md"
      onClick={() => { setShowSearch(false); setSearchQuery(''); }}
    />

    {/* Sheet */}
    <div className="relative w-full sm:max-w-[420px] bg-[#0f0f10] sm:rounded-2xl rounded-t- shadow-2xl animate-in slide-in-from-bottom duration-300 max-h- flex-col border border-white/10">

      {/* Handle */}
      <div className="flex justify-center pt-2.5 sm:hidden">
        <div className="w-10 h-1 bg-white/20 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-3 border-b border-white/5">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentResultIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setShowSearch(false); setSearchQuery(''); }
              if (e.key === 'Enter' && searchQuery) { goToNextResult(); }
            }}
            placeholder="Tìm trong cuộc trò chuyện"
            className="w-full h-9 pl-9 pr-8 bg-[#1c1c1e] text- text-white placeholder:text-white/40 rounded-lg outline-none border border-transparent focus:border-[#0A84FF]/50 focus:bg-[#1e1e20] transition"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center"
            >
              <X size={12} className="text-white/70" />
            </button>
          )}
        </div>
        <button
          onClick={() => { setShowSearch(false); setSearchQuery(''); }}
          className="text-[#0A84FF] text- font-medium px-1 active:opacity-60"
        >
          Hủy
        </button>
      </div>

      {/* Thanh kết quả */}
      {searchQuery && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a0a0b]/50 border-b border-white/5">
          <span className="text- text-white/55">
            {filteredMessages.length > 0
            ? `${currentResultIndex + 1} / ${filteredMessages.length}`
              : 'Không tìm thấy'}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={goToPrevResult}
              disabled={filteredMessages.length === 0}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-30 flex items-center justify-center active:scale-95 transition"
            >
              <ChevronUp size={16} className="text-white/80" />
            </button>
            <button
              onClick={goToNextResult}
              disabled={filteredMessages.length === 0}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-30 flex items-center justify-center active:scale-95 transition"
            >
              <ChevronDown size={16} className="text-white/80" />
            </button>
          </div>
        </div>
      )}

      {/* LIST KẾT QUẢ - ĐÃ FIX */}
      <div className="flex-1 overflow-y-auto min-h-">
        {!searchQuery? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Search size={20} className="text-white/30" />
            </div>
            <p className="text-white/60 text-">Tìm kiếm tin nhắn</p>
            <p className="text-white/40 text- mt-1">Nhập từ khóa để bắt đầu</p>
          </div>
        ) : filteredMessages.length === 0? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-white/40 text-">Không có kết quả cho "{searchQuery}"</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filteredMessages.map((msg, idx) => {
              const isMe = msg.senderId === user?.uid;
              const preview = msg.text || (msg.image? '📷 Hình ảnh' : msg.file? '📎 Tệp' : msg.type === 'location'? '📍 Vị trí' : 'Tin nhắn');

              return (
                <button
                  key={msg.id}
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                    // Jump to message
                    setTimeout(() => {
                      const el = document.getElementById(`msg-${msg.id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        el.classList.add('animate-pulse');
                        const bubble = el.querySelector('[class*="bg-gradient"], [class*="bg-white"], [class*="bg-zinc"]');
                        bubble?.classList.add('ring-2', 'ring-[#0A84FF]');
                        setTimeout(() => {
                          el.classList.remove('animate-pulse');
                          bubble?.classList.remove('ring-2', 'ring-[#0A84FF]');
                        }, 2000);
                      }
                    }, 150);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-white/[0.04] active:bg-white/[0.06] transition ${
                    idx === currentResultIndex? 'bg-[#0A84FF]/15' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
<img 
  src={isMe? (user?.photoURL || '/default-avatar.png') : (friend?.avatar || '/default-avatar.png')} 
  className="w-8 h-8 rounded-full mt-0.5 flex-shrink-0 object-cover" 
  alt=""
/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text- font-medium text-white/90 truncate">
                          {isMe? 'Bạn' : friend?.name}
                        </span>
                        <span className="text- text-white/40 flex-shrink-0">
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                      <p className="text- text-white/70 mt-0.5 line-clamp-2 break-words">
                        {preview}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
)}


{/* HEADER - nền trắng chữ đen */}
<div
  className="shrink-0 z-40 border-b border-zinc-200/70 bg-white/85 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/70"
  style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
>
  <div className="px-3 sm:px-4 h-[60px] flex items-center justify-between">
    {/* Left: avatar + name - BẤM LÀ MỞ SETTING */}
    <button
      onClick={() => setShowSettings(true)}
      className="flex items-center gap-3 min-w-0 flex-1 active:opacity-70 transition text-left"
    >
      <div className="relative flex-shrink-0">
        <img
          src={friend.avatar}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-200/80"
          alt={friend.name}
        />
        {friend.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#31d158] rounded-full ring-2 ring-white grid place-items-center">
            <div className="absolute inset-0 bg-[#31d158] rounded-full animate-ping opacity-75" />
            <div className="w-1.5 h-1.5 bg-white rounded-full relative z-10" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-zinc-900 text-[16px] leading-tight truncate">
          {friend.name}
        </p>
        <p className="text-[13px] leading-snug font-medium text-zinc-500">
          {friend.isOnline? (
            <span>Đang hoạt động</span>
          ) : friend.lastSeen? (
            <span>{formatDistanceToNow(friend.lastSeen.toDate(), { addSuffix: true, locale: vi })}</span>
          ) : (
            <span>Offline</span>
          )}
        </p>
      </div>
    </button>

    {/* Right: chỉ còn Call & Video */}
    <div className="flex items-center gap-1.5 pl-2">
      <button
        onClick={() => toast.info('Gọi thoại')}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0084FF] hover:bg-[#0073e6] active:scale-90 shadow-md shadow-blue-500/20 transition"
      >
        <Phone size={18} className="text-white" strokeWidth={2.3} />
      </button>
      <button
        onClick={() => toast.info('Gọi video')}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0084FF] hover:bg-[#0073e6] active:scale-90 shadow-md shadow-blue-500/20 transition"
      >
        <Video size={18} className="text-white" strokeWidth={2.3} />
      </button>
    </div>
  </div>
</div>

{/* PINNED - Pro UI */}
{chatData?.pinnedMessage && (
  <div className="sticky top- z-30 px-3 pt-2">
    <div className="group relative overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-900/50 bg-amber-50/85 dark:bg-[#1c1405]/70 backdrop-blur-2xl shadow-[0_4px_12px_-4px_rgba(245,158,11,0.2)]">
      {/* viền trái gradient */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500" />

      <div className="flex items-center gap-2.5 pl-3.5 pr-2 py-2.5">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
          <Pin size={15} className="text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
        </div>

        {/* Bấm để nhảy tới tin nhắn */}
        <button
          onClick={() => {
            const el = document.getElementById(`msg-${(chatData as any).pinnedMessage.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el?.classList.add('ring-2','ring-amber-400','transition');
            setTimeout(() => el?.classList.remove('ring-2','ring-amber-400'), 1500);
          }}
          className="flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text- font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wider">Đã ghim</span>
            {(chatData as any).pinnedMessage?.by && (
              <span className="text- text-zinc-500 dark:text-zinc-400">• {(chatData as any).pinnedMessage.by}</span>
            )}
          </div>

          <p className="text- text-zinc-800 dark:text-zinc-100 truncate leading-snug group-hover:underline decoration-dotted underline-offset-2">
            {(chatData as any).pinnedMessage?.text ||
             (chatData as any).pinnedMessage?.image? '📷 Hình ảnh' :
             (chatData as any).pinnedMessage?.file? '📎 Tệp đính kèm' : 'Tin nhắn'}
          </p>
        </button>

        {/* Actions */}
        <div className="flex items-center">
          <button
            onClick={() => {
              const el = document.getElementById(`msg-${(chatData as any).pinnedMessage.id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="w-7 h-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center active:scale-90 transition"
            title="Đi đến tin nhắn"
          >
            <ChevronDown size={16} className="text-zinc-500 rotate-[-90deg]" />
          </button>

          <button
            onClick={async () => {
              await updateDoc(doc(db, "chats", chatId), { pinnedMessage: null });
              toast.success('Đã bỏ ghim');
            }}
            className="w-7 h-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center active:scale-90 transition"
            title="Bỏ ghim"
          >
            <X size={15} className="text-zinc-500" />
          </button>
        </div>
      </div>
    </div>
  </div>
)}

{/* Action Menu */}
{longPressMsg && (
  <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/40 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={() => setLongPressMsg(null)}
    />

    <div className="relative w-full max-w-[375px] px-4 pb-6 sm:pb-0" onClick={e => e.stopPropagation()}>
      {/* REACTION BAR - chỉ 6 emoji, bỏ + và nút xanh */}
      <div className="bg-white rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.15)] px-2 py-2 flex items-center justify-center gap-0.5 mb-3 mx-auto w-fit animate-in zoom-in-95 slide-in-from-bottom-2 duration-250">
        {["❤️","😆","😮","😢","😡","👍"].map((emoji, i) => (
          <button
            key={emoji}
            onClick={() => { toggleReaction(longPressMsg.id, emoji); setLongPressMsg(null); }}
            className="w-[48px] h-[48px] flex items-center justify-center text-[28px] active:scale-110 hover:bg-gray-100 rounded-full transition-all duration-150"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* MENU - đồng bộ font với ảnh 2-3 */}
      <div className="bg-white rounded-[14px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] overflow-hidden animate-in slide-in-from-bottom-3 zoom-in-95 duration-300">
        <div className="divide-y divide-[#e5e5ea]">
          {longPressMsg.senderId === user?.uid && (
            <button
              onClick={() => { setEditingMsg(longPressMsg); setText(longPressMsg.text || ''); setLongPressMsg(null); setTimeout(() => inputRef.current?.focus(), 100); }}
              className="w-full flex items-center justify-between px-4 h-[48px] active:bg-[#f2f2f7] transition-colors"
            >
              <span className="text-[17px] leading-[22px] text-black font-normal tracking-[-0.2px]">Chỉnh sửa</span>
              <Pencil size={22} className="text-[#8e8e93]" strokeWidth={1.7} />
            </button>
          )}

          <button
            onClick={() => { setReplyTo(longPressMsg); setLongPressMsg(null); }}
            className="w-full flex items-center justify-between px-4 h-[48px] active:bg-[#f2f2f7] transition-colors"
          >
            <span className="text-[17px] leading-[22px] text-black font-normal tracking-[-0.2px]">Trả lời</span>
            <Reply size={22} className="text-[#8e8e93] scale-x-[-1]" strokeWidth={1.7} />
          </button>

          <button
            onClick={() => { navigator.clipboard.writeText(longPressMsg.text || ''); toast.success('Đã sao chép'); setLongPressMsg(null); }}
            className="w-full flex items-center justify-between px-4 h-[48px] active:bg-[#f2f2f7] transition-colors"
          >
            <span className="text-[17px] leading-[22px] text-black font-normal tracking-[-0.2px]">Sao chép</span>
            <Copy size={21} className="text-[#8e8e93]" strokeWidth={1.7} />
          </button>
        </div>

        {/* Divider dày như ảnh */}
        <div className="h-[8px] bg-[#f2f2f7]" />

        <div className="divide-y divide-[#e5e5ea]">
          <button
            onClick={() => handlePinMessage(longPressMsg)}
            className="w-full flex items-center justify-between px-4 h-[48px] active:bg-[#f2f2f7] transition-colors"
          >
            <span className="text-[17px] leading-[22px] text-black font-normal tracking-[-0.2px]">Ghim</span>
            <Pin size={22} className="text-[#8e8e93]" strokeWidth={1.7} />
          </button>

          {longPressMsg.senderId === user?.uid && (
            <button
              onClick={() => handleDeleteMessage(longPressMsg.id)}
              className="w-full flex items-center justify-between px-4 h-[48px] active:bg-[#ff3b30]/10 transition-colors"
            >
              <span className="text-[17px] leading-[22px] text-[#ff3b30] font-normal tracking-[-0.2px]">Xóa, gỡ</span>
              <Trash2 size={22} className="text-[#ff3b30]" strokeWidth={1.7} />
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
)}

<div
  className="flex-1 min-h-0 overflow-y-auto px-0 pt-2 pb-2 space-y-0.5 relative z-10 bg-transparent"

>
  {filteredMessages.map((m, i) => {
    const isMe = m.senderId === user.uid;
    const prev = filteredMessages[i - 1];
    const next = filteredMessages[i + 1];
    const showAvatar =!isMe && (!next || next.senderId!== m.senderId);
    const isFirstInGroup =!prev || prev.senderId!== m.senderId;
    const isLastInGroup =!next || next.senderId!== m.senderId;
    const showDate =
      prev &&
      m.createdAt &&
      prev.createdAt &&
      m.createdAt.toDate().toDateString()!== prev.createdAt.toDate().toDateString();

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

        <div 
          className={`flex items-end gap-1 group ${isMe? "justify-end pl-12 pr-1" : "justify-start pr-12 pl-1"} ${isFirstInGroup? "mt-1.5" : "mt-0.5"}`}
          onTouchStart={(e) => {
  // Ngăn scroll khi giữ
  e.currentTarget.style.userSelect = 'none';
  const el = e.currentTarget;
  
  // Hiệu ứng nhấn
  el.style.transform = 'scale(0.97)';
  el.style.filter = 'brightness(0.92)';
  el.style.transition = 'transform 0.15s ease, filter 0.15s ease';
  
  const timer = setTimeout(() => {
    // Rung nhẹ
    if (navigator.vibrate) navigator.vibrate(12);
    
    // Reset visual trước khi mở menu
    el.style.transform = '';
    el.style.filter = '';
    
    setLongPressMsg(m);
  }, 480); // 480ms giống iOS
  
  setPressTimer(timer);
}}

onTouchEnd={(e) => {
  if (pressTimer) {
    clearTimeout(pressTimer);
    setPressTimer(null);
  }
  // Reset visual
  const el = e.currentTarget;
  el.style.transform = '';
  el.style.filter = '';
  el.style.userSelect = '';
}}

onTouchMove={() => {
  // Hủy nếu di chuyển > 10px
  if (pressTimer) {
    clearTimeout(pressTimer);
    setPressTimer(null);
  }
}}

onMouseDown={(e) => {
  // Chỉ chuột trái
  if (e.button !== 0) return;
  
  const el = e.currentTarget;
  el.style.transform = 'scale(0.98)';
  
  const timer = setTimeout(() => {
    el.style.transform = '';
    setLongPressMsg(m);
  }, 500);
  
  setPressTimer(timer);
}}

onMouseUp={(e) => {
  if (pressTimer) {
    clearTimeout(pressTimer);
    setPressTimer(null);
  }
  e.currentTarget.style.transform = '';
}}

onMouseLeave={(e) => {
  if (pressTimer) {
    clearTimeout(pressTimer);
    setPressTimer(null);
  }
  e.currentTarget.style.transform = '';
}}

onContextMenu={(e) => {
  e.preventDefault();
  // Reset mọi timer
  if (pressTimer) {
    clearTimeout(pressTimer);
    setPressTimer(null);
  }
  setLongPressMsg(m);
}}

onClick={(e) => {
  // Ngăn click nếu vừa long-press
  if (pressTimer) {
    e.preventDefault();
  }
}}
        >
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
    className={`px-4 py-3 shadow-sm cursor-pointer active:scale-95 transition rounded-2xl ${
      isMe
      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
        : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700"
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

) : (m.type === 'location' || m.location)? (
  // === LOCATION: KHÔNG BUBBLE XANH ===
  (() => {
    const lat = Number(m.lat?? m.location?.lat?? 0);
    const lng = Number(m.lng?? m.location?.lng?? 0);
    if (!lat ||!lng) return null;

    return (
      <div className="relative">
        <a
          href={`https://www.google.com/maps?q=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-[240px]"
        >
          <div className="overflow-hidden rounded-2xl shadow-lg">
            <div className="relative h-[150px] w-full bg-zinc-200">
              <img
src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff0000(${lng},${lat})/${lng},${lat},16/600x300@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
            <div className="bg-white dark:bg-zinc-900 px-3 py-2.5">
              <p className="text-sm font-medium truncate text-zinc-900 dark:text-white">
                {m.address || 'Vị trí đã chia sẻ'}
              </p>
              <p className="text-xs flex items-center gap-1 mt-0.5 text-zinc-500 dark:text-zinc-400">
                <Navigation size={12} />
                Nhấn để mở bản đồ
              </p>
            </div>
          </div>
        </a>
      </div>
    );
  })()

) : (
  // === TIN NHẮN THƯỜNG: giữ bubble ===
  <div
    className={`px-3.5 py-2 min-w-[36px] min-h-[36px] flex items-center justify-center shadow-sm cursor-pointer rounded-2xl ${
      isMe
      ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
        : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white"
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
    {m.text && (
      <p className="text-[15px] leading-snug whitespace-pre-wrap break-words">
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
<button 
  onClick={() => { setEditingMsg(m); setText(m.text ?? ''); inputRef.current?.focus(); }} 
  className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded"
>
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
                      <button onClick={() => { navigator.clipboard.writeText(m.text ?? ''); toast.success("Đã copy"); }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded">
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

        
                </div>
              </div>


         {/* GIỜ Ở GIỮA */}
{isLastInGroup && filteredMessages.length > 0 && i === filteredMessages.length - 1 && m.createdAt && (
  <div className="flex w-full justify-center items-center gap-1.5 my-2">
    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
      {formatTime(m.createdAt)}
    </span>
    {isMe && seenAvatars.length > 0 && (
      <div className="flex -space-x-1">
        {seenAvatars.slice(0, 3).map((u, idx) => (
          <img
            key={idx}
            src={u.avatar}
            className="w-3 h-3 rounded-full ring-1 ring-white dark:ring-zinc-950"
            alt={u.name}
          />
        ))}
      </div>
    )}
    {isMe && seenAvatars.length === 0 && m.seenBy && m.seenBy.length > 1 && (
      <CheckCheck className="text-blue-500" size={12} />
    )}
  </div>
)}
            </div>
          );
        })}

    {chatData?.typing?.[friendId || ""] && (
  <div className="flex items-end gap-2 px-3 mb-2 animate-in fade-in duration-200">
    <img
      src={friend.avatar || '/default-avatar.png'}
      className="w-6 h-6 rounded-full object-cover"
      alt=""
    />
    <div className="bg-[#2a2a2a] px-3.5 py-2 rounded-">
      <span className="flex items-baseline gap-0.5">
        <span className="text- text-white/80 italic">Đang nhắn</span>
        <span className="flex gap-0.5 ml-0.5">
          <span className="text-white/80 animate-pulse" style={{animationDelay:'0ms'}}>.</span>
          <span className="text-white/80 animate-pulse" style={{animationDelay:'200ms'}}>.</span>
          <span className="text-white/80 animate-pulse" style={{animationDelay:'400ms'}}>.</span>
        </span>
      </span>
    </div>
  </div>
)}
        <div ref={messagesEndRef} />
      </div>

      {/* REPLY/EDIT BAR */}
      {(replyTo || editingMsg) && (
<div className="shrink-0 z-30 px-4 py-2 border-t border-white/10 bg-black/70 backdrop-blur-xl">
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


{showBgPicker && (
  <div
    className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4"
    onClick={() => setShowBgPicker(false)}
  >
    <div
      className="bg-[#101012]/95 backdrop-blur-2xl w-full sm:max-w-lg max-h-[85vh] sm:rounded-[28px] rounded-t-[28px] overflow-hidden flex flex-col"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 sticky top-0 bg-[#101012]/90 backdrop-blur-2xl z-10 border-b border-white/5">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden ring-1 ring-white/10 shrink-0">
            {(() => {
              const currentId = (chatData?.backgroundId || 'default') as BgId;
              const current = BACKGROUNDS[currentId];
              return isGradient(currentId)? (
                <div className="w-full h-full" style={{ background: current.url.replace('gradient:','') }} />
              ) : current.url? (
                <img
                  src={getBgUrl(currentId, 200)}
                  className="w-full h-full object-cover"
                  alt=""
                  onError={() => setFailedBg(prev => [...prev, currentId])}
                />
              ) : (
                <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #1e1e22 0%, #0a0a0b 100%)' }} />
              );
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white text-[22px] font-semibold leading-tight">Hình nền</h3>
            <p className="text-white/55 text-[13px]">
              Chọn cho đoạn chat này • {chatData?.backgroundId && chatData.backgroundId!== 'default'? BACKGROUNDS[chatData.backgroundId as BgId]?.name : 'Mặc định'}
            </p>
          </div>
          <button onClick={() => setShowBgPicker(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:scale-90">
            <X size={16} className="text-white/80"/>
          </button>
        </div>
      </div>

      <div className="overflow-y-auto px-5 pb-6 flex-1">
        {BACKGROUND_GROUPS.map((group) => (
          <div key={group.id} className="mb-7">
            <h4 className="text-white/60 text-[12px] font-semibold mb-3 uppercase tracking-widest">{group.title}</h4>
            <div className="grid grid-cols-3 gap-3">
              {group.ids.filter(id =>!failedBg.includes(id)).map((id) => {
                const bg = BACKGROUNDS[id];
                const currentId = (chatData?.backgroundId || 'default') as BgId;
                const isSelected = id === currentId;
                const isGrad = isGradient(id);

                return (
                  <button
                    key={id}
                    onClick={async () => {
                      const newId = id === 'default'? '' : id;
                      await updateDoc(doc(db, "chats", chatId), {
                        backgroundId: newId,
                        background: deleteField()
                      });
                      setChatData(prev => prev? {...prev, backgroundId: newId } : prev);
                      setShowBgPicker(false);
                      toast.success(`Đã đổi: ${bg.name}`);
                    }}
                    className="relative w-full h-28 rounded-2xl overflow-hidden bg-zinc-900 ring-1 ring-white/10 active:scale-95 transition group"
                  >
                    {isGrad? (
                      <div className="w-full h-full" style={{ background: bg.url.replace('gradient:','') }} />
                    ) : bg.url? (
                      <img
                        src={getBgUrl(id, 400)}
                        alt={bg.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={() => setFailedBg(prev => prev.includes(id)? prev : [...prev, id])}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-2 border-white/20" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[11px] text-white font-medium drop-shadow-lg text-center truncate">
                      {bg.name}
                    </span>

                    {isSelected && (
                      <>
                        <div className="absolute inset-0 ring-2 ring-[#0A84FF] ring-inset rounded-2xl pointer-events-none" />
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#0A84FF] rounded-full flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

{/* UPLOAD PROGRESS */}
{uploading && (
  <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl px-4 py-2.5 rounded-full flex items-center gap-2.5 z-[60]">
    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    <span className="text-white text-sm font-medium">Đang tải {uploadProgress}%</span>
  </div>
)}



      {/* BANNER CẢNH BÁO */}
      {!isFriend &&!isBlocked &&!isDeleted && (
<div className="shrink-0 z-30 px-4 py-2 border-t border-amber-500/20 bg-amber-500/10 backdrop-blur-xl">
          <div className="flex items-center justify-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
            <Shield size={14} />
            Các bạn chưa kết bạn. Hãy cẩn thận khi chia sẻ thông tin cá nhân
          </div>
        </div>
      )}

{/* INPUT */}
<div
  className="shrink-0 z-30 px-3"
  style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
>
  <div className="flex items-center gap-1 h-[48px] px-2 bg-white/95 dark:bg-zinc-900/90 backdrop-blur-2xl rounded-full shadow-[0_8px_24px_-8px_rgba(0,0,0,0.18)] border border-zinc-200/70 dark:border-zinc-800">

    {/* 1. Ảnh */}
    <input type="file" hidden ref={imageInputRef} accept="image/*" onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])} />
    <button
      onClick={() => imageInputRef.current?.click()}
      disabled={isBlocked || isDeleted}
      className={`w-8 h-8 flex items-center justify-center rounded-full active:scale-90 shrink-0 ${isBlocked || isDeleted? 'opacity-40' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
    >
      <ImageIcon size={20} className="text-[#0084FF]" strokeWidth={2.2} />
    </button>

    {/* 2. VỊ TRÍ - THÊM MỚI BÊN TRÁI */}
    <button
      onClick={sendLocation}
      disabled={isBlocked || isDeleted}
      className={`w-8 h-8 flex items-center justify-center rounded-full active:scale-90 shrink-0 ${isBlocked || isDeleted? 'opacity-40' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
    >
      <MapPin size={20} className="text-[#0084FF]" strokeWidth={2.2} />
    </button>

    {/* 3. File (chỉ desktop) */}
    <input type="file" hidden ref={fileInputRef} onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])} />
    <button
      onClick={() => fileInputRef.current?.click()}
      disabled={isBlocked || isDeleted}
      className={`w-8 h-8 hidden sm:flex items-center justify-center rounded-full active:scale-90 shrink-0 ${isBlocked || isDeleted? 'opacity-40' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
    >
      <Paperclip size={18} className="text-zinc-500 dark:text-zinc-400" />
    </button>

    {/* Ô nhập */}
    <div className="flex-1 relative h-full flex items-center">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => { setText(e.target.value); handleTyping(); }}
        onKeyDown={(e) => { if (e.key === 'Enter' &&!e.shiftKey) { e.preventDefault(); if (!isBlocked &&!isDeleted && text.trim()) sendMessage(); } }}
        disabled={isBlocked || isDeleted}
        placeholder={isBlocked? 'Bạn không thể nhắn tin' : isDeleted? 'Đã xóa' : 'Nhắn tin...'}
        className="w-full h-full bg-transparent outline-none border-0 text-[15px] text-zinc-900 dark:text-white placeholder:text-zinc-400 pr-9"
      />
      <button
        onClick={sendMessage}
        disabled={sending || isBlocked || isDeleted ||!text.trim()}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#0084FF] hover:bg-[#0073e6] text-white rounded-full flex items-center justify-center active:scale-90 disabled:opacity-40"
      >
        {sending? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />}
      </button>
    </div>
  </div>
</div>
{/* SETTINGS SHEET */}
{showSettings && (
  <div
    className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[70] flex items-end sm:items-center justify-center"
    onClick={() => setShowSettings(false)}
  >
    <div
      className="bg-[#0b0b0d] w-full sm:max-w-[420px] h-[92vh] sm:h-auto sm:max-h-[85vh] sm:rounded-[28px] rounded-t-[28px] overflow-hidden flex flex-col border border-white/10"
      onClick={e => e.stopPropagation()}
    >
      {/* Handle */}
      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2 sm:hidden" />

      {/* PROFILE HEADER */}
      <div className="px-5 pt-2 pb-5 flex flex-col items-center text-center border-b border-white/5">
        <div className="relative">
          <img src={friend.avatar} className="w-20 h-20 rounded-full object-cover ring-2 ring-white/10" />
          {friend.isOnline && <div className="absolute bottom-1 right-1 w-4 h-4 bg-[#31d158] rounded-full ring-2 ring-[#0b0b0d]" />}
        </div>
        <h2 className="text-white text-[22px] font-semibold mt-3">{friend.name}</h2>
        <p className="text-white/50 text-sm">@{friend.username || 'user'}</p>

        <div className="flex gap-3 mt-4">
          <button onClick={() => router.push(`/profile/${friend.userId}`)} className="px-4 py-2 bg-white/10 hover:bg-white/15 rounded-full text-white text-sm font-medium active:scale-95 transition">Trang cá nhân</button>
          <button onClick={() => { setShowSettings(false); toast.info('Gọi thoại...') }} className="w-9 h-9 bg-white/10 hover:bg-white/15 rounded-full flex items-center justify-center active:scale-95"><Phone size={18} className="text-white" /></button>
          <button onClick={() => { setShowSettings(false); toast.info('Gọi video...') }} className="w-9 h-9 bg-white/10 hover:bg-white/15 rounded-full flex items-center justify-center active:scale-95"><Video size={18} className="text-white" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* TÙY CHỈNH */}
        <div className="bg-white/[0.04] rounded-2xl overflow-hidden border border-white/5">
          {[
            { icon: Search, label: 'Tìm trong cuộc trò chuyện', action: () => { setShowSettings(false); setShowSearch(true); } },
            { icon: ImageIcon, label: 'Đổi hình nền', value: (chatData as any)?.background? 'Đã đặt' : 'Mặc định', action: () => { setShowSettings(false); setShowBgPicker(true); } },
            { icon: Pin, label: 'Tin nhắn đã ghim', value: chatData?.pinnedMessage? '1 tin' : 'Không có', action: () => toast.info('Xem tin ghim') },
          ].map((item,i) => (
            <button key={i} onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/[0.03] transition border-b border-white/5 last:border-0">
              <item.icon size={20} className="text-white/70" />
              <span className="flex-1 text-left text-white">{item.label}</span>
              {item.value && <span className="text-white/40 text-sm">{item.value}</span>}
            </button>
          ))}
        </div>

        {/* MEDIA */}
        <div className="bg-white/[0.04] rounded-2xl overflow-hidden border border-white/5">
          <button onClick={() => toast.info('Đang phát triển')} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5">
            <ImageIcon size={20} className="text-white/70" />
            <span className="flex-1 text-left text-white">Ảnh, file, liên kết</span>
            <span className="text-white/40 text-sm">Xem tất cả</span>
          </button>
        </div>

        {/* QUYỀN RIÊNG TƯ */}
        <div className="bg-white/[0.04] rounded-2xl overflow-hidden border border-white/5">
          {[
            { icon: BellOff, label: 'Tắt thông báo', action: async () => { toast.success('Đã tắt thông báo'); setShowSettings(false); } },
            {
              icon: Shield,
              label: chatData?.blockedUsers?.includes(friendId || '')? 'Bỏ chặn' : 'Chặn người dùng',
              danger: true,
              action: async () => {
                if (!chatId ||!friendId) return;
                const blocked = chatData?.blockedUsers?.includes(friendId);
                await updateDoc(doc(db, "chats", chatId), {
                  blockedUsers: blocked? arrayRemove(friendId) : arrayUnion(friendId)
                });
                toast.success(blocked? 'Đã bỏ chặn' : 'Đã chặn');
                setShowSettings(false);
              }
            },
            { icon: Flag, label: 'Báo cáo', action: () => toast.info('Đã gửi báo cáo') },
          ].map((item,i) => (
            <button key={i} onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/[0.03] transition border-b border-white/5 last:border-0">
              <item.icon size={20} className={item.danger? "text-red-400" : "text-white/70"} />
              <span className={`flex-1 text-left ${item.danger? 'text-red-400' : 'text-white'}`}>{item.label}</span>
            </button>
          ))}
        </div>

        {/* NGUY HIỂM */}
        <div className="bg-white/[0.04] rounded-2xl overflow-hidden border border-white/5">
          <button
            onClick={async () => {
              if (!confirm('Xóa toàn bộ cuộc trò chuyện này?')) return;
              await updateDoc(doc(db, "chats", chatId), { deletedFor: arrayUnion(user?.uid) });
              toast.success('Đã xóa');
              router.replace('/chat');
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-500/10 active:bg-red-500/5 transition"
          >
            <Trash2 size={20} className="text-red-400" />
            <span className="flex-1 text-left text-red-400 font-medium">Xóa cuộc trò chuyện</span>
          </button>
        </div>
      </div>
    </div>
  </div>
)}
  </div>

  );
}