"use client";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState, useRef, useLayoutEffect } from "react";
import { doc, onSnapshot, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { FiSend, FiCheckCircle, FiSmile, FiUserPlus, FiAlertCircle, FiClock, FiX, FiRefreshCw, FiArrowLeft, FiFlag } from "react-icons/fi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import EmojiPicker, { EmojiClickData, Theme, EmojiStyle } from "emoji-picker-react";
// XÓA DÒNG NÀY: import { sendFriendRequest, acceptRequest, type FriendRequest } from "@/lib/friendService";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { fetchPartnerProfile, partnerOnline } from "@/lib/strangerPartners";

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
  onlineStatus?: Record<string, boolean>;
  unreadCounts?: Record<string, number>;
  lastMessage?: string;
  lastMessageTime?: any;
  expiresAt?: any;
  friendRequests?: Record<string, boolean>;
  filters?: {
    interests: string[];
    ageRange: string;
    wantGender: string;
    province: string;
    locationLat?: number;
    locationLng?: number;
  };
  partnerNames?: Record<string, string>;
  partnerAvatars?: Record<string, string>;
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

  const [isExpired, setIsExpired] = useState(false);
  const [isEndedLocal, setIsEndedLocal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [matchedChatId, setMatchedChatId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [partnerProfile, setPartnerProfile] = useState({ name: "Người lạ", avatar: "" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasSetOnline = useRef(false);

const [isFriend, setIsFriend] = useState(false);
  const partnerId = chatData?.members?.find(m => m!== user?.uid) || "";
  const hasSentRequest = chatData?.friendRequests?.[user?.uid || ""] || false;
  const partnerSentRequest = chatData?.friendRequests?.[partnerId] || false;
useEffect(() => {
  if (!user?.uid ||!partnerId) return;
  getDoc(doc(db, "friends", `${user.uid}_${partnerId}`)).then(snap => {
    setIsFriend(snap.exists());
  });
}, [user?.uid, partnerId]);

useEffect(() => {
  if (!partnerId) return;
  const cachedName = chatData?.partnerNames?.[partnerId];
  const cachedAvatar = chatData?.partnerAvatars?.[partnerId];
  if (cachedName) {
    setPartnerProfile({ name: cachedName, avatar: cachedAvatar || "" });
    return;
  }
  fetchPartnerProfile(partnerId).then((p) => {
    setPartnerProfile({ name: p.name, avatar: p.avatar });
  });
}, [partnerId, chatData?.partnerNames, chatData?.partnerAvatars]);


  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current &&!emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };
    if (showEmoji) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmoji]);

  useLayoutEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages]);

  useEffect(() => {
    if (!chatData?.expiresAt) return;
    const expires = chatData.expiresAt.toMillis();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expires - now) / 1000));
      setTimeLeft(diff);

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
          setTimeout(() => router.push("/stranger"), 2000);
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

  const handleSend = async () => {
    if (!input.trim() ||!user?.uid ||!chatId || chatData?.status === "ended" || isExpired || isEndedLocal) return;
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
        lastSenderId: user.uid,
        [`unreadCounts.${partnerId}`]: ((chatData?.unreadCounts || {})[partnerId] || 0) + 1,
      });
    } catch (err: any) {
      toast.error("Gửi tin nhắn thất bại");
      console.error(err);
      setInput(text);
    }
  };

  const handleSendWave = async () => {
    if (!user?.uid ||!chatId || chatData?.status === "ended" || isExpired || isEndedLocal) return;
    const msg: Message = {
      id: crypto.randomUUID(),
      text: "👋",
      senderId: user.uid,
      timestamp: new Date(),
    };
    try {
      await updateDoc(doc(db, "stranger_chats", chatId), {
        messages: arrayUnion(msg),
        lastMessage: "👋",
        lastMessageTime: serverTimestamp(),
        lastSenderId: user.uid,
        [`unreadCounts.${partnerId}`]: ((chatData?.unreadCounts || {})[partnerId] || 0) + 1,
      });
    } catch (err: any) {
      toast.error("Gửi tin nhắn thất bại");
      console.error(err);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInput(prev => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  // FIX: Đổi sang httpsCallable
  const handleSendFriendRequest = async () => {
    if (!chatId ||!user?.uid || hasSentRequest ||!partnerId) {
      console.warn('[handleSendFriendRequest] Thiếu data:', { chatId, uid: user?.uid, hasSentRequest, partnerId });
      return;
    }

    if (isSending) {
      console.log('[handleSendFriendRequest] Đang gửi, bỏ qua click');
      return;
    }

    setIsSending(true);
    console.log('[handleSendFriendRequest] Bắt đầu:', { from: user.uid, to: partnerId, chatId });

    try {
      console.log('[handleSendFriendRequest] Gọi Cloud Function...');
      const functions = getFunctions(getApp(), "asia-southeast1");
      const sendRequest = httpsCallable(functions, 'sendFriendRequest');
      await sendRequest({ toUid: partnerId });
      console.log('[handleSendFriendRequest] sendFriendRequest OK');

      await updateDoc(doc(db, "stranger_chats", chatId), {
        [`friendRequests.${user.uid}`]: true,
        [`friendRequestsTime.${user.uid}`]: serverTimestamp(),
      });
      console.log('[handleSendFriendRequest] Update stranger_chats OK');

      toast.success("Đã gửi lời mời kết bạn");

      if (partnerSentRequest) {
        console.log('[handleSendFriendRequest] Partner đã gửi trước, auto accept');
        const functions = getFunctions(getApp(), "asia-southeast1");
        const acceptRequest = httpsCallable(functions, 'acceptFriendRequest');
        const requestId = [user.uid, partnerId].sort().join("_");
        await acceptRequest({ fromUid: partnerId, notifId: requestId });
        toast.success("Đã kết bạn thành công! 🎉");
      }
    } catch (err: any) {
      console.error('[handleSendFriendRequest] LỖI:', err.code, err.message, err);

      if (err.code === 'permission-denied') {
        toast.error("Không có quyền gửi lời mời");
      } else if (err.message?.includes('hết lượt') || err.message?.includes('resource-exhausted')) {
        toast.error("Bạn đã gửi 20 lời mời hôm nay");
      } else if (err.message?.includes('already-exists')) {
        toast.error("Đã gửi lời mời trước đó");
      } else {
        toast.error(err.message || "Lỗi gửi lời mời");
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleEndChat = async () => {
    if (!chatId) return;

    if (chatData?.status === "ended") {
      router.push("/stranger");
      return;
    }

    setIsEndedLocal(true);
    try {
      await updateDoc(doc(db, "stranger_chats", chatId), {
        status: "ended",
        endedAt: serverTimestamp(),
      });
      toast.success("Đã kết thúc");
      router.push("/stranger");
    } catch {
      toast.error("Lỗi kết thúc chat");
      setIsEndedLocal(false);
    }
  };

  const handleContinueSearch = async () => {
    if (!chatId ||!user?.uid || isSearching) return;
    setIsSearching(true);
    try {
      await updateDoc(doc(db, "stranger_chats", chatId), {
        status: "ended",
        endedAt: serverTimestamp(),
      });

      const oldFilters = chatData?.filters;
      if (!oldFilters ||!oldFilters.interests?.length) {
        toast.error("Không tìm thấy bộ lọc cũ, về trang chủ chọn lại");
        router.push("/stranger");
        return;
      }

      const functions = getFunctions(getApp(), "asia-southeast1");
      const findFn = httpsCallable(functions, 'findStranger');

      const result = await findFn({
        interests: oldFilters.interests,
        ageRange: oldFilters.ageRange,
        wantGender: oldFilters.wantGender,
        province: oldFilters.province,
        ...(oldFilters.locationLat != null && oldFilters.locationLng != null
          ? { locationLat: oldFilters.locationLat, locationLng: oldFilters.locationLng }
          : {}),
      });

      const data = result.data as { chatId: string, matched: boolean };

      if (data.matched) {
        setMatchedChatId(data.chatId);
        toast.success("Đã tìm thấy bạn phù hợp!");
        router.push("/stranger");
      } else {
        toast.info("Đang tìm người phù hợp...");
        router.push("/stranger");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Lỗi tìm kiếm");
      router.push("/stranger");
    } finally {
      setIsSearching(false);
    }
  };

  const handleReport = async (reason: string) => {
    if (!chatId || !user?.uid) return;
    try {
      const functions = getFunctions(getApp(), "asia-southeast1");
      const reportFn = httpsCallable(functions, "reportStranger");
      await reportFn({ chatId, reason });
      toast.success("Đã gửi báo cáo");
      setShowReport(false);
      router.push("/stranger");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Báo cáo thất bại");
    }
  };

  const formatMsgTime = (ts: unknown) => {
    try {
      const date =
        ts && typeof ts === "object" && "toDate" in (ts as object)
          ? (ts as { toDate: () => Date }).toDate()
          : ts instanceof Date
            ? ts
            : new Date(ts as string | number);
      return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isExpired) {
    return (
      <div className="h-[100svh] flex flex-col items-center justify-center bg-white dark:bg-black gap-6 px-4">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
          <FiAlertCircle size={40} className="text-zinc-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-[800] text-zinc-900 dark:text-white">Cuộc trò chuyện đã bị xoá</h2>
          <p className="text-sm text-zinc-500">Phòng chat này đã hết hạn sau 5 phút</p>
        </div>
        <button
          onClick={() => router.push("/stranger")}
          className="px-8 h-12 bg-blue-600 text-white rounded-2xl font-[700] active:scale-95 transition-all"
        >
          Quay về
        </button>
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="h-[100svh] bg-white dark:bg-black p-4 space-y-3">
        <div className="h-12 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="h-12 w-2/3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="h-12 w-1/2 ml-auto bg-blue-100 dark:bg-blue-900/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error ||!chatData) {
    return (
      <div className="h-[100svh] flex flex-col items-center justify-center gap-4 bg-white dark:bg-black">
        <p className="text-zinc-500">{error || "Không tìm thấy chat"}</p>
        <button
          onClick={() => router.push("/stranger")}
          className="px-6 h-11 bg-blue-600 text-white rounded-xl font-[700] active:scale-95"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const isUrgent = timeLeft <= 120;
  const chatEnded = chatData.status === "ended" || isEndedLocal;

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-zinc-50 to-white dark:from-black dark:to-zinc-950">
      <div
        className="shrink-0 border-b border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-black"
        style={{ paddingTop: "max(8px, env(safe-area-inset-top))" }}
      >
        <div className="mb-2 flex items-center gap-2">
          <button
            onClick={() => router.push("/stranger/chats")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 active:scale-95 dark:bg-zinc-900"
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <img
              src={
                partnerProfile.avatar ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerProfile.name)}&background=random`
              }
              alt=""
              className="h-9 w-9 rounded-xl object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-[800]">{partnerProfile.name}</p>
              <p className="text-[11px] text-zinc-500">
                {partnerId && partnerOnline(chatData as unknown as Record<string, unknown>, partnerId)
                  ? "Đang online"
                  : "Ngoại tuyến"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowReport(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 active:scale-95 dark:bg-red-950/40"
            title="Báo cáo"
          >
            <FiFlag size={16} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
        <button
          onClick={handleEndChat}
          disabled={chatEnded}
          className="flex-1 px-3 h-9 bg-zinc-600 disabled:bg-zinc-300 disabled:dark:bg-zinc-700 text-white rounded-xl text-sm font-[800] active:scale-95 flex items-center justify-center gap-1.5"
        >
          <FiX size={16} />
          Kết thúc
        </button>

        <button
          className={cn(
            "flex-1 px-3 h-9 rounded-xl font-[800] text-sm transition-all flex items-center justify-center gap-1.5",
            isUrgent? "bg-slate-600 text-white animate-pulse" : "bg-zinc-500 text-white"
          )}
        >
          <FiClock size={16} />
          {formatTime(timeLeft)}
        </button>

        <button
          onClick={handleContinueSearch}
          disabled={isSearching || chatEnded}
          className="flex-1 px-3 h-9 bg-neutral-500 disabled:bg-zinc-300 disabled:dark:bg-zinc-700 text-white rounded-xl text-sm font-[800] active:scale-95 flex items-center justify-center gap-1.5"
        >
          <FiRefreshCw size={16} className={isSearching? "animate-spin" : ""} />
          {isSearching? "Đang tìm..." : "Tiếp tục"}
        </button>
        </div>
      </div>

   <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
  {/* GHIM LUÔN - KHÔNG ĐỢI 3 PHÚT */}
  {chatData?.status === "active" &&!isEndedLocal &&!isFriend && (
    <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-2 border-orange-500 rounded-2xl p-4 mb-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <FiUserPlus className="text-white" size={20} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-[700] text-orange-600 dark:text-orange-400 mb-2">
            Kết bạn để không mất liên lạc
          </p>
          <p className="text-xs text-[#8e8e93] dark:text-zinc-500 mb-3">
            Chat này tự động xóa sau 5 phút
          </p>
          <button
            onClick={handleSendFriendRequest}
            disabled={hasSentRequest || isSending}
            className="w-full h-10 bg-gradient-to-r from-orange-500 to-pink-500 disabled:from-zinc-300 disabled:to-zinc-300 dark:disabled:from-zinc-700 dark:disabled:to-zinc-700 text-white rounded-xl text-sm font-[700] active:scale-95 flex items-center justify-center gap-2 disabled:active:scale-100 disabled:cursor-not-allowed shadow-md shadow-orange-500/30"
          >
            {isSending? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Đang gửi...
              </>
            ) : (
              <>
                <FiUserPlus size={16} />
                {hasSentRequest? "Đã gửi lời mời" : "Gửi lời mời kết bạn"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )}
        {chatEnded &&!isEndedLocal &&!isExpired && (
          <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-2 border-rose-500 rounded-2xl p-4 mb-3">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="text-rose-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-[700] text-rose-600 dark:text-rose-400 mb-3 text-center">
                  Đối phương đã rời phòng
                </p>
                <button
                  onClick={handleContinueSearch}
                  disabled={isSearching}
                  className="w-full h-10 bg-gradient-to-r from-emerald-500 to-green-500 disabled:from-zinc-300 disabled:to-zinc-300 dark:disabled:from-zinc-700 dark:disabled:to-zinc-700 text-white rounded-xl text-sm font-[700] active:scale-95 flex items-center justify-center gap-2"
                >
                  <FiRefreshCw size={16} className={isSearching? "animate-spin" : ""} />
                  {isSearching? "Đang tìm..." : "Tiếp tục tìm người mới"}
                </button>
              </div>
            </div>
          </div>
        )}
        {matchedChatId &&!chatEnded && (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-2xl p-6 mb-3 text-center">
            <div className="w-16 h-16 mx-auto mb-3 bg-green-600 rounded-full flex items-center justify-center">
              <FiCheckCircle className="text-white" size={32} />
            </div>
            <h3 className="text-lg font-[800] mb-2">Đã tìm thấy bạn!</h3>
            <p className="text-sm text-zinc-500 mb-4">Bấm để bắt đầu trò chuyện ngay</p>
            <button
              onClick={() => {
                router.push(`/stranger/${matchedChatId}`);
                setMatchedChatId(null);
              }}
              className="w-full h-12 bg-green-600 text-white rounded-xl font-[700] active:scale-95"
            >
              Trò chuyện ngay
            </button>
          </div>
        )}

        {messages.length === 0 &&!chatEnded &&!matchedChatId && (
          <button
            onClick={handleSendWave}
            className="flex flex-col items-center justify-center h-full gap-2 active:scale-95 transition-all w-full"
          >
            <div className="text-6xl animate-waving">👋</div>
            <p className="text-sm text-zinc-400 font-[600]">Bắt đầu cuộc trò chuyện</p>
          </button>
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
          const timeLabel = formatMsgTime(msg.timestamp);
          return (
            <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[75%] px-4 py-2.5 rounded-3xl text-sm break-words",
                  isMe
                    ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-lg"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-bl-lg"
                )}
              >
                {msg.text}
              </div>
              {timeLabel && (
                <span className="mt-1 px-1 text-[10px] text-zinc-400">{timeLabel}</span>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {chatData.status === "active" &&!isEndedLocal && (
        <div className="shrink-0 px-4 py-2 text-center border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95">
          <p className="text-xs text-zinc-400 font-[600]">
            Cuộc trò chuyện sẽ tự động xoá sau 5 phút
          </p>
        </div>
      )}

      {chatData.status === "active" &&!isEndedLocal? (
        <div className="shrink-0 p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-black/95 backdrop-blur-xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
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
              className="w-11 h-11 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center active:scale-90 shrink-0 border-2 border-blue-500"
            >
              <FiSmile size={22} />
            </button>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" &&!e.shiftKey && handleSend()}
              placeholder="Nhắn tin..."
              className="flex-1 min-h-11 max-h-[120px] px-4 py-3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl outline-none text-sm border-2 border-blue-500 focus:border-blue-500 focus:ring-0 focus:outline-none"
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
      ) : null}

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 dark:bg-zinc-900">
            <h3 className="mb-2 text-lg font-[800]">Báo cáo người dùng</h3>
            <p className="mb-4 text-sm text-zinc-500">Chọn lý do báo cáo. Bạn sẽ bị trừ 20 điểm Huha nếu báo cáo sai.</p>
            <div className="space-y-2">
              {["Spam / quảng cáo", "Nội dung không phù hợp", "Quấy rối", "Lừa đảo", "Khác"].map((reason) => (
                <button
                  key={reason}
                  onClick={() => handleReport(reason)}
                  className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-left text-sm font-semibold active:scale-[0.99] dark:bg-zinc-800"
                >
                  {reason}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReport(false)}
              className="mt-3 w-full rounded-xl py-3 text-sm font-bold text-zinc-500"
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}