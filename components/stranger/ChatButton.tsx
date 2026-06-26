"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FiUsers, FiMessageCircle, FiClock } from "react-icons/fi";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ChatButtonProps {
  chatId: string | null;
  className?: string;
  variant?: "default" | "compact" | "icon";
  showDetails?: boolean;
}

interface ChatPreview {
  partnerName: string;
  partnerAvatar: string;
  lastMessage: string;
  lastMessageTime: number;
  unreadCount: number;
  isPartnerOnline: boolean;
  status: "active" | "ended" | "waiting";
}

export default function ChatButton({
  chatId,
  className,
  variant = "default",
  showDetails = false
}: ChatButtonProps) {
  const router = useRouter();
  const db = getFirebaseDB();
  const [chatData, setChatData] = useState<ChatPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!chatId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, "stranger_chats", chatId), (snap) => {
      const data = snap.data();
      if (!data) {
        setChatData(null);
        setLoading(false);
        return;
      }

      setChatData({
        partnerName: data.partnerName || "Người lạ",
        partnerAvatar: data.partnerAvatar || "",
        lastMessage: data.lastMessage || "",
        lastMessageTime: data.lastMessageTime?.toMillis() || 0,
        unreadCount: data.unreadCount || 0,
        isPartnerOnline: data.isPartnerOnline || false,
        status: data.status || "active",
      });
      setLoading(false);
    });

    return () => unsub();
  }, [chatId, db]);

  if (!chatId || loading) return null;
  if (!chatData) return null;

  const handleClick = () => {
    router.push(`/stranger/${chatId}`);
  };

  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes}p`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  // Variant: Icon only
  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "relative w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-blue-600/20",
          className
        )}
        title={chatData.partnerName}
      >
        <FiMessageCircle size={20} />
        {chatData.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-[800] rounded-full flex items-center justify-center">
            {chatData.unreadCount > 9? "9+" : chatData.unreadCount}
          </span>
        )}
        {chatData.isPartnerOnline && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900" />
        )}
      </button>
    );
  }

  // Variant: Compact
  if (variant === "compact") {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "h-11 px-3 rounded-2xl bg-blue-600 text-white flex items-center gap-2 active:scale-90 transition-all shadow-lg shadow-blue-600/20",
          className
        )}
      >
        <div className="relative">
          <FiUsers size={18} />
          {chatData.unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-[800] rounded-full flex items-center justify-center">
              {chatData.unreadCount > 9? "9+" : chatData.unreadCount}
            </span>
          )}
        </div>
        <span className="text-xs font-[700]">Chat</span>
      </button>
    );
  }

  // Variant: Default - Full info
  return (
    <motion.button
      onClick={handleClick}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative h-11 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-3 transition-colors shadow-lg shadow-blue-600/20 group",
        chatData.status === "ended" && "bg-zinc-500 hover:bg-zinc-600 shadow-zinc-500/20",
        className
      )}
    >
      {/* Avatar + Online status */}
      <div className="relative flex-shrink-0">
        <img
          src={chatData.partnerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chatData.partnerName)}&background=random`}
          alt={chatData.partnerName}
          className="w-7 h-7 rounded-xl object-cover"
        />
        <AnimatePresence>
          {chatData.isPartnerOnline && chatData.status === "active" && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-blue-600 group-hover:border-blue-700"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-[700] truncate max-w-[100px]">
            {chatData.status === "ended"? "Đã kết thúc" : chatData.partnerName}
          </span>
          {chatData.status === "waiting" && (
            <FiClock size={12} className="text-amber-300 flex-shrink-0" />
          )}
        </div>
        {showDetails && chatData.lastMessage && (
          <p className="text-[10px] text-blue-100 truncate max-w-[120px]">
            {chatData.lastMessage}
          </p>
        )}
      </div>

      {/* Unread badge / Time */}
      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
        {chatData.unreadCount > 0? (
          <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-[800] rounded-full flex items-center justify-center">
            {chatData.unreadCount > 99? "99+" : chatData.unreadCount}
          </span>
        ) : chatData.lastMessageTime > 0? (
          <span className="text-[10px] text-blue-100">
            {formatTime(chatData.lastMessageTime)}
          </span>
        ) : null}
      </div>
    </motion.button>
  );
}