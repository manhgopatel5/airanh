"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { db, auth, storage } from "@/lib/firebase";
import {
  collection, query, where, onSnapshot, doc, getDoc,
  orderBy, limit, addDoc, serverTimestamp, updateDoc, Timestamp,
  writeBatch, setDoc
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  Image as ImageIcon, MapPin, Paperclip, Phone, Info, Send,
  ArrowLeft, Loader2, X, Video
} from "lucide-react";
import { toast, Toaster } from "sonner";
import imageCompression from "browser-image-compression";
import ChatBubble from "@/components/ChatBubble";
import EmojiPicker from "@/components/EmojiPicker";

type Message = {
  id: string;
  chatId: string;
  senderId: string;
  text?: string;
  image?: string;
  file?: string;
  fileName?: string;
  location?: { lat: number; lng: number };
  type: "text" | "image" | "file" | "location";
  createdAt: Timestamp | null;
  seenBy: string[];
  replyTo?: { id: string; text: string; userName: string };
  reactions?: Record<string, string>;
};

type Friend = {
  id: string;
  name: string;
  avatar: string;
  online: boolean;
  lastSeen?: Timestamp;
  typing?: boolean;
  fcmToken?: string;
};

export default function ChatDetail() {
  const params = useParams();
  const id = typeof params.id === "string"? params.id : Array.isArray(params.id)? params.id[0] : "";
  const router = useRouter();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [friend, setFriend] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<string>("");
  const lastOnlineUpdate = useRef<number>(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /* ================= ONLINE STATUS ================= */
  useEffect(() => {
    if (!user) return;
    const refUser = doc(db, "users", user.uid);

    const updateOnline = () => {
      const now = Date.now();
      if (now - lastOnlineUpdate.current < 30000) return;
      lastOnlineUpdate.current = now;
      updateDoc(refUser, { online: true, lastSeen: serverTimestamp() }).catch(() => {});
    };
    updateOnline();

    const handleOffline = () => {
      updateDoc(refUser, { online: false, lastSeen: serverTimestamp() }).catch(() => {});
    };

    let visibilityTimeout: NodeJS.Timeout;
    const handleVisibility = () => {
      clearTimeout(visibilityTimeout);
      visibilityTimeout = setTimeout(() => {
        if (document.hidden) handleOffline();
        else updateOnline();
      }, 1000);
    };

    window.addEventListener("beforeunload", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      handleOffline();
      window.removeEventListener("beforeunload", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearTimeout(visibilityTimeout);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [user]);

  /* ================= LOAD MESSAGES ================= */
  useEffect(() => {
    if (!id ||!user) return;

    const q = query(
      collection(db, "chats", id, "messages"),
      where("createdAt", "!=", null),
      orderBy("createdAt", "asc"),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id,...d.data() } as Message));
      setMessages(list);
      setLoading(false);

      const unread = snap.docs.filter((d) => {
        const data = d.data();
        return!data.seenBy?.includes(user.uid);
      });

      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach((d) => {
          batch.update(doc(db, "chats", id, "messages", d.id), {
            seenBy: [...(d.data().seenBy || []), user.uid],
          });
        });
        batch.commit().catch(() => {});
      }
    });

    return () => unsub();
  }, [id, user]);

  /* ================= LOAD FRIEND ================= */
  useEffect(() => {
    if (!id ||!user) return;

    const load = async () => {
      const chatRef = doc(db, "chats", id);
      let chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        const friendId = id.split("_").find((uid) => uid!== user.uid);
        if (!friendId) return router.back();

        await setDoc(chatRef, {
          members: [user.uid, friendId],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        chatSnap = await getDoc(chatRef);
      }

      const data = chatSnap.data();
      const friendId = data?.members?.find((m: string) => m!== user.uid);
      if (!friendId) return;

      return onSnapshot(doc(db, "users", friendId), (snap) => {
        if (snap.exists()) {
          setFriend({ id: friendId,...snap.data() } as Friend);
        }
      });
    };

    let unsub: (() => void) | null = null;
    load().then((u) => (unsub = u || null));
    return () => unsub?.();
  }, [id, user, router]);

  /* ================= TYPING INDICATOR ================= */
  useEffect(() => {
    if (!id ||!user) return;
    const unsub = onSnapshot(doc(db, "chats", id), (snap) => {
      const data = snap.data();
      setIsTyping(data?.typing?.[friend?.id || ""] === true);
    });
    return () => unsub();
  }, [id, user, friend?.id]);

  const handleTyping = useCallback(async () => {
    if (!user ||!id) return;

    await updateDoc(doc(db, "chats", id), {
      [`typing.${user.uid}`]: true,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(async () => {
      await updateDoc(doc(db, "chats", id), {
        [`typing.${user.uid}`]: false,
      });
    }, 3000);
  }, [user, id]);

  /* ================= AUTO SCROLL ================= */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  /* ================= PUSH NOTIFICATION ================= */
  const sendPush = async (message: string, messageId: string) => {
    if (!friend?.fcmToken || lastSentRef.current === messageId ||!user ||!id) return;
    lastSentRef.current = messageId;

    try {
      const idToken = await auth.currentUser?.getIdToken();
      await fetch("/api/send-noti", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          token: friend.fcmToken,
          message,
          chatId: id,
          senderName: user.displayName || "User",
          messageId,
        }),
      });
    } catch (e) {
      console.error("Push error", e);
    }

    setTimeout(() => (lastSentRef.current = ""), 2000);
  };

  /* ================= ADD REACTION ================= */
  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!user ||!id ||!messageId) return;

      try {
        await updateDoc(
          doc(db, "chats", id, "messages", messageId),
          {
            [`reactions.${user.uid}`]: emoji,
          }
        );
      } catch (_e) {
        toast.error("Lỗi thêm reaction");
      }
    },
    [user, id]
  );

  /* ================= SEND MESSAGE ================= */
  const sendMessage = useCallback(async () => {
    if (!user ||!text.trim() ||!id) return;

    const messageText = text.trim();
    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chatId: id,
      senderId: user.uid,
      text: messageText,
      type: "text",
      createdAt: Timestamp.now(),
      seenBy: [user.uid],
     ...(replyTo && {
        replyTo: {
          id: replyTo.id,
          text: replyTo.text || "",
          userName: replyTo.senderId === user.uid? user.displayName || "Bạn" : friend?.name || "User",
        },
      }),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setText("");
    setReplyTo(null);

    try {
      const docRef = await addDoc(collection(db, "chats", id, "messages"), {
        chatId: id,
        senderId: user.uid,
        text: messageText,
        type: "text",
        createdAt: serverTimestamp(),
        seenBy: [user.uid],
       ...(replyTo && {
          replyTo: {
            id: replyTo.id,
            text: replyTo.text || "",
            userName: replyTo.senderId === user.uid? user.displayName || "Bạn" : friend?.name || "User"
          },
        }),
      });

      await setDoc(
        doc(db, "chats", id),
        {
          members: [user.uid, friend?.id].filter(Boolean),
          lastMessage: messageText,
          updatedAt: serverTimestamp(),
          [`typing.${user.uid}`]: false,
        },
        { merge: true }
      );

      setMessages((prev) => prev.map((m) => (m.id === tempId? {...optimisticMsg, id: docRef.id } : m)));
      await sendPush(messageText, docRef.id);
    } catch (e) {
      console.error("Send error", e);
      toast.error("Gửi tin nhắn thất bại");
      setMessages((prev) => prev.filter((m) => m.id!== tempId));
      setText(messageText);
    }
  }, [user, text, id, replyTo, friend?.id, friend?.name]);

  /* ================= SEND IMAGE ================= */
  const sendImage = async (file: File) => {
    if (!user ||!id) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const storageRef = ref(storage, `chat-images/${id}/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, compressed);

      uploadTask.on(
        "state_changed",
        (snap) => {
          const prog = (snap.bytesTransferred / snap.totalBytes) * 100;
          setUploadProgress(Math.round(prog));
        },
        (err) => {
          console.error(err);
          toast.error("Upload ảnh thất bại");
          setUploading(false);
          setUploadProgress(0);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            const docRef = await addDoc(collection(db, "chats", id, "messages"), {
              chatId: id,
              senderId: user.uid,
              image: url,
              type: "image",
              createdAt: serverTimestamp(),
              seenBy: [user.uid],
            });

            await setDoc(
              doc(db, "chats", id),
              {
                members: [user.uid, friend?.id].filter(Boolean),
                lastMessage: "📷 Ảnh",
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            await sendPush("Đã gửi 1 ảnh 📷", docRef.id);
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
      setUploadProgress(0);
    }
  };

  /* ================= SEND FILE ================= */
  const sendFile = async (file: File) => {
    if (!user ||!id) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File không được vượt quá 10MB");
      return;
    }

    setUploading(true);
    try {
      const storageRef = ref(storage, `chat-files/${id}/${Date.now()}_${file.name}`);
      await uploadBytesResumable(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const docRef = await addDoc(collection(db, "chats", id, "messages"), {
        chatId: id,
        senderId: user.uid,
        file: url,
        fileName: file.name,
        type: "file",
        createdAt: serverTimestamp(),
        seenBy: [user.uid],
      });

      await setDoc(
        doc(db, "chats", id),
        {
          members: [user.uid, friend?.id].filter(Boolean),
          lastMessage: `📎 ${file.name}`,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await sendPush(`Đã gửi file: ${file.name}`, docRef.id);
      toast.success("Đã gửi file");
    } catch (err) {
      console.error(err);
      toast.error("Lỗi gửi file");
    } finally {
      setUploading(false);
    }
  };

  /* ================= SEND LOCATION ================= */
  const sendLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Trình duyệt không hỗ trợ định vị");
      return;
    }
    if (!user ||!id) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const docRef = await addDoc(collection(db, "chats", id, "messages"), {
          chatId: id,
          senderId: user.uid,
          type: "location",
          location: { lat: latitude, lng: longitude },
          createdAt: serverTimestamp(),
          seenBy: [user.uid],
        });

        await setDoc(
          doc(db, "chats", id),
          {
            members: [user.uid, friend?.id].filter(Boolean),
            lastMessage: "📍 Vị trí",
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        await sendPush("Đã gửi vị trí 📍", docRef.id);
      },
      () => toast.error("Không lấy được vị trí")
    );
  };

  const groupedMessages = useMemo(() => {
    const groups: Record<string, Message[]> = {};
    messages.forEach((m) => {
      const date = m.createdAt?.toDate();
      if (!date) return;
      const key = date.toLocaleDateString("vi-VN");
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });
    return groups;
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" &&!e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const setObserver = useCallback((node: HTMLDivElement | null, isRead: boolean) => {
    if (!node || isRead ||!id) return;
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const notifId = entry.target.getAttribute("data-id");
            if (notifId && user) {
              updateDoc(doc(db, "chats", id, "messages", notifId), {
                seenBy: [...(messages.find(m => m.id === notifId)?.seenBy || []), user.uid],
              }).catch(() => {});
            }
          }
        });
      }, { threshold: 0.5 });
    }
    observerRef.current.observe(node);
  }, [id, user, messages]);

  if (!user ||!id) return null;

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-zinc-950">
      <Toaster richColors position="top-center" />

      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft size={24} className="text-gray-900 dark:text-gray-100" />
          </button>
          <img
            src={friend?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend?.name || "U")}`}
            className="w-10 h-10 rounded-full ring-2 ring-gray-100 dark:ring-zinc-800"
            alt=""
          />
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{friend?.name || "User"}</p>
            <p className="text-xs text-green-500">
              {isTyping? "Đang nhập..." : friend?.online? "Đang hoạt động" : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-blue-500 dark:text-blue-400">
          <Phone size={20} />
          <Video size={20} />
          <Info size={20} />
        </div>
      </div>

      {/* MESSAGES */}
      <div ref={containerRef} className="flex-1 px-3 py-4 overflow-y-auto scroll-smooth">
        {loading? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2? "justify-end" : "justify-start"}`}>
                <div className="h-12 w-48 bg-gray-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              <div className="text-center my-4">
                <span className="text-xs bg-white dark:bg-zinc-900 px-3 py-1 rounded-full text-gray-500 dark:text-zinc-400 shadow-sm">
                  {date}
                </span>
              </div>
              {msgs.map((m, idx) => {
                const next = msgs[idx + 1];
                const isLastOfGroup =!next || next.senderId!== m.senderId;
                return (
                  <div key={m.id} data-id={m.id} ref={(node) => setObserver(node, m.seenBy.includes(user?.uid || ""))}>
                    <ChatBubble
                      msg={m}
                      currentUser={user}
                      friend={friend}
                      isLastOfGroup={isLastOfGroup}
                      onReply={setReplyTo}
                      onReaction={addReaction}
                    />
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* REPLY BAR */}
      {replyTo && (
        <div className="bg-blue-50 dark:bg-blue-950/30 px-4 py-2 border-t border-blue-200 dark:border-blue-900 flex items-center justify-between">
          <div className="text-xs">
            <p className="font-semibold text-blue-600 dark:text-blue-400">
              Đang trả lời {replyTo.senderId === user?.uid? "chính mình" : friend?.name}
            </p>
            <p className="text-gray-600 dark:text-zinc-400 truncate">{replyTo.text || "Tin nhắn"}</p>
          </div>
          <button onClick={() => setReplyTo(null)}>
            <X size={20} className="text-gray-500" />
          </button>
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
      <div className="border-t border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-2 px-3 py-2">
          <EmojiPicker onSelect={(emoji) => setText((prev) => prev + emoji)} align="left" />

          <input
            type="file"
            hidden
            id="img"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && sendImage(e.target.files[0])}
          />
          <label htmlFor="img">
            <ImageIcon className="text-blue-500 w-6 h-6 cursor-pointer" />
          </label>

          <button onClick={sendLocation}>
            <MapPin className="text-blue-500 w-6 h-6" />
          </button>

          <input
            type="file"
            hidden
            id="file"
            onChange={(e) => e.target.files?.[0] && sendFile(e.target.files[0])}
          />
          <label htmlFor="file">
            <Paperclip className="text-blue-500 w-6 h-6 cursor-pointer" />
          </label>

          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              handleTyping();
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              if (id && user) updateDoc(doc(db, "chats", id), { [`typing.${user.uid}`]: false });
            }}
            maxLength={5000}
            className="flex-1 bg-gray-100 dark:bg-zinc-800 rounded-full px-4 py-2 outline-none text-sm focus:ring-2 focus:ring-blue-400 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
            placeholder="Aa"
          />

          <button
            onClick={sendMessage}
            disabled={!text.trim()}
            className="bg-blue-500 p-2.5 rounded-full hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="text-white w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}