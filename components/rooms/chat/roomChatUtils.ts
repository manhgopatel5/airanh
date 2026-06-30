import { format, isToday, isYesterday } from "date-fns";
import { vi } from "date-fns/locale";
import { createElement } from "react";

export type RoomMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  createdAt: { toDate?: () => Date } | null;
  type?: "text" | "poll" | "system";
  pollData?: {
    question: string;
    options: { text: string; votes: string[] }[];
    creatorId: string;
    createdAt: unknown;
    allowMultiple: boolean;
    endTime?: { toDate: () => Date };
    closed?: boolean;
  };
};

export function highlightText(text: string, query: string) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? createElement(
          "mark",
          { key: i, className: "rounded bg-yellow-300/80 px-0.5 dark:bg-yellow-600/80" },
          part
        )
      : part
  );
}

export function shouldShowTimeDivider(
  msg: RoomMessage,
  prevMsg: RoomMessage | undefined
): boolean {
  if (!prevMsg?.createdAt || !msg.createdAt) return true;
  const prev = prevMsg.createdAt.toDate?.();
  const curr = msg.createdAt.toDate?.();
  if (!prev || !curr) return true;
  return curr.getTime() - prev.getTime() > 5 * 60 * 1000;
}

export function formatTimeDivider(timestamp: RoomMessage["createdAt"]): string {
  if (!timestamp?.toDate) return "";
  const date = timestamp.toDate();
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return `Hôm qua ${format(date, "HH:mm")}`;
  return format(date, "dd/MM/yyyy HH:mm", { locale: vi });
}
