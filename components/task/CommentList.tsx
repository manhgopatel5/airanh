"use client";

import { useState, useRef, useEffect } from "react";
import { FiMoreHorizontal, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TaskComment } from "@/types/task";
import MarkdownContent from "@/components/common/MarkdownContent";
import Linkify from "linkify-react";

type Props = {
  comment: TaskComment;
  replies: TaskComment[];
  currentUserId?: string | null | undefined;
  taskOwnerId: string;
  onLike: (id: string) => void;
  onReply: (c: TaskComment) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  isEditing: boolean;
  editText: string;
  setEditText: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onCancelEdit: () => void;
  likingComments: Set<string>;
};

const MAX_TEXT_LINES = 5;

export function CommentList({
  comment: c,
  replies,
  currentUserId,
  taskOwnerId,
  onLike,
  onReply,
  onDelete,
  onEdit,
  isEditing,
  editText,
  setEditText,
  onSaveEdit,
  onCancelEdit,
  likingComments,
}: Props) {
  const liked =!!(currentUserId && c.likedBy?.includes(currentUserId));
  const isOwnComment = currentUserId === c.userId;
  const [showReplies, setShowReplies] = useState(false);
  const [expandedText, setExpandedText] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [showMoreText, setShowMoreText] = useState(false);

  const displayReplies = showReplies? replies : [];

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    if (textRef.current &&!c.deleted &&!isEditing) {
      const lineHeight = parseInt(window.getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * MAX_TEXT_LINES;
      setShowMoreText(textRef.current.scrollHeight > maxHeight + 2);
    }
  }, [c.text, c.deleted, isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, isReply = false, replyId?: string) => {
    if (e.key === "Enter" &&!e.shiftKey) {
      e.preventDefault();
      if (isReply && replyId && editReplyText.trim()) {
        onSaveEdit(replyId);
        setEditingReplyId(null);
        setEditReplyText("");
        navigator.vibrate?.(5);
      } else if (!isReply && editText.trim()) {
        onSaveEdit(c.id);
        navigator.vibrate?.(5);
      }
    }
    if (e.key === "Escape") {
      isReply? setEditingReplyId(null) : onCancelEdit();
      navigator.vibrate?.(5);
    }
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const seconds = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
    if (seconds < 60) return "Vừa xong";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} ngày`;
    return timestamp.toDate().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  };

  const linkifyOptions = {
    target: "_blank",
    className: "text-[#0A84FF] hover:underline break-all font-semibold",
    rel: "noopener noreferrer"
  };

  const renderText = (text: string, replyToUserName?: string) => {
    if (replyToUserName) {
      return (
        <>
          <span className="text-[#0A84FF] font-semibold">@{replyToUserName} </span>
          <MarkdownContent content={text} className="inline" />
        </>
      );
    }

    const hasMarkdown = /[*_#`\[\]]/.test(text);
    if (hasMarkdown) {
      return <MarkdownContent content={text} />;
    }

    const mentionRegex = /@(\w+)/g;
    const parts = text.split(mentionRegex);

    const content = parts.map((part, i) => {
      if (i % 2 === 1) {
        return <span key={i} className="text-[#0A84FF] font-semibold">@{part}</span>;
      }
      return part;
    });

    return <Linkify options={linkifyOptions}>{content}</Linkify>;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", damping: 25, stiffness: 400 }}
      className="text-sm group"
    >
      <div className="flex gap-2.5">
        <UserAvatar src={c.userAvatar} name={c.userName} size={32} />

        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-3 py-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{c.userName}</span>
                {c.userId === taskOwnerId && (
                  <span className="text-xs px-1.5 py-0.5 rounded-md bg-[#0A84FF]/10 text-[#0A84FF] font-semibold">
                    Tác giả
                  </span>
                )}
              </div>

              {isEditing? (
                <div className="mt-1.5">
                  <input
                    ref={editInputRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 outline-none ring-2 ring-[#0A84FF]/50"
                    placeholder="Chỉnh sửa bình luận..."
                  />
                  <div className="flex gap-2 mt-2 justify-end">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onCancelEdit();
                        navigator.vibrate?.(5);
                      }}
                      className="px-3 py-1.5 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all font-semibold"
                    >
                      Huỷ
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onSaveEdit(c.id);
                        navigator.vibrate?.(5);
                      }}
                      disabled={!editText.trim()}
                      className="px-3 py-1.5 text-sm bg-[#0A84FF] hover:bg-[#0071e3] text-white rounded-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Lưu
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div
                  ref={textRef}
                  className={cn(
                    "break-words text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed mt-0.5 whitespace-pre-wrap",
                !expandedText && `line-clamp-${MAX_TEXT_LINES}`
                  )}
                >
                  {c.deleted? (
                    <i className="text-zinc-500 dark:text-zinc-400">Bình luận đã bị xoá</i>
                  ) : (
                    <>
                      {renderText(c.text)}
                      {c.edited && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1.5">· đã chỉnh sửa</span>
                      )}
                    </>
                  )}
                </div>
              )}

              {showMoreText &&!expandedText &&!isEditing &&!c.deleted && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setExpandedText(true);
                    navigator.vibrate?.(5);
                  }}
                  className="text-sm font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 mt-1 transition-colors"
                >
                  Xem thêm
                </motion.button>
              )}
            </div>

            {c.likeCount > 0 &&!isEditing && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-2 -right-2 flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-zinc-900 rounded-full shadow-md border border-zinc-200 dark:border-zinc-700"
              >
                <FaHeart className="text-[#FF3B30]" size={11} />
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{c.likeCount}</span>
              </motion.div>
            )}
          </div>

          {!c.deleted &&!isEditing && (
            <div className="flex items-center gap-4 mt-1.5 px-3 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">{timeAgo(c.createdAt)}</span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onLike(c.id);
                  navigator.vibrate?.(5);
                }}
                disabled={likingComments.has(c.id)}
                className={cn(
                  "font-semibold hover:underline active:scale-95 transition-all disabled:opacity-50",
                  liked && "text-[#0A84FF]"
                )}
              >
                {liked? "Đã thích" : "Thích"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onReply(c);
                  navigator.vibrate?.(5);
                }}
                className="font-semibold hover:underline active:scale-95 transition-all"
              >
                Trả lời
              </motion.button>

              {isOwnComment && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      className="p-1 -m-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                    >
                      <FiMoreHorizontal size={16} className="text-zinc-500 dark:text-zinc-400" />
                    </motion.button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    side="top"
                    sideOffset={4}
                    className="rounded-xl min-w-[140px] p-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-xl border border-zinc-200 dark:border-zinc-800"
                  >
                    <DropdownMenuItem
                      onClick={() => {
                        onEdit(c.id);
                        navigator.vibrate?.(5);
                      }}
                      className="px-3 py-2 text-sm font-semibold rounded-lg cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800"
                    >
                      Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        onDelete(c.id);
                        navigator.vibrate?.(5);
                      }}
                      className="px-3 py-2 text-sm font-semibold rounded-lg cursor-pointer text-[#FF3B30] focus:text-[#FF3B30] focus:bg-red-50 dark:focus:bg-red-950/50"
                    >
                      Xoá
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}

          <AnimatePresence>
            {displayReplies.map((r) => {
              const rLiked =!!(currentUserId && r.likedBy?.includes(currentUserId));
              const isOwnReply = currentUserId === r.userId;
              const isEditingReply = editingReplyId === r.id;

              return (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex gap-2.5 mt-3 group/reply"
                >
                  <UserAvatar src={r.userAvatar} name={r.userName} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-3 py-2 relative">
                      <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{r.userName}</div>

                      {isEditingReply? (
                        <div className="mt-1">
                          <input
                            value={editReplyText}
                            onChange={(e) => setEditReplyText(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, true, r.id)}
                            className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 outline-none ring-2 ring-[#0A84FF]/50"
                            placeholder="Chỉnh sửa..."
                            autoFocus
                          />
                          <div className="flex gap-2 mt-1.5 justify-end">
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setEditingReplyId(null);
                                navigator.vibrate?.(5);
                              }}
                              className="px-2 py-1 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg font-semibold"
                            >
                              Huỷ
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                onSaveEdit(r.id);
                                setEditingReplyId(null);
                                setEditReplyText("");
                                navigator.vibrate?.(5);
                              }}
                              disabled={!editReplyText.trim()}
                              className="px-2 py-1 text-sm bg-[#0A84FF] text-white rounded-lg disabled:opacity-50 font-semibold"
                            >
                              Lưu
                            </motion.button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                          {r.deleted? (
                            <i className="text-zinc-500 dark:text-zinc-400">Bình luận đã bị xoá</i>
                          ) : (
                            renderText(r.text, r.replyToUserName)
                          )}
                        </div>
                      )}

                      {r.likeCount > 0 &&!isEditingReply && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -bottom-2 -right-2 flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-zinc-900 rounded-full shadow-md border border-zinc-200 dark:border-zinc-700"
                        >
                          <FaHeart className="text-[#FF3B30]" size={10} />
                          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">{r.likeCount}</span>
                        </motion.div>
                      )}
                    </div>

                    {!r.deleted &&!isEditingReply && (
                      <div className="flex items-center gap-4 mt-1 px-3 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium">{timeAgo(r.createdAt)}</span>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            onLike(r.id);
                            navigator.vibrate?.(5);
                          }}
                          disabled={likingComments.has(r.id)}
                          className={cn(
                            "font-semibold hover:underline active:scale-95 transition-all disabled:opacity-50",
                            rLiked && "text-[#0A84FF]"
                          )}
                        >
                          {rLiked? "Đã thích" : "Thích"}
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            onReply(r);
                            navigator.vibrate?.(5);
                          }}
                          className="font-semibold hover:underline active:scale-95 transition-all"
                        >
                          Trả lời
                        </motion.button>
                        {isOwnReply && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                className="p-1 -m-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-all active:scale-90 opacity-0 group-hover/reply:opacity-100"
                              >
                                <FiMoreHorizontal size={14} className="text-zinc-500 dark:text-zinc-400" />
                              </motion.button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="top" className="rounded-xl min-w-[140px] p-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingReplyId(r.id);
                                  setEditReplyText(r.text);
                                  navigator.vibrate?.(5);
                                }}
                                className="px-3 py-2 text-sm font-semibold rounded-lg"
                              >
                                Chỉnh sửa
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  onDelete(r.id);
                                  navigator.vibrate?.(5);
                                }}
                                className="px-3 py-2 text-sm font-semibold rounded-lg text-[#FF3B30] focus:text-[#FF3B30]"
                              >
                                Xoá
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {replies.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowReplies(!showReplies);
                navigator.vibrate?.(5);
              }}
              className="mt-2 text-sm font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors flex items-center gap-1 active:scale-95"
            >
              {showReplies? (
                <>
                  <FiChevronUp size={16} />
                  Ẩn bớt
                </>
              ) : (
                <>
                  <FiChevronDown size={16} />
                  Xem {replies.length} phản hồi
                </>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}