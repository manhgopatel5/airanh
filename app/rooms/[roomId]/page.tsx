"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, collection, addDoc, query, orderBy, limit, setDoc } from "firebase/firestore";
import { FiArrowLeft, FiUsers, FiSend, FiLoader } from "react-icons/fi";
import { toast } from "sonner";
import { format, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";

type RoomData = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  members: string[];
  memberCount: number;
  onlineCount: number;
};

type Message = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  createdAt: any;
};

export default function ChatRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const isPublicRoom = typeof roomId === 'string' && roomId.startsWith('public_');

  // Check nếu user scroll lên thì không auto scroll nữa
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
  }, []);

  // Auto scroll chỉ khi đang ở cuối
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (!roomId ||!user?.uid) return;

    let unsubRoom: () => void = () => {};
    let unsubMessages: () => void = () => {};

    const roomRef = doc(db, isPublicRoom? "public_rooms" : "chats", roomId as string);
    unsubRoom = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoomData({
          id: snap.id,
          name: data.name || data.groupName || "Phòng chat",
          emoji: data.emoji || "💬",
          color: data.color || "from-blue-500 to-cyan-500",
          members: data.members || [],
          memberCount: data.memberCount || 0,
          onlineCount: data.onlineCount || 0,
        });
        setLoading(false);
      } else {
        toast.error("Phòng không tồn tại");
        router.push("/chat");
      }
    });

    const chatRef = doc(db, "chats", roomId as string);
    const unsubChatCheck = onSnapshot(chatRef, (chatSnap) => {
      if (chatSnap.exists()) {
        const messagesRef = collection(db, "chats", roomId as string, "messages");
        const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));
        unsubMessages = onSnapshot(q, (snap) => {
          const msgs: Message[] = [];
          snap.forEach((doc) => {
            msgs.push({ id: doc.id,...doc.data() } as Message);
          });
          setMessages(msgs);
        });
      } else {
        setMessages([]);
      }
    });

    return () => {
      unsubRoom();
      unsubChatCheck();
      unsubMessages();
    };
  }, [roomId, user?.uid, db, isPublicRoom, router]);

  const handleSendMessage = async () => {
    if (!message.trim() ||!user?.uid ||!roomId || sending) return;
    const text = message.trim();
    setMessage("");
    setSending(true);
    setIsAtBottom(true); // Force scroll khi gửi

    try {
      const chatRef = doc(db, "chats", roomId as string);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          isGroup: true,
          isPublicRoom: isPublicRoom,
          groupName: roomData?.name || "Phòng chat",
          groupAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(roomData?.emoji || "💬")}&background=random&color=fff&bold=true&size=128`,
          members: [user.uid],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: text,
          lastSenderId: user.uid,
          lastSenderName: user.displayName || "User",
        });
      } else {
        await updateDoc(chatRef, {
          members: arrayUnion(user.uid),
          lastMessage: text,
          lastSenderId: user.uid,
          lastSenderName: user.displayName || "User",
          updatedAt: serverTimestamp(),
        });
      }

      await addDoc(collection(db, "chats", roomId as string, "messages"), {
        text,
        senderId: user.uid,
        senderName: user.displayName || "User",
        senderAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&background=random`,
        createdAt: serverTimestamp(),
      });

      if ("vibrate" in navigator) navigator.vibrate(10);
    } catch (e: any) {
      console.error(e);
      toast.error("Lỗi gửi tin: " + e.message);
      setMessage(text);
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const date = timestamp.toDate();
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Hôm qua ' + format(date, 'HH:mm');
    return format(date, 'dd/MM HH:mm', { locale: vi });
  };

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-white dark:bg-black">
        <FiLoader className="animate-spin text-[#0a84ff]" size={32} />
      </div>
    );
  }

  if (!roomData) return null;

  return (
    <div className="h-[100dvh] bg-white dark:bg-black flex flex-col overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-shrink-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center -ml-2 active:opacity-60">
            <FiArrowLeft size={22} />
          </button>
          <div className={`w-10 h-10 bg-gradient-to-br ${roomData.color} rounded-full flex items-center justify-center text-xl flex-shrink-0`}>
            {roomData.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-semibold truncate leading-5">{roomData.name}</h1>
            <p className="text-[13px] text-[#8e8e93] flex items-center gap-1 mt-0.5">
              <FiUsers size={12} />
              {roomData.memberCount || 0} thành viên
              {roomData.onlineCount > 0 && (
                <>
                  <span className="mx-1">•</span>
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {roomData.onlineCount} online
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages - Scrollable */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3"
      >
        {messages.length === 0? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="text-6xl mb-4">{roomData.emoji}</div>
            <h3 className="text-[17px] font-semibold mb-1">Chào mừng đến {roomData.name}!</h3>
            <p className="text-[15px] text-[#8e8e93]">Hãy là người đầu tiên gửi tin nhắn</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isMe = msg.senderId === user?.uid;
              const prevMsg = messages[idx - 1];
              const showAvatar =!isMe && (!prevMsg || prevMsg.senderId!== msg.senderId);
              const showName =!isMe && showAvatar;

              return (
                <div key={msg.id} className={`flex gap-2 ${isMe? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className="w-8 flex-shrink-0">
                    {showAvatar? (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-black"
                      />
                    ) :!isMe? <div className="w-8" /> : null}
                  </div>

                  {/* Message bubble */}
                  <div className={`max-w-[75%] flex flex-col ${isMe? 'items-end' : 'items-start'}`}>
                    {showName && (
                      <p className="text-[13px] text-[#8e8e93] mb-1 px-3 font-medium">
                        {msg.senderName}
                      </p>
                    )}
                    <div className={`px-4 py-2.5 rounded-[18px] ${
                      isMe
                       ? 'bg-[#0a84ff] text-white rounded-tr-[4px]'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white rounded-tl-[4px]'
                    }`}>
                      <p className="text-[15px] leading-[20px] whitespace-pre-wrap break-words">{msg.text}</p>
                    </div>
                    <p className="text-[11px] text-[#8e8e93] mt-1 px-3">
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input - Fixed bottom với safe area */}
      <div className="flex-shrink-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-black/5 dark:border-white/5 pb-[env(safe-area-inset-bottom)]">
        <div className="px-3 py-2">
          <div className="flex items-end gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' &&!e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Nhắn tin..."
              className="flex-1 min-h-[40px] max-h-32 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-[20px] text-[15px] outline-none resize-none placeholder:text-[#8e8e93]"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || sending}
              className="w-10 h-10 bg-[#0a84ff] disabled:opacity-40 text-white rounded-full flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
            >
              {sending? <FiLoader className="animate-spin" size={18} /> : <FiSend size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}