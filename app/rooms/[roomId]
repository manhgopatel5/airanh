"use client";


import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, collection, addDoc, query, orderBy, limit, setDoc } from "firebase/firestore";
import { FiArrowLeft, FiUsers, FiSend, FiLoader } from "react-icons/fi";
import { toast } from "sonner";
import { format } from "date-fns";
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
  const { roomId } = useParams(); // ← Đổi từ chatId thành roomId
  const { user } = useAuth();
  const db = getFirebaseDB();
  const router = useRouter();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isPublicRoom = typeof roomId === 'string' && roomId.startsWith('public_'); // ← Sửa hết chatId thành roomId

  useEffect(() => {
    if (!roomId ||!user?.uid) return; // ← Sửa chatId thành roomId

    const unsubs: (() => void)[] = [];

    // 1. Load room data
    const roomRef = doc(db, isPublicRoom? "public_rooms" : "chats", roomId as string); // ← Sửa
    unsubs.push(onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoomData({
          id: snap.id,
          name: data.name || data.groupName,
          emoji: data.emoji || "💬",
          color: data.color || "from-blue-500 to-cyan-500",
          members: data.members || [],
          memberCount: data.memberCount || 0,
          onlineCount: data.onlineCount || 0,
        });
        setLoading(false);
      } else {
        toast.error("Phòng không tồn tại");
        router.push("/chat"); // Về lại list chat
      }
    }));

    // 2. Load messages
    const messagesRef = collection(db, "chats", roomId as string, "messages"); // ← Sửa
    const q = query(messagesRef, orderBy("createdAt", "asc"), limit(100));
    unsubs.push(onSnapshot(q, (snap) => {
      const msgs: Message[] = [];
      snap.forEach((doc) => {
        msgs.push({ id: doc.id,...doc.data() } as Message);
      });
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }));

    return () => unsubs.forEach((u) => u());
  }, [roomId, user?.uid, db, isPublicRoom, router]); // ← Sửa chatId thành roomId

  const handleSendMessage = async () => {
    if (!message.trim() ||!user?.uid ||!roomId || sending) return; // ← Sửa
    const text = message.trim();
    setMessage("");
    setSending(true);

    try {
      const chatRef = doc(db, "chats", roomId as string); // ← Sửa
      const chatSnap = await getDoc(chatRef);

      // Tạo chats doc nếu chưa có - chỉ khi gửi tin nhắn đầu tiên
      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          isGroup: true,
          isPublicRoom: isPublicRoom,
          groupName: roomData?.name,
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

      // Thêm message vào subcollection
      await addDoc(collection(db, "chats", roomId as string, "messages"), { // ← Sửa
        text,
        senderId: user.uid,
        senderName: user.displayName || "User",
        senderAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}&background=random`,
        createdAt: serverTimestamp(),
      });

      if ("vibrate" in navigator) navigator.vibrate(10);
    } catch (e: any) {
      toast.error("Lỗi gửi tin: " + e.message);
      setMessage(text); // restore nếu lỗi
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <FiLoader className="animate-spin text-[#0a84ff]" size={32} />
      </div>
    );
  }

  if (!roomData) return null;

  return (
    <div className="min-h-dvh bg-white dark:bg-black flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center -ml-2 active:opacity-60">
            <FiArrowLeft size={22} />
          </button>
          <div className={`w-10 h-10 bg-gradient-to-br ${roomData.color} rounded-full flex items-center justify-center text-xl`}>
            {roomData.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text- font-semibold truncate">{roomData.name}</h1>
            <p className="text- text-[#8e8e93] flex items-center gap-1">
              <FiUsers size={12} />
              {roomData.memberCount} thành viên
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

      {/* Messages */}
      <div className="flex-1 overflow-auto px-4 py-4 space-y-3">
        {messages.length === 0? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="text-6xl mb-4">{roomData.emoji}</div>
            <h3 className="text- font-semibold mb-1">Chào mừng đến {roomData.name}!</h3>
            <p className="text- text-[#8e8e93]">Hãy là người đầu tiên gửi tin nhắn</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={`flex gap-2 ${isMe? 'flex-row-reverse' : ''}`}>
                {!isMe && (
                  <img src={msg.senderAvatar} alt={msg.senderName} className="w-8 h-8 rounded-full flex-shrink-0" />
                )}
                <div className={`max-w-[75%] ${isMe? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isMe && <p className="text- text-[#8e8e93] mb-1 px-3">{msg.senderName}</p>}
                  <div className={`px-4 py-2.5 rounded-2xl ${isMe? 'bg-[#0a84ff] text-white rounded-tr-sm' : 'bg-zinc-100 dark:bg-zinc-800 rounded-tl-sm'}`}>
                    <p className="text- leading-5">{msg.text}</p>
                  </div>
                  <p className="text- text-[#8e8e93] mt-1 px-3">
                    {msg.createdAt?.toDate && format(msg.createdAt.toDate(), 'HH:mm', { locale: vi })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5 p-3">
        <div className="flex items-end gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' &&!e.shiftKey && handleSendMessage()}
            placeholder="Nhắn tin..."
            className="flex-1 min-h-[44px] max-h-32 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text- outline-none resize-none"
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || sending}
            className="w-11 h-11 bg-[#0a84ff] disabled:opacity-40 text-white rounded-full flex items-center justify-center active:scale-95 transition-all flex-shrink-0"
          >
            {sending? <FiLoader className="animate-spin" size={20} /> : <FiSend size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}