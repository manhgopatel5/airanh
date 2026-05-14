"use client";

import { useState, useRef, useEffect } from "react";
import { FiMoreHorizontal } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { TaskComment } from "@/types/task";
import LottiePlayer from "@/components/LottiePlayer";
import celebrate from "@/public/lotties/huha-celebrate.json";

type Props = {
  comment: TaskComment;
  replies: TaskComment[];
  currentUserId?: string | null;
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

export function CommentList({ comment: c, replies, currentUserId, taskOwnerId, onLike, onReply, onDelete, onEdit, isEditing, editText, setEditText, onSaveEdit, onCancelEdit, likingComments }: Props) {
  const liked =!!(currentUserId && c.likedBy?.includes(currentUserId));
  const isOwnComment = currentUserId === c.userId;
  const [showAllReplies, setShowAllReplies] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const displayReplies = showAllReplies? replies : replies.slice(0, 1);

  useEffect(() => { if (isEditing) editInputRef.current?.focus(); }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" &&!e.shiftKey) { e.preventDefault(); if (editText.trim()) onSaveEdit(c.id); }
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
    <motion.div layout initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,scale:0.95}} className="text- group">
      <div className="flex gap-2.5">
        <UserAvatar src={c.userAvatar} name={c.userName} size={32} />
        <div className="flex-1 min-w-0">
          <div className="relative">
            <div className="px-0 py-1">
              <div className="flex items-center gap-1.5">
                <div className="font-semibold text-">{c.userName}</div>
                {c.userId === taskOwnerId && <span className="text- px-1.5 py-0.5 rounded-md font-medium" style={{background:'rgba(0,66,178,0.1)',color:'#0042B2'}}>Tác giả</span>}
              </div>
              {isEditing? (
                <div className="mt-1.5">
                  <input ref={editInputRef} value={editText} onChange={(e)=>setEditText(e.target.value)} onKeyDown={handleKeyDown} className="w-full px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text- outline-none focus:ring-2 focus:ring-[#0042B2]/30" placeholder="Chỉnh sửa..." />
                  <div className="flex gap-2 mt-2 justify-end">
                    <button onClick={onCancelEdit} className="px-3 py-1.5 text- text-zinc-600 hover:bg-zinc-100 rounded-lg">Huỷ</button>
                    <button onClick={()=>onSaveEdit(c.id)} disabled={!editText.trim()} className="px-3 py-1.5 text- text-white rounded-lg disabled:opacity-50" style={{background:'#0042B2'}}>Lưu</button>
                  </div>
                </div>
              ) : (
                <div className="break-words text- leading-relaxed mt-0.5 whitespace-pre-wrap">
                  {c.deleted? <i className="text-zinc-500">Bình luận đã bị xoá</i> : <>{c.text}{c.edited && <span className="text- text-zinc-500 ml-1.5">· đã sửa</span>}</>}
                </div>
              )}
            </div>
            {c.likeCount > 0 &&!isEditing && (
              <motion.div initial={{scale:0}} animate={{scale:1}} className="absolute -bottom-2 -right-2 flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-zinc-950 rounded-full shadow-md border border-zinc-200 dark:border-zinc-800">
                <FaHeart className="text-red-500" size={11} />
                <span className="text- font-medium tabular-nums">{c.likeCount}</span>
              </motion.div>
            )}
          </div>

{!c.deleted &&!isEditing && (
  <div className="flex items-center gap-4 mt-1.5 px-0 text- text-zinc-500">
    <span>{timeAgo(c.createdAt)}</span>

    <motion.button
      whileTap={{ scale: 0.82 }}
      onClick={() => {
        onLike(c.id);
        navigator.vibrate?.(5);
      }}
      disabled={likingComments.has(c.id)}
      className={cn(
        "relative font-semibold hover:underline disabled:opacity-50 transition-all duration-200",
        liked && "text-red-500"
      )}
    >
      <AnimatePresence>
        {liked && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 18,
            }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none z-10"
          >
            <LottiePlayer
              animationData={celebrate}
              autoplay
              loop={false}
              className="w-12 h-12"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <span className="relative z-">
        {liked? "Đã thích" : "Thích"}
      </span>
    </motion.button>

    <button
      onClick={() => onReply(c)}
      className="font-semibold hover:underline transition-colors hover:text-[#0042B2]"
    >
      Trả lời
    </button>

    {isOwnComment && (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 -m-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors">
            <FiMoreHorizontal
              size={16}
              className="text-zinc-500"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          side="top"
          sideOffset={4}
          className="rounded-2xl min-w-[140px] p-1.5 bg-white dark:bg-zinc-950 shadow-xl border border-zinc-200 dark:border-zinc-900"
        >
          <DropdownMenuItem
            onClick={() => onEdit(c.id)}
            className="px-3 py-2 text- font-medium rounded-xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Chỉnh sửa
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => onDelete(c.id)}
            className="px-3 py-2 text- font-medium rounded-xl cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
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
              <motion.div key={r.id} layout initial={{opacity:0,y:-10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="flex gap-2.5 mt-3">
                <UserAvatar src={r.userAvatar} name={r.userName} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-900 rounded-2xl px-3.5 py-2.5">
                    <div className="font-semibold text-">{r.userName}</div>
                    <div className="text- leading-relaxed mt-0.5 whitespace-pre-wrap">
                      {r.deleted? <i className="text-zinc-500">Đã xoá</i> : <><span className="font-medium" style={{color:'#0042B2'}}>@{r.replyToUserName}</span> {r.text}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-1 px-3.5 text- text-zinc-500"><span>{timeAgo(r.createdAt)}</span></div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {replies.length > 1 &&!showAllReplies && (
            <button onClick={()=>setShowAllReplies(true)} className="mt-2 text- font-semibold text-zinc-500 hover:text-[#0042B2] transition-colors">
              — Xem {replies.length - 1} trả lời
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}