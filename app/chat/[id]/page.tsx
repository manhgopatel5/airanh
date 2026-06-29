"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB, getFirebaseStorage } from "@/lib/firebase";

import {
  collection, query, onSnapshot, doc,
  orderBy, addDoc, serverTimestamp, Timestamp, updateDoc, deleteDoc, arrayUnion, arrayRemove
} from "firebase/firestore";
import { getDoc } from "firebase/firestore";
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Image as ImageIcon, MapPin, Paperclip, Phone, Send, Loader2, X, Video, CheckCheck,
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
  pinnedMessage?: string;
  typing?: Record<string, boolean>;
  blockedUsers?: string[];
  deletedFor?: string[];
  type?: string; // THÊM FIELD NÀY
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
const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
const [showBgPicker, setShowBgPicker] = useState(false);
const [bgTimer, setBgTimer] = useState<NodeJS.Timeout | null>(null);
  const handleDeleteMessage = async (msgId: string) => {
  if (!chatId) return;
  await deleteDoc(doc(db, "chats", chatId, "messages", msgId));
  setLongPressMsg(null);
};
const handlePinMessage = async (msg: any) => {
  if (!chatId) return;
  await updateDoc(doc(db, "chats", chatId), {
    pinnedMessage: {
      id: msg.id,
      text: msg.text || "Ảnh",
      sender: msg.senderId,
      createdAt: msg.createdAt
    }
  });
  setLongPressMsg(null);
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



  return (
<div className="fixed inset-0 flex flex-col bg-black">
  {/* NỀN FIX TOÀN MÀN - không cuộn */}
  {(chatData as any)?.background && (
    <>
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: `url(${(chatData as any).background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          transform: 'translateZ(0)'
        }}
      />
      <div className="fixed inset-0 z-0 bg-black/15 dark:bg-black/35 pointer-events-none" />
    </>
  )}

  {/* Nền mặc định khi chưa có ảnh */}
  {!(chatData as any)?.background && (
    <div className="fixed inset-0 z-0 bg-gradient-to-b from-white via-gray-50 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black" />
  )}

  <Toaster richColors position="top-center" />
      {showSearch && (
<div className="shrink-0 z-30 px-4 py-2 border-b border-white/10 bg-black/80 backdrop-blur-xl">
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

{/* HEADER - nền trắng chữ đen */}
<div
  className="shrink-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-2xl"
  style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
>
  <div className="px-4 py-2.5 flex items-center justify-between">
    {/* Left: avatar + name */}
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <div className="relative flex-shrink-0">
        <img
          src={friend.avatar}
          className="w-10 h-10 rounded-full object-cover ring-2 ring-zinc-200"
          alt={friend.name}
        />
        {friend.isOnline && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#31d158] rounded-full ring-2 ring-white">
            <div className="absolute inset-0 bg-[#31d158] rounded-full animate-ping opacity-60" />
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="font-semibold text-zinc-900 text- leading-tight truncate">
          {friend.name}
        </p>
        <p className="text-xs leading-tight font-medium text-zinc-500">
          {chatData?.typing?.[friendId || ""]? (
            <span className="text-blue-600">Đang nhập...</span>
          ) : friend.isOnline? (
            <span>Đang hoạt động</span>
          ) : friend.lastSeen? (
            <span>{formatDistanceToNow(friend.lastSeen.toDate(), { addSuffix: true, locale: vi })}</span>
          ) : (
            <span>Offline</span>
          )}
        </p>
      </div>
    </div>

    {/* Right: actions */}
    <div className="flex items-center gap-1.5">
      <button onClick={() => setShowSearch(true)} className="w-9 h-9 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-2xl active:scale-90 shadow-lg">
        <Search size={20} className="text-white" strokeWidth={2.25} />
      </button>
      <button className="w-9 h-9 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-2xl active:scale-90 shadow-lg">
        <Phone size={20} className="text-white" strokeWidth={2.25} />
      </button>
      <button className="w-9 h-9 flex items-center justify-center rounded-full bg-black/25 backdrop-blur-2xl active:scale-90 shadow-lg">
        <Video size={20} className="text-white" strokeWidth={2.25} />
      </button>
    </div>
  </div>
</div>

{/* Pinned */}
{chatData?.pinnedMessage && (
  <div className="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900 flex items-center gap-2 sticky top- z-40">
    <Pin size={14} className="text-amber-600" />
    <p className="text-xs flex-1 truncate">{(chatData as any)?.pinnedMessage?.text}</p>
    <button onClick={() => updateDoc(doc(db, "chats", chatId), { pinnedMessage: null })}>
      <X size={14} />
    </button>
  </div>
)}

{/* Action Menu */}
{longPressMsg && (
  <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-zinc-700 p-2 flex gap-2">
    <button onClick={() => handlePinMessage(longPressMsg)} className="px-4 py-2.5 bg-gray-100 dark:bg-zinc-700 rounded-xl flex items-center gap-2 text-sm font-medium">
      <Pin size={16} /> Ghim
    </button>
    {longPressMsg.senderId === user?.uid && (
      <button onClick={() => handleDeleteMessage(longPressMsg.id)} className="px-4 py-2.5 bg-red-500 text-white rounded-xl flex items-center gap-2 text-sm font-medium">
        <Trash2 size={16} /> Xóa
      </button>
    )}
    <button onClick={() => setLongPressMsg(null)} className="px-3 py-2.5">
      <X size={16} />
    </button>
  </div>
)}

<div
  className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-[100px] space-y-0.5 relative z-10 bg-transparent"
  onTouchStart={(e) => {
    if (e.target === e.currentTarget) {
      const timer = setTimeout(() => setShowBgPicker(true), 800);
      setBgTimer(timer);
    }
  }}
  onTouchEnd={() => bgTimer && clearTimeout(bgTimer)}
  onMouseDown={(e) => {
    if (e.target === e.currentTarget) {
      const timer = setTimeout(() => setShowBgPicker(true), 800);
      setBgTimer(timer);
    }
  }}
  onMouseUp={() => bgTimer && clearTimeout(bgTimer)}
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
          className={`flex items-end gap-2 group px-3 ${isMe? "justify-end" : "justify-start"} ${isFirstInGroup? "mt-1" : ""}`}
          onTouchStart={() => {
    const timer = setTimeout(() => setLongPressMsg(m), 500);
    setPressTimer(timer);
  }}
  onTouchEnd={() => pressTimer && clearTimeout(pressTimer)}
  onMouseDown={() => {
    const timer = setTimeout(() => setLongPressMsg(m), 500);
    setPressTimer(timer);
  }}
  onMouseUp={() => pressTimer && clearTimeout(pressTimer)}
  onMouseLeave={() => pressTimer && clearTimeout(pressTimer)}
  onContextMenu={(e) => {
    e.preventDefault();
    setLongPressMsg(m);
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
{isLastInGroup && (
  <div className="flex w-full justify-center items-center gap-1.5 my-2">
    <span className="text-[11px] text-gray-400 dark:text-zinc-500">
      {formatTime(m.createdAt)}
    </span>
    {isMe && seenAvatars.length > 0 && (
      <div className="flex -space-x-1">
        {seenAvatars.slice(0, 3).map((u, i) => (
          <img
            key={i}
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
  <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowBgPicker(false)}>
    <div className="bg-[#1c1c1e]/95 backdrop-blur-2xl w-full sm:max-w-lg max-h-[85vh] sm:rounded-[32px] rounded-t-[32px] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div className="px-6 pt-6 pb-4 sticky top-0 bg-[#1c1c1e]/80 backdrop-blur-xl z-10">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />
        <h3 className="text-white text-[22px] font-semibold">Hình nền</h3>
        <p className="text-white/50 text-sm mt-1">Chọn hình nền cho đoạn chat này</p>
      </div>

      <div className="overflow-y-auto px-6 pb-6 flex-1">
        {/* Nổi bật */}
        <div className="mb-6">
          <h4 className="text-white/70 text-[13px] font-medium mb-3 uppercase tracking-wider">Phổ biến</h4>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { url: '', name: 'Mặc định', color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
              { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', name: 'Dãy núi', color: '' },
              { url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800', name: 'Ngân hà', color: '' },
              { url: 'https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?w=800', name: 'Bắc cực', color: '' },
              { url: 'https://images.unsplash.com/photo-1470071459604-3b5b0a5c2cdb?w=800', name: 'Rừng sương', color: '' },
              { url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800', name: 'Hồ gương', color: '' },
            ].map((bg, i) => {
              const isSelected = (chatData as any)?.background === bg.url || (!(chatData as any)?.background &&!bg.url);
              return (
                <button key={i} onClick={async () => { await updateDoc(doc(db, "chats", chatId), { background: bg.url }); setShowBgPicker(false); }}
                  className={`relative aspect-[4/5] rounded-2xl overflow-hidden group ${isSelected? 'ring-[3px] ring-[#0A84FF] ring-offset-2 ring-offset-[#1c1c1e]' : ''}`}>
                  <div className="absolute inset-0" style={{ background: bg.color || `url(${bg.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="absolute bottom-2 left-2 right-2 text-white text-[12px] font-medium drop-shadow-lg">{bg.name}</span>
                  {isSelected && <div className="absolute top-2 right-2 w-5 h-5 bg-[#0A84FF] rounded-full flex items-center justify-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg></div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Thiên nhiên */}
        <div className="mb-6">
          <h4 className="text-white/70 text-[13px] font-medium mb-3 uppercase tracking-wider">Thiên nhiên</h4>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=800',
              'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800',
              'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800',
              'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=800',
              'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800',
              'https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=800',
            ].map((url, i) => (
              <button key={i} onClick={async () => { await updateDoc(doc(db, "chats", chatId), { background: url }); setShowBgPicker(false); }}
                className="aspect-square rounded-2xl overflow-hidden relative group hover:scale-[0.97] transition-transform">
                <div className="absolute inset-0" style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                {(chatData as any)?.background === url && <div className="absolute inset-0 ring-[3px] ring-[#0A84FF] ring-inset rounded-2xl" />}
              </button>
            ))}
          </div>
        </div>

        {/* Không gian & Abstract */}
        <div className="mb-6">
          <h4 className="text-white/70 text-[13px] font-medium mb-3 uppercase tracking-wider">Vũ trụ</h4>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800',
              'https://images.unsplash.com/photo-1465101162946-4377e57745c3?w=800',
              'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800',
              'https://images.unsplash.com/photo-1505506874110-6a7a69069a08?w=800',
              'https://images.unsplash.com/photo-1614732414444-096e5f1122d5?w=800',
              'https://images.unsplash.com/photo-1610296669228-602fa827fc1f?w=800',
            ].map((url, i) => (
              <button key={i} onClick={async () => { await updateDoc(doc(db, "chats", chatId), { background: url }); setShowBgPicker(false); }}
                className="aspect-square rounded-2xl overflow-hidden">
                <div className="w-full h-full" style={{ backgroundImage: `url(${url})`, backgroundSize: 'cover' }} />
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div className="mt-2">
          <input type="file" accept="image/*" id="bg-upload" className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file ||!chatId) return;
              try {
                const storage = getFirebaseStorage();
                const storageRef = ref(storage, `chat-backgrounds/${chatId}/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                await updateDoc(doc(db, "chats", chatId), { background: url });
                setShowBgPicker(false);
              } catch (err) { alert('Lỗi tải ảnh'); }
            }} />
          <label htmlFor="bg-upload" className="flex items-center justify-center gap-3 w-full py-4 bg-white/10 hover:bg-white/15 active:bg-white/5 rounded-2xl border border-white/10 transition-all group cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            </div>
            <div className="text-left">
              <div className="text-white font-medium text-[15px]">Tải ảnh lên</div>
              <div className="text-white/50 text-[12px]">Chọn từ thư viện</div>
            </div>
          </label>
        </div>
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
  className="shrink-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur-2xl"
  style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
>
  <div className="flex items-end gap-2 px-3 py-2.5">
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
      className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-90 ${isBlocked || isDeleted? 'opacity-50' : ''}`}
    >
      <ImageIcon size={22} className="text-zinc-600" />
    </button>

    <input
      type="file"
      hidden
      ref={fileInputRef}
      onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])}
    />
    <button
      onClick={() => fileInputRef.current?.click()}
      disabled={isBlocked || isDeleted}
      className={`w-10 h-10 hidden sm:flex items-center justify-center rounded-full active:scale-90 ${isBlocked || isDeleted? 'opacity-50' : ''}`}
    >
      <Paperclip size={20} className="text-zinc-600" />
    </button>

    <button
      onClick={sendLocation}
      disabled={isBlocked || isDeleted}
      className={`w-10 h-10 hidden sm:flex items-center justify-center rounded-full active:scale-90 ${isBlocked || isDeleted? 'opacity-50' : ''}`}
    >
      <MapPin size={20} className="text-zinc-600" />
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
        placeholder={isBlocked? 'Bạn không thể nhắn tin' : isDeleted? 'Đã xóa' : 'Nhắn tin...'}
        className="w-full h-10 pl-4 pr-11 bg-zinc-100 rounded-full outline-none text- text-zinc-900 border-zinc-200 placeholder:text-zinc-400"
      />
      <button
        onClick={sendMessage}
        disabled={sending || isBlocked || isDeleted ||!text.trim()}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 bg-[#A9D0FF] text-white rounded-full flex items-center justify-center active:scale-90 disabled:opacity-40"
      >
        {sending? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={2.5} />}
      </button>
    </div>
  </div>
</div>
  </div>

  );
}