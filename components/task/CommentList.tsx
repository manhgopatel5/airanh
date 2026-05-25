"use client";

import { useState, useRef, useEffect } from "react";
import { FiMoreHorizontal } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TaskComment } from "@/types/task";

type Props = {
  comment: TaskComment;
  replies: TaskComment[];
  currentUserId?: string | null | undefined;
  taskOwnerId: string; // ✅ Thêm prop này
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

export function CommentList({
  comment: c,
  replies,
  currentUserId,
  taskOwnerId, // ✅ Nhận prop
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
  const [showAllReplies, setShowAllReplies] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const displayReplies = showAllReplies? replies : replies.slice(0, 1);

  useEffect(() => {
    if (isEditing) editInputRef.current?.focus();
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" &&!e.shiftKey) {
      e.preventDefault();
      if (editText.trim()) onSaveEdit(c.id);
    }
    if (e.key === "Escape") onCancelEdit();
  };

  const timeAgo = (timestamp: any) => {
    if (!timestamp?.toDate) return "";
    const seconds = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
    if (seconds < 60) return "Vừa xong";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} giờ`;
    return `${Math.floor(seconds / 86400)} ngày`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="text-[15px] group"
    >
      <div className="flex gap-2.5">
        <UserAvatar src={c.userAvatar} name={c.userName} size={32} />

        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className="bg-transparent px-0 py-1">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold text-[14px]">{c.userName}</div>
                {c.userId === taskOwnerId && ( // ✅ Dùng taskOwnerId
                  <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-[#0a84ff]/10 text-[#0a84ff] font-medium">
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
                    className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-900 text-[15px] outline-none ring-2 ring-[#0a84ff]/50"
                    placeholder="Chỉnh sửa bình luận..."
                  />
                  <div className="flex gap-2 mt-2 justify-end">
                    <button
                      onClick={onCancelEdit}
                      className="px-3 py-1.5 text-[13px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all active:scale-95"
                    >
                      Huỷ
                    </button>
                    <button
                      onClick={() => onSaveEdit(c.id)}
                      disabled={!editText.trim()}
                      className="px-3 py-1.5 text-[13px] bg-[#0a84ff] hover:bg-[#0071e3] text-white rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Lưu
                    </button>
                  </div>
                </div>
              ) : (
                <div className="break-words text-[15px] leading-relaxed mt-0.5 whitespace-pre-wrap">
                  {c.deleted? (
                    <i className="text-zinc-500">Bình luận đã bị xoá</i>
                  ) : (
                    <>
                      {c.text}
                      {c.edited && (
                        <span className="text-[12px] text-zinc-500 ml-1.5">· đã chỉnh sửa</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {c.likeCount > 0 &&!isEditing && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-2 -right-2 flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-zinc-900 rounded-full shadow-md border border-zinc-200 dark:border-zinc-700"
              >
                <FaHeart className="text-red-500" size={11} />
                <span className="text-[12px] font-medium tabular-nums">{c.likeCount}</span>
              </motion.div>
            )}
          </div>

          {!c.deleted &&!isEditing && (
            <div className="flex items-center gap-4 mt-1.5 px-3.5 text-[13px] text-zinc-500">
              <span>{timeAgo(c.createdAt)}</span>
              <button
                onClick={() => onLike(c.id)}
                disabled={likingComments.has(c.id)}
                className={cn(
                  "font-semibold hover:underline active:scale-95 transition-all disabled:opacity-50",
                  liked && "text-red-500"
                )}
              >
                {liked? "Đã thích" : "Thích"}
              </button>
              <button
                onClick={() => onReply(c)}
                className="font-semibold hover:underline active:scale-95 transition-all"
              >
                Trả lời
              </button>

            {isOwnComment && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="p-1 -m-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-all active:scale-90">
        <FiMoreHorizontal size={16} className="text-zinc-500" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent 
      align="end" 
      side="top"
      sideOffset={4}
      className="rounded-xl min-w-[140px] p-1.5 bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-800"
    >
      <DropdownMenuItem 
        onClick={() => onEdit(c.id)}
        className="px-3 py-2 text-[14px] font-medium rounded-lg cursor-pointer focus:bg-zinc-100 dark:focus:bg-zinc-800"
      >
        Chỉnh sửa
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onDelete(c.id)}
        className="px-3 py-2 text-[14px] font-medium rounded-lg cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/50"
      >
        Xoá
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
)}
            </div>
          )}

          <AnimatePresence>
            {displayReplies.map((r) => (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-2.5 mt-3"
              >
                <UserAvatar src={r.userAvatar} name={r.userName} size={28} />
                <div className="flex-1 min-w-0">
                 <div className="bg-white dark:bg-zinc-900 border border-[#F2F2F7] dark:border-zinc-800 rounded-2xl px-3.5 py-2.5">
                    <div className="font-semibold text-[13px]">{r.userName}</div>
                    <div className="text-[14px] leading-relaxed mt-0.5 whitespace-pre-wrap">
                      {r.deleted? ( // ✅ Check deleted cho reply
                        <i className="text-zinc-500">Bình luận đã bị xoá</i>
                      ) : (
                        <>
                          <span className="text-[#0a84ff] font-medium">@{r.replyToUserName}</span>{" "}
                          {r.text}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 px-3.5 text-[12px] text-zinc-500">
                    <span>{timeAgo(r.createdAt)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {replies.length > 1 &&!showAllReplies && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="mt-2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
              — Xem {replies.length - 1} câu trả lời khác
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}