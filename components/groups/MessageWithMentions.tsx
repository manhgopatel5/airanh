"use client";

/** Render text với highlight @mention */
export function MessageWithMentions({ text, isMe }: { text: string; isMe?: boolean }) {
  const parts = text.split(/(@[^\s@]+)/g);
  return (
    <span className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <span
            key={i}
            className={`font-bold ${isMe ? "text-blue-100 underline decoration-blue-200" : "text-blue-600 dark:text-blue-400"}`}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}
