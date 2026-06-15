"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFirebaseDB } from "@/lib/firebase";
import {
  doc, onSnapshot, collection, query, orderBy, limit, addDoc,
  serverTimestamp, updateDoc, deleteDoc
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { FiImage, FiChevronLeft, FiSend, FiMoreVertical, FiTrash2 } from "react-icons/fi";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

type Group = {
  name: string;
  members: string[];
  admins: string[];
  createdBy: string;
  avatar: string;
  groupCode: string;
  lastMessage: string;
  updatedAt: any;
  membersInfo?: { [uid: string]: { name: string; avatar: string } };
};

type Message = {
  id: string;
  text?: string;
  imageUrl?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  createdAt: any;
  replyTo?: { id: string; text: string; senderName: string };
};

export default function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const storage = getStorage();

  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [longPressMsg, setLongPressMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (!groupId ||!user?.uid) return;

    const groupRef = doc(db, "groups", groupId);
    const unsubGroup = onSnapshot(groupRef, (snap) => {
      if (!snap.exists()) {
        toast.error("Nhóm không tồn tại");
        router.push("/inbox");
        return;
      }
      const data = snap.data() as Group;
      if (!data.members.includes(user.uid)) {
        toast.error("Bạn không phải thành viên nhóm này");
        router.push("/inbox");
        return;
      }
      setGroup(data);
      setLoading(false);
    }, (err) => {
      console.error("Group error:", err);
      setLoading(false);
    });

    const q = query(
      collection(db, "groups", groupId, "messages"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const unsubMsg = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id,...d.data() } as Message));
      setMessages(msgs.reverse());

      // Update seen
      if (user?.uid) {
        updateDoc(groupRef, {
          [`seen.${user.uid}`]: serverTimestamp()
        }).catch(() => {});
      }
    });

    return () => {
      unsubGroup();
      unsubMsg();
    };
  }, [groupId, user?.uid, db, router]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() ||!user?.uid || sending ||!group) return;

    setSending(true);
    const msgText = text.trim();
    setText("");
    setReplyTo(null);

    try {
      const msgRef = collection(db, "groups", groupId, "messages");
      await addDoc(msgRef, {
        text: msgText,
        senderId: user.uid,
        senderName: user.displayName || "User",
        senderAvatar: user.photoURL || "",
        createdAt: serverTimestamp(),
        replyTo: replyTo? {
          id: replyTo.id,
          text: replyTo.text || "[Ảnh]",
          senderName: replyTo.senderName
        } : null
      });

      await updateDoc(doc(db, "groups", groupId), {
        lastMessage: msgText,
        lastSenderId: user.uid,
        lastSenderName: user.displayName || "User",
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      toast.error("Lỗi gửi tin: " + err.message);
      setText(msgText);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSendImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file ||!user?.uid ||!group) return;
    if (file.size > 10 * 1024 * 1024) return toast.error("Ảnh tối đa 10MB");

    setUploading(true);
    try {
      const imgRef = ref(storage, `group_images/${groupId}/${Date.now()}_${file.name}`);
      await uploadBytes(imgRef, file);
      const url = await getDownloadURL(imgRef);

      await addDoc(collection(db, "groups", groupId, "messages"), {
        imageUrl: url,
        senderId: user.uid,
        senderName: user.displayName || "User",
        senderAvatar: user.photoURL || "",
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "groups", groupId), {
        lastMessage: `${user.displayName} đã gửi ảnh`,
        lastSenderId: user.uid,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      toast.error("Lỗi gửi ảnh: " + err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteMsg = async (msgId: string) => {
    if (!confirm("Xóa tin nhắn này?")) return;
    try {
      await deleteDoc(doc(db, "groups", groupId, "messages", msgId));
      toast.success("Đã xóa");
    } catch {
      toast.error("Không thể xóa");
    }
    setLongPressMsg(null);
  };

  const handleLongPressStart = (msgId: string) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressMsg(msgId);
      if ("vibrate" in navigator) navigator.vibrate(15);
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return "Hôm qua " + format(date, "HH:mm");
    return format(date, "dd/MM HH:mm", { locale: vi });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-white dark:bg-black">
        <div className="w-8 h-8 border-4 border-[#0a84ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) return <div className="p-4 text-center">Nhóm không tồn tại</div>;

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-black">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl sticky top-0 z-10">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center -ml-2 active:opacity-60">
          <FiChevronLeft size={24} className="text-[#0a84ff]" strokeWidth={2.5} />
        </button>
        <img
          src={group.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=0a84ff&color=fff&bold=true`}
          className="w-9 h-9 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-[600] truncate">{group.name}</h1>
          <p className="text-xs text-[#8e8e93]">{group.members.length} thành viên</p>
        </div>
        <button className="w-8 h-8 flex items-center justify-center active:opacity-60">
          <FiMoreVertical size={20} className="text-[#8e8e93]" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1" onClick={() => setLongPressMsg(null)}>
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-[#8e8e93] text-sm">
            Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!
          </div>
        )}
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === user?.uid;
          const prevMsg = messages[idx - 1];
          const showAvatar =!isMe && (!prevMsg || prevMsg.senderId!== msg.senderId);
          const showName =!isMe && showAvatar;

          return (
            <div
              key={msg.id}
              className={`flex ${isMe? 'justify-end' : 'justify-start'} ${showAvatar? 'mt-3' : 'mt-0.5'}`}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className={`flex items-end gap-2 max-w-[75%] ${isMe? 'flex-row-reverse' : ''}`}>
                {!isMe && (
                  <div className="w-7 h-7 flex-shrink-0">
                    {showAvatar && (
                      <img src={msg.senderAvatar || `https://ui-avatars.com/api/?name=${msg.senderName}`}
                           className="w-7 h-7 rounded-full object-cover" />
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-0.5">
                  {showName && (
                    <span className="text-xs text-[#8e8e93] px-3 font-medium">{msg.senderName}</span>
                  )}

                  {msg.replyTo && (
                    <div className="px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-xl border-l-2 border-[#0a84ff] mb-1">
                      <p className="text-xs font-medium text-[#0a84ff]">{msg.replyTo.senderName}</p>
                      <p className="text-xs text-[#8e8e93] truncate">{msg.replyTo.text}</p>
                    </div>
                  )}

                  <div
                    className={`relative px-3 py-2 rounded-[18px] ${
                      isMe
                      ? 'bg-[#0a84ff] text-white'
                        : 'bg-[#e9e9eb] dark:bg-zinc-800 text-black dark:text-white'
                    } ${longPressMsg === msg.id? 'ring-2 ring-[#0a84ff] ring-offset-2' : ''}`}
                    onPointerDown={() => isMe && handleLongPressStart(msg.id)}
                    onPointerUp={handleLongPressEnd}
                    onPointerLeave={handleLongPressEnd}
                  >
                    {msg.imageUrl? (
                      <img src={msg.imageUrl} className="rounded-xl max-w-[240px] max-h-[240px] object-cover" />
                    ) : (
                      <p className="text-[15px] leading-[20px] whitespace-pre-wrap break-words">{msg.text}</p>
                    )}

                    {longPressMsg === msg.id && isMe && (
                      <div className="absolute -top-10 right-0 flex gap-1 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-1">
                        <button
                          onClick={() => { setReplyTo(msg); setLongPressMsg(null); }}
                          className="px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded"
                        >
                          Trả lời
                        </button>
                        <button
                          onClick={() => handleDeleteMsg(msg.id)}
                          className="px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/10 rounded"
                        >
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] text-[#8e8e93] px-3 ${isMe? 'text-right' : ''}`}>
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {replyTo && (
        <div className="px-4 pt-2 flex items-center justify-between bg-[#f2f2f7] dark:bg-zinc-900">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#0a84ff]">Đang trả lời {replyTo.senderName}</p>
            <p className="text-xs text-[#8e8e93] truncate">{replyTo.text || "[Ảnh]"}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="w-6 h-6 flex items-center justify-center">
            <FiTrash2 size={14} className="text-[#8e8e93]" />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="p-2 border-t border-black/10 dark:border-white/10 bg-white dark:bg-black">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-8 h-8 flex items-center justify-center text-[#0a84ff] active:opacity-60 disabled:opacity-40"
          >
            <FiImage size={22} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleSendImage}
          />
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhắn tin..."
            className="flex-1 h-9 px-4 bg-[#f2f2f7] dark:bg-zinc-800 rounded-full text-[15px] outline-none placeholder:text-[#8e8e93]"
            disabled={sending || uploading}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="w-8 h-8 flex items-center justify-center text-[#0a84ff] active:opacity-60 disabled:opacity-40 disabled:text-[#8e8e93]"
          >
            <FiSend size={20} />
          </button>
        </div>
      </form>
    </div>
  );
}