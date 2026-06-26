"use client";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiSend, FiSmile, FiUserPlus, FiAlertCircle, FiClock } from "react-icons/fi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from "emoji-picker-react";

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
  type?: "text" | "system";
}

interface ChatData {
  members: string[];
  status: "active" | "ended" | "waiting";
  messages?: Message[];
  partnerNames?: Record<string, string>;
  partnerAvatars?: Record<string, string>;
  onlineStatus?: Record<string, boolean>;
  unreadCounts?: Record<string, number>;
  lastMessage?: string;
  lastMessageTime?: any;
  expiresAt?: any;
  friendRequests?: Record<string, boolean>;
}

export default function ChatRoomPage() {
  const { user, loading: authLoading } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const { chatId } = useParams<{ chatId: string }>();
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showInviteNotice, setShowInviteNotice] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSetOnline = useRef(false);
  const hasSentNotice = useRef(false);

  const partnerId = chatData?.members?.find(m => m!== user?.uid) || "";
  const hasSentRequest = chatData?.friendRequests?.[user?.uid || ""] || false;
  const partnerSentRequest = chatData?.friendRequests?.[partnerId] || false;
  const isPartnerOnline = chatData?.onlineStatus?.[partnerId] || false;
  const partnerName = chatData?.partnerNames?.[partnerId] || "Người lạ";
  const partnerAvatar = chatData?.partnerAvatars?.[partnerId];

  // Click outside emoji để đóng
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current &&!emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmoji]);

  // Fix iOS viewport khi mở bàn phím
  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!chatData?.expiresAt) return;

    const expires = chatData.expiresAt.toMillis();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);

      if (diff === 120 &&!hasSentNotice.current) {
        hasSentNotice.current = true;
        setShowInviteNotice(true);
      }

      if (diff === 0) {
        setIsExpired(true);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [chatData?.expiresAt]);

  useEffect(() => {
    if (authLoading) return;

    if (!chatId ||!user?.uid) {
      setLoading(false);
      setError("Thiếu thông tin");
      return;
    }

    const chatRef = doc(db, "stranger_chats", chatId);
    const unsub = onSnapshot(
      chatRef,
      (snap) => {
        if (!snap.exists()) {
          setIsExpired(true);
          setLoading(false);
          return;
        }

        const data = snap.data() as ChatData;

        if (!data.members?.includes(user.uid)) {
          setError("Bạn không có quyền truy cập");
          setLoading(false);
          setTimeout(() => router.push("/stranger/chats"), 2000);
          return;
        }

        setChatData(data);
        setMessages(data.messages || []);
        setLoading(false);
        setError(null);

        if (!hasSetOnline.current) {
          hasSetOnline.current = true;
          updateDoc(chatRef, {
            [`unreadCounts.${user.uid}`]: 0,
            [`onlineStatus.${user.uid}`]: true,
          }).catch(() => {});
        }
      },
      (err) => {
        console.error("Snapshot error:", err);
        setError(`Lỗi: ${err.code}`);
        setLoading(false);
      }
    );

    return () => {
      if (user?.uid && chatId) {
        updateDoc(doc(db, "stranger_chats", chatId), {
          [`onlineStatus.${user.uid}`]: false,
        }).catch(() => {});
      }
      unsub();
    };
  }, [chatId, user?.uid, authLoading, db, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() ||!user?.uid ||!chatId || chatData?.status === "ended" || isExpired) return;

    const msg: Message = {
      id: crypto.randomUUID(),
      text: input.trim(),
      senderId: user.uid,
      timestamp: new Date(),
    };

    const text = input.trim();
    setInput("");
    setShowEmoji(false);
    inputRef.current?.focus();

    try {
      await updateDoc(doc(db, "stranger_chats", chatId), {
        messages: arrayUnion(msg),
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
        [`unreadCounts.${partnerId}`]: ((chatData?.unreadCounts || {})[partnerId] || 0) + 1,
      });
    } catch (err: any) {
      toast.error("Gửi tin nhắn thất bại");
      console.error(err);
      setInput(text);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInput(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleSendFriendRequest = async () => {
    if (!chatId ||!user?.uid || hasSentRequest) return;

    try {
      await updateDoc(doc(db, "stranger_chats", chatId), {
        [`friendRequests.${user.uid}`]: true,
      });
      toast.success("Đã gửi lời mời kết bạn");

      if (partnerSentRequest) {
        await Promise.all([
          setDoc(doc(db, "users", user.uid, "friends", partnerId), {
            createdAt: serverTimestamp(),
            status: "accepted",
          }),
          setDoc(doc(db, "users", partnerId, "friends", user.uid), {
            createdAt: serverTimestamp(),
            status: "accepted",
          })
        ]);
        toast.success("Đã kết bạn thành công! 🎉");
      }
    } catch {
      toast.error("Lỗi gửi lời mời");
    }
  };

  const handleEndChat = async () => {
    if (!chatId) return;
    try {
      await updateDoc(doc(db, "stranger_chats", chatId), {
        status: "ended",
        endedAt: serverTimestamp(),
      });
      toast.success("Đã kết thúc");
      router.push("/stranger/chats");
    } catch {
      toast.error("Lỗi kết thúc chat");
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Màn hình trắng khi hết giờ
  if (isExpired) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center bg-white dark:bg-black gap-6 px-4">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
          <FiAlertCircle size={40} className="text-zinc-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-[800] text-zinc-900 dark:text-white">
            Cuộc trò chuyện đã bị xoá
          </h2>
          <p className="text-sm text-zinc-500">
            Phòng chat này đã hết hạn sau 5 phút
          </p>
        </div>
        <button
          onClick={() => router.push("/stranger/chats")}
          className="px-8 h-12 bg-blue-600 text-white rounded-2xl font-[700] active:scale-95 transition-all"
        >
          Quay về
        </button>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="h-dvh bg-white dark:bg-black p-4 space-y-3">
        <div className="h-14 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="h-12 w-2/3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="h-12 w-1/2 ml-auto bg-blue-100 dark:bg-blue-900/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error ||!chatData) {
    return (
      <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-white dark:bg-black">
        <p className="text-zinc-500">{error || "Không tìm thấy chat"}</p>
        <button
          onClick={() => router.push("/stranger/chats")}
          className="px-6 h-11 bg-blue-600 text-white rounded-xl font-[700] active:scale-95"
        >
          Về danh sách chat
        </button>
      </div>
    );
  }

  const isUrgent = timeLeft <= 120;

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      {/* Header */}
      <div className="shrink-0 h-16 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-black/80 backdrop-blur-xl">
        <button
          onClick={() => router.push("/stranger/chats")}
          className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center active:scale-90"
        >
          <FiArrowLeft size={20} />
        </button>

        <div className="flex items-center gap-2">
          <img 
            src={partnerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}`}
            className="w-8 h-8 rounded-full object-cover"
            alt=""
          />
          <div className="flex flex-col">
            <span className="text-sm font-[700] leading-tight">{partnerName}</span>
            {isPartnerOnline && (
              <span className="text-[10px] text-green-600 font-[600]">Đang hoạt động</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={cn(
            "px-3 py-1.5 rounded-xl font-[800] transition-all flex items-center gap-1",
            isUrgent
           ? "bg-red-500 text-white text-sm animate-pulse"
              : "bg-zinc-100 dark:bg-zinc-900 text-xs"
          )}>
            <FiClock size={14} />
            {formatTime(timeLeft)}
          </div>

          {chatData.status === "active" && (
            <button
              onClick={handleEndChat}
              className="px-3 h-9 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-[700] active:scale-95"
            >
              Kết thúc
            </button>
          )}
        </div>
      </div>

      {/* Notice expire */}
      <div className="shrink-0 bg-gradient-to-r from-red-500 to-rose-500 text-white text-center py-2 text-xs font-[700]">
        Cuộc trò chuyện sẽ tự động xoá sau 5 phút
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 pb-28" style={{ WebkitOverflowScrolling: 'touch' }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <div className="text-6xl">👋</div>
            <p className="text-sm text-zinc-400 font-[600]">
              Bắt đầu cuộc trò chuyện
            </p>
          </div>
        )}

        {showInviteNotice && timeLeft <= 120 && timeLeft > 0 && (
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-2 border-red-500 rounded-2xl p-4 mx-2 animate-in">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-[700] text-red-600 dark:text-red-400 mb-2">
                  Sắp hết giờ! Gửi lời mời để giữ liên lạc
                </p>
                <button
                  onClick={handleSendFriendRequest}
                  disabled={hasSentRequest}
                  className="w-full h-10 bg-gradient-to-r from-red-600 to-rose-600 disabled:from-zinc-300 disabled:to-zinc-300 dark:disabled:from-zinc-700 dark:disabled:to-zinc-700 text-white rounded-xl text-sm font-[700] active:scale-95 flex items-center justify-center gap-2"
                >
                  <FiUserPlus size={16} />
                  {hasSentRequest? "Đã gửi lời mời" : "Gửi lời mời kết bạn"}
                </button>
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.type === "system") {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-full">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={cn("flex", isMe? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] px-4 py-2.5 rounded-3xl text-sm shadow-sm break-words",
                  isMe
                 ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-lg"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-bl-lg"
                )}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Fixed bottom */}
      {chatData.status === "active"? (
        <div className="shrink-0 fixed bottom-0 left-0 right-0 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          {showEmoji && (
            <div ref={emojiRef} className="absolute bottom-full left-0 right-0 px-3 mb-2">
              <EmojiPicker 
                onEmojiClick={handleEmojiClick}
                theme={Theme.AUTO}
                emojiStyle={EmojiStyle.NATIVE}
                width="100%"
                height={350}
                lazyLoadEmojis={true}
                previewConfig={{ showPreview: false }}
                searchPlaceHolder="Tìm emoji..."
                skinTonesDisabled
              />
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="w-11 h-11 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center active:scale-90 shrink-0"
            >
              <FiSmile size={22} />
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" &&!e.shiftKey && handleSend()}
              placeholder="Nhắn tin..."
              className="flex-1 min-h-[44px] max-h-[120px] px-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl outline-none text-sm resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-11 h-11 bg-gradient-to-br from-blue-500 to-blue-600 disabled:from-zinc-300 disabled:to-zinc-300 dark:disabled:from-zinc-800 dark:disabled:to-zinc-800 text-white rounded-2xl flex items-center justify-center active:scale-90 shrink-0"
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 fixed bottom-0 left-0 right-0 p-4 text-center text-sm text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          Cuộc trò chuyện đã kết thúc
        </div>
      )}
    </div>
  );
}