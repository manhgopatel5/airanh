"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiMessageCircle, FiSend, FiX } from "react-icons/fi";
import { createPortal } from "react-dom";
import { CommentList } from "./CommentList";

import type { TaskComment } from "@/types/task";
import type { User } from "firebase/auth";

type Props = {
  taskOwnerId: string;
  comments: TaskComment[];
  currentUser: User | null;
  sending: boolean;
  likingComments: Set<string>;
  onSend: (text: string, user: User, replyTo: TaskComment | null) => Promise<void>;
  onLike: (commentId: string, userId: string) => void;
  onDelete: (commentId: string, userId: string) => void;
  onEdit: (commentId: string, userId: string, text: string) => void;
};

const Portal = ({ children }: { children: React.ReactNode }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted? createPortal(children, document.body) : null;
};

export default function CommentSection({
  taskOwnerId,
  comments,
  currentUser,
  sending,
  likingComments,
  onSend,
  onLike,
  onDelete,
  onEdit
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [commentSort, setCommentSort] = useState<'relevant' | 'newest' | 'all'>('newest');
  const [visibleCount, setVisibleCount] = useState(5);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const parentComments = comments.filter((c) =>!c.parentId);

  const sortedParents = [...parentComments].sort((a, b) => {
    if (commentSort === 'newest') {
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    }
    if (commentSort === 'relevant') {
      if (a.userId === taskOwnerId && b.userId!== taskOwnerId) return -1;
      if (b.userId === taskOwnerId && a.userId!== taskOwnerId) return 1;
      return (b.likeCount || 0) - (a.likeCount || 0);
    }
    return 0;
  });

  const visibleComments = sortedParents.slice(0, visibleCount);
  const hasMoreComments = sortedParents.length > visibleCount;
  const getReplies = (id: string) => comments.filter((c) => c.parentId === id);

  const handleSend = async () => {
    if (!currentUser ||!text.trim()) return;
    try {
      await onSend(text, currentUser, replyTo);
      setText("");
      setReplyTo(null);
      inputRef.current?.blur();
      navigator.vibrate?.(5);
    } catch {}
  };

  const handleLike = (commentId: string) => {
    if (!currentUser) return;
    onLike(commentId, currentUser.uid);
    navigator.vibrate?.(5);
  };

  return (
    <div className="bg-white dark:bg-zinc-950">

      
      <div className="px-4">
        <div className="flex items-center justify-between pb-3">
          <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 leading-5">
            Bình luận ({parentComments.length})
          </h3>

          <div className="relative min-w-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowSortMenu(!showSortMenu);
                navigator.vibrate?.(5);
              }}
              className="flex items-center gap-1 text-sm font-semibold text-zinc-600 dark:text-zinc-400 active:opacity-60 transition-opacity"
            >
              <span className="whitespace-nowrap">
                {commentSort === 'relevant'? 'Phù hợp nhất' : commentSort === 'newest'? 'Mới nhất' : 'Tất cả bình luận'}
              </span>
              <FiChevronDown size={16} className="shrink-0" />
            </motion.button>

            <AnimatePresence>
              {showSortMenu && (
                <Portal>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-t-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 pb-safe"
                  >
                    <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mt-3 mb-2" />
                    <div className="px-4 py-3">
                      <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100 mb-4">Sắp xếp theo</h4>
                      {[
                        { key: 'relevant', label: 'Phù hợp nhất', desc: 'Hiển thị bình luận tác giả và nhiều tương tác trước.' },
                        { key: 'newest', label: 'Mới nhất', desc: 'Hiển thị bình luận mới nhất trước tiên.' },
                        { key: 'all', label: 'Tất cả bình luận', desc: 'Hiển thị tất cả bình luận.' }
                      ].map(item => (
                        <motion.button
                          key={item.key}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { 
                            setCommentSort(item.key as any); 
                            setShowSortMenu(false); 
                            setVisibleCount(5);
                            navigator.vibrate?.(5);
                          }}
                          className="w-full text-left py-3 flex items-start gap-3 active:bg-zinc-100 dark:active:bg-zinc-800 rounded-xl px-2"
                        >
                          <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${commentSort === item.key? 'border-[#0A84FF] bg-[#0A84FF]' : 'border-zinc-300 dark:border-zinc-600'}`}>
                            {commentSort === item.key && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{item.label}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{item.desc}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </Portal>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div>
          {parentComments.length === 0? (
            <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-sm">
              <FiMessageCircle size={48} className="mx-auto mb-3 opacity-30" />
              Chưa có bình luận nào<br />Hãy là người đầu tiên
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {visibleComments.map((c) => (
                  <CommentList
                    key={c.id}
                    comment={c}
                    replies={getReplies(c.id)}
                    currentUserId={currentUser?.uid}
                    taskOwnerId={taskOwnerId}
                    onLike={handleLike}
                    onReply={(c) => { 
                      setReplyTo(c); 
                      inputRef.current?.focus();
                      navigator.vibrate?.(5);
                    }}
                    onDelete={(id) => currentUser && onDelete(id, currentUser.uid)}
                    onEdit={(id) => { setEditingComment(id); setEditText(c.text); }}
                    isEditing={editingComment === c.id}
                    editText={editText}
                    setEditText={setEditText}
                    onSaveEdit={(id) => currentUser && onEdit(id, currentUser.uid, editText)}
                    onCancelEdit={() => { setEditingComment(null); setEditText(""); }}
                    likingComments={likingComments}
                  />
                ))}
              </AnimatePresence>

              {hasMoreComments && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setVisibleCount(prev => prev + 5);
                    navigator.vibrate?.(5);
                  }}
                  className="w-full py-3 text-sm font-semibold text-[#0A84FF] active:bg-zinc-100 dark:active:bg-zinc-800 rounded-xl mt-2 transition-colors"
                >
                  Xem thêm bình luận
                </motion.button>
              )}
            </div>
          )}
        </div>

        <div className="h-4" />

        <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl py-2">
          {replyTo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-zinc-600 dark:text-zinc-400 mb-2 flex items-center justify-between bg-zinc-100 dark:bg-zinc-800 px-3.5 py-2 rounded-xl"
            >
              <span>Đang trả lời <b className="text-zinc-900 dark:text-zinc-100 font-semibold">{replyTo.userName}</b></span>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setReplyTo(null);
                  navigator.vibrate?.(5);
                }}
                className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg active:scale-90 transition-all"
              >
                <FiX size={14} />
              </motion.button>
            </motion.div>
          )}
          <div className="flex gap-2 items-end relative">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" &&!e.shiftKey && handleSend()}
              placeholder={currentUser? "Viết bình luận..." : "Đăng nhập để bình luận"}
              className="flex-1 px-4 py-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-transparent outline-none text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-500 focus:ring-2 focus:ring-[#0A84FF]/20 focus:border-[#0A84FF] transition-all"
              disabled={sending ||!currentUser}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!text.trim() || sending ||!currentUser}
              className="p-2.5 rounded-full bg-[#0A84FF] hover:bg-[#0071e3] text-white disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed active:scale-90 transition-all"
            >
              <FiSend size={18} />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}