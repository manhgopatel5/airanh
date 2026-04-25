"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB, getFirebaseStorage } from "@/lib/firebase";
import {
  collection, query, onSnapshot, doc,
  orderBy, limit, addDoc, serverTimestamp, Timestamp,
  writeBatch, setDoc, updateDoc, getDoc
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Image as ImageIcon, MapPin, Paperclip, Phone, Info, Send,
  ArrowLeft, Loader2, X, Video, Check, CheckCheck
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
  online: boolean;
  lastSeen?: Timestamp;
  shortId: string;
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
  type: "text" | "image" | "file" | "location";
};

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const db = getFirebaseDB();
  const storage = getFirebaseStorage();
  const { user, loading: authLoading } = useAuth();
  // ✅ FIX 1: Route /chat/[id] nên dùng params.id
  const friendId = params.id as string;

  const [friend, setFriend] = useState<UserData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loadingFriend, setLoadingFriend] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const chatId = user && friendId? [user.uid, friendId].sort().join("_") : null;

  /* ================= LOAD FRIEND ================= */
  useEffect(() => {
    if (!friendId || authLoading) return;
    if (!user) {
      router.replace("/chat");
      return;
    }

    const loadFriend = async () => {
      try {
        const snap = await getDoc(doc(db, "users", friendId));
        if (snap.exists()) {
          setFriend({ uid: snap.id,...snap.data() } as UserData);
        } else {
          toast.error("Người dùng không tồn tại");
          setTimeout(() => router.replace("/chat"), 1500);
        }
      } catch (e) {
        console.error(e);
        toast.error("Lỗi tải thông tin");
        router.replace("/chat");
      } finally {
        setLoadingFriend(false);
      }
    };

    loadFriend();

    const unsub = onSnapshot(doc(db, "users", friendId), (snap) => {
      if (snap.exists()) {
        setFriend({ uid: snap.id,...snap.data() } as UserData);
      }
    });
    return () => unsub();
  }, [friendId, user, authLoading, router, db]);

  /* ================= LOAD MESSAGES - FIX 4: Bỏ where!= null ================= */
  useEffect(() => {
    if (!chatId ||!user ||!friend) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(500)
    );

    const unsub = onSnapshot(q, (snap) => {
      // ✅ Filter null ở client thay vì query where!= null
      const msgs = snap.docs
       .map((d) => ({ id: d.id,...d.data() } as Message))
       .filter((m) => m.createdAt!== null);

      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);

      const unread = snap.docs.filter((d) => {
        const data = d.data();
        return data.senderId === friendId &&!data.seenBy?.includes(user.uid);
      });

      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach((d) => {
          batch.update(doc(db, "chats", chatId, "messages", d.id), {
            seenBy: [...(d.data().seenBy || []), user.uid],
          });
        });
        batch.commit().catch(() => {});
      }
    });

    return () => unsub();
  }, [chatId, user, friendId, friend, db]);

  /* ================= TYPING INDICATOR - FIX 3: Check exists ================= */
  useEffect(() => {
    if (!chatId) return;
    const unsub = onSnapshot(doc(db, "chats", chatId), (snap) => {
      // ✅ FIX 3: Check exists trước khi.data()
      if (snap.exists()) {
        const data = snap.data();
        setIsTyping(data?.typing?.[friendId] === true);
      } else {
        setIsTyping(false);
      }
    });
    return () => unsub();
  }, [chatId, friendId, db]);

  /* ================= FIX 2: Dùng setDoc merge thay vì updateDoc ================= */
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
      // Im lặng nếu chat chưa tạo
      console.log("Typing error:", e);
    }
  }, [user, chatId, db]);

  /* ================= SEND MESSAGE ================= */
  const sendMessage = useCallback(async () => {
    if (!text.trim() ||!user ||!friend ||!chatId || sending) return;

    const tempText = text;
    const tempReply = replyTo;
    setText("");
    setReplyTo(null);
    setSending(true);
    inputRef.current?.focus();

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        text: tempText,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        seenBy: [user.uid],
        type: "text",
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
          members: [user.uid, friendId],
          lastMessage: tempText,
          updatedAt: serverTimestamp(),
          [`typing.${user.uid}`]: false,
        },
        { merge: true }
      );
    } catch (e) {
      console.error(e);
      toast.error("Gửi thất bại");
      setText(tempText);
      setReplyTo(tempReply);
    } finally {
      setSending(false);
    }
  }, [user, text, friend, chatId, sending, replyTo, friendId, db]);

  /* ================= SEND IMAGE ================= */
  const sendImage = async (file: File) => {
    if (!user ||!chatId) return;
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
            });

            await setDoc(
              doc(db, "chats", chatId),
              {
                members: [user.uid, friendId],
                lastMessage: "📷 Ảnh",
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
            toast.success("Đã gửi ảnh");
          } catch (err) {
            console.error(err);
            toast.error("Lỗi gửi ảnh");
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
    if (!user ||!chatId) return;
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
      });

      await setDoc(
        doc(db, "chats", chatId),
        {
          members: [user.uid, friendId],
          lastMessage: `📎 ${file.name}`,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success("Đã gửi file");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi gửi file");
    } finally {
      setUploading(false);
    }
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

  if (authLoading || loadingFriend ||!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!friend) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-950 gap-4">
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
    <div className="flex flex-col h-screen bg-gradient-to-b from-white via-gray-50 to-white dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <Toaster richColors position="top-center" />

      {/* HEADER */}
      <div className="px-4 py-3 border-b border-gray-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl flex items-center gap-3 sticky top-0 z-20">
        <button onClick={() => router.back()} className="md:hidden p-2 -ml-2 active:scale-90 transition-transform rounded-full hover:bg-gray-100 dark:hover:bg-zinc-900">
          <ArrowLeft size={24} className="text-gray-900 dark:text-white" />
        </button>
        <div className="relative">
          <img src={friend.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-zinc-950 shadow-lg" alt={friend.name} />
          {friend.online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-[3px] ring-white dark:ring-zinc-950">
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
            ) : friend.online? (
              "Đang hoạt động"
            ) : friend.lastSeen? (
              formatDistanceToNow(friend.lastSeen.toDate(), { addSuffix: true, locale: vi })
            ) : (
              "Offline"
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90">
            <Phone size={20} className="text-gray-700 dark:text-zinc-300" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90">
            <Video size={20} className="text-gray-700 dark:text-zinc-300" />
          </button>
          <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-zinc-900 rounded-full transition-colors active:scale-90">
            <Info size={20} className="text-gray-700 dark:text-zinc-300" />
          </button>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-0.5">
        {messages.map((m, i) => {
          const isMe = m.senderId === user.uid;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const showAvatar =!isMe && (!next || next.senderId!== m.senderId);
          const isFirstInGroup =!prev || prev.senderId!== m.senderId;
          const isLastInGroup =!next || next.senderId!== m.senderId;
          const showDate =
          !prev ||
            (m.createdAt &&
              prev.createdAt &&
              m.createdAt.toDate().toDateString()!== prev.createdAt.toDate().toDateString());

          return (
            <div key={m.id}>
              {showDate && m.createdAt && (
                <div className="flex items-center justify-center my-6">
                  <div className="px-4 py-1.5 bg-gray-200/60 dark:bg-zinc-800/60 backdrop-blur-xl rounded-full">
                    <p className="text-xs font-bold text-gray-600 dark:text-zinc-400">
                      {formatDateDivider(m.createdAt)}
                    </p>
                  </div>
                </div>
              )}

              <div className={`flex items-end gap-2 ${isMe? "justify-end" : "justify-start"} ${isFirstInGroup? "mt-3" : ""}`}>
                {!isMe && (
                  <div className="w-7 flex-shrink-0">
                    {showAvatar && <img src={friend.avatar} className="w-7 h-7 rounded-full shadow-sm" alt={friend.name} />}
                  </div>
                )}
                <div className={`group max-w-[75%] flex flex-col ${isMe? "items-end" : "items-start"}`}>
                  {m.replyTo && (
                    <div
                      className={`px-3 py-1.5 mb-1 rounded-2xl text-xs ${
                        isMe? "bg-blue-400/30 text-white/80" : "bg-gray-200/60 dark:bg-zinc-700/60 text-gray-600 dark:text-zinc-300"
                      }`}
                    >
                      <p className="font-bold text-xs">{m.replyTo.senderName}</p>
                      <p className="truncate">{m.replyTo.text}</p>
                    </div>
                  )}

                  <div
                    onClick={() => setReplyTo(m)}
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
                        className="flex items-center gap-2 p-2 bg-black/10 rounded-xl"
                      >
                        <MapPin size={16} />
                        <span className="text-sm">Xem vị trí</span>
                      </a>
                    )}
                    {m.text && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>}
                  </div>
                  {isLastInGroup && (
                    <div className={`flex items-center gap-1 mt-1 px-1 ${isMe? "flex-row-reverse" : ""}`}>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 font-medium">{formatTime(m.createdAt)}</p>
                      {isMe && m.seenBy && m.seenBy.length > 1 && <CheckCheck className="text-blue-500" size={14} />}
                      {isMe && (!m.seenBy || m.seenBy.length <= 1) && <Check className="text-gray-400" size={14} />}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* REPLY BAR */}
      {replyTo && (
        <div className="px-4 pt-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl border-t border-gray-200/50 dark:border-zinc-800/50">
          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-2xl">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                Trả lời {replyTo.senderId === user.uid? "bạn" : friend.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-zinc-400 truncate">{replyTo.text}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-full transition-colors">
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
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center active:scale-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
          >
            {sending? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}