"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getFirebaseDB } from "@/lib/firebase";
import {
  doc, onSnapshot, collection, query, orderBy, limit, addDoc,
  serverTimestamp, updateDoc, deleteDoc, arrayRemove, deleteField
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { FiImage, FiChevronLeft, FiSend, FiMoreVertical, FiTrash2, FiUsers, FiCopy, FiLogOut, FiMic } from "react-icons/fi";
import { RiPushpinFill } from "react-icons/ri";
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
  membersInfo?: { [uid: string]: { name: string; avatar: string; username: string } };
  pinnedMessage?: { id: string; text: string; senderName: string };
  typing?: { [uid: string]: string };
};

type Message = {
  id: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
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
const [showEditModal, setShowEditModal] = useState(false);
const [editName, setEditName] = useState("");
const [editAvatar, setEditAvatar] = useState<File | null>(null);
const [editAvatarPreview, setEditAvatarPreview] = useState("");
const [updatingGroup, setUpdatingGroup] = useState(false);
const editAvatarInputRef = useRef<HTMLInputElement>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [longPressMsg, setLongPressMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [recording, setRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages.length, scrollToBottom]);

  // Typing indicator
  useEffect(() => {
    if (!user?.uid ||!groupId) return;
    const groupRef = doc(db, "groups", groupId);

    if (text.trim()) {
      updateDoc(groupRef, {
        [`typing.${user.uid}`]: user.displayName || "User"
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        updateDoc(groupRef, {
          [`typing.${user.uid}`]: deleteField()
        });
      }, 2000);
    } else {
      updateDoc(groupRef, {
        [`typing.${user.uid}`]: deleteField()
      });
    }

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [text, user?.uid, groupId, db]);

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

      // Typing users
      if (data.typing) {
        const typing = Object.entries(data.typing)
         .filter(([uid]) => uid!== user.uid)
         .map(([_, name]) => name as string);
        setTypingUsers(typing);
      } else {
        setTypingUsers([]);
      }

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
const openEditModal = () => {
  if (group?.createdBy!== user?.uid) return toast.error("Chỉ chủ nhóm mới đổi được");
  setEditName(group?.name || "");
  setEditAvatarPreview(group?.avatar || "");
  setShowEditModal(true);
  setShowMenu(false);
};

const handleUpdateGroup = async () => {
  if (!user?.uid || !group || group.createdBy !== user.uid) return;
  if (!editName.trim()) return toast.error("Tên nhóm không được để trống");

  setUpdatingGroup(true);
  try {
    let avatarUrl = group.avatar;

    if (editAvatar) {
      // Đổi sang group_images cho khớp rules, thêm prefix avatar_ để dễ phân biệt
      const avatarRef = ref(storage, `group_images/${groupId}/avatar_${Date.now()}_${editAvatar.name}`);
      
      // Thêm metadata để check contentType
      await uploadBytes(avatarRef, editAvatar, {
        contentType: editAvatar.type,
      });
      avatarUrl = await getDownloadURL(avatarRef);
    }

    await updateDoc(doc(db, "groups", groupId), {
      name: editName.trim(),
      avatar: avatarUrl,
      updatedAt: serverTimestamp()
    });

    toast.success("Đã cập nhật nhóm");
    setShowEditModal(false);
    setEditAvatar(null);
    setEditAvatarPreview("");
  } catch (err: any) {
    console.error("Update group error:", err);
    if (err.code === 'storage/unauthorized') {
      toast.error("Không có quyền upload. Kiểm tra Storage Rules");
    } else {
      toast.error("Lỗi cập nhật: " + err.message);
    }
  } finally {
    setUpdatingGroup(false);
  }
};
const handleEditAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) return toast.error("Ảnh tối đa 5MB");
  setEditAvatar(file);
  setEditAvatarPreview(URL.createObjectURL(file));
};
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() ||!user?.uid || sending ||!group) return;

    setSending(true);
    const msgText = text.trim();
    setText("");
    setReplyTo(null);
    setShowMentions(false);
    if (inputRef.current) inputRef.current.style.height = 'auto';

    // Clear typing
    await updateDoc(doc(db, "groups", groupId), {
      [`typing.${user.uid}`]: deleteField()
    });

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

  const startRecording = async () => {
    if (!user?.uid ||!group) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const audioRef = ref(storage, `voice/${groupId}/${Date.now()}.webm`);
        await uploadBytes(audioRef, blob);
        const url = await getDownloadURL(audioRef);

        await addDoc(collection(db, "groups", groupId, "messages"), {
          audioUrl: url,
          senderId: user.uid,
          senderName: user.displayName || "User",
          senderAvatar: user.photoURL || "",
          createdAt: serverTimestamp(),
        });

        await updateDoc(doc(db, "groups", groupId), {
          lastMessage: `${user.displayName} đã gửi voice`,
          lastSenderId: user.uid,
          updatedAt: serverTimestamp(),
        });

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      if ("vibrate" in navigator) navigator.vibrate(50);
    } catch {
      toast.error("Không thể truy cập micro");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if ("vibrate" in navigator) navigator.vibrate(50);
  };

  const handlePinMessage = async (msg: Message) => {
    try {
      await updateDoc(doc(db, "groups", groupId), {
        pinnedMessage: {
          id: msg.id,
          text: msg.text || "[Ảnh]",
          senderName: msg.senderName
        }
      });
      toast.success("Đã ghim tin nhắn");
    } catch {
      toast.error("Lỗi ghim tin");
    }
    setLongPressMsg(null);
  };

  const handleUnpinMessage = async () => {
    try {
      await updateDoc(doc(db, "groups", groupId), {
        pinnedMessage: deleteField()
      });
      toast.success("Đã bỏ ghim");
    } catch {
      toast.error("Lỗi bỏ ghim");
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

  const handleLeaveGroup = async () => {
    if (!user?.uid ||!group) return;
    if (!confirm("Rời nhóm này?")) return;

    try {
      await updateDoc(doc(db, "groups", groupId), {
        members: arrayRemove(user.uid),
        updatedAt: serverTimestamp()
      });
      toast.success("Đã rời nhóm");
      router.push("/inbox");
    } catch {
      toast.error("Lỗi rời nhóm");
    }
  };
const shouldShowTimeDivider = (msg: Message, prevMsg: Message | undefined) => {
  if (!prevMsg?.createdAt || !msg.createdAt) return true;
  const prev = prevMsg.createdAt.toDate();
  const curr = msg.createdAt.toDate();
  const diff = curr.getTime() - prev.getTime();
  return diff > 5 * 60 * 1000; // Cách 5 phút
};

const formatTimeDivider = (timestamp: any) => {
  if (!timestamp?.toDate) return "";
  const date = timestamp.toDate();
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Hôm qua " + format(date, "HH:mm");
  return format(date, "dd/MM/yyyy HH:mm", { locale: vi });
};
  const handleDeleteGroup = async () => {
    if (!user?.uid ||!group) return;
    if (group.createdBy!== user.uid) return toast.error("Chỉ chủ nhóm mới xóa được");
    if (!confirm("Xóa vĩnh viễn nhóm này?")) return;

    try {
      await deleteDoc(doc(db, "groups", groupId));
      toast.success("Đã xóa nhóm");
      router.push("/inbox");
    } catch {
      toast.error("Lỗi xóa nhóm");
    }
  };

  const copyGroupCode = () => {
    if (!group?.groupCode) return;
    navigator.clipboard.writeText(group.groupCode);
    toast.success(`Đã copy mã: ${group.groupCode}`);
    setShowMenu(false);
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



  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    setShowMentions(val.endsWith("@"));
  };

  const selectMention = (name: string) => {
    setText(text + name + " ");
    setShowMentions(false);
    inputRef.current?.focus();
  };

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-white dark:bg-black">
        <div className="w-8 h-8 border-4 border-[#0a84ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) return <div className="p-4 text-center">Nhóm không tồn tại</div>;

  const isOwner = group.createdBy === user?.uid;

return (
  <div
    className="fixed inset-0 flex flex-col bg-white dark:bg-black overflow-hidden"
    onClick={() => setShowMenu(false)}
  >
{/* Header - fixed top */}
<div className="flex-shrink-0 flex flex-col bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl z-30 pt-[env(safe-area-inset-top)]">
  <div className="flex items-center gap-3 px-4 h-14">
    <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center -ml-2 active:opacity-60">
      <FiChevronLeft size={24} className="text-[#0a84ff]" strokeWidth={2.5} />
    </button>

    <button
      onClick={openEditModal}
      className="flex items-center gap-3 flex-1 min-w-0 active:opacity-60 text-left"
    >
      <img
        src={group.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(group.name)}&background=0a84ff&color=fff&bold=true`}
        alt={group.name}
        className="w-9 h-9 rounded-full object-cover"
      />
      <div className="flex-1 min-w-0">
        <h1 className="text-base font-[600] truncate">{group.name}</h1>
        <p className="text-xs text-[#8e8e93]">{group.members.length} thành viên</p>
      </div>
    </button>

    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className="w-8 h-8 flex items-center justify-center active:opacity-60"
      >
        <FiMoreVertical size={20} className="text-[#8e8e93]" />
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-10 w-56 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-black/10 dark:border-white/10 py-2 z-20">
            <button
              onClick={copyGroupCode}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 text-left"
            >
              <FiCopy size={18} />
              <div>
                <p className="text-sm font-medium">Copy mã nhóm</p>
                <p className="text-xs text-[#8e8e93]">{group.groupCode}</p>
              </div>
            </button>

            <button
              onClick={() => { setShowMenu(false); toast.info("Sắp ra mắt"); }}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 text-left"
            >
              <FiUsers size={18} />
              <p className="text-sm font-medium">Thành viên</p>
            </button>

            <div className="h-px bg-black/10 dark:bg-white/10 my-1" />

            <button
              onClick={handleLeaveGroup}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-500/10 text-left text-red-500"
            >
              <FiLogOut size={18} />
              <p className="text-sm font-medium">Rời nhóm</p>
            </button>

            {isOwner && (
              <button
                onClick={handleDeleteGroup}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-red-500/10 text-left text-red-500"
              >
                <FiTrash2 size={18} />
                <p className="text-sm font-medium">Xóa nhóm</p>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  </div>

  {/* Pinned Message */}
  {group.pinnedMessage && (
    <button
      onClick={handleUnpinMessage}
      className="flex items-center gap-2 px-4 py-2 bg-[#0a84ff]/10 border-t border-[#0a84ff]/20 text-left w-full hover:bg-[#0a84ff]/15"
    >
      <RiPushpinFill className="text-[#0a84ff] flex-shrink-0" size={16} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#0a84ff]">{group.pinnedMessage.senderName}</p>
        <p className="text-xs text-[#8e8e93] truncate">{group.pinnedMessage.text}</p>
      </div>
    </button>
  )}
</div>

{/* Messages - scrollable only this */}
<div className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-3 pb-4 relative z-0" onClick={() => setLongPressMsg(null)}>
  {messages.length === 0? (
    <div className="h-full flex items-center justify-center text-[#8e8e93] text-sm">
      Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!
    </div>
  ) : (
    <div className="space-y-">
      {messages.map((msg, idx) => {
        const isMe = msg.senderId === user?.uid;
        const prevMsg = messages[idx - 1];
        const nextMsg = messages[idx + 1];
        const isFirstInGroup =!prevMsg || prevMsg.senderId!== msg.senderId;
        const isLastInGroup =!nextMsg || nextMsg.senderId!== msg.senderId;
        const showAvatar = isLastInGroup;
        const showName = isFirstInGroup &&!isMe;
        const showTimeDivider = shouldShowTimeDivider(msg, prevMsg);

        return (
          <div key={msg.id}>
            {/* Time Divider căn giữa - chỉ hiện khi cách >5 phút */}
            {showTimeDivider && (
              <div className="flex justify-center my-4">
                <span className="text- text-[#8e8e93] bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                  {formatTimeDivider(msg.createdAt)}
                </span>
              </div>
            )}

            <div
              className={`flex items-end gap-2 ${isMe? 'justify-end' : 'justify-start'} ${isFirstInGroup? 'mt-3' : 'mt-0.5'}`}
              onContextMenu={(e) => e.preventDefault()}
            >
              {!isMe && (
                <div className="w-7 h-7 flex-shrink-0">
                  {showAvatar? (
                    <img
                      src={msg.senderAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName)}`}
                      alt={msg.senderName}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-7 h-7" />
                  )}
                </div>
              )}

              <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe? "items-end" : "items-start"}`}>
                {showName && (
                  <span className="px-3 text-xs font-medium text-[#8e8e93]">
                    {msg.senderName}
                  </span>
                )}

                {msg.replyTo && (
                  <div className="px-3 py-1.5 bg-black/5 dark:bg-white/5 rounded-xl border-l-2 border-[#0a84ff] mb-1 max-w-full">
                    <p className="text-xs font-medium text-[#0a84ff]">{msg.replyTo.senderName}</p>
                    <p className="text-xs text-[#8e8e93] truncate">{msg.replyTo.text}</p>
                  </div>
                )}

                <div
                  className={`relative px-3.5 py-2.5 ${
                    isMe
                     ? 'bg-[#0a84ff] text-white rounded-[18px] rounded-br-[4px]'
                      : 'bg-[#e9e9eb] dark:bg-zinc-800 text-black dark:text-white rounded-[18px] rounded-bl-[4px]'
                  } ${longPressMsg === msg.id? 'ring-2 ring-[#0a84ff] ring-offset-2' : ''}`}
                  onPointerDown={() => isMe && handleLongPressStart(msg.id)}
                  onPointerUp={handleLongPressEnd}
                  onPointerLeave={handleLongPressEnd}
                >
                  {msg.audioUrl? (
                    <audio controls src={msg.audioUrl} className="max-w-[240px]" />
                  ) : msg.imageUrl? (
                    <img src={msg.imageUrl} alt="Ảnh" className="rounded-xl max-w-[240px] max-h-[240px] object-cover" />
                  ) : (
                    <p className="text-[15px] leading-[20px] whitespace-pre-wrap break-words">{msg.text}</p>
                  )}

                  {longPressMsg === msg.id && isMe && (
                    <div className="absolute -top-10 right-0 flex gap-1 bg-white dark:bg-zinc-800 rounded-lg shadow-lg p-1 z-10">
                      <button
                        onClick={() => { setReplyTo(msg); setLongPressMsg(null); }}
                        className="px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded"
                      >
                        Trả lời
                      </button>
                      <button
                        onClick={() => handlePinMessage(msg)}
                        className="px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 rounded"
                      >
                        Ghim
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
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  )}
</div>

{/* Typing indicator */}
{typingUsers.length > 0 && (
  <div className="px-4 pb-1 text-xs text-[#8e8e93] italic bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl">
    {typingUsers.join(", ")} đang nhập...
  </div>
)}

{/* Input - fixed bottom */}
<form
  onSubmit={handleSend}
  className="flex-shrink-0 px-3 pt-2 pb-[max(12px,env(safe-area-inset-bottom))] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl relative"
>
  {replyTo && (
    <div className="flex items-center justify-between mb-2 px-3 py-2 bg-black/5 dark:bg-white/5 rounded-xl">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#0a84ff]">Đang trả lời {replyTo.senderName}</p>
        <p className="text-xs text-[#8e8e93] truncate">{replyTo.text || "[Ảnh]"}</p>
      </div>
      <button onClick={() => setReplyTo(null)} className="w-6 h-6 flex items-center justify-center">
        <FiTrash2 size={14} className="text-[#8e8e93]" />
      </button>
    </div>
  )}

  {showMentions && group?.membersInfo && (
    <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 py-1 max-h-40 overflow-y-auto z-20">
      {group.members.map(uid => {
        const info = group.membersInfo?.[uid];
        if (!info || uid === user?.uid) return null;
        return (
          <button
            key={uid}
            type="button"
            onClick={() => selectMention(info.name)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5 w-full text-left"
          >
            <img src={info.avatar} alt="" className="w-7 h-7 rounded-full" />
            <div>
              <p className="text-sm font-medium">{info.name}</p>
              <p className="text-xs text-[#8e8e93]">@{info.username}</p>
            </div>
          </button>
        );
      })}
    </div>
  )}

  <div className="flex items-end gap-1.5 bg-white dark:bg-zinc-900 border border-[#0a84ff] rounded-full px-3 py-1.5">
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      disabled={uploading}
      className="w-8 h-8 flex items-center justify-center text-[#0a84ff] active:opacity-60 disabled:opacity-40 flex-shrink-0"
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
    <textarea
      ref={inputRef}
      value={text}
      onChange={(e) => handleInputChange(e)}
      placeholder="Nhắn tin..."
      rows={1}
      className="flex-1 bg-transparent text-sm resize-none outline-none border-0 ring-0 focus:ring-0 focus:outline-none placeholder:text-[#8e8e93] max-h-[100px] py-[6px] px-1"
      disabled={sending || uploading || recording}
      onInput={(e) => {
        const target = e.target as HTMLTextAreaElement;
        target.style.height = 'auto';
        target.style.height = target.scrollHeight + 'px';
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' &&!e.shiftKey) {
          e.preventDefault();
          handleSend();
        }
      }}
    />
    {text.trim()? (
      <button
        type="submit"
        disabled={sending}
        className="w-8 h-8 flex items-center justify-center text-[#0a84ff] active:opacity-60 disabled:opacity-40 disabled:text-[#8e8e93] flex-shrink-0"
      >
        <FiSend size={20} />
      </button>
    ) : (
      <button
        type="button"
        onPointerDown={startRecording}
        onPointerUp={stopRecording}
        onPointerLeave={stopRecording}
        className={`w-8 h-8 flex items-center justify-center active:opacity-60 flex-shrink-0 ${recording? 'text-red-500' : 'text-[#0a84ff]'}`}
      >
        <FiMic size={20} />
      </button>
    )}
  </div>
</form>
{/* Edit Group Modal */}
{showEditModal && (
  <div className="fixed inset-0 z-40">
    <div
      className="absolute inset-0 bg-black/50"
      onClick={() => setShowEditModal(false)}
    />
    <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-5 pointer-events-auto">
        <h2 className="text-lg font-[600] mb-4 text-center">Chỉnh sửa nhóm</h2>

        <div className="flex flex-col items-center gap-4 mb-4">
          <button
            onClick={() => editAvatarInputRef.current?.click()}
            className="relative"
          >
            <img
              src={editAvatarPreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(editName)}&background=0a84ff&color=fff&bold=true`}
              alt="Avatar"
              className="w-20 h-20 rounded-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <FiImage size={24} className="text-white" />
            </div>
          </button>
          <input
            ref={editAvatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleEditAvatarChange}
          />
          <p className="text-xs text-[#8e8e93]">Bấm để đổi ảnh đại diện</p>
        </div>

        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Tên nhóm"
          maxLength={50}
          className="w-full px-4 py-2.5 bg-[#f2f2f7] dark:bg-zinc-800 rounded-xl outline-none border-0 focus:ring-2 focus:ring-[#0a84ff] mb-4 text-base"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setShowEditModal(false)}
            disabled={updatingGroup}
            className="flex-1 py-2.5 rounded-xl bg-[#f2f2f7] dark:bg-zinc-800 font-medium active:opacity-60 disabled:opacity-40"
          >
            Hủy
          </button>
          <button
            onClick={handleUpdateGroup}
            disabled={updatingGroup ||!editName.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#0a84ff] text-white font-medium active:opacity-60 disabled:opacity-40"
          >
            {updatingGroup? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}