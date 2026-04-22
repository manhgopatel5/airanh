import { Timestamp } from "firebase/firestore";

/* ================= ENUMS ================= */
export type UserRole = "user" | "admin" | "moderator";
export type UserStatus = "active" | "banned" | "deleted" | "deactivated";
export type FriendStatus = "pending" | "accepted" | "blocked";

/* ================= MAIN TYPE ================= */
export type User = {
  // Core - bắt buộc
  uid: string;
  shortId: string; // ABC123 - backup nếu chưa có username
  username?: string; // airanh - unique, dùng cho URL đẹp /@airanh
  name: string;
  nameLower: string;
  email: string;
  emailVerified: boolean;
  avatar: string;
  coverPhoto?: string;

  // Profile
  bio?: string;
  phoneNumber?: string;
  phoneVerified?: boolean;
  dateOfBirth?: Timestamp;
  gender?: "male" | "female" | "other";
  location?: { country?: string; city?: string };
  locale: string; // "vi-VN", "en-US"
  timezone: string; // "Asia/Ho_Chi_Minh"

  // Social - denormalized counts
  friendCount: number;
  followerCount: number;
  followingCount: number;

  // Status
  role: UserRole;
  status: UserStatus;
  bannedAt?: Timestamp;
  bannedReason?: string;
  deletedAt?: Timestamp;
  isOnline: boolean;
  lastSeen?: Timestamp;
  lastActiveAt?: Timestamp;
  isVerified: boolean;

  // Notification
  fcmTokens: string[]; // Multi-device

  // Search
  searchKeywords: string[]; // ["nguyen van a", "nguyenvana", "airanh"]
  hidden?: boolean;

  // Time
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Stats
  taskCompletedCount: number;
  taskCreatedCount: number;
  postCount: number;
  reputation: number;

  // Security
  twoFactorEnabled?: boolean;
  lastLoginAt?: Timestamp;
};

/* ================= CREATE DTO ================= */
export type CreateUserInput = Pick<User, "uid" | "name" | "email" | "avatar"> & {
  shortId?: string;
  username?: string;
  locale?: string;
  timezone?: string;
};

/* ================= UPDATE DTO ================= */
export type UpdateUserInput = Partial<
  Pick<
    User,
    | "name"
    | "avatar"
    | "coverPhoto"
    | "bio"
    | "phoneNumber"
    | "dateOfBirth"
    | "gender"
    | "username"
    | "location"
    | "locale"
    | "timezone"
  >
>;

/* ================= PUBLIC PROFILE ================= */
export type PublicUserProfile = Pick<
  User,
  | "uid"
  | "shortId"
  | "username"
  | "name"
  | "avatar"
  | "coverPhoto"
  | "bio"
  | "isOnline"
  | "lastSeen"
  | "isVerified"
  | "friendCount"
  | "followerCount"
  | "taskCompletedCount"
  | "reputation"
  | "location"
>;

/* ================= FRIEND ================= */
export type Friend = {
  id: string; // userId_friendId
  userId: string;
  friendId: string;
  friendName: string;
  friendAvatar: string;
  friendShortId: string;
  friendUsername?: string;
  status: FriendStatus;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
};

/* ================= SETTINGS - Tách riêng cho gọn ================= */
export type UserSettings = {
  uid: string;
  theme: "light" | "dark" | "system";
  emailNotifications: boolean;
  pushNotifications: boolean;
  profileVisibility: "public" | "friends" | "private";
  showOnlineStatus: boolean;
  allowFriendRequests: boolean;
  updatedAt: Timestamp;
};

/* ================= HELPERS ================= */
export const getUserProfileUrl = (user: Pick<User, "username" | "shortId">): string => {
  return user.username? `/@${user.username}` : `/u/${user.shortId}`;
};

export const getUserDisplayName = (user: Pick<User, "name">): string => {
  return user.name?.trim() || "Người dùng ẩn danh";
};

export const isUserOnline = (user: Pick<User, "isOnline" | "lastSeen">): boolean => {
  if (user.isOnline) return true;
  if (!user.lastSeen) return false;
  const diff = Date.now() - user.lastSeen.toMillis();
  return diff < 2 * 60 * 1000; // 2 phút
};

export const formatLastSeen = (
  lastSeen?: Timestamp,
  locale: string = "vi-VN"
): string => {
  if (!lastSeen) return "";

  const diff = Date.now() - lastSeen.toMillis();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return locale.startsWith("vi")? "Vừa xong" : "Just now";
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-days, "day");
};

export const generateSearchKeywords = (user: Pick<User, "name" | "email" | "username" | "shortId">): string[] => {
  const words = user.name.toLowerCase().split(" ");
  const email = user.email.toLowerCase();

  return [
   ...new Set([
      user.name.toLowerCase(),
      user.name.toLowerCase().replace(/\s/g, ""),
      email,
      email.split("@")[0],
      user.shortId.toLowerCase(),
      user.username?.toLowerCase(),
     ...words,
      words[0]?.[0] + words[words.length - 1]?.[0], // "na" từ "nguyen an"
    ]),
  ].filter(Boolean).slice(0, 10) as string[]; // Firestore limit 10
};

// Type guards
export const isUserBanned = (user: Pick<User, "status">): boolean => user.status === "banned";
export const isUserDeleted = (user: Pick<User, "status">): boolean => user.status === "deleted";
export const isUserActive = (user: Pick<User, "status">): boolean => user.status === "active";
