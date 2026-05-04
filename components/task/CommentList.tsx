"use client";

import { useState } from "react";
import { FiCheck, FiX } from "react-icons/fi";
import { FaRegHeart, FaHeart } from "react-icons/fa";
import { motion } from "framer-motion";
import { UserAvatar } from "@/components/ui/UserAvatar";
import type { TaskComment } from "@/types/task";

const PRIMARY = "#0a84ff";

type Props = {
  comment: TaskComment;
  replies: TaskComment[];
  currentUserId?: string | null | undefined; // nhận đủ 3 case
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
  const liked = currentUserId && c.likedBy?.includes(currentUserId);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const displayReplies = showAllReplies? replies : replies.slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="text-[15px]"
    >
      <div className="flex gap-2.5">
        <UserAvatar src={c.userAvatar} name={c.userName} size={32} />
        <div className="flex-1 min-w-0">
          <div className="bg-[#F2F2F7] dark:bg-zinc-800 rounded-2xl px-3.5 py-2.5">
            <div className="font-semibold text-[14px]">{c.userName}</div>
            {isEditing? (
              <div className="mt-1 flex gap-2">
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSaveEdit(c.id)}
                  className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 text-[14px]"
                  autoFocus
                />
                <button onClick={() => onSaveEdit(c.id)} className="p-1 text-[#0a84ff] hover:scale-110 transition-all">
                  <FiCheck size={16} />
                </button>
                <button onClick={onCancelEdit} className="p-1 hover:scale-110 transition-all">
                  <FiX size={16} />
                </button>
              </div>
            ) : (
              <div className="break-words text-[15px] leading-relaxed mt-0.5">
                {c.deleted? <i className="text-zinc-500">Đã xóa</i> : c.text}
                {c.edited && <span className="text-[12px] text-zinc-500 ml-1">(đã sửa)</span>}
              </div>
            )}
          </div>

          {!c.deleted &&!isEditing && (
            <div className="flex gap-4 mt-1.5 text-[13px] text-zinc-500 px-3.5">
              <button
                onClick={() => onLike(c.id)}
                disabled={likingComments.has(c.id)}
                className="flex items-center gap-1.5 hover:text-red-500 active:scale-90 transition-all disabled:opacity-50"
              >
                {liked? <FaHeart className="text-red-500" size={13} /> : <FaRegHeart size={13} />}
                <span className="tabular-nums">{c.likeCount || ""}</span>
              </button>
              <button onClick={() => onReply(c)} className="hover:text-[#0a84ff] active:scale-90 transition-all">
                Trả lời
              </button>
              {currentUserId === c.userId && (
                <>
                  <button onClick={() => onEdit(c.id)} className="hover:text-[#0a84ff] active:scale-90 transition-all">
                    Sửa
                  </button>
                  <button onClick={() => onDelete(c.id)} className="hover:text-red-500 active:scale-90 transition-all">
                    Xóa
                  </button>
                </>
              )}
            </div>
          )}

          {/* REPLIES */}
          {displayReplies.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-2.5 mt-3 ml-4"
            >
              <UserAvatar src={r.userAvatar} name={r.userName} size={28} />
              <div className="flex-1 min-w-0">
                <div className="bg-[#F2F2F7] dark:bg-zinc-800 rounded-2xl px-3.5 py-2.5">
                  <div className="font-semibold text-[13px]">{r.userName}</div>
                  <div className="text-[14px] leading-relaxed mt-0.5">
                    <span className={`text-[${PRIMARY}] font-medium`}>@{r.replyToUserName}</span> {r.text}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {replies.length > 2 &&!showAllReplies && (
            <button
              onClick={() => setShowAllReplies(true)}
              className="ml-4 mt-2 text-[13px] text-zinc-500 hover:text-[#0a84ff] transition-colors"
            >
              Xem {replies.length - 2} phản hồi khác
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}