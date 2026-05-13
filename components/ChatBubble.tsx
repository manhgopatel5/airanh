"use client";

import { useState, useCallback } from "react";
import { FiDownload, FiMapPin, FiFile } from "react-icons/fi";
import Linkify from "linkify-react";
import EmojiPicker from "./EmojiPicker";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { motion, AnimatePresence } from "framer-motion";

import type { Message } from "@/types/message";

type Friend = {
  id: string;
  name: string;
  avatar: string;
};

type Props = {
  msg: Message;
  currentUser: { uid: string } | null;
  showAvatar?: boolean;
  avatar?: string;
  onImageClick?: (url: string) => void;
  friend?: Friend | null;
  isLastOfGroup?: boolean;
  onReply?: (msg: Message) => void;
  onReaction?: (messageId: string, emoji: string) => void;
};

export default function ChatBubble({
  msg,
  currentUser,
  showAvatar = false,
  avatar,
  onImageClick,
  friend,
  isLastOfGroup = false,
  onReply,
  onReaction,
}: Props) {
  if (!msg) return null;

  const [imgError, setImgError] = useState(false);
  const [showCopied, setShowCopied] = useState(false);
  const isMe = msg.senderId === currentUser?.uid;

  // ✅ LOTTIE
  const taskShareLottie = "/lotties/huha-task-full.lottie";
  const copyLottie = "/lotties/huha-celebrate-full.lottie";

  const time =
    msg.createdAt &&
    typeof msg.createdAt === "object" &&
    "seconds" in msg.createdAt
   ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Đang gửi...";

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (msg.text) {
        navigator.clipboard.writeText(msg.text);
        navigator.vibrate?.(5);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 1500);
      }
    },
    [msg.text]
  );

  // ✅ FIX: handle cả object lẫn array
  const reactionList = msg.reactions
 ? Object.entries(
        Object.values(msg.reactions).reduce((acc, emoji) => {
          if (typeof emoji === 'string') {
            acc[emoji] = (acc[emoji] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>)
      )
    : [];

  return (
    <div className={`flex items-end gap-2 mb-1 px-2 ${isMe? "justify-end" : "justify-start"} group`}>
      {!isMe && showAvatar && (
        <img
          src={avatar || friend?.avatar || `https://ui-avatars.com/api/?name=U&background=random`}
          className="w-7 h-7 rounded-full object-cover ring-2 ring-gray-50 dark:ring-zinc-800 shrink-0 mb-4"
          alt=""
        />
      )}

      <div className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${isMe? "items-end" : "items-start"}`}>
        {msg.replyTo && (
          <div
            className={`text-xs mb-1 px-3 py-1.5 rounded-2xl max-w-full truncate ${
              isMe
             ? "bg-[#0042B2]/30 text-white/90"
                : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
            }`}
          >
            <span className="font-semibold">{msg.replyTo.userName}: </span>
            {msg.replyTo.text || "Tin nhắn"}
          </div>
        )}

        {/* ✅ TASK SHARE - MỚI THÊM */}
        {msg.type === "task_share" && (
          <motion.div
            initial={{scale:0.9,opacity:0}}
            animate={{scale:1,opacity:1}}
            onDoubleClick={() => onReply?.(msg)}
            className={`px-4 py-3 rounded-3xl shadow-sm w-64 ${
              isMe
             ? "bg-gradient-to-r from-[#0042B2] to-[#0066FF] text-white rounded-br-lg"
                : "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-bl-lg"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 shrink-0">
                <DotLottieReact src={taskShareLottie} autoplay loop style={{width:32,height:32}} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold uppercase tracking-wide ${isMe? "text-white/80" : "text-[#0042B2]"}`}>
                  {msg.taskType === "task"? "TASK" : "PLAN"}
                </p>
                <p className="text-sm font-semibold truncate">{msg.taskTitle}</p>
              </div>
            </div>
            {(msg.price ?? 0) > 0 && (
              <p className={`text-sm font-bold mt-1.5 ${isMe? "text-white" : "text-[#00C853]"}`}>
                {msg.price?.toLocaleString("vi-VN")}đ
              </p>
            )}
          </motion.div>
        )}

        {msg.type === "text" && msg.text && (
          <div
            onContextMenu={handleCopy}
            onDoubleClick={() => onReply?.(msg)}
            className={`px-4 py-2.5 rounded-3xl text- shadow-sm leading-relaxed break-words relative ${
              isMe
             ? "bg-gradient-to-r from-[#0042B2] to-[#1A5FFF] text-white rounded-br-lg"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-lg"
            }`}
          >
            <Linkify
              options={{
                target: "_blank",
                className: isMe? "underline text-white" : "underline text-[#0042B2] dark:text-blue-400",
              }}
            >
              {msg.text}
            </Linkify>
            <AnimatePresence>
              {showCopied && (
                <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 text-white text-xs px-2.5 py-1.5 rounded-xl whitespace-nowrap flex items-center gap-1.5">
                  <div className="w-4 h-4"><DotLottieReact src={copyLottie} autoplay style={{width:16,height:16}} /></div>
                  Đã copy
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {msg.type === "image" && msg.image && (
          <motion.div whileTap={{scale:0.98}} className="relative rounded-3xl overflow-hidden shadow-sm">
            <img
              src={imgError? "/img-error.png" : msg.image}
              onError={() => setImgError(true)}
              onClick={() =>!imgError && onImageClick?.(msg.image!)}
              alt={msg.fileName || "image"}
              className="max-w-[220px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
            />
          </motion.div>
        )}

        {(msg.type as string) === "video" && (msg as any).video && (
          <video
            src={(msg as any).video}
            controls
            playsInline
            className="max-w-[220px] max-h-[300px] rounded-3xl shadow-sm bg-black"
          />
        )}

        {msg.type === "file" && msg.file && (
          <a
            href={msg.file}
            download={msg.fileName}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-4 py-3 rounded-3xl shadow-sm transition active:scale-[0.98] ${
              isMe
             ? "bg-gradient-to-r from-[#0042B2] to-[#1A5FFF] text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            }`}
          >
            <div className={`p-2 rounded-2xl ${isMe? "bg-white/20" : "bg-[#0042B2]/10 dark:bg-[#0042B2]/20"}`}>
              <FiFile size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{msg.fileName || "Tệp đính kèm"}</p>
              <p className={`text-xs ${isMe? "text-white/70" : "text-zinc-500 dark:text-zinc-400"}`}>
                Nhấn để tải xuống
              </p>
            </div>
            <FiDownload size={18} />
          </a>
        )}

        {msg.type === "location" && msg.location?.lat && msg.location?.lng && (
          <a
            href={`https://maps.google.com/?q=${msg.location.lat},${msg.location.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-3 px-4 py-3 rounded-3xl shadow-sm transition active:scale-[0.98] ${
              isMe
             ? "bg-gradient-to-r from-[#0042B2] to-[#1A5FFF] text-white"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            }`}
          >
            <div className={`p-2 rounded-2xl ${isMe? "bg-white/20" : "bg-[#00C853]/10 dark:bg-[#00C853]/20"}`}>
              <FiMapPin size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Vị trí</p>
              <p className={`text-xs truncate ${isMe? "text-white/70" : "text-zinc-500 dark:text-zinc-400"}`}>
                Mở trong Google Maps
              </p>
            </div>
          </a>
        )}

        {reactionList.length > 0 && (
          <div className={`flex gap-1 mt-1.5 ${isMe? "justify-end" : "justify-start"}`}>
            {reactionList.map(([emoji, count]) => (
              <motion.div
                key={emoji}
                initial={{scale:0}}
                animate={{scale:1}}
                className="bg-white dark:bg-zinc-800 text-xs px-2 py-1 rounded-full shadow-md border border-zinc-200 dark:border-zinc-700 backdrop-blur"
              >
                {emoji} {count > 1 && <span className="font-bold ml-0.5">{count}</span>}
              </motion.div>
            ))}
          </div>
        )}

        {isLastOfGroup && (
          <div
            className={`flex items-center gap-1 text- mt-1 px-1 text-zinc-400 dark:text-zinc-500 ${
              isMe? "flex-row-reverse" : ""
            }`}
          >
            <span>{time}</span>
            {isMe && msg.status === "read" && <span className="text-[#00C853]">✓✓</span>}
            {isMe && msg.status === "sent" && <span>✓</span>}
          </div>
        )}
      </div>

      {msg.id && (
        <div className={`opacity-0 group-hover:opacity-100 transition ${isMe? "order-first mr-2" : "ml-2"}`}>
          <EmojiPicker
            onSelect={(e) => msg.id && onReaction?.(msg.id, e)}
            align={isMe? "right" : "left"}
          />
        </div>
      )}
    </div>
  );
}
