"use client";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { getFirebaseDB } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Timestamp, limit, startAfter, QueryDocumentSnapshot, DocumentData, doc, updateDoc, arrayUnion, getDoc, getDocs } from "firebase/firestore";
import { FiSend, FiMessageCircle, FiTrash2, FiCornerUpLeft, FiX, FiSmile } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type UserType = { uid: string; name: string; avatar?: string };
type MessageType = {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  attachments?: { url: string; type: "image" }[];
  replyTo?: { id: string; text: string; userName: string };
  createdAt?: Timestamp | null;
  deletedFor?: string[];
  edited?: boolean;
  reactions?: { emoji: string; users: string[] }[];
};

type TaskChatProps = { taskId: string; currentUser: UserType };

const MSG_LIMIT = 40;
const RATE_LIMIT_MS = 1500;

export default function TaskChat({ taskId, currentUser }: TaskChatProps) {
  const db = useMemo(() => getFirebaseDB(), []);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [replyingTo, setReplyingTo] = useState<MessageType | null>(null);
  const [canComment, setCanComment] = useState(false);
  const [showEmoji, setShowEmoji] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const lastSentRef = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getDoc(doc(db, "tasks", taskId)).then((snap) => {
      const data = snap.data();
      const allowed = data?.userId === currentUser.uid || data?.applicants?.includes(currentUser.uid) || data?.members?.includes(currentUser.uid);
      setCanComment(!!allowed);
    });
  }, [taskId, currentUser.uid, db]);

  useEffect(() => {
    const q = query(collection(db, "tasks", taskId, "messages"), orderBy("createdAt", "desc"), limit(MSG_LIMIT));
    const unsub = onSnapshot(q, (snap) => {
      const data: MessageType[] = snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<MessageType, "id">) })).filter((m) => !m.deletedFor?.includes(currentUser.uid)).reverse();
      setMessages(data);
      lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
      setHasMore(snap.docs.length === MSG_LIMIT);
      setLoading(false);
      setTimeout(() => { if (scrollRef.current && data.length <= MSG_LIMIT) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, 100);
    });
    return () => unsub();
  }, [taskId, currentUser.uid, db]);

  const loadMore = useCallback(async () => {
    if (!lastDocRef.current || loadingMore) return;
    setLoadingMore(true);
    const q = query(collection(db, "tasks", taskId, "messages"), orderBy("createdAt", "desc"), startAfter(lastDocRef.current), limit(MSG_LIMIT));
    const snap = await getDocs(q);
    const older = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MessageType)).reverse();
    const prevHeight = scrollRef.current?.scrollHeight || 0;
    setMessages((prev) => [...older, ...prev]);
    lastDocRef.current = snap.docs[snap.docs.length - 1] || null;
    setHasMore(snap.docs.length === MSG_LIMIT);
    setLoadingMore(false);
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight; }, 50);
  }, [taskId, loadingMore, db]);

  const sendMessage = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !canComment) return;
    const now = Date.now();
    if (now - lastSentRef.current < RATE_LIMIT_MS) {
      toast.error(`Chờ ${Math.ceil((RATE_LIMIT_MS - (now - lastSentRef.current)) / 1000)}s`);
      return;
    }
    const badWords = ["đm", "vcl", "clgt", "địt"];
    if (badWords.some((w) => trimmed.toLowerCase().includes(w))) {
      toast.error("Tin nhắn chứa từ ngữ không phù hợp");
      return;
    }
    setSending(true);
    setText("");
    lastSentRef.current = now;
    navigator.vibrate?.(5);
    try {
      await addDoc(collection(db, "tasks", taskId, "messages"), {
        text: trimmed,
        userId: currentUser.uid,
        userName: currentUser.name,
        userAvatar: currentUser.avatar || null,
        replyTo: replyingTo? { id: replyingTo.id, text: replyingTo.text.slice(0, 100), userName: replyingTo.userName } : null,
        createdAt: serverTimestamp(),
        deletedFor: [],
        reactions: [],
      });
      setReplyingTo(null);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    } catch (err) {
      console.error("Lỗi gửi tin:", err);
      setText(trimmed);
      toast.error("Gửi thất bại");
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [text, sending, canComment, taskId, currentUser, replyingTo, db]);

  const deleteMessage = useCallback(async (msgId: string) => {
    if (!confirm("Xóa bình luận này?")) return;
    await updateDoc(doc(db, "tasks", taskId, "messages", msgId), { deletedFor: arrayUnion(currentUser.uid) });
    toast.success("Đã xóa");
    navigator.vibrate?.(5);
  }, [taskId, currentUser.uid, db]);

  const toggleReaction = useCallback(async (msgId: string, emoji: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    const reactions = msg.reactions || [];
    const existing = reactions.find((r) => r.emoji === emoji);
    const newReactions = existing?.users.includes(currentUser.uid)
      ? reactions.map((r) => (r.emoji === emoji? { ...r, users: r.users.filter((u) => u !== currentUser.uid) } : r)).filter((r) => r.users.length > 0)
      : existing
      ? reactions.map((r) => (r.emoji === emoji? { ...r, users: [...r.users, currentUser.uid] } : r))
      : [...reactions, { emoji, users: [currentUser.uid] }];
    await updateDoc(doc(db, "tasks", taskId, "messages", msgId), { reactions: newReactions });
    setShowEmoji(null);
    navigator.vibrate?.(3);
  }, [messages, currentUser.uid, taskId, db]);

  const formatTime = useCallback((timestamp?: Timestamp | null) => {
    if (!timestamp?.seconds) return "now";
    const date = new Date(timestamp.seconds * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "vừa xong";
    if (diffMins < 60) return `${diffMins}p`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }, []);

  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: MessageType[] }[] = [];
    let currentDate = "";
    messages.forEach((msg) => {
      const date = msg.createdAt?.toDate?.()?.toDateString() || "today";
      if (date !== currentDate) {
        groups.push({ date, messages: [] });
        currentDate = date;
      }
      groups[groups.length - 1].messages.push(msg);
    });
    return groups;
  }, [messages]);

  return (
    <div className="mt-4 border-t border-black/5 dark:border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between py-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0a84ff]/10 grid place-items-center">
            <FiMessageCircle size={14} className="text-[#0a84ff]" />
          </div>
          <span className="text-sm font-semibold text-zinc-900 dark:text-white">Thảo luận</span>
          {messages.length > 0 && <span className="text-xs px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-medium">{messages.length}</span>}
        </div>
        {canComment && <span className="text-xs text-[#00C853] font-medium flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#00C853] animate-pulse" />Đang hoạt động</span>}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="relative h-[320px] overflow-y-auto overscroll-contain px-1 -mx-1" onScroll={(e) => { if (e.currentTarget.scrollTop < 50 && hasMore && !loadingMore) loadMore(); }}>
        {/* Load more */}
        <AnimatePresence>
          {hasMore && !loading && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="sticky top-0 z-10 flex justify-center py-2">
              <button onClick={loadMore} disabled={loadingMore} className="px-3 h-7 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 text-xs font-medium text-[#0a84ff] hover:bg-white dark:hover:bg-zinc-900 shadow-sm active:scale-95 transition-all">
                {loadingMore? "Đang tải..." : "Xem thêm"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3 py-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-2.5 animate-pulse">
                <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
                  <div className="h-9 bg-zinc-200 dark:bg-zinc-800 rounded-2xl w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && messages.length === 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 grid place-items-center mb-3">
              <FiMessageCircle size={24} className="text-zinc-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">Chưa có thảo luận</p>
            <p className="text-xs text-zinc-500 mt-1">Bắt đầu cuộc trò chuyện</p>
          </motion.div>
        )}

        {/* Messages list */}
        <div className="space-y-0.5 pb-3">
          {groupedMessages.map((group, groupIdx) => (
            <div key={groupIdx}>
              {/* Date separator */}
              {groupedMessages.length > 1 && (
                <div className="flex items-center justify-center my-4">
                  <div className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text- font-medium text-zinc-500">
                    {new Date(group.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                  </div>
                </div>
              )}
              {group.messages.map((msg, idx) => {
                const isMe = msg.userId === currentUser.uid;
                const prevMsg = group.messages[idx - 1];
                const showAvatar = !prevMsg || prevMsg.userId !== msg.userId;
                const isFirstInGroup = showAvatar;

                return (
                  <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} className={`flex gap-2.5 group/message px-1 ${isMe? "flex-row-reverse" : ""} ${isFirstInGroup? "mt-3" : "mt-0.5"}`}>
                    {/* Avatar */}
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && !isMe && <img src={msg.userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.userName)}&background=0a84ff&color=fff&size=32`} alt={msg.userName} className="w-8 h-8 rounded-full object-cover ring-2 ring-white dark:ring-zinc-950 shadow-sm" />}
                    </div>

                    <div className={`flex flex-col max-w-[78%] ${isMe? "items-end" : "items-start"}`}>
                      {/* Name */}
                      {showAvatar && !isMe && <span className="text- font-semibold text-zinc-700 dark:text-zinc-300 mb-1 px-1">{msg.userName}</span>}

                      {/* Reply preview */}
                      {msg.replyTo && (
                        <div className={`mb-1 px-2.5 py-1.5 rounded-2xl text- max-w-full ${isMe? "bg-[#0a84ff]/15 text-[#0a84ff]" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"}`}>
                          <div className="flex items-center gap-1 font-medium"><FiCornerUpLeft size={10} />{msg.replyTo.userName}</div>
                          <p className="truncate opacity-80">{msg.replyTo.text}</p>
                        </div>
                      )}

                      {/* Bubble */}
                      <div className="relative group/bubble">
                        <div className={`px-3.5 py-2 shadow-sm relative ${isMe? "bg-[#0a84ff] text-white rounded- rounded-br-" : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-zinc-100 dark:border-zinc-700/50 rounded- rounded-bl-"}`}>
                          <p className="text- leading- whitespace-pre-wrap break-words">{msg.text}</p>

                          {/* Actions */}
                          <div className={`absolute top-1/2 -translate-y-1/2 ${isMe? "-left-20" : "-right-20"} hidden group-hover/message:flex items-center gap-0.5 bg-white dark:bg-zinc-900 rounded-full shadow-lg border border-zinc-100 dark:border-zinc-800 p-0.5`}>
                            <button onClick={() => setShowEmoji(showEmoji === msg.id? null : msg.id)} className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"><FiSmile size={14} /></button>
                            <button onClick={() => setReplyingTo(msg)} className="w-7 h-7 grid place-items-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"><FiCornerUpLeft size={14} /></button>
                            {isMe && <button onClick={() => deleteMessage(msg.id)} className="w-7 h-7 grid place-items-center rounded-full hover:bg-red-50 dark:hover:bg-red-950/30 text-zinc-500 hover:text-red-600 transition-colors"><FiTrash2 size={13} /></button>}
                          </div>
                        </div>

                        {/* Emoji picker */}
                        <AnimatePresence>
                          {showEmoji === msg.id && (
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className={`absolute z-20 ${isMe? "right-0" : "left-0"} -top-12 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 p-1.5 flex gap-1`}>
                              {["❤️", "👍", "😂", "😮", "😢", "🙏"].map((emoji) => (
                                <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="w-8 h-8 grid place-items-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl text-lg active:scale-90 transition-all">{emoji}</button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className="flex gap-1 mt-1 px-1">
                          {msg.reactions.map((r) => (
                            <button key={r.emoji} onClick={() => toggleReaction(msg.id, r.emoji)} className={`h-5 px-1.5 rounded-full text- flex items-center gap-0.5 border transition-all active:scale-95 ${r.users.includes(currentUser.uid)? "bg-[#0a84ff]/10 border-[#0a84ff]/30" : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700"}`}>
                              <span>{r.emoji}</span>
                              <span className="text- font-medium">{r.users.length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Time */}
                      <span className="text- text-zinc-400 dark:text-zinc-600 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Input */}
      {!canComment? (
        <div className="mt-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 text-center">
          <p className="text-xs text-zinc-500">Tham gia công việc để thảo luận</p>
        </div>
      ) : (
        <div className="mt-3">
          <AnimatePresence>
            {replyingTo && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-2 overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-[#0a84ff]/5 dark:bg-[#0a84ff]/10 border border-[#0a84ff]/20 rounded-2xl">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FiCornerUpLeft size={14} className="text-[#0a84ff] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#0a84ff]">Trả lời {replyingTo.userName}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{replyingTo.text}</p>
                    </div>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="w-6 h-6 grid place-items-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex-shrink-0 ml-2"><FiX size={14} className="text-zinc-500" /></button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" &&!e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Nhập bình luận..." maxLength={500} disabled={sending} className="w-full h-10 px-4 pr-10 bg-zinc-100 dark:bg-zinc-900 rounded-2xl outline-none text-sm placeholder:text-zinc-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-2 focus:ring-[#0a84ff]/20 focus:shadow-sm transition-all disabled:opacity-50" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text- text-zinc-400 font-medium">{text.length}/500</span>
            </div>
            <motion.button whileTap={{ scale: 0.92 }} onClick={sendMessage} disabled={!text.trim() || sending} className="w-10 h-10 grid place-items-center bg-[#0a84ff] text-white rounded-2xl shadow-lg shadow-[#0a84ff]/25 active:shadow-md disabled:opacity-40 disabled:shadow-none transition-all">
              {sending? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSend size={18} strokeWidth={2} />}
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}