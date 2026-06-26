"use client";
import { useAuth } from "@/lib/AuthContext";
import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { FiArrowLeft, FiSend } from "react-icons/fi";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: any;
}

interface ChatData {
  members: string[];
  status: "active" | "ended" | "waiting";
  messages?: Message[];
  partnerName?: string;
  partnerAvatar?: string;
  partnerNames?: Record<string, string>;
  partnerAvatars?: Record<string, string>;
  onlineStatus?: Record<string, boolean>;
  unreadCounts?: Record<string, number>;
}

export default function ChatRoomPage() {
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const { chatId } = useParams<{ chatId: string }>();
  const [chatData, setChatData] = useState<ChatData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const partnerId = chatData?.members?.find(m => m!== user?.uid) || "";
  const partnerName = chatData?.partnerNames?.[partnerId] || chatData?.partnerName || "Người lạ";
  const partnerAvatar = chatData?.partnerAvatars?.[partnerId] || chatData?.partnerAvatar || "";
  const isPartnerOnline = chatData?.onlineStatus?.[partnerId] || false;

  useEffect(() => {
    if (!chatId ||!user?.uid) {
      setLoading(false);
      setError("Thiếu thông tin");
      return;
    }

    const unsub = onSnapshot(doc(db, "stranger_chats", chatId), 
      (snap) => {
        if (!snap.exists()) {
          setError("Không tìm thấy cuộc trò chuyện");
          setLoading(false);
          setTimeout(() => router.push("/stranger/chats"), 2000);
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

        updateDoc(snap.ref, {
          [`unreadCounts.${user.uid}`]: 0,
          [`onlineStatus.${user.uid}`]: true,
        }).catch(() => {});
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
  }, [chatId, user?.uid, db, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() ||!user?.uid ||!chatId || chatData?.status === "ended") return;

    const msg = {
      id: crypto.randomUUID(),
      text: input.trim(),
      senderId: user.uid,
      timestamp: new Date(),
    };

    setInput("");

    try {
      await updateDoc(doc(db, "stranger_chats", chatId), {
        messages: arrayUnion(msg),
        lastMessage: input.trim(),
        lastMessageTime: serverTimestamp(),
        [`unreadCounts.${partnerId}`]: ((chatData?.unreadCounts || {})[partnerId] || 0) + 1,
      });
    } catch (err: any) {
      toast.error("Gửi tin nhắn thất bại");
      console.error(err);
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

  if (loading) {
    return (
      <div className="h-screen bg-white dark:bg-black p-4 space-y-3">
        <div className="h-14 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="h-12 w-2/3 bg-zinc-100 dark:bg-zinc-900 rounded-2xl animate-pulse" />
        <div className="h-12 w-1/2 ml-auto bg-blue-100 dark:bg-blue-900/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (error ||!chatData) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white dark:bg-black">
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

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-black">
      <div className="h-16 px-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white/80 dark:bg-black/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/stranger/chats")}
            className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center active:scale-90"
          >
            <FiArrowLeft size={20} />
          </button>
          <div className="relative">
            <img
              src={partnerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(partnerName)}&background=random`}
              alt={partnerName}
              className="w-10 h-10 rounded-xl object-cover"
            />
            {isPartnerOnline && chatData.status === "active" && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-black" />
            )}
          </div>
          <div>
            <p className="font-[700] text-sm">{partnerName}</p>
            <p className="text-xs text-zinc-500">
              {chatData.status === "ended"? "Đã kết thúc" : isPartnerOnline? "Đang hoạt động" : "Offline"}
            </p>
          </div>
        </div>

        {chatData.status === "active" && (
          <button
            onClick={handleEndChat}
            className="px-4 h-9 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-[700] active:scale-95"
          >
            Kết thúc
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-zinc-400 mt-8">
            Bắt đầu cuộc trò chuyện 👋
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={cn("flex", isMe? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[75%] px-4 py-2 rounded-2xl text-sm",
                  isMe
                ? "bg-blue-600 text-white rounded-br-md"
                    : "bg-zinc-100 dark:bg-zinc-900 rounded-bl-md"
                )}
              >
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {chatData.status === "active"? (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Nhắn tin..."
              className="flex-1 h-11 px-4 bg-zinc-100 dark:bg-zinc-900 rounded-xl outline-none text-sm"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-11 h-11 bg-blue-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 text-white rounded-xl flex items-center justify-center active:scale-90"
            >
              <FiSend size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-sm text-zinc-500 border-t border-zinc-200 dark:border-zinc-800">
          Cuộc trò chuyện đã kết thúc
        </div>
      )}
    </div>
  );
}