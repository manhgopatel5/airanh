"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { getFirebaseDB, getFirebaseRTDB } from "@/lib/firebase";
import { getCityMetaByRoomId, getCityBackgroundUrl } from "@/lib/publicRooms";
import RoomChatBackground from "@/components/rooms/chat/RoomChatBackground";
import RoomChatHeader from "@/components/rooms/chat/RoomChatHeader";
import RoomChatInput from "@/components/rooms/chat/RoomChatInput";
import RoomMembersSheet from "@/components/rooms/chat/RoomMembersSheet";
import { formatTimeDivider, shouldShowTimeDivider } from "@/components/rooms/chat/roomChatUtils";
import { doc, getDoc, onSnapshot, arrayUnion, serverTimestamp, collection, query, orderBy, limit, writeBatch, where, getDocs } from "firebase/firestore";
import { ref, onValue, set, onDisconnect } from "firebase/database";
import { FiUser, FiLoader, FiSearch, FiChevronUp, FiTrash2, FiChevronDown, FiUserPlus, FiX, FiPlus, FiCheck } from "react-icons/fi";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

type RoomData = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  imageUrl?: string;
  tag: string;
  tagColor: string;
  desc: string;
  accent: string;
  backgroundUrl: string;
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
  type?: 'text' | 'poll' | 'system';
  pollData?: PollData;
};

type PollData = {
  question: string;
  options: { text: string; votes: string[] }[];
  creatorId: string;
  createdAt: any;
  allowMultiple: boolean; // Thêm
  endTime?: any; // Thêm: deadline
  closed?: boolean; // Thêm: khóa
};

type UserData = {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
};

export default function ChatRoom() {
  const { roomId } = useParams();
  const { user, loading: authLoading } = useAuth();
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
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
const [inviting, setInviting] = useState(false);
  // Menu + Modal states
  const [showMenu, setShowMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [pollAllowMultiple, setPollAllowMultiple] = useState(false);
const [pollHasDeadline, setPollHasDeadline] = useState(false);
const [pollEndDate, setPollEndDate] = useState("");
const [pollEndTime, setPollEndTime] = useState("");
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
const [searching, setSearching] = useState(false);
const [currentResultIdx, setCurrentResultIdx] = useState(-1);
const [deleteMsgId, setDeleteMsgId] = useState<string | null>(null);
const longPressTimer = useRef<NodeJS.Timeout | null>(null);
// Highlight từ khóa
const highlightText = (text: string, query: string) => {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
     ? <mark key={i} className="bg-yellow-300 dark:bg-yellow-600 rounded px-0.5">{part}</mark> 
      : part
  );
};
const [activePopupMsgId, setActivePopupMsgId] = useState<string | null>(null);
const [showMembers, setShowMembers] = useState(false);
const [memberProfiles, setMemberProfiles] = useState<UserData[]>([]);
const [loadingMembers, setLoadingMembers] = useState(false);
useEffect(() => {
  const handleClickOutside = () => setActivePopupMsgId(null);
  if (activePopupMsgId) {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }
}, [activePopupMsgId]);
useEffect(() => {
    return () => {
      setActivePopupMsgId(null);
    };
  }, []);
const deleteMessage = async (msgId: string) => {
  if (!user?.uid) return;
  try {
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "chats", roomId as string, "messages", msgId));
    toast.success("Đã xoá tin nhắn");
    setDeleteMsgId(null);
  } catch (e: any) {
    toast.error("Lỗi xoá: " + e.message);
  }
};

  const [searchFriend, setSearchFriend] = useState("");
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 150;
    setIsAtBottom(atBottom);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid && roomId) {
      router.replace(`/login?redirect=${encodeURIComponent(`/rooms/${roomId}`)}`);
    }
  }, [authLoading, user?.uid, roomId, router]);

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
    if (!roomId || !user?.uid) return;

    let unsubMessages: () => void = () => {};
    const roomRef = doc(db, "chats", roomId as string);

    const unsubRoom = onSnapshot(roomRef, (snap) => {
      if (!snap.exists()) {
        toast.error("Phòng không tồn tại");
        router.push("/rooms");
        return;
      }

      const data = snap.data();
      const cityMeta = getCityMetaByRoomId(snap.id);
      setRoomData((prev) => ({
        id: snap.id,
        name: data.name || data.groupName || cityMeta?.name || "Phòng chat",
        emoji: data.emoji || cityMeta?.emoji || "💬",
        color: data.color || cityMeta?.color || "from-blue-500 to-cyan-500",
        imageUrl: data.imageUrl || data.groupAvatar || cityMeta?.imageUrl,
        tag: cityMeta?.tag ?? "",
        tagColor: cityMeta?.tagColor ?? "",
        desc: cityMeta?.desc ?? "",
        accent: cityMeta?.accent || "#0a84ff",
        backgroundUrl: cityMeta ? getCityBackgroundUrl(cityMeta) : "",
        members: data.members || [],
        memberCount: data.members?.length || 0,
        onlineCount: prev?.onlineCount || 0,
      }));
      setLoading(false);

      unsubMessages();
      const messagesRef = collection(db, "chats", roomId as string, "messages");
      const q = query(messagesRef, orderBy("createdAt", "asc"), limit(200));
      unsubMessages = onSnapshot(q, (msgSnap) => {
        const msgs: Message[] = [];
        msgSnap.forEach((messageDoc) => {
          const msgData = messageDoc.data();
          const senderName = msgData.senderName || "User";
          msgs.push({
            id: messageDoc.id,
            text: msgData.text || "",
            senderId: msgData.senderId || "",
            senderName,
            senderAvatar:
              msgData.senderAvatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=random`,
            createdAt: msgData.createdAt,
            type: msgData.type || "text",
            pollData: msgData.pollData || null,
          } as Message);
        });
        setMessages(msgs);
      });
    });

    return () => {
      unsubRoom();
      unsubMessages();
    };
  }, [roomId, user?.uid, db, router]);

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
        
        groupName: roomData?.name || "Phòng chat",
        emoji: roomData?.emoji || "💬",
        color: roomData?.color || "from-blue-500 to-cyan-500",
        groupAvatar: roomData?.imageUrl || roomData?.emoji || "💬",
        members: [user.uid],
        memberCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastMessage: text,
        lastSenderId: user.uid,
        lastSenderName: userName,
        blockedUsers: [],
      });
    } else {
      // Public room: auto add vào members, không check số lượng
      batch.update(chatRef, {
        members: arrayUnion(user.uid), // tự thêm nếu chưa có
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
  const handleSearch = useCallback(() => {
  if (!searchQuery.trim()) {
    setSearchResults([]);
    setCurrentResultIdx(-1);
    return;
  }
  setSearching(true);
  
  const query = searchQuery.toLowerCase().trim();
  const results = messages
   .filter(msg => {
      // Search text
      if (msg.text.toLowerCase().includes(query)) return true;
      // Search poll question
      if (msg.type === 'poll' && msg.pollData?.question.toLowerCase().includes(query)) return true;
      // Search poll options
      if (msg.type === 'poll' && msg.pollData?.options.some(opt => opt.text.toLowerCase().includes(query))) return true;
      return false;
    })
   .sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)); // Mới nhất lên đầu

  setSearchResults(results);
  setCurrentResultIdx(results.length > 0? 0 : -1);
  setSearching(false);
}, [searchQuery, messages]);

// Auto search khi gõ - debounce 300ms
useEffect(() => {
  const timer = setTimeout(() => {
    if (showSearch && searchQuery) handleSearch();
  }, 300);
  return () => clearTimeout(timer);
}, [searchQuery, showSearch, handleSearch]);
const scrollToMessage = (msgId: string, idx?: number) => {
  const el = document.getElementById(`msg-${msgId}`);
  if (el) {
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('outline', 'outline-2', 'outline-[#0a84ff]', 'rounded-');
      setTimeout(() => el.classList.remove('outline', 'outline-2', 'outline-[#0a84ff]', 'rounded-'), 2000);
    }, 100);
  }
  if (idx!== undefined) setCurrentResultIdx(idx);
};

  // Mời bạn bè
const loadAllUsers = async () => {
  if (!user?.uid) return;
  setInviting(true);
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const friendIds = userDoc.data()?.friends || [];
    
    if (friendIds.length === 0) {
      setAllUsers([]);
      setInviting(false);
      return;
    }

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
        users.push({
          uid: doc.id,
          displayName: data.displayName || data.email?.split('@')[0] || "User",
          email: data.email || "",
          photoURL: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || "User")}&background=random`,
        });
      });
    }
    
    users.sort((a, b) => {
      const aInRoom = roomData?.members.includes(a.uid);
      const bInRoom = roomData?.members.includes(b.uid);
      if (aInRoom &&!bInRoom) return 1;
      if (!aInRoom && bInRoom) return -1;
      return a.displayName.localeCompare(b.displayName);
    });
    
    setAllUsers(users);
  } catch (e) {
    console.error(e);
    toast.error("Lỗi tải danh sách bạn bè");
  } finally {
    setInviting(false);
  }
};
const inviteUsers = async () => {
  if (selectedInviteIds.length === 0) return;
  setInviting(true);
  try {
    const batch = writeBatch(db);
    const chatRef = doc(db, "chats", roomId as string);
    
    batch.update(chatRef, {
      members: arrayUnion(...selectedInviteIds),
      memberCount: (roomData?.memberCount || 0) + selectedInviteIds.length,
      updatedAt: serverTimestamp(),
    });
    
    // Gửi tin nhắn hệ thống
    const msgRef = doc(collection(db, "chats", roomId as string, "messages"));
    const invitedNames = allUsers
    .filter(u => selectedInviteIds.includes(u.uid))
    .map(u => u.displayName)
    .join(", ");
    
    batch.set(msgRef, {
      text: `${user?.displayName} đã thêm ${invitedNames} vào nhóm`,
      senderId: "system",
      senderName: "Hệ thống",
      senderAvatar: "",
      createdAt: serverTimestamp(),
      type: 'system',
    });
    
    await batch.commit();
    toast.success(`Đã mời ${selectedInviteIds.length} người`);
    setSelectedInviteIds([]);
    setShowInvite(false);
    setSearchFriend("");
  } catch (e) {
    toast.error("Lỗi mời bạn");
  } finally {
    setInviting(false);
  }
};

const loadMembers = async () => {
  if (!roomData?.members.length) {
    setMemberProfiles([]);
    return;
  }
  setLoadingMembers(true);
  try {
    const users: UserData[] = [];
    const chunks = [];
    for (let i = 0; i < roomData.members.length; i += 10) {
      chunks.push(roomData.members.slice(i, i + 10));
    }
    for (const chunk of chunks) {
      const q = query(collection(db, "users"), where("__name__", "in", chunk));
      const snap = await getDocs(q);
      snap.forEach((userDoc) => {
        const data = userDoc.data();
        users.push({
          uid: userDoc.id,
          displayName: data.displayName || data.name || data.email?.split("@")[0] || "User",
          email: data.email || "",
          photoURL:
            data.photoURL ||
            data.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || "User")}&background=random`,
        });
      });
    }
    setMemberProfiles(users);
  } catch {
    toast.error("Không tải được danh sách thành viên");
  } finally {
    setLoadingMembers(false);
  }
};

const handleMenuSelect = (action: "search" | "invite" | "poll" | "members") => {
  if (action === "search") setShowSearch(true);
  if (action === "invite") {
    setShowInvite(true);
    loadAllUsers();
  }
  if (action === "poll") setShowPoll(true);
  if (action === "members") {
    setShowMembers(true);
    void loadMembers();
  }
};

const scrollToBottom = () => {
  if (!messagesContainerRef.current) return;
  messagesContainerRef.current.scrollTo({
    top: messagesContainerRef.current.scrollHeight,
    behavior: "smooth",
  });
  setIsAtBottom(true);
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

    let endTimestamp = null;
    if (pollHasDeadline && pollEndDate && pollEndTime) {
      endTimestamp = new Date(`${pollEndDate}T${pollEndTime}`);
    }

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
        allowMultiple: pollAllowMultiple,
        endTime: endTimestamp,
        closed: false,
      }
    }).commit();

    setShowPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollAllowMultiple(false);
    setPollHasDeadline(false);
    setPollEndDate("");
    setPollEndTime("");
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

    // Check khóa
    if (pollData.closed) return toast.error("Bình chọn đã kết thúc");
    
    // Check deadline
    if (pollData.endTime && pollData.endTime.toDate() < new Date()) {
      return toast.error("Bình chọn đã hết hạn");
    }

    const allowMultiple = pollData.allowMultiple || false;
    const newOptions = pollData.options.map((opt: any, idx: number) => {
      const votes = opt.votes || [];
      const hasVoted = votes.includes(user.uid);
      
      if (idx === optionIdx) {
        return {
        ...opt,
          votes: hasVoted 
           ? votes.filter((v: string) => v!== user.uid) 
            : [...votes, user.uid]
        };
      } else if (!allowMultiple) {
        // Single vote: bỏ vote option khác
        return {
        ...opt,
          votes: votes.filter((v: string) => v!== user.uid)
        };
      }
      return opt;
    });

    const { updateDoc } = await import("firebase/firestore");
    await updateDoc(msgRef, {
      'pollData.options': newOptions
    });
    
  } catch (e: any) {
    console.error("Vote error:", e);
    toast.error("Lỗi vote: " + e.message);
  }
};
  const voterIds = useMemo(() => {
    const ids = new Set<string>();
    messages.forEach((msg) => {
      if (msg.type === "poll" && msg.pollData) {
        msg.pollData.options.forEach((opt) => opt.votes.forEach((uid) => ids.add(uid)));
      }
    });
    return Array.from(ids);
  }, [messages]);

  useEffect(() => {
    if (!voterIds.length) return;
    let cancelled = false;

    (async () => {
      setAllUsers((prev) => {
        const missing = voterIds.filter((id) => !prev.some((u) => u.uid === id));
        if (!missing.length) return prev;

        void (async () => {
          const chunks: string[][] = [];
          for (let i = 0; i < missing.length; i += 10) chunks.push(missing.slice(i, i + 10));
          const loaded: UserData[] = [];
          for (const chunk of chunks) {
            const q = query(collection(db, "users"), where("__name__", "in", chunk));
            const snap = await getDocs(q);
            snap.forEach((userDoc) => {
              const data = userDoc.data();
              loaded.push({
                uid: userDoc.id,
                displayName: data.name || data.displayName || "User",
                email: data.email || "",
                photoURL:
                  data.avatar ||
                  data.photoURL ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "User")}&background=random`,
              });
            });
          }
          if (!cancelled && loaded.length) {
            setAllUsers((current) => {
              const map = new Map(current.map((u) => [u.uid, u]));
              loaded.forEach((u) => map.set(u.uid, u));
              return Array.from(map.values());
            });
          }
        })();

        return prev;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [voterIds, db]);

const handleAvatarClick = (e: React.MouseEvent, msgId: string) => {
  e.stopPropagation();
  setActivePopupMsgId(prev => prev === msgId? null : msgId);
};

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
        <FiLoader className="animate-spin text-[#0a84ff]" size={32} />
      </div>
    );
  }

  if (!roomData) return null;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      <RoomChatBackground imageUrl={roomData.backgroundUrl || ""} accent={roomData.accent} />

      <RoomChatHeader
        room={roomData}
        accent={roomData.accent}
        showMenu={showMenu}
        onBack={() => router.back()}
        onToggleMenu={() => setShowMenu((v) => !v)}
        onOpenMembers={() => {
          setShowMembers(true);
          void loadMembers();
        }}
        onMenuSelect={handleMenuSelect}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
<div
  ref={messagesContainerRef}
  onScroll={handleScroll}
  className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-0.5"
>
  {messages.length === 0? (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      {roomData.imageUrl ? (
        <div className="relative mb-4 h-28 w-28 overflow-hidden rounded-3xl shadow-2xl ring-4 ring-white/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={roomData.imageUrl} alt={roomData.name} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="mb-4 text-6xl">{roomData.emoji}</div>
      )}
      <h3 className="mb-1 text-[18px] font-bold text-white drop-shadow">Chào mừng đến {roomData.name}!</h3>
      <p className="text-[14px] text-white/70">{roomData.desc || "Hãy là người đầu tiên gửi tin nhắn"}</p>
    </div>
  ) : (
    messages.map((msg, idx) => {
      const isMe = msg.senderId === user?.uid;
      const isSystem = msg.type === "system" || msg.senderId === "system";
      const prevMsg = messages[idx - 1];
      const nextMsg = messages[idx + 1];
      const isFirstInGroup =!prevMsg || prevMsg.senderId!== msg.senderId || isSystem;
      const isLastInGroup =!nextMsg || nextMsg.senderId!== msg.senderId || isSystem;
      const showTimeDivider = shouldShowTimeDivider(msg, prevMsg);

      if (isSystem) {
        return (
          <div key={msg.id}>
            {showTimeDivider && (
              <div className="my-4 flex justify-center">
                <span className="rounded-full bg-black/35 px-3 py-1 text-[12px] text-white/80 backdrop-blur-sm">
                  {formatTimeDivider(msg.createdAt)}
                </span>
              </div>
            )}
            <div className="my-2 flex justify-center px-6">
              <span className="rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-center text-[12px] text-white/75 backdrop-blur-md">
                {msg.text}
              </span>
            </div>
          </div>
        );
      }

      // Render Poll
      if (msg.type === 'poll' && msg.pollData) {
        const totalVotes = msg.pollData.options.reduce((sum, opt) => sum + opt.votes.length, 0);
        const isExpired = msg.pollData.endTime && msg.pollData.endTime.toDate() < new Date();
        const isClosed = msg.pollData.closed || isExpired;
        const isCreator = msg.pollData.creatorId === user?.uid;

        return (
          <div key={msg.id}>
            {/* Time Divider căn giữa - chỉ hiện khi cách >5 phút */}
            {showTimeDivider && (
              <div className="my-4 flex justify-center">
                <span className="rounded-full bg-black/35 px-3 py-1 text-[12px] text-white/80 backdrop-blur-sm">
                  {formatTimeDivider(msg.createdAt)}
                </span>
              </div>
            )}

            <div
              id={`msg-${msg.id}`}
              className={`flex gap-2 ${isMe? "flex-row-reverse" : ""} ${isFirstInGroup? "mt-2" : "mt-0.5"}`}
              onTouchStart={() => {
                if (!isCreator) return;
                longPressTimer.current = setTimeout(() => {
                  setDeleteMsgId(msg.id);
                  if ("vibrate" in navigator) navigator.vibrate(50);
                }, 500);
              }}
              onTouchEnd={() => {
                if (longPressTimer.current) {
                  clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }
              }}
              onTouchMove={() => {
                if (longPressTimer.current) {
                  clearTimeout(longPressTimer.current);
                  longPressTimer.current = null;
                }
              }}
            >
              {!isMe && (
              <div className="w-8 shrink-0 self-end relative">
                {isFirstInGroup? (
                  <>
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName}
                      className="h-8 w-8 cursor-pointer rounded-full border border-white/20 object-cover active:scale-90"
                      referrerPolicy="no-referrer"
                      onClick={(e) => handleAvatarClick(e, msg.id)}
                    />
                    {activePopupMsgId === msg.id && (
                      <div
                        className="absolute left-10 top-0 z-50 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setActivePopupMsgId(null);
                            router.push(`/profile/${msg.senderId}`);
                          }}
                          className="flex items-center gap-2.5 whitespace-nowrap px-4 py-2.5 text-white active:bg-white/10"
                        >
                          <FiUser className="h-4 w-4" />
                          <span className="text-[15px] font-medium">Thông tin cá nhân</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : <div className="w-8" />}
              </div>
              )}

              <div className={`max-w-[82%] flex flex-col ${isMe? 'items-end' : 'items-start'}`}>
                {isFirstInGroup &&!isMe && (
                  <span className="mb-0.5 px-3 text-[12px] font-medium text-white/70">{msg.senderName}</span>
                )}

                <div className={`w-full rounded-[20px] border border-white/10 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-md dark:bg-zinc-900/90 ${
                  isLastInGroup? (isMe? 'rounded-br-[6px]' : 'rounded-bl-[6px]') : ''
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-[15px] font-semibold flex-1">📊 {msg.pollData.question}</p>
                    {isCreator &&!isClosed && (
                      <button
                        onClick={async () => {
                          const { updateDoc } = await import("firebase/firestore");
                          const msgRef = doc(db, "chats", roomId as string, "messages", msg.id);
                          await updateDoc(msgRef, { 'pollData.closed': true });
                          toast.success("Đã khóa bình chọn");
                        }}
                        className="text-[13px] text-red-500 active:opacity-60 ml-2"
                      >
                        Khóa
                      </button>
                    )}
                  </div>

                  {msg.pollData.endTime && (
                    <p className="text-[13px] text-[#8e8e93] mb-2">
                      {isExpired? 'Đã kết thúc' : `Kết thúc: ${format(msg.pollData.endTime.toDate(), 'HH:mm dd/MM', { locale: vi })}`}
                    </p>
                  )}

                  <div className="space-y-2">
                    {msg.pollData.options.map((opt, optIdx) => {
                      const voted = opt.votes.includes(user?.uid || '');
                      const percent = totalVotes > 0? (opt.votes.length / totalVotes * 100) : 0;
                      return (
                        <button
                          key={optIdx}
                          onClick={() =>!isClosed && votePoll(msg.id, optIdx)}
                          disabled={isClosed}
                          className="w-full text-left relative overflow-hidden rounded-lg border border-zinc-300 dark:border-zinc-700 active:opacity-70 disabled:opacity-60"
                        >
                          <div
                            className="absolute inset-0 transition-all duration-300"
                            style={{ width: `${percent}%`, backgroundColor: `${roomData.accent}33` }}
                          />
                          <div className="relative px-3 py-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[15px] flex items-center gap-2">
                                {voted && <FiCheck size={16} style={{ color: roomData.accent }} />}
                                {opt.text}
                              </span>
                              <span className="text-[13px] text-[#8e8e93] font-medium">{percent.toFixed(0)}%</span>
                            </div>
                            {opt.votes.length > 0 && (
                              <div className="flex -space-x-1">
                                {opt.votes.slice(0, 5).map((uid: string) => {
                                  const voter = allUsers.find(u => u.uid === uid);
                                  return voter? (
                                    <img
                                      key={uid}
                                      src={voter.photoURL}
                                      className="w-5 h-5 rounded-full border border-white dark:border-zinc-800"
                                      alt=""
                                    />
                                  ) : null;
                                })}
                                {opt.votes.length > 5 && (
                                  <div className="w-5 h-5 rounded-full bg-zinc-300 dark:bg-zinc-600 border border-white dark:border-zinc-800 flex items-center justify-center text-[11px] text-zinc-600 dark:text-zinc-300">
                                    +{opt.votes.length - 5}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[13px] text-[#8e8e93] mt-2">
                    {totalVotes} lượt bình chọn{msg.pollData.allowMultiple? ' • Nhiều lựa chọn' : ''}
                  </p>
                </div>
              </div>

              {/* Popup xoá */}
              {deleteMsgId === msg.id && isCreator && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDeleteMsgId(null)}
                  />
                  <div className="absolute z-50 top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="flex items-center gap-2.5 px-4 py-2.5 active:bg-red-50 dark:active:bg-red-950/30 text-red-500 whitespace-nowrap"
                    >
                      <FiTrash2 size={18} />
                      <span className="text-[15px] font-medium">Xoá bình chọn</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      }

      // Tin nhắn text thường
      return (
        <div key={msg.id}>
          {/* Time Divider căn giữa - chỉ hiện khi cách >5 phút */}
          {showTimeDivider && (
            <div className="my-4 flex justify-center">
              <span className="rounded-full bg-black/35 px-3 py-1 text-[12px] text-white/80 backdrop-blur-sm">
                {formatTimeDivider(msg.createdAt)}
              </span>
            </div>
          )}

          <div
            id={`msg-${msg.id}`}
            className={`flex gap-2 ${isMe? 'flex-row-reverse' : ''} ${isFirstInGroup? 'mt-2' : 'mt-0.5'}`}
            onTouchStart={() => {
              if (!isMe) return;
              longPressTimer.current = setTimeout(() => {
                setDeleteMsgId(msg.id);
                if ("vibrate" in navigator) navigator.vibrate(50);
              }, 500);
            }}
            onTouchEnd={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
            }}
            onTouchMove={() => {
              if (longPressTimer.current) {
                clearTimeout(longPressTimer.current);
                longPressTimer.current = null;
              }
            }}
          >
            {!isMe && (
            <div className="w-8 shrink-0 self-end relative">
              {isFirstInGroup? (
                <>
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="h-8 w-8 cursor-pointer rounded-full border border-white/20 object-cover active:scale-90"
                    referrerPolicy="no-referrer"
                    onClick={(e) => handleAvatarClick(e, msg.id)}
                    onError={(e) => {
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName)}&background=random`;
                    }}
                  />
                  {activePopupMsgId === msg.id && (
                    <div
                      className="absolute left-10 top-0 z-50 overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setActivePopupMsgId(null);
                          router.push(`/profile/${msg.senderId}`);
                        }}
                        className="flex items-center gap-2.5 whitespace-nowrap px-4 py-2.5 text-white active:bg-white/10"
                      >
                        <FiUser className="h-4 w-4" />
                        <span className="text-[15px] font-medium">Thông tin cá nhân</span>
                      </button>
                    </div>
                  )}
                </>
              ) : <div className="w-8" />}
            </div>
            )}

            <div className={`max-w-[82%] flex flex-col ${isMe? 'items-end' : 'items-start'}`}>
              {isFirstInGroup &&!isMe && (
                <span className="mb-0.5 px-3 text-[12px] font-medium text-white/70">{msg.senderName}</span>
              )}

              <div
                className={`px-4 py-2.5 shadow-md ${
                  isMe
                    ? 'rounded-[20px] text-white'
                    : 'rounded-[20px] border border-white/10 bg-white/90 text-zinc-900 backdrop-blur-md dark:bg-zinc-900/90 dark:text-white'
                } ${isLastInGroup? (isMe? 'rounded-br-[6px]' : 'rounded-bl-[6px]') : ''}`}
                style={isMe ? { backgroundColor: roomData.accent } : undefined}
              >
                <p className="whitespace-pre-wrap break-words text-[15px] leading-[20px]">{msg.text}</p>
              </div>
              {/* Đã xoá time ở đây - Messenger không hiện time dưới mỗi tin */}
            </div>

            {/* Popup xoá */}
            {deleteMsgId === msg.id && isMe && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDeleteMsgId(null)}
                />
                <div className="absolute z-50 top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="flex items-center gap-2.5 px-4 py-2.5 active:bg-red-50 dark:active:bg-red-950/30 text-red-500 whitespace-nowrap"
                  >
                    <FiTrash2 size={18} />
                    <span className="text-[15px] font-medium">Xoá tin nhắn</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      );
    })
  )}
</div>

        {!isAtBottom && messages.length > 0 && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-3 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-lg backdrop-blur-md active:scale-95"
          >
            <FiChevronDown size={20} />
          </button>
        )}

        <RoomChatInput
          message={message}
          sending={sending}
          accent={roomData.accent}
          onChange={setMessage}
          onSend={handleSendMessage}
          onSearch={() => setShowSearch(true)}
          onInvite={() => {
            setShowInvite(true);
            loadAllUsers();
          }}
          onPoll={() => setShowPoll(true)}
        />
      </div>

      <RoomMembersSheet
        open={showMembers}
        accent={roomData.accent}
        roomName={roomData.name}
        members={memberProfiles}
        onlineCount={roomData.onlineCount}
        loading={loadingMembers}
        onClose={() => setShowMembers(false)}
      />

      {/* Modal Tìm tin nhắn */}
 {showSearch && (
  <div 
    className="fixed inset-0 z-50 bg-white dark:bg-black flex flex-col pt-[env(safe-area-inset-top)] animate-in fade-in duration-200"
    onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); setCurrentResultIdx(-1); }}
  >
    <div 
      className="flex items-center gap-2 px-4 py-3 border-b border-black/5 dark:border-white/5"
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        onClick={() => { setShowSearch(false); setSearchQuery(""); setSearchResults([]); setCurrentResultIdx(-1); }} 
        className="w-9 h-9 flex items-center justify-center -ml-2 active:opacity-60"
      >
        <FiX size={22} />
      </button>
      <div className="flex-1 relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8e8e93]" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm trong đoạn chat..."
          autoFocus
          className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-[20px] text-[15px] outline-none"
        />
        {searching && <FiLoader className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#8e8e93]" size={16} />}
      </div>
    </div>

{/* Counter + Prev/Next */}
{searchResults.length > 0 && (
  <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border-b border-black/5 dark:border-white/5">
    <span className="text-sm text-[#8e8e93] font-medium">
      {currentResultIdx + 1}/{searchResults.length} kết quả
    </span>
    <div className="flex gap-2">
      <button
        onClick={() => {
          if (searchResults.length === 0) return;
          const newIdx = currentResultIdx > 0? currentResultIdx - 1 : searchResults.length - 1;
          const result = searchResults[newIdx];
          if (result) {
            setCurrentResultIdx(newIdx);
            scrollToMessage(result.id, newIdx);
          }
        }}
        className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center shadow-sm"
      >
        <FiChevronUp size={18} className="text-zinc-900 dark:text-white" />
      </button>
      <button
        onClick={() => {
          if (searchResults.length === 0) return;
          const newIdx = currentResultIdx < searchResults.length - 1? currentResultIdx + 1 : 0;
          const result = searchResults[newIdx];
          if (result) {
            setCurrentResultIdx(newIdx);
            scrollToMessage(result.id, newIdx);
          }
        }}
        className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-700 active:scale-90 transition-all flex items-center justify-center shadow-sm"
      >
        <FiChevronDown size={18} className="text-zinc-900 dark:text-white" />
      </button>
    </div>
  </div>
)}

<div className="flex-1 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
  {searchQuery && searchResults.length === 0 &&!searching? (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <FiSearch size={48} className="text-zinc-300 dark:text-zinc-700 mb-3" />
      <p className="text-sm text-[#8e8e93]">Không tìm thấy "{searchQuery}"</p>
    </div>
  ) : searchResults.map((msg, idx) => (
    <button
      key={msg.id}
      onClick={() => scrollToMessage(msg.id, idx)}
      className={`w-full text-left px-4 py-3 border-b border-black/5 dark:border-white/5 active:bg-zinc-100 dark:active:bg-zinc-800 transition-colors ${
        idx === currentResultIdx? 'bg-blue-50 dark:bg-blue-950/30' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <img src={msg.senderAvatar} className="w-6 h-6 rounded-full" alt="" />
        <p className="text-sm font-medium text-zinc-900 dark:text-white">{msg.senderName}</p>
<p className="text-sm text-[#8e8e93]">• {formatTimeDivider(msg.createdAt)}</p>
      </div>
      <div className="pl-8">
        <p className="text-sm text-zinc-900 dark:text-white line-clamp-2">
          {msg.type === 'poll'? `📊 ${msg.pollData?.question}` : highlightText(msg.text, searchQuery)}
        </p>
      </div>
    </button>
  ))}
</div>
</div>
)}
     {/* Modal Mời bạn bè */}
{showInvite && (
  <div 
    className="fixed inset-0 z-50 bg-black/50 flex items-end animate-in fade-in duration-200"
    onClick={() => { setShowInvite(false); setSearchFriend(""); setSelectedInviteIds([]); }}
  >
    <div 
className="bg-white dark:bg-zinc-900 w-full rounded-t-3xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-5 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-black/5 dark:border-white/5">
        <button 
          onClick={() => { setShowInvite(false); setSearchFriend(""); setSelectedInviteIds([]); }}
          className="text-[#0a84ff] active:opacity-60"
        >
          Hủy
        </button>
        <h3 className="text-sm font-semibold">Mời bạn bè</h3>
        <button 
          onClick={inviteUsers}
          disabled={selectedInviteIds.length === 0 || inviting}
          className="text-[#0a84ff] font-semibold disabled:opacity-40 active:opacity-60"
        >
          {inviting? <FiLoader className="animate-spin" size={18} /> : `Mời${selectedInviteIds.length > 0? ` (${selectedInviteIds.length})` : ''}`}
        </button>
      </div>
      
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
          <FiSearch size={18} className="text-[#8e8e93]" />
          <input
            type="text"
            value={searchFriend}
            onChange={(e) => setSearchFriend(e.target.value)}
            placeholder="Tìm bạn bè..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#8e8e93]"
          />
          {searchFriend && (
            <button onClick={() => setSearchFriend("")}>
              <FiX size={18} className="text-[#8e8e93]" />
            </button>
          )}
        </div>
      </div>

      {/* Counter đã chọn */}
      {selectedInviteIds.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto py-2 scrollbar-hide">
            {selectedInviteIds.map(uid => {
              const u = allUsers.find(x => x.uid === uid);
              if (!u) return null;
              return (
                <div key={uid} className="relative flex-shrink-0">
                  <img src={u.photoURL} className="w-12 h-12 rounded-full" alt="" />
                  <button
                    onClick={() => setSelectedInviteIds(prev => prev.filter(id => id!== uid))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black rounded-full flex items-center justify-center"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {inviting? (
          <div className="flex justify-center py-10">
            <FiLoader className="animate-spin" size={24} />
          </div>
        ) : (() => {
          const filtered = allUsers.filter(u => 
            u.displayName.toLowerCase().includes(searchFriend.toLowerCase()) ||
            u.email.toLowerCase().includes(searchFriend.toLowerCase())
          );
          
          return filtered.length === 0? (
            <div className="flex flex-col items-center justify-center py-20">
              <FiUserPlus size={48} className="text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm text-[#8e8e93]">
                {searchFriend? "Không tìm thấy bạn bè" : "Không có bạn bè để mời"}
              </p>
            </div>
          ) : (
            filtered.map(user => {
              const isInRoom = roomData?.members.includes(user.uid);
              const isSelected = selectedInviteIds.includes(user.uid);
              
              return (
                <button
                  key={user.uid}
                  onClick={() => {
                    if (isInRoom) return;
                    setSelectedInviteIds(prev => 
                      isSelected? prev.filter(id => id!== user.uid) : [...prev, user.uid]
                    );
                  }}
                  disabled={isInRoom}
                  className="w-full flex items-center gap-3 py-2.5 active:bg-zinc-100 dark:active:bg-zinc-800 rounded-lg disabled:opacity-40"
                >
                  <img src={user.photoURL} className="w-12 h-12 rounded-full" alt="" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{user.displayName}</p>
                    <p className="text-sm text-[#8e8e93] truncate">
                      {isInRoom? "Đã tham gia" : user.email}
                    </p>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected? 'bg-[#0a84ff] border-[#0a84ff]' : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {isSelected && <FiCheck className="text-white" size={14} />}
                  </div>
                </button>
              );
            })
          );
        })()}
      </div>
    </div>
  </div>
)}

      {/* Modal Tạo bình chọn */}
{showPoll && (
  <div 
    className="fixed inset-0 z-50 bg-black/50 flex items-end animate-in fade-in duration-200"
    onClick={() => setShowPoll(false)}
  >
    <div 
className="bg-white dark:bg-zinc-900 w-full rounded-t-3xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-5 duration-300"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-black/5 dark:border-white/5">
        <button onClick={() => setShowPoll(false)} className="text-[#0a84ff] active:opacity-60">Huỷ</button>
        <h3 className="text-sm font-semibold">Tạo bình chọn</h3>
        <button 
          onClick={createPoll} 
          disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
          className="text-[#0a84ff] font-semibold disabled:opacity-40 active:opacity-60"
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
          className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm outline-none mb-4"
        />
        <p className="text-sm text-[#8e8e93] mb-2">Lựa chọn</p>
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
              className="flex-1 px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm outline-none"
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
          className="flex items-center gap-2 text-[#0a84ff] mt-2 mb-4"
        >
          <FiPlus size={20} /> <span className="text-">Thêm lựa chọn</span>
        </button>

        {/* Cài đặt */}
        <div className="border-t border-black/5 dark:border-white/5 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-">Cho phép chọn nhiều</span>
            <button
              onClick={() => setPollAllowMultiple(!pollAllowMultiple)}
              className={`w-12 h-7 rounded-full transition-colors ${pollAllowMultiple? 'bg-[#0a84ff]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${pollAllowMultiple? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-">Đặt thời hạn</span>
            <button
              onClick={() => setPollHasDeadline(!pollHasDeadline)}
              className={`w-12 h-7 rounded-full transition-colors ${pollHasDeadline? 'bg-[#0a84ff]' : 'bg-zinc-300 dark:bg-zinc-700'}`}
            >
              <div className={`w-6 h-6 bg-white rounded-full transition-transform ${pollHasDeadline? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          
          {pollHasDeadline && (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
              <input
                type="date"
                value={pollEndDate}
                onChange={(e) => setPollEndDate(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm outline-none"
              />
              <input
                type="time"
                value={pollEndTime}
                onChange={(e) => setPollEndTime(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-sm outline-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}



    </div>
  );
}