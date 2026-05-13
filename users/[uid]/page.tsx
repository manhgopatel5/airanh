import { Timestamp } from "firebase/firestore";

/* ================= HUHA CONSTANTS ================= */
export const HUHA = {
  APP_NAME: "HUHA",
  SHORT_ID_LENGTH: 6,
  MAX_SEARCH_KEYWORDS: 10,
  ONLINE_THRESHOLD_MS: 2 * 60 * 1000, // 2 phút
} as const;

/* ================= ENUMS ================= */
export type UserRole = "user" | "admin" | "moderator" | "creator";
export type UserStatus = "active" | "banned" | "deleted" | "deactivated" | "pending";
export type FriendStatus = "pending" | "accepted" | "blocked" | "muted";
export type Gender = "male" | "female" | "other" | "prefer_not_say";

/* ================= MAIN TYPE ================= */
export type User = {
  // Core - bắt buộc
  uid: string;
  shortId: string; // HUHA123
  username?: string; // @huha - unique
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
  gender?: Gender;
  location?: { country?: string; city?: string; lat?: number; lng?: number };
  locale: string;
  timezone: string;

  // Social - denormalized
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
  verifiedAt?: Timestamp;

  // Notification
  fcmTokens: string[];

  // Search
  searchKeywords: string[];
  hidden?: boolean;

  // Time
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Stats - HUHA gamification
  taskCompletedCount: number;
  taskCreatedCount: number;
  planCompletedCount: number;
  postCount: number;
  reputation: number;
  level: number;
  xp: number;

  // Security
  twoFactorEnabled?: boolean;
  lastLoginAt?: Timestamp;
  lastLoginIp?: string;
  loginCount: number;
};

/* ================= CREATE DTO ================= */
export type CreateUserInput = Pick<User, "uid" | "name" | "email" | "avatar"> & {
  shortId?: string;
  username?: string;
  locale?: string;
  timezone?: string;
  phoneNumber?: string;
};

/* ================= UPDATE DTO ================= */
export type UpdateUserInput = Partial<
  Pick<User, "name" | "avatar" | "coverPhoto" | "bio" | "phoneNumber" | "dateOfBirth" | "gender" | "username" | "location" | "locale" | "timezone">
>;

/* ================= PUBLIC PROFILE ================= */
export type PublicUserProfile = Pick<User, "uid" | "shortId" | "username" | "name" | "avatar" | "coverPhoto" | "bio" | "isOnline" | "lastSeen" | "isVerified" | "friendCount" | "followerCount" | "taskCompletedCount" | "reputation" | "location" | "level">;

/* ================= FRIEND ================= */
export type Friend = {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  friendAvatar: string;
  friendShortId: string;
  friendUsername?: string;
  status: FriendStatus;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  mutualFriends?: number;
};

/* ================= SETTINGS ================= */
export type UserSettings = {
  uid: string;
  theme: "light" | "dark" | "system";
  accentColor: "#0042B2" | "#00C853" | "#FF9500";
  emailNotifications: boolean;
  pushNotifications: boolean;
  profileVisibility: "public" | "friends" | "private";
  showOnlineStatus: boolean;
  allowFriendRequests: boolean;
  language: "vi" | "en";
  updatedAt: Timestamp;
};

/* ================= HELPERS ================= */
export const getUserProfileUrl = (user: Pick<User, "username" | "shortId">): string => {
  return user.username? `/@${user.username}` : `/u/${user.shortId}`;
};

export const getUserDisplayName = (user: Pick<User, "name">): string => {
  return user.name?.trim() || "Người dùng HUHA";
};

export const isUserOnline = (user: Pick<User, "isOnline" | "lastSeen">): boolean => {
  if (user.isOnline) return true;
  if (!user.lastSeen) return false;
  return Date.now() - user.lastSeen.toMillis() < HUHA.ONLINE_THRESHOLD_MS;
};

export const formatLastSeen = (lastSeen?: Timestamp, locale: string = "vi-VN"): string => {
  if (!lastSeen) return "";
  const diff = Date.now() - lastSeen.toMillis();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return locale.startsWith("vi")? "Vừa xong" : "Just now";
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (hours < 24) return rtf.format(-hours, "hour");
  if (days < 7) return rtf.format(-days, "day");
  return lastSeen.toDate().toLocaleDateString(locale);
};

export const generateSearchKeywords = (user: Pick<User, "name" | "email" | "username" | "shortId">): string[] => {
  const name = user.name.toLowerCase().trim();
  const words = name.split(/\s+/);
  const email = user.email.toLowerCase();
  const username = user.username?.toLowerCase() || "";

  const keywords = new Set<string>([
    name,
    name.replace(/\s/g, ""),
    email,
    email.split("@")[0],
    user.shortId.toLowerCase(),
    username,
   ...words,
    words.map(w => w[0]).join(""), // viết tắt
  ].filter(Boolean));

  return Array.from(keywords).slice(0, HUHA.MAX_SEARCH_KEYWORDS);
};

export const generateShortId = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length: HUHA.SHORT_ID_LENGTH}, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

// Type guards
export const isUserBanned = (user: Pick<User, "status">): boolean => user.status === "banned";
export const isUserDeleted = (user: Pick<User, "status">): boolean => user.status === "deleted";
export const isUserActive = (user: Pick<User, "status">): boolean => user.status === "active";
export const isUserVerified = (user: Pick<User, "isVerified" | "emailVerified">): boolean => user.isVerified && user.emailVerified;

// Validation
export const validateUsername = (username: string): boolean => {
  return /^[a-z0-9_]{3,20}$/.test(username);
};

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2 && name.trim().length <= 50;
};