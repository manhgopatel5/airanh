"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp, Timestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getApp } from "firebase/app";
import { FiSend, FiAlertTriangle, FiHeart, FiClock, FiX, FiUserPlus, FiMic } from "react-icons/fi";
import toast from "react-hot-toast";

interface StrangerChat {
  members: string[];
  topic: string[];
  voiceIntros: { [uid: string]: string };
  createdAt: Timestamp;
  expiresAt: Timestamp;
  messages: { uid: string; text: string; time: Timestamp }[];
  extended: boolean;
  reportedBy: string[];
}

export default function StrangerChatPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [chat, setChat] = useState<StrangerChat | null>(null);
  const [text, setText] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [otherUser, setOtherUser] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat
  useEffect(() => {
    if (!id ||!user?.uid) return;
    const unsub = onSnapshot(doc(db, "stranger_chats", id as string), async (snap) => {
      if (!snap.exists()) {
        toast.error("Phòng chat đã đóng");
        router.push("/");
        return;
      }
      const data = snap.data() as StrangerChat;

      // Check member
      if (!data.members.includes(user.uid)) {
        toast.error("Bạn không trong phòng này");
        router.push("/");
        return;
      }

      setChat(data);

      // Load other user
      const otherUid = data.members.find(m => m!== user.uid)!;
      const otherSnap = await getDoc(doc(db, "users", otherUid));
      setOtherUser({ uid: otherUid,...otherSnap.data() });

      // Timer
      const expires = data.expiresAt.toDate().getTime();
      const updateTimer = () => {
        const left = Math.max(0, Math.floor((expires - Date.now()) / 1000));
        setTimeLeft(left);
        if (left === 0 &&!showEndModal) setShowEndModal(true);
      };
      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    });
    return unsub;
  }, [id, user?.uid]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.messages]);

  const sendMessage = async () => {
    if (!text.trim() ||!chat ||!user?.uid) return;
    const chatRef = doc(db, "stranger_chats", id as string);
    await updateDoc(chatRef, {
      messages: arrayUnion({
        uid: user.uid,
        text: text.trim(),
        time: Timestamp.now()
      })
    });
    setText("");
  };

  const handleExtend = async () => {
    if (!chat || chat.extended) return;
    const chatRef = doc(db, "stranger_chats", id as string);
    await updateDoc(chatRef, {
      extended: true,
      expiresAt: Timestamp.fromDate(new Date(chat.expiresAt.toDate().getTime() + 5 * 60 * 1000))
    });
    toast.success("Đã gia hạn +5 phút");
  };

  const handleReport = async (reason: string) => {
    if (!user?.uid) return;
    const functions = getFunctions(getApp(), "asia-southeast1");
    const reportFn = httpsCallable(functions, 'reportStranger');
    await reportFn({ chatId: id, reason });
    toast.success("Đã báo cáo. Thoát phòng");
    router.push("/");
  };

  const handleAddFriend = async () => {
    if (!otherUser) return;
    const functions = getFunctions(getApp(), "asia-southeast1");
    const addFn = httpsCallable(functions, 'addStrangerFriend');
    await addFn({ chatId: id, otherUid: otherUser.uid });
    toast.success("Đã gửi lời mời kết bạn");
    setShowEndModal(false);
    router.push("/");
  };

  if (!chat ||!otherUser) {
    return <div className="h-screen flex items-center justify-center"><FiLoader className="animate-spin" size={32} /></div>;
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-pink-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-pink-200/50 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
           ?
          </div>
          <div>
            <p className="text- font-[600]">Người lạ</p>
            <p className="text- text-[#8e8e93]">{chat.topic.join(", ")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 px-3 h-8 rounded-full ${timeLeft < 60? 'bg-red-500/10 text-red-500' : 'bg-pink-500/10 text-pink-600'}`}>
            <FiClock size={14} />
            <span className="text- font-[700]">{minutes}:{seconds.toString().padStart(2,'0')}</span>
          </div>
          <button onClick={() => setShowReport(true)} className="w-9 h-9 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
            <FiAlertTriangle size={18} />
          </button>
        </div>
      </div>

      {/* Voice Intro */}
      <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
        <p className="text- text-amber-700 dark:text-amber-400 text-center">Nghe lời chào của nhau trước khi chat 👇</p>
        <div className="flex gap-2 mt-2">
          {Object.entries(chat.voiceIntros).map(([uid, url]) => (
            <audio key={uid} src={url} controls className="flex-1 h-8" />
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {chat.messages?.map((msg, i) => (
          <div key={i} className={`flex ${msg.uid === user?.uid? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
              msg.uid === user?.uid
            ? 'bg-gradient-to-br from-pink-500 to-purple-500 text-white'
               : 'bg-white dark:bg-zinc-800'
            }`}>
              <p className="text-">{msg.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-pink-200/50 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Nhập tin nhắn..."
            className="flex-1 h-11 px-4 bg-zinc-100 dark:bg-zinc-800 rounded-full text- outline-none"
          />
          <button onClick={sendMessage} className="w-11 h-11 bg-gradient-to-br from-pink-500 to-purple-500 text-white rounded-full flex items-center justify-center active:scale-95">
            <FiSend size={18} />
          </button>
        </div>
      </div>

      {/* Modal hết giờ */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="w-full max-w-[360px] bg-white dark:bg-zinc-900 rounded-3xl p-6 text-center space-y-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
              <FiClock className="text-white" size={40} />
            </div>
            <h3 className="text- font-bold">Hết giờ rồi!</h3>
            <p className="text- text-[#8e8e93]">Bạn có muốn kết bạn với người này không?</p>
            <div className="space-y-2">
              <button onClick={handleAddFriend} className="w-full h-12 bg-gradient-to-br from-pink-500 to-purple-500 text-white rounded-xl font-[600] flex items-center justify-center gap-2">
                <FiUserPlus size={18} /> Gửi lời mời kết bạn
              </button>
              {!chat.extended && (
                <button onClick={handleExtend} className="w-full h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl font-[600] flex items-center justify-center gap-2">
                  <FiHeart size={18} className="text-pink-500" /> Gia hạn +5 phút
                </button>
              )}
              <button onClick={() => router.push("/")} className="w-full h-12 text-[#8e8e93] font-[600]">Thoát</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Report */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xl">
          <div className="w-full sm:max-w-[360px] bg-white dark:bg-zinc-900 rounded-3xl p-5 space-y-3">
            <h3 className="text- font-bold text-red-500 flex items-center gap-2"><FiAlertTriangle /> Báo cáo người dùng</h3>
            {["Quấy rối", "Nội dung 18+", "Spam", "Khác"].map(reason => (
              <button key={reason} onClick={() => handleReport(reason)}
                className="w-full h-12 bg-red-500/10 text-red-500 rounded-xl font-[600] text-left px-4">
                {reason}
              </button>
            ))}
            <button onClick={() => setShowReport(false)} className="w-full h-12 text-[#8e8e93] font-[600]">Hủy</button>
          </div>
        </div>
      )}
    </div>
  );
}
