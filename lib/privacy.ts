import type { GeneralSettings } from "@/types/settings";
import type { Timestamp } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { vi, enUS } from "date-fns/locale";

type PrivacySettings = Pick<
  GeneralSettings,
  "hideOnline" | "hideLastSeen" | "hidePhone" | "hideEmail" | "allowStrangers" | "language"
>;

export function getPrivacySettings(raw?: Record<string, unknown> | null): PrivacySettings {
  const s = (raw?.settings || {}) as Partial<GeneralSettings>;
  return {
    hideOnline: s.hideOnline === true,
    hideLastSeen: s.hideLastSeen === true,
    hidePhone: s.hidePhone === true,
    hideEmail: s.hideEmail === true,
    allowStrangers: s.allowStrangers || "everyone",
    language: s.language || "vi",
  };
}

export function formatOnlineStatus(
  online: boolean | undefined,
  lastSeen: Timestamp | undefined,
  privacy: PrivacySettings,
  isOwnProfile: boolean
): string {
  if (!isOwnProfile && privacy.hideOnline && privacy.hideLastSeen) return "Ẩn";
  if (!isOwnProfile && privacy.hideOnline) {
    if (privacy.hideLastSeen) return "Ẩn";
    if (!lastSeen?.toDate) return "Offline";
    const locale = privacy.language === "en" ? enUS : vi;
    return formatDistanceToNow(lastSeen.toDate(), { addSuffix: true, locale });
  }
  if (online) return "Đang hoạt động";
  if (!isOwnProfile && privacy.hideLastSeen) return "Ẩn";
  if (!lastSeen?.toDate) return "Offline";
  const locale = privacy.language === "en" ? enUS : vi;
  return formatDistanceToNow(lastSeen.toDate(), { addSuffix: true, locale });
}

export function showOnlineIndicator(
  online: boolean | undefined,
  privacy: PrivacySettings,
  isOwnProfile: boolean
): boolean {
  if (!online) return false;
  if (isOwnProfile) return true;
  return !privacy.hideOnline;
}

export function maskPhone(
  phone: string | undefined,
  privacy: PrivacySettings,
  isOwnProfile: boolean
): { value: string; hidden: boolean } {
  if (!phone) return { value: "Chưa cập nhật", hidden: false };
  if (!isOwnProfile && privacy.hidePhone) return { value: "Đã ẩn", hidden: true };
  return { value: `••••••${phone.slice(-3)}`, hidden: false };
}

export function maskEmail(
  emailVerified: boolean | undefined,
  privacy: PrivacySettings,
  isOwnProfile: boolean
): { value: string; hidden: boolean } {
  if (!emailVerified) return { value: "Chưa xác minh", hidden: false };
  if (!isOwnProfile && privacy.hideEmail) return { value: "Đã ẩn", hidden: true };
  return { value: "••••••@gmail.com", hidden: false };
}

export function canReceiveMessageFrom(
  privacy: PrivacySettings,
  isFriend: boolean
): boolean {
  if (privacy.allowStrangers === "none") return false;
  if (privacy.allowStrangers === "contacts") return isFriend;
  return true;
}

export function canUseStrangerChat(privacy: PrivacySettings): boolean {
  return privacy.allowStrangers === "everyone";
}
