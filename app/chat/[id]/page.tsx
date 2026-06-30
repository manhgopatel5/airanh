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
  Image as ImageIcon, FileText, Link2, Navigation, ChevronDown, ChevronUp, Flag, MapPin, BellOff, Paperclip, Phone, Send, Loader2, X, Video, CheckCheck,
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
fileUrl?: string;
 imageUrl?: string;
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
  const [showUnpinSheet, setShowUnpinSheet] = useState(false)
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
  const [showMedia, setShowMedia] = useState(false);
const [mediaTab, setMediaTab] = useState<'photos'|'files'|'links'>('photos');

const mediaPhotos = messages.filter(m => m.imageUrl || m.image);
const mediaFiles = messages.filter(m => m.fileUrl || m.file);
const mediaLinks = messages.filter(m => m.text && /(https?:\/\/[^\s]+)/.test(m.text));
  const [loadingFriend, setLoadingFriend] = useState(true);
const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
const isTyping = chatData?.typing?.[friendId || ""];
const [typingDisplay, setTypingDisplay] = useState("");

useEffect(() => {
  if (!isTyping) {
    setTypingDisplay("");
    return;
  }
  const name = friend?.name || 'Bạn';
  const fullText = `${name} đang nhắn...`;
  let i = 0;
  setTypingDisplay("");
  
  const type = () => {
    if (i <= fullText.length) {
      setTypingDisplay(fullText.slice(0, i));
      i++;
      setTimeout(type, 45);
    } else {
      setTimeout(() => {
        i = 0;
        setTypingDisplay("");
        type();
      }, 1200);
    }
  };
  type();
}, [isTyping, friend?.name]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
const [showBgPicker, setShowBgPicker] = useState(false);
const [showPinned, setShowPinned] = useState(false);
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
  if (!user || !chatId || !friendId || !chatData) {
    if (!chatData) toast.error("Đang tải dữ liệu chat...");
    return;
  }
  
  setUploading(true);
  setUploadProgress(0);

  try {
    // Nén thông minh: chỉ resize nếu >2560px, giữ chất lượng cao
    const isBig = file.size > 1.5 * 1024 * 1024;
    const compressed = isBig
      ? await imageCompression(file, {
          maxSizeMB: 2.5,
          maxWidthOrHeight: 2560,
          initialQuality: 0.92,
          useWebWorker: true,
          fileType: 'image/webp',
          preserveExif: false,
        })
      : file;

    const ext = compressed.type === 'image/webp' ? 'webp' : file.name.split('.').pop();
    const storageRef = ref(storage, `chat-images/${chatId}/${Date.now()}.${ext}`);
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
            imageUrl: url,        // <-- fix hiển thị
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
  if (!user || !chatId || !friendId || !chatData) {
    if (!chatData) toast.error("Đang tải dữ liệu chat...");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {  // tăng lên 25MB
    toast.error("File không được vượt quá 5MB");
    return;
  }

  setUploading(true);
  setUploadProgress(0);
  
  try {
    const storageRef = ref(storage, `chat-files/${chatId}/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on("state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => {
        console.error(err);
        toast.error("Upload file thất bại");
        setUploading(false);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        await addDoc(collection(db, "chats", chatId, "messages"), {
          senderId: user.uid,
          file: url,
          fileUrl: url,        // <-- fix cho media tab
          fileName: file.name,
          fileSize: file.size,
          type: "file",
          createdAt: serverTimestamp(),
          seenBy: [user.uid],
          members: chatData.members,
        });
        setUploading(false);
        setUploadProgress(0);
      }
    );
  } catch (err: any) {
    console.error(err);
    toast.error(`Lỗi gửi file: ${err.code}`);
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

 

  

  const searchInputRef = useRef<HTMLInputElement>(null);
const [currentResultIndex, setCurrentResultIndex] = useState(0);

const filteredMessages = useMemo(() =>
  searchQuery
    ? messages.filter(m => (m.text || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : messages,
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
  <div className="fixed inset-0 z-[200] bg-white dark:bg-black flex flex-col">
    {/* HEADER */}
    <div className="shrink-0 bg-white dark:bg-black" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
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
            className="w-full h-9 pl-9 pr-8 bg-zinc-100 dark:bg-zinc-800 text-base text-zinc-900 dark:text-white placeholder:text-zinc-500 rounded-full border-0 outline-none focus:outline-none focus:ring-0"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-400/90 flex items-center justify-center active:scale-90"
            >
              <X size={12} className="text-white" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* NÚT X TRÒN */}
        <button
          onClick={() => { setShowSearch(false); setSearchQuery(''); }}
          className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center active:scale-90 transition shrink-0"
          aria-label="Đóng"
        >
          <X size={18} className="text-zinc-600 dark:text-zinc-300" strokeWidth={2.2} />
        </button>
      </div>
    </div>

    {/* THANH ĐẾM */}
    {searchQuery && (
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {filteredMessages.length > 0
           ? `${currentResultIndex + 1} / ${filteredMessages.length}`
            : 'Không tìm thấy'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevResult}
            disabled={filteredMessages.length === 0}
            className="w-7 h-7 rounded-md bg-zinc-200 dark:bg-zinc-800 disabled:opacity-30 flex items-center justify-center active:scale-95 hover:bg-zinc-300 dark:hover:bg-zinc-700"
          >
            <ChevronUp size={16} className="text-zinc-700 dark:text-zinc-300" />
          </button>
          <button
            onClick={goToNextResult}
            disabled={filteredMessages.length === 0}
            className="w-7 h-7 rounded-md bg-zinc-200 dark:bg-zinc-800 disabled:opacity-30 flex items-center justify-center active:scale-95 hover:bg-zinc-300 dark:hover:bg-zinc-700"
          >
            <ChevronDown size={16} className="text-zinc-700 dark:text-zinc-300" />
          </button>
        </div>
      </div>
    )}

    {/* LIST */}
    <div className="flex-1 overflow-y-auto bg-white dark:bg-black">
      {!searchQuery? (
        <div className="flex flex-col items-center justify-center h-full -mt-20 px-4">
          <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-3">
            <Search size={24} className="text-zinc-400" />
          </div>
          <p className="text-[15px] text-zinc-500 dark:text-zinc-400">Tìm kiếm tin nhắn</p>
        </div>
      ) : filteredMessages.length === 0? (
        <div className="pt-20 text-center px-4">
          <p className="text-[15px] text-zinc-400 dark:text-zinc-500">Không có kết quả cho "{searchQuery}"</p>
        </div>
      ) : (
        <div>
          {filteredMessages.map((msg, idx) => {
            const isMe = msg.senderId === user?.uid;
            const preview = msg.text || (msg.image? '📷 Hình ảnh' : msg.file? '📎 Tệp' : 'Tin nhắn');

            return (
              <button
                key={msg.id}
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  setTimeout(() => {
                    const el = document.getElementById(`msg-${msg.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const bubble = el?.querySelector('div[class*="bg-gradient"], div[class*="bg-white"], div[class*="dark:bg-zinc"]');
                    bubble?.classList.add('!bg-yellow-200', 'transition-colors', 'duration-300');
                    setTimeout(() => {
                      bubble?.classList.remove('!bg-yellow-200');
                    }, 1500);
                  }, 100);
                }}
                className={`w-full text-left px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 active:bg-zinc-50 dark:active:bg-zinc-900 ${
                  idx === currentResultIndex? 'bg-zinc-100 dark:bg-zinc-900' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={isMe? (user?.photoURL || '/default-avatar.png') : (friend?.avatar || '/default-avatar.png')}
                    className="w-9 h-9 rounded-full object-cover mt-0.5 ring-1 ring-zinc-200 dark:ring-zinc-800"
                    alt=""
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[15px] font-medium text-zinc-900 dark:text-white truncate">
                        {isMe? 'Bạn' : friend?.name}
                      </span>
                      <span className="text-[13px] text-zinc-400 dark:text-zinc-500">
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-[14px] text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
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
)}


{/* HEADER - trắng đặc, đồng bộ */}
<div
  className="shrink-0 z-40 bg-white border-b border-[#e5e5e5]"
  style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
>
  <div className="px-3 h-[56px] flex items-center justify-between">
    {/* Left */}
    <button
      onClick={() => setShowSettings(true)}
      className="flex items-center gap-3 min-w-0 flex-1 active:opacity-70 transition text-left"
    >
      <div className="relative flex-shrink-0">
        <img
          src={friend.avatar}
          className="w-9 h-9 rounded-full object-cover"
          alt={friend.name}
        />
        {friend.isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00c851] rounded-full border-2 border-white" />
        )}
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-black text-[17px] leading-tight truncate">
          {friend.name}
        </p>
        <p className="text-[13px] leading-snug text-[#8e8e93]">
          {friend.isOnline? "Đang hoạt động" : friend.lastSeen? formatDistanceToNow(friend.lastSeen.toDate(), { addSuffix: true, locale: vi }) : "Offline"}
        </p>
      </div>
    </button>

    {/* Right */}
    <div className="flex items-center gap-2.5">
      <button
        onClick={() => toast.info('Gọi thoại')}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0a7cff] active:scale-95"
      >
        <Phone size={18} className="text-white" strokeWidth={2} />
      </button>
      <button
        onClick={() => toast.info('Gọi video')}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-[#0a7cff] active:scale-95"
      >
        <Video size={18} className="text-white" strokeWidth={2} />
      </button>
    </div>
  </div>
</div>
{showMedia && (
  <div className="fixed inset-0 z-[200] bg-white flex flex-col">
    {/* HEADER - NO BORDER */}
    <div className="shrink-0 bg-white" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
      <div className="relative flex items-center justify-center h-[44px]">
        <span className="text-[17px] font-semibold text-black">Ảnh, file, liên kết</span>
        <button
          onClick={() => setShowMedia(false)}
          className="absolute right-3 w-7 h-7 rounded-full bg-zinc-200/80 flex items-center justify-center active:scale-90"
        >
          <X size={16} className="text-zinc-700" strokeWidth={2.5} />
        </button>
      </div>

      {/* TABS */}
      <div className="px-3 pt-1 pb-3 bg-white">
        <div className="grid grid-cols-3 gap-1.5 bg-zinc-100 rounded-[10px] p-1">
          {[
            {k:'photos', label:'Ảnh'},
            {k:'files', label:'File'},
            {k:'links', label:'Liên kết'},
          ].map(t => (
            <button
              key={t.k}
              onClick={() => setMediaTab(t.k as any)}
              className={`h-[32px] rounded-[8px] text-[15px] font-medium transition-all ${
                mediaTab===t.k
                 ? 'bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                  : 'text-zinc-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* CONTENT */}
    <div className="flex-1 overflow-y-auto bg-white">
      {/* ẢNH */}
      {mediaTab==='photos' && (
        mediaPhotos.length===0? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="w-20 h-20 mb-3">
              <svg viewBox="0 0 80 80" fill="none"><circle cx="40" cy="40" r="40" fill="#F2F2F7"/><path d="M30 35a5 5 0 110-10 5 5 0 010 10zM52 54H28c-1.1 0-2-.9-2-2V32c0-1.1.9-2 2-2h24c1.1 0 2.9 2 2v20c0 1.1-.9 2-2 2z" stroke="#AEAEB2" strokeWidth="2"/></svg>
            </div>
            <p className="text-[15px] text-zinc-500">Chưa có ảnh</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[2px] bg-white">
            {mediaPhotos.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setShowMedia(false);
                  setTimeout(() => {
                    const el = document.getElementById(`msg-${m.id}`);
                    el?.scrollIntoView({behavior:'smooth', block:'center'});
                    const bubble = el?.querySelector('div[class*="bg-gradient"], div[class*="bg-white"]');
                    bubble?.classList.add('!bg-yellow-200');
                    setTimeout(() => bubble?.classList.remove('!bg-yellow-200'), 1500);
                  }, 100);
                }}
                className="aspect-square bg-zinc-100 overflow-hidden active:opacity-70"
              >
                <img src={(m as any).imageUrl || (m as any).image} className="w-full h-full object-cover" loading="lazy" alt="" />
              </button>
            ))}
          </div>
        )
      )}

      {/* FILE */}
      {mediaTab==='files' && (
        <div>
          {mediaFiles.length===0? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <FileText size={48} className="text-zinc-300 mb-3" strokeWidth={1.5} />
              <p className="text-[15px] text-zinc-500">Chưa có tệp</p>
            </div>
          ) : mediaFiles.map(m => {
            const name = (m as any).fileName || 'Tài liệu';
            const ext = name.split('.').pop()?.toUpperCase() || 'FILE';
            return (
              <button
                key={m.id}
                onClick={() => window.open((m as any).fileUrl || (m as any).file, '_blank')}
                className="w-full flex items-center gap-3 px-4 h-[68px] border-b border-zinc-100 active:bg-zinc-50 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-[#007AFF] flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-white">{ext.slice(0,4)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] text-black truncate leading-tight">{name}</p>
                  <p className="text-[13px] text-zinc-500 mt-0.5">{(m as any).fileSize? `${((m as any).fileSize/1024/1024).toFixed(1)} MB` : 'Tệp'}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* LINK */}
      {mediaTab==='links' && (
        <div>
          {mediaLinks.length===0? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
              <Link2 size={48} className="text-zinc-300 mb-3" strokeWidth={1.5} />
              <p className="text-[15px] text-zinc-500">Chưa có liên kết</p>
            </div>
          ) : mediaLinks.map(m => {
            const url = (m.text || '').match(/(https?:\/\/[^\s]+)/)?.[0] || '';
            const domain = url? new URL(url).hostname.replace('www.','') : '';
            return (
              <button
                key={m.id}
                onClick={() => window.open(url, '_blank')}
                className="w-full flex items-center gap-3 px-4 h-[72px] border-b border-zinc-100 active:bg-zinc-50 text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} className="w-6 h-6" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] text-black truncate leading-tight">{(m as any).linkTitle || domain}</p>
                  <p className="text-[13px] text-zinc-500 truncate mt-0.5">{url}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  </div>
)}
{showPinned && (
  <div className="fixed inset-0 z-[200] bg-white dark:bg-zinc-950 flex flex-col">
    {/* Header */}
    <div
      className="shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800"
      style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center justify-between px-4 h-12">
        <div className="w-8" />
        <span className="text-[17px] font-semibold text-zinc-900 dark:text-white">Tin nhắn đã ghim</span>
        <button
          onClick={() => setShowPinned(false)}
          className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center active:scale-90 transition"
        >
          <X size={18} className="text-zinc-600 dark:text-zinc-300" strokeWidth={2.2} />
        </button>
      </div>
    </div>

    {/* List */}
    <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-black">
      {!chatData?.pinnedMessage? (
        <div className="pt-24 text-center px-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-4">
            <Pin size={28} className="text-zinc-400" />
          </div>
          <p className="text-base font-medium text-zinc-900 dark:text-white">Chưa có ghim</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Nhấn giữ tin nhắn và chọn "Ghim" để lưu lại</p>
        </div>
      ) : (
        <div className="p-3">
          <button
            onClick={() => {
  setShowPinned(false);
  setTimeout(() => {
    const el = document.getElementById(`msg-${(chatData as any).pinnedMessage.id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // DÙNG Y HỆT SELECTOR BÊN SEARCH
    const bubble = el?.querySelector('div[class*="bg-gradient"], div[class*="bg-white"], div[class*="dark:bg-zinc"]');
    bubble?.classList.add('!bg-yellow-200', 'transition-colors', 'duration-300');
    setTimeout(() => {
      bubble?.classList.remove('!bg-yellow-200');
    }, 1500);
  }, 100);
}}
            onContextMenu={(e) => { e.preventDefault(); setShowUnpinSheet(true); }}
            onTouchStart={(e) => {
              (e.currentTarget as any)._timer = setTimeout(() => {
                (navigator.vibrate || (() => {}))(10);
                setShowUnpinSheet(true);
              }, 500);
            }}
            onTouchEnd={(e) => clearTimeout((e.currentTarget as any)._timer)}
            onTouchMove={(e) => clearTimeout((e.currentTarget as any)._timer)}
            onMouseDown={(e) => { (e.currentTarget as any)._timer = setTimeout(() => setShowUnpinSheet(true), 500); }}
            onMouseUp={(e) => clearTimeout((e.currentTarget as any)._timer)}
            onMouseLeave={(e) => clearTimeout((e.currentTarget as any)._timer)}
            className="w-full text-left bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-sm border border-zinc-200 dark:border-zinc-800 active:scale-[0.98] transition"
          >
            <div className="flex items-start gap-3">
              <img
                src={(chatData as any).pinnedMessage.senderId === user?.uid
                ? (user?.photoURL || '/default-avatar.png')
                  : (friend?.avatar || '/default-avatar.png')}
                className="w-10 h-10 rounded-full object-cover"
                alt=""
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold text-zinc-900 dark:text-white truncate">
                    {(chatData as any).pinnedMessage.senderId === user?.uid? 'Bạn' : friend?.name}
                  </span>
               
                </div>
                <p className="text-[14px] text-zinc-600 dark:text-zinc-300 mt-1.5 line-clamp-2 leading-snug">
                  {(() => {
                    const m = (chatData as any).pinnedMessage;
                    return m.text?.trim()
                    ? m.text
                      : m.imageUrl || m.image
                    ? '📷 Hình ảnh'
                      : m.fileUrl || m.file
                    ? '📎 Tệp đính kèm'
                      : m.location
                    ? '📍 Vị trí'
                      : 'Tin nhắn';
                  })()}
                </p>
           
              </div>

            </div>
          </button>

          <div className="text-center mt-4 px-4 space-y-0.5">
            <p className="text-xs text-zinc-500 dark:text-zinc-500">Nhấn để đi tới</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-500">Nhấn giữ để bỏ ghim</p>
          </div>
        </div>
      )}
    </div>

    {/* Action Sheet */}
    {showUnpinSheet && (
      <div className="fixed inset-0 z-[300] flex items-end justify-center p-3" onClick={() => setShowUnpinSheet(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white/95 dark:bg-zinc-800/95 backdrop-blur-2xl rounded-2xl overflow-hidden mb-2 shadow-2xl">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 text-center">Tin nhắn đã ghim</p>
              <p className="text-[15px] font-medium text-zinc-900 dark:text-white text-center mt-0.5 line-clamp-1">
                {(chatData as any).pinnedMessage?.text?.slice(0, 40) || 'Hình ảnh'}
              </p>
            </div>
            <button
              onClick={async () => {
                await updateDoc(doc(db, 'chats', chatId), { pinnedMessage: deleteField() });
                setChatData((prev) => (prev? {...prev, pinnedMessage: null } : prev));
                setShowUnpinSheet(false);
                toast.success('Đã bỏ ghim');
              }}
              className="w-full px-4 h-14 text-[17px] text-red-500 font-normal active:bg-zinc-100 dark:active:bg-zinc-700"
            >
              Bỏ ghim
            </button>
          </div>
          <button
            onClick={() => setShowUnpinSheet(false)}
            className="w-full h-14 bg-white/95 dark:bg-zinc-800/95 backdrop-blur-2xl rounded-2xl text-[17px] font-semibold text-[#0084FF] active:scale-[0.98] transition"
          >
            Hủy
          </button>
        </div>
      </div>
    )}
  </div>
)}
{/* Action Menu */}
{longPressMsg && (
  <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center pb-6">
    {/* Backdrop mờ */}
    <div
      className="absolute inset-0 bg-black/40 backdrop-blur-xl"
      onClick={() => setLongPressMsg(null)}
    />

    <div className="relative w-full max-w-[320px] px-4" onClick={e => e.stopPropagation()}>
      {/* THANH REACTION - 6 emoji y hệt ảnh */}
      <div className="bg-white rounded-full shadow-xl px-2.5 py-2 flex items-center justify-between mb-2.5 mx-auto">
        {["❤️","😆","😮","😢","😡","👍"].map((emoji) => (
          <button
            key={emoji}
            onClick={() => { toggleReaction(longPressMsg.id, emoji); setLongPressMsg(null); }}
            className="w-11 h-11 flex items-center justify-center text-[26px] active:scale-110 rounded-full hover:bg-zinc-100 transition"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* MENU TRẮNG */}
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="divide-y divide-zinc-200/80">
          {longPressMsg.senderId === user?.uid && (
            <button
              onClick={() => { setEditingMsg(longPressMsg); setText(longPressMsg.text || ''); setLongPressMsg(null); setTimeout(() => inputRef.current?.focus(), 100); }}
              className="w-full flex items-center justify-between px-4 h-[48px] active:bg-zinc-100"
            >
              <span className="text-[17px] text-black font-[-apple-system]">Chỉnh sửa</span>
              <Pencil size={20} className="text-[#8e8e93]" strokeWidth={1.8} />
            </button>
          )}

          <button
            onClick={() => { setReplyTo(longPressMsg); setLongPressMsg(null); }}
            className="w-full flex items-center justify-between px-4 h-[48px] active:bg-zinc-100"
          >
            <span className="text-[17px] text-black">Trả lời</span>
            <Reply size={20} className="text-[#8e8e93] scale-x-[-1]" strokeWidth={1.8} />
          </button>

          <button
            onClick={() => { navigator.clipboard.writeText(longPressMsg.text || ''); toast.success('Đã sao chép'); setLongPressMsg(null); }}
            className="w-full flex items-center justify-between px-4 h-[48px] active:bg-zinc-100"
          >
            <span className="text-[17px] text-black">Sao chép</span>
            <Copy size={20} className="text-[#8e8e93]" strokeWidth={1.8} />
          </button>
        </div>

        {/* Divider dày */}
        <div className="h-[8px] bg-[#f2f2f7]" />

        <div className="divide-y divide-zinc-200/80">
          <button
            onClick={() => handlePinMessage(longPressMsg)}
            className="w-full flex items-center justify-between px-4 h-[48px] active:bg-zinc-100"
          >
            <span className="text-[17px] text-black">Ghim</span>
            <Pin size={20} className="text-[#8e8e93]" strokeWidth={1.8} />
          </button>

          {longPressMsg.senderId === user?.uid && (
            <button
              onClick={() => handleDeleteMessage(longPressMsg.id)}
              className="w-full flex items-center justify-between px-4 h-[48px] active:bg-red-50"
            >
              <span className="text-[17px] text-[#ff3b30]">Xóa, gỡ</span>
              <Trash2 size={20} className="text-[#ff3b30]" strokeWidth={1.8} />
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
{messages.map((m, i) => {
    const isMe = m.senderId === user.uid;
const prev = messages[i - 1];
const next = messages[i + 1];
const showAvatar = !isMe && (!next || next.senderId !== m.senderId);
const isFirstInGroup = !prev || prev.senderId !== m.senderId;
const isLastInGroup = !next || next.senderId !== m.senderId;
const showDate =
  prev &&
  m.createdAt &&
  prev.createdAt &&
  m.createdAt.toDate().toDateString() !== prev.createdAt.toDate().toDateString();
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
          className="block w-[180px]"
        >
          <div className="overflow-hidden rounded-2xl shadow-md">
            <div className="relative h-[110px] w-full bg-zinc-200">
              <img
                src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+ff0000(${lng},${lat})/${lng},${lat},16/360x220@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                className="w-full h-full object-cover"
                alt=""
              />
            </div>
            <div className="bg-white dark:bg-zinc-900 px-2.5 py-2">
              {/* BỎ dòng "Vị trí đã chia sẻ" */}
            <p className="text-[10px] leading-none flex items-center justify-center gap-1 text-zinc-500 dark:text-zinc-400">
  <Navigation size={10} strokeWidth={2.5} />
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
   {((m as any).image || (m as any).imageUrl) && (
  <img
    src={(m as any).imageUrl || (m as any).image}
    className="rounded-2xl max-w-[240px] max-h-[320px] w-auto h-auto object-cover mb-1 block"
    alt="sent"
    loading="lazy"
  />
)}

{m.file && (
  <a href={m.file} target="_blank" className="flex items-center gap-2 p-2 bg-black/10 rounded-xl mb-1">
    <Paperclip size={16} />
    <span className="text-sm truncate">{(m as any).fileName || 'Tệp'}</span>
  </a>
)}

{m.text && (
  <p className="text- leading-snug whitespace-pre-wrap break-words">
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
                   <button
  onClick={() => handlePinMessage(m)}
  className={`p-1.5 rounded-full transition ${
    (chatData as any)?.pinnedMessage?.id === m.id
      ? 'bg-[#0A84FF]/20 hover:bg-[#0A84FF]/30'
      : 'hover:bg-white/10 active:bg-white/15'
  }`}
  title={(chatData as any)?.pinnedMessage?.id === m.id ? 'Bỏ ghim' : 'Ghim tin nhắn'}
>
  <Pin 
    size={16} 
    className={`transition ${
      (chatData as any)?.pinnedMessage?.id === m.id
        ? 'text-[#0A84FF] fill-[#0A84FF]/30'
        : 'text-white/60 hover:text-white/90'
    }`}
    strokeWidth={2}
  />
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
    className="fixed inset-0 z-[80]"
    onClick={() => setShowBgPicker(false)}
  >
    <div className="absolute inset-0 bg-black/40 backdrop-blur-xl" />

    <div
      className="fixed inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:max-h-[90vh] sm:rounded-[28px] bg-white flex flex-col overflow-hidden shadow-2xl"
      onClick={e => e.stopPropagation()}
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Header */}
      <div className="px-5 pt-3 pb-3 sticky top-0 bg-white/95 backdrop-blur-xl z-10 border-b border-zinc-100 shrink-0">
        <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mb-3 sm:hidden" />
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden ring-1 ring-zinc-200 shrink-0 shadow-sm">
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
                <div className="w-full h-full bg-zinc-100" />
              );
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-zinc-900 text-[22px] font-semibold leading-tight tracking-tight">Hình nền</h3>
            <p className="text-zinc-500 text-[13px]">
              Chọn cho đoạn chat này • {chatData?.backgroundId && chatData.backgroundId!== 'default'? BACKGROUNDS[chatData.backgroundId as BgId]?.name : 'Mặc định'}
            </p>
          </div>
          <button onClick={() => setShowBgPicker(false)} className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center active:scale-90 transition">
            <X size={16} className="text-zinc-600"/>
          </button>
        </div>
      </div>

      <div className="overflow-y-auto px-5 pb-6 flex-1 bg-zinc-50 overscroll-contain">
        {BACKGROUND_GROUPS.map((group) => (
          <div key={group.id} className="mb-7 first:mt-5">
            <h4 className="text-zinc-500 text-[12px] font-semibold mb-3 uppercase tracking-widest">{group.title}</h4>
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
                    className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-white ring-1 ring-zinc-200 active:scale-[0.97] transition-all group shadow-sm hover:shadow-md"
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
                      <div className="w-full h-full flex items-center justify-center bg-zinc-50">
                        <div className="w-8 h-8 rounded-full border-2 border-zinc-300" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-60" />

                    <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[11px] text-white font-medium drop-shadow-md text-center truncate">
                      {bg.name}
                    </span>

                    {isSelected && (
                      <>
                        <div className="absolute inset-0 ring-2 ring-[#0A84FF] ring-inset rounded-2xl pointer-events-none" />
                        <div className="absolute top-2 right-2 w-5 h-5 bg-[#0A84FF] rounded-full flex items-center justify-center shadow-md">
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M3 6l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
  className="shrink-0 z-30 px-3 relative"
  style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
>
  <div className="flex items-center gap-1 h-12 px-2.5 bg-white dark:bg-zinc-900 backdrop-blur-2xl rounded-full shadow-[0_8px_24px_-8px_rgba(0,0,0,0.15)] border border-zinc-200 dark:border-zinc-800 overflow-hidden">

    {/* 1. Ảnh */}
    <input type="file" hidden ref={imageInputRef} accept="image/*" onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])} />
    <button
      onClick={() => imageInputRef.current?.click()}
      disabled={isBlocked || isDeleted}
      className={`w-8 h-8 flex items-center justify-center rounded-full active:scale-90 shrink-0 ${isBlocked || isDeleted? 'opacity-40' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
    >
      <ImageIcon size={20} className="text-[#0084FF]" strokeWidth={2.2} />
    </button>

    {/* 2. Vị trí */}
    <button
      onClick={sendLocation}
      disabled={isBlocked || isDeleted}
      className={`w-8 h-8 flex items-center justify-center rounded-full active:scale-90 shrink-0 ${isBlocked || isDeleted? 'opacity-40' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
    >
      <MapPin size={20} className="text-[#0084FF]" strokeWidth={2.2} />
    </button>

    {/* 3. File desktop */}
    <input type="file" hidden ref={fileInputRef} onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])} />
    <button
      onClick={() => fileInputRef.current?.click()}
      disabled={isBlocked || isDeleted}
      className={`w-8 h-8 hidden sm:flex items-center justify-center rounded-full active:scale-90 shrink-0 ${isBlocked || isDeleted? 'opacity-40' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
    >
      <Paperclip size={18} className="text-zinc-500 dark:text-zinc-400" />
    </button>

    {/* Ô nhập */}
    <div className="flex-1 relative h-full flex items-center min-w-0">
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => { setText(e.target.value); handleTyping(); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' &&!e.shiftKey) {
            e.preventDefault();
            if (!isBlocked &&!isDeleted && text.trim()) sendMessage();
          }
        }}
        disabled={isBlocked || isDeleted}
        placeholder={
          isTyping
           ? ''
            : isBlocked
           ? 'Bạn không thể nhắn tin'
            : isDeleted
           ? 'Đã xóa'
            : 'Nhắn tin...'
        }
        className="w-full h-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-base text-zinc-900 dark:text-white placeholder:text-zinc-400 pr-9"
      />

      {/* Hiệu ứng đang nhắn */}
      {isTyping &&!text && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
          <span className="text-sm text-zinc-400 truncate">
            {typingDisplay}
            <span className="inline-block w-0.5 h-4 bg-zinc-400 ml-0.5 animate-pulse translate-y-0.5" />
          </span>
        </div>
      )}

      <button
        onClick={sendMessage}
        disabled={sending || isBlocked || isDeleted ||!text.trim()}
        className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#0084FF] hover:bg-[#0073e6] text-white rounded-full flex items-center justify-center active:scale-90 disabled:opacity-40 transition shrink-0"
      >
        {sending? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2.5} />}
      </button>
    </div>
  </div>
</div>
{/* SETTINGS SHEET */}
{showSettings && (
  <div
    className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4"
    onClick={() => setShowSettings(false)}
  >
    <div
      className="bg-white w-full sm:max-w-[400px] h-[92vh] sm:h-auto sm:max-h-[85vh] sm:rounded-[28px] rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl border border-zinc-200"
      onClick={e => e.stopPropagation()}
    >
      {/* Handle */}
      <div className="w-10 h-1 bg-zinc-300 rounded-full mx-auto mt-3 mb-2 sm:hidden" />

{/* PROFILE HEADER */}
<div className="px-5 pt-4 pb-5 flex flex-col items-center text-center border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
  <div className="relative">
    <img src={friend?.avatar} className="w-20 h-20 rounded-full object-cover ring-4 ring-white dark:ring-zinc-900 shadow-md" />
    {friend?.isOnline && <div className="absolute bottom-1 right-1 w-4 h-4 bg-[#31d158] rounded-full ring-2 ring-white dark:ring-zinc-900" />}
  </div>
  <h2 className="text-zinc-900 dark:text-white text- font-semibold mt-3 tracking-tight">{friend?.name}</h2>
  <p className="text-zinc-500 dark:text-zinc-400 text-">@{friend?.username || 'user'}</p>

  <div className="flex gap-2.5 mt-4">
    <button 
      onClick={() => router.push(`/profile/${friend?.userId}`)} 
      className="px-4 h-9 bg-[#0084FF] hover:bg-[#0073e6] text-white rounded-full text- font-medium active:scale-95 transition shadow-sm"
    >
      Trang cá nhân
    </button>
    <button 
      onClick={() => { setShowSettings(false); toast.info('Gọi thoại...') }} 
      className="w-9 h-9 bg-[#0084FF] hover:bg-[#0073e6] rounded-full flex items-center justify-center active:scale-95 transition shadow-sm"
    >
      <Phone size={18} className="text-white" strokeWidth={2.2} />
    </button>
    <button 
      onClick={() => { setShowSettings(false); toast.info('Gọi video...') }} 
      className="w-9 h-9 bg-[#0084FF] hover:bg-[#0073e6] rounded-full flex items-center justify-center active:scale-95 transition shadow-sm"
    >
      <Video size={18} className="text-white" strokeWidth={2.2} />
    </button>
  </div>
</div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-zinc-50">
        {/* TÙY CHỈNH */}
        <div className="bg-white rounded-2xl overflow-hidden border border-zinc-200 shadow-sm">
          {[
            { icon: Search, label: 'Tìm trong cuộc trò chuyện', action: () => { setShowSettings(false); setShowSearch(true); } },
            { icon: ImageIcon, label: 'Đổi hình nền', value: chatData?.backgroundId? 'Đã đặt' : 'Mặc định', action: () => { setShowSettings(false); setShowBgPicker(true); } },
            { icon: Pin, label: 'Tin nhắn đã ghim', value: chatData?.pinnedMessage? '1 tin nhắn' : 'Không có', action: () => { setShowSettings(false); setShowPinned(true); } },
          ].map((item,i) => (
            <button key={i} onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 active:bg-zinc-100 transition border-b border-zinc-100 last:border-0">
              <item.icon size={20} className="text-zinc-500" />
              <span className="flex-1 text-left text-[16px] text-zinc-900">{item.label}</span>
              {item.value && <span className="text-zinc-400 text-[14px]">{item.value}</span>}
            </button>
          ))}
        </div>

     {/* MEDIA */}
<div className="bg-white rounded-2xl overflow-hidden border border-zinc-200 shadow-sm">
  <button 
    onClick={() => setShowMedia(true)} 
    className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-zinc-50 transition"
  >
    <ImageIcon size={20} className="text-zinc-500" />
    <span className="flex-1 text-left text-base text-zinc-900">
      Ảnh, file, liên kết
    </span>
    <span className="text-sm text-zinc-400">
      Xem tất cả
    </span>
  </button>
</div>

        {/* QUYỀN RIÊNG TƯ */}
        <div className="bg-white rounded-2xl overflow-hidden border border-zinc-200 shadow-sm">
          {[
            { icon: BellOff, label: 'Tắt thông báo', action: async () => { toast.success('Đã tắt thông báo'); setShowSettings(false); } },
            {
              icon: Shield,
              label: chatData?.blockedUsers?.includes(friendId || '')? 'Bỏ chặn' : 'Chặn người dùng',
              danger: false,
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
            <button key={i} onClick={item.action} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 active:bg-zinc-100 transition border-b border-zinc-100 last:border-0">
              <item.icon size={20} className="text-zinc-500" />
              <span className="flex-1 text-left text-[16px] text-zinc-900">{item.label}</span>
            </button>
          ))}
        </div>

        {/* NGUY HIỂM */}
        <div className="bg-white rounded-2xl overflow-hidden border border-zinc-200 shadow-sm">
          <button
            onClick={async () => {
              if (!confirm('Xóa toàn bộ cuộc trò chuyện này?')) return;
              await updateDoc(doc(db, "chats", chatId), { deletedFor: arrayUnion(user?.uid) });
              toast.success('Đã xóa');
              router.replace('/chat');
            }}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 active:bg-red-100 transition"
          >
            <Trash2 size={20} className="text-red-500" />
            <span className="flex-1 text-left text-[16px] text-red-500 font-medium">Xóa cuộc trò chuyện</span>
          </button>
        </div>
      </div>
    </div>
  </div>
)}
  </div>

  );
}