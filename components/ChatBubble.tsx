"use client";

import { useState, useCallback } from "react";
import { FiDownload, FiMapPin, FiFile } from "react-icons/fi";
import Linkify from "linkify-react";
import EmojiPicker from "./EmojiPicker";

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
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 1500);
      }
    },
    [msg.text]
  );

  // ✅ FIX: Check reactions tồn tại + có key
  const reactionList = msg.reactions && Object.keys(msg.reactions).length > 0
? Object.entries(
        Object.values(msg.reactions).reduce((acc, emoji) => {
          acc[emoji] = (acc[emoji] || 0) + 1;
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
           ? "bg-blue-400/30 text-white/80"
                : "bg-gray-200 dark:bg-zinc-700 text-gray-600 dark:text-zinc-300"
            }`}
          >
            <span className="font-semibold">{msg.replyTo.userName}: </span>
            {msg.replyTo.text || "Tin nhắn"}
          </div>
        )}

       {msg.type === "text" && msg.text && (
          <div
            onContextMenu={handleCopy}
            onDoubleClick={() => onReply?.(msg)}
            className={`px-4 py-2.5 rounded-3xl text-sm shadow-sm leading-relaxed break-words relative ${
              isMe
           ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-br-lg"
                : "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100 rounded-bl-lg"
            }`}
          >
            <Linkify
              options={{
                target: "_blank",
                className: isMe? "underline text-white" : "underline text-blue-600 dark:text-blue-400",
              }}
            >
              {msg.text}
            </Linkify>
            {showCopied && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap">
                Đã copy
              </div>
            )}
          </div>
        )}

        {msg.type === "image" && msg.image && (
          <div className="relative rounded-3xl overflow-hidden shadow-sm">
            <img
              src={imgError? "/img-error.png" : msg.image}
              onError={() => setImgError(true)}
              onClick={() =>!imgError && onImageClick?.(msg.image!)}
              alt={msg.fileName || "image"}
              className="max-w-[220px] max-h-[300px] object-cover cursor-pointer hover:opacity-90 transition-opacity"
            />
          </div>
        )}

        {msg.type === "video" && msg.video && (
          <video
            src={msg.video}
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
           ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                : "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
            }`}
          >
            <div className={`p-2 rounded-2xl ${isMe? "bg-white/20" : "bg-blue-500/10 dark:bg-blue-400/20"}`}>
              <FiFile size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{msg.fileName || "Tệp đính kèm"}</p>
              <p className={`text-xs ${isMe? "text-white/70" : "text-gray-500 dark:text-zinc-400"}`}>
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
           ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                : "bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-gray-100"
            }`}
          >
            <div className={`p-2 rounded-2xl ${isMe? "bg-white/20" : "bg-emerald-500/10 dark:bg-emerald-400/20"}`}>
              <FiMapPin size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Vị trí</p>
              <p className={`text-xs truncate ${isMe? "text-white/70" : "text-gray-500 dark:text-zinc-400"}`}>
                {msg.location?.address || "Mở trong Google Maps"}
              </p>
            </div>
          </a>
        )}

        {reactionList.length > 0 && (
          <div className={`flex gap-1 mt-1 ${isMe? "justify-end" : "justify-start"}`}>
            {reactionList.map(([emoji, count]) => (
              <div
                key={emoji} // ✅ FIX: Thêm key
                className="bg-white dark:bg-zinc-700 text-xs px-1.5 py-0.5 rounded-full shadow border border-gray-200 dark:border-zinc-600"
              >
                {emoji} {count > 1 && count}
              </div>
            ))}
          </div>
        )}

        {isLastOfGroup && (
          <div
            className={`flex items-center gap-1 text-xs mt-1 px-1 text-gray-400 dark:text-zinc-500 ${
              isMe? "flex-row-reverse" : ""
            }`}
          >
            <span>{time}</span>
            {isMe && msg.status === "read" && <span className="text-blue-500">✓✓</span>}
            {isMe && msg.status === "sent" && <span>✓</span>}
          </div>
        )}
      </div>

      {/* ✅ EMOJI REACTION BUTTON - FIX: Check msg.id */}
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
