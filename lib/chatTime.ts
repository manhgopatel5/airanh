import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { Timestamp } from "firebase/firestore";

const ONE_HOUR_MS = 60 * 60 * 1000;

type WithTime = { createdAt?: Timestamp | null };

function toDate(ts?: Timestamp | null): Date | null {
  if (!ts) return null;
  try {
    return ts.toDate();
  } catch {
    return null;
  }
}

/** Ngày đổi → hiện "Hôm nay" / "Hôm qua" / dd/MM/yyyy */
export function shouldShowChatDateDivider(prev: WithTime | undefined, curr: WithTime): boolean {
  const currDate = toDate(curr.createdAt);
  if (!currDate) return false;
  const prevDate = toDate(prev?.createdAt);
  if (!prevDate) return true;
  return prevDate.toDateString() !== currDate.toDateString();
}

/** Cùng ngày, cách ≥ 1 giờ → hiện HH:mm căn giữa */
export function shouldShowChatTimeDivider(prev: WithTime | undefined, curr: WithTime): boolean {
  const currDate = toDate(curr.createdAt);
  if (!currDate) return false;
  const prevDate = toDate(prev?.createdAt);
  if (!prevDate) return true;
  if (prevDate.toDateString() !== currDate.toDateString()) return false;
  return currDate.getTime() - prevDate.getTime() >= ONE_HOUR_MS;
}

export function formatChatDateDivider(time: Timestamp): string {
  const date = time.toDate();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Hôm nay";
  if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";
  return format(date, "dd/MM/yyyy", { locale: vi });
}

export function formatChatTimeDivider(time: Timestamp): string {
  return format(time.toDate(), "HH:mm", { locale: vi });
}
