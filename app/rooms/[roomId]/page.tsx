"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB, getFirebaseRTDB } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, arrayUnion, serverTimestamp, collection, query, orderBy, limit, writeBatch, where, getDocs, updateDoc } from "firebase/firestore";
import { ref, onValue, set, onDisconnect } from "firebase/database";
import { FiArrowLeft, FiUsers, FiSend, FiLoader, FiMoreVertical, FiSearch, FiUserPlus, FiClipboard, FiX, FiPlus, FiCheck, FiCopy } from "react-icons/fi";
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
  type?: 'text' | 'poll';
  pollData?: PollData;
};

type PollData = {
  question: string;
  options: { text: string; votes: string[] }[];
  creatorId: string;
  createdAt: any;
};

type UserData = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
};

export default function ChatRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const db = getFirebaseDB();
  const rtdb = getFirebaseRTDB();
  const router = useRouter();
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  
  // Menu + Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);

  const isPublicRoom = typeof roomId === 'string' && roomId.startsWith('public_');
  const [searchFriend, setSearchFriend] = useState("");
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 150;
    setIsAtBottom(atBottom);
  }, []);

  useEffect(() => {
    if (isAtBottom && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: messages.length > 1? "smooth" : "auto"
        });
      });
    }
  }, [messages, isAtBottom]);

  // Presence - Online count real-time
  useEffect(() => {
    if (!user?.uid ||!roomId) return;

    const myConnectionsRef = ref(rtdb, `rooms/${roomId}/online/${user.uid}`);
    const connectedRef = ref(rtdb, '.info/connected');

    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        set(myConnectionsRef, true);
        onDisconnect(myConnectionsRef).remove();
      }
    });

    const onlineRef = ref(rtdb, `rooms/${roomId}/online`);
    const unsubOnline = onValue(onlineRef, (snap) => {
      const count = snap.exists()? Object.keys(snap.val()).length : 0;
      setRoomData(prev => prev? {...prev, onlineCount: count} : null);
    });

    return () => {
      unsubConnected();
      unsubOnline();
      set(myConnectionsRef, null);
    };
  }, [user?.uid, roomId, rtdb]);

  useEffect(() => {
    if (!roomId ||!user?.uid) return;

    let unsubRoom: () => void = () => {};
    let unsubMessages: () => void = () => {};

    const roomRef = doc(db, isPublicRoom? "public_rooms" : "chats", roomId as string);
    unsubRoom = onSnapshot(roomRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setRoomData(prev => ({
          id: snap.id,
          name: data.name || data.groupName || "Phòng chat",
          emoji: data.emoji || "💬",
          color: data.color || "from-blue-500 to-cyan-500",
          members: data.members || [],
          memberCount: data.members?.length || 0,
          onlineCount: prev?.onlineCount || 0,
        }));
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
        const q = query(messagesRef, orderBy("createdAt", "asc"), limit(200));
        unsubMessages = onSnapshot(q, (snap) => {
          const msgs: Message[] = [];
          snap.forEach((doc) => {
            const data = doc.data();
            const senderName = data.senderName || "User";
            const senderAvatar = data.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`;
            msgs.push({
              id: doc.id,
              text: data.text || "",
              senderId: data.senderId || "",
              senderName,
              senderAvatar,
              createdAt: data.createdAt,
              type: data.type || 'text',
              pollData: data.pollData || null,
            } as Message);
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
    setIsAtBottom(true);

    try {
      const userName = user.displayName || user.email?.split('@')[0] || "User";
      const userAvatar = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;

      const batch = writeBatch(db);
      const chatRef = doc(db, "chats", roomId as string);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        batch.set(chatRef, {
          isGroup: true,
          isPublicRoom: isPublicRoom,
          groupName: roomData?.name || "Phòng chat",
          groupAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(roomData?.emoji || "💬")}&background=random&color=fff&bold=true&size=128`,
          members: [user.uid],
          memberCount: 1,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          lastMessage: text,
          lastSenderId: user.uid,
          lastSenderName: userName,
        });
      } else {
        const currentMembers = chatSnap.data().members || [];
        const isNewMember =!currentMembers.includes(user.uid);
        batch.update(chatRef, {
          members: arrayUnion(user.uid),
          memberCount: isNewMember? currentMembers.length + 1 : currentMembers.length,
          lastMessage: text,
          lastSenderId: user.uid,
          lastSenderName: userName,
          updatedAt: serverTimestamp(),
        });
      }

      const msgRef = doc(collection(db, "chats", roomId as string, "messages"));
      batch.set(msgRef, {
        text,
        senderId: user.uid,
        senderName: userName,
        senderAvatar: userAvatar,
        createdAt: serverTimestamp(),
        type: 'text',
      });

      await batch.commit();
      if ("vibrate" in navigator) navigator.vibrate(10);
    } catch (e: any) {
      console.error(e);
      toast.error("Lỗi gửi tin: " + e.message);
      setMessage(text);
    } finally {
      setSending(false);
    }
  };

  // Tìm tin nhắn
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const results = messages.filter(msg => 
      msg.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setSearchResults(results);
  };

  const scrollToMessage = (msgId: string) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-yellow-200', 'dark:bg-yellow-900');
      setTimeout(() => el.classList.remove('bg-yellow-200', 'dark:bg-yellow-900'), 2000);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  // Mời bạn bè
  const loadAllUsers = async () => {
  if (!user?.uid) return;
  setInviteLoading(true);
  try {
    // 1. Lấy danh sách friend IDs từ user hiện tại
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const friendIds = userDoc.data()?.friends || [];
    
    if (friendIds.length === 0) {
      setAllUsers([]);
      setInviteLoading(false);
      return;
    }

    // 2. Load thông tin từng friend chưa có trong room
    const users: UserData[] = [];
    const chunks = [];
    for (let i = 0; i < friendIds.length; i += 10) {
      chunks.push(friendIds.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      const q = query(collection(db, "users"), where("__name__", "in", chunk));
      const snap = await getDocs(q);
      snap.forEach(doc => {
        const data = doc.data();
        if (!roomData?.members.includes(doc.id)) {
          users.push({
            uid: doc.id,
            displayName: data.displayName || data.email?.split('@')[0] || "User",
            email: data.email || "",
            photoURL: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || "User")}&background=random`,
          });
        }
      });
    }
    setAllUsers(users);
  } catch (e) {
    console.error(e);
    toast.error("Lỗi tải danh sách bạn bè");
  } finally {
    setInviteLoading(false);
  }
};

  const inviteUser = async (uid: string) => {
    try {
      const chatRef = doc(db, "chats", roomId as string);
      await writeBatch(db).update(chatRef, {
        members: arrayUnion(uid),
        memberCount: (roomData?.memberCount || 0) + 1,
      }).commit();
      toast.success("Đã mời thành công");
      setAllUsers(prev => prev.filter(u => u.uid!== uid));
    } catch (e) {
      toast.error("Lỗi mời bạn");
    }
  };

 

  // Tạo bình chọn
  const createPoll = async () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) {
      toast.error("Cần câu hỏi và ít nhất 2 lựa chọn");
      return;
    }
    setSending(true);
    try {
      const userName = user?.displayName || user?.email?.split('@')[0] || "User";
      const userAvatar = user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`;

      const msgRef = doc(collection(db, "chats", roomId as string, "messages"));
      await writeBatch(db).set(msgRef, {
        text: `📊 ${pollQuestion}`,
        senderId: user?.uid,
        senderName: userName,
        senderAvatar: userAvatar,
        createdAt: serverTimestamp(),
        type: 'poll',
        pollData: {
          question: pollQuestion,
          options: pollOptions.filter(o => o.trim()).map(o => ({ text: o, votes: [] })),
          creatorId: user?.uid,
          createdAt: serverTimestamp(),
        }
      }).commit();

      setShowPoll(false);
      setPollQuestion("");
      setPollOptions(["", ""]);
      toast.success("Đã tạo bình chọn");
    } catch (e) {
      toast.error("Lỗi tạo bình chọn");
    } finally {
      setSending(false);
    }
  };

  const votePoll = async (msgId: string, optionIdx: number) => {
  if (!user?.uid) return toast.error("Chưa đăng nhập");
  try {
    const msgRef = doc(db, "chats", roomId as string, "messages", msgId);
    const msgSnap = await getDoc(msgRef);
    if (!msgSnap.exists()) return toast.error("Bình chọn không tồn tại");
    
    const data = msgSnap.data();
    const pollData = data.pollData;
    if (!pollData) return;

    // Toggle vote: bấm lại thì bỏ vote, bấm option khác thì đổi vote
    const newOptions = pollData.options.map((opt: any, idx: number) => {
      const votes = opt.votes || [];
      const hasVoted = votes.includes(user.uid);
      
      if (idx === optionIdx) {
        // Bấm vào option này: toggle
        return {
          ...opt,
          votes: hasVoted 
            ? votes.filter((v: string) => v !== user.uid) 
            : [...votes, user.uid]
        };
      } else {
        // Option khác: bỏ vote nếu có
        return {
          ...opt,
          votes: votes.filter((v: string) => v !== user.uid)
        };
      }
    });

    // Dùng updateDoc thay vì writeBatch
    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(msgRef, {
      'pollData.options': newOptions
    });
    
  } catch (e: any) {
    console.error("Vote error:", e);
    toast.error("Lỗi vote: " + e.message);
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
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-black">
        <FiLoader className="animate-spin text-[#0a84ff]" size={32} />
      </div>
    );
  }

  if (!roomData) return null;

  return (
    <div className="fixed inset-0 bg-white dark:bg-black flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white/95 dark:bg-black/95 backdrop-blur-xl border-b border-black/5 dark:border-white/5 pt-[env(safe-area-inset-top)]">
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
          
          {/* Nút... Menu */}
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            className="w-9 h-9 flex items-center justify-center -mr-2 active:opacity-60 relative"
          >
            <FiMoreVertical size={20} />
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute top-12 right-0 z-50 w-56 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden">
                  <button 
                    onClick={() => { setShowSearch(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-zinc-100 dark:active:bg-zinc-800"
                  >
                    <FiSearch size={18} /> <span className="text-[15px]">Tìm tin nhắn</span>
                  </button>
                  <button 
                    onClick={() => { setShowInvite(true); setShowMenu(false); loadAllUsers(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-zinc-100 dark:active:bg-zinc-800"
                  >
                    <FiUserPlus size={18} /> <span className="text-[15px]">Mời bạn bè</span>
                  </button>
                  <button 
                    onClick={() => { setShowPoll(true); setShowMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-zinc-100 dark:active:bg-zinc-800"
                  >
                    <FiClipboard size={18} /> <span className="text-[15px]">Tạo bình chọn</span>
                  </button>
                </div>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-3"
      >
        {messages.length === 0? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="text-6xl mb-4">{roomData.emoji}</div>
            <h3 className="text-[17px] font-semibold mb-1">Chào mừng đến {roomData.name}!</h3>
            <p className="text-[15px] text-[#8e8e93]">Hãy là người đầu tiên gửi tin nhắn</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderId === user?.uid;
            const prevMsg = messages[idx - 1];
            const nextMsg = messages[idx + 1];
            const isFirstInGroup =!prevMsg || prevMsg.senderId!== msg.senderId;
            const isLastInGroup =!nextMsg || nextMsg.senderId!== msg.senderId;

            // Render Poll
            if (msg.type === 'poll' && msg.pollData) {
              const totalVotes = msg.pollData.options.reduce((sum, opt) => sum + opt.votes.length, 0);
              return (
                <div key={msg.id} id={`msg-${msg.id}`} className={`flex gap-2 ${isMe? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 flex-shrink-0 self-end">
                    {isFirstInGroup? (
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="w-8 h-8 rounded-full object-cover bg-zinc-200 dark:bg-zinc-700"
                        referrerPolicy="no-referrer"
                      />
                    ) : <div className="w-8" />}
                  </div>
                  <div className={`max-w-[75%] flex flex-col ${isMe? 'items-end' : 'items-start'}`}>
                    <div className="px-4 py-3 rounded-[18px] bg-zinc-100 dark:bg-zinc-800 w-full">
                      <p className="text-[15px] font-semibold mb-3">📊 {msg.pollData.question}</p>
                      <div className="space-y-2">
                        {msg.pollData.options.map((opt, optIdx) => {
                          const voted = opt.votes.includes(user?.uid || '');
                          const percent = totalVotes > 0? (opt.votes.length / totalVotes * 100).toFixed(0) : 0;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => votePoll(msg.id, optIdx)}
                              className="w-full text-left relative overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700 active:opacity-70"
                            >
                              <div 
                                className="absolute inset-0 bg-[#0a84ff]/20 transition-all"
                                style={{ width: `${percent}%` }}
                              />
                              <div className="relative px-3 py-2.5 flex items-center justify-between">
                                <span className="text-[15px] flex items-center gap-2">
                                  {voted && <FiCheck className="text-[#0a84ff]" size={16} />}
                                  {opt.text}
                                </span>
                                <span className="text-[13px] text-[#8e8e93]">{opt.votes.length}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-[#8e8e93] mt-2">{totalVotes} lượt bình chọn</p>
                    </div>
                    {isLastInGroup && (
                      <p className="text-[11px] text-[#8e8e93] mt-1 px-3">
                        {formatMessageTime(msg.createdAt)}
                      </p>
                    )}
                  </div>
                </div>
              );
            }

            // Render Text message
            return (
              <div key={msg.id} id={`msg-${msg.id}`} className={`flex gap-2 ${isMe? 'flex-row-reverse' : ''}`}>
                <div className="w-8 flex-shrink-0 self-end">
                  {isFirstInGroup? (
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName}
                      className="w-8 h-8 rounded-full object-cover bg-zinc-200 dark:bg-zinc-700"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName)}&background=random`;
                      }}
                    />
                  ) : <div className="w-8" />}
                </div>

                <div className={`max-w-[75%] flex flex-col ${isMe? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 rounded-[18px] ${
                    isMe
               ? 'bg-[#0a84ff] text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white'
                  } ${isLastInGroup? (isMe? 'rounded-tr-[4px]' : 'rounded-tl-[4px]') : ''}`}>
                    <p className="text-[15px] leading-[20px] whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                  {isLastInGroup && (
                    <p className="text-[11px] text-[#8e8e93] mt-1 px-3">
                      {formatMessageTime(msg.createdAt)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
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

      {/* Modal Tìm tin nhắn */}
      {showSearch && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-black flex flex-col pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-black/5 dark:border-white/5">
            <button onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); }} className="w-9 h-9 flex items-center justify-center -ml-2">
              <FiX size={22} />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Tìm tin nhắn..."
              autoFocus
              className="flex-1 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-[20px] text-[15px] outline-none"
            />
            <button onClick={handleSearch} className="text-[#0a84ff] font-semibold">Tìm</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2">
            {searchResults.length === 0 && searchQuery? (
              <p className="text-center text-[#8e8e93] mt-10">Không tìm thấy kết quả</p>
            ) : searchResults.map(msg => (
              <button
                key={msg.id}
                onClick={() => scrollToMessage(msg.id)}
                className="w-full text-left p-3 active:bg-zinc-100 dark:active:bg-zinc-800 rounded-lg mb-1"
              >
                <p className="text-[13px] text-[#8e8e93] mb-1">{msg.senderName} • {formatMessageTime(msg.createdAt)}</p>
                <p className="text-[15px] line-clamp-2">{msg.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}

     {/* Modal Mời bạn bè */}
{showInvite && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
    <div className="bg-white dark:bg-zinc-900 w-full rounded-t-3xl max-h-[80vh] flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 border-b border-black/5 dark:border-white/5">
        <h3 className="text-[17px] font-semibold">Mời bạn bè</h3>
        <button onClick={() => { setShowInvite(false); setSearchFriend(""); }}>
          <FiX size={24} />
        </button>
      </div>
      
      {/* Ô Search bạn bè */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <FiSearch size={18} className="text-[#8e8e93]" />
          <input
            type="text"
            value={searchFriend}
            onChange={(e) => setSearchFriend(e.target.value)}
            placeholder="Tìm bạn bè..."
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#8e8e93]"
          />
          {searchFriend && (
            <button onClick={() => setSearchFriend("")}>
              <FiX size={18} className="text-[#8e8e93]" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {inviteLoading? (
          <div className="flex justify-center py-10">
            <FiLoader className="animate-spin" size={24} />
          </div>
        ) : (() => {
          const filtered = allUsers.filter(u => 
            u.displayName.toLowerCase().includes(searchFriend.toLowerCase()) ||
            u.email.toLowerCase().includes(searchFriend.toLowerCase())
          );
          
          return filtered.length === 0? (
            <p className="text-center text-[#8e8e93] py-10">
              {searchFriend? "Không tìm thấy bạn bè" : "Không có ai để mời"}
            </p>
          ) : (
            filtered.map(user => (
              <div key={user.uid} className="flex items-center gap-3 py-2.5">
                <img src={user.photoURL} className="w-12 h-12 rounded-full" alt="" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium truncate">{user.displayName}</p>
                  <p className="text-[13px] text-[#8e8e93] truncate">{user.email}</p>
                </div>
                <button 
                  onClick={() => inviteUser(user.uid)}
                  className="px-5 py-1.5 bg-[#0a84ff] text-white rounded-full text-[15px] font-medium active:opacity-70"
                >
                  Mời
                </button>
              </div>
            ))
          );
        })()}
      </div>
    </div>
  </div>
)}

      {/* Modal Tạo bình chọn */}
      {showPoll && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="bg-white dark:bg-zinc-900 w-full rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-4 border-b border-black/5 dark:border-white/5">
              <button onClick={() => setShowPoll(false)} className="text-[#0a84ff]">Huỷ</button>
              <h3 className="text-[17px] font-semibold">Tạo bình chọn</h3>
              <button 
                onClick={createPoll} 
                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                className="text-[#0a84ff] font-semibold disabled:opacity-40"
              >
                Tạo
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Đặt câu hỏi..."
                className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[15px] outline-none mb-4"
              />
              <p className="text-[13px] text-[#8e8e93] mb-2">Lựa chọn</p>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...pollOptions];
                      newOpts[idx] = e.target.value;
                      setPollOptions(newOpts);
                    }}
                    placeholder={`Lựa chọn ${idx + 1}`}
                    className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-[15px] outline-none"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions(pollOptions.filter((_, i) => i!== idx))}>
                      <FiX size={20} className="text-red-500" />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={() => setPollOptions([...pollOptions, ""])}
                className="flex items-center gap-2 text-[#0a84ff] mt-2"
              >
                <FiPlus size={20} /> <span className="text-[15px]">Thêm lựa chọn</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}