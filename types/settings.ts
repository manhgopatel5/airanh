export type GeneralSettings = {
  theme: "light" | "dark" | "system";
  accentTask: "blue" | "indigo" | "purple";
  accentPlan: "green" | "emerald" | "teal";
  fontSize: "small" | "medium" | "large";
  compactMode: boolean;
  reduceMotion: boolean;
  hideOnline: boolean;
  hideLastSeen: boolean;
  hidePhone: boolean;
  hideEmail: boolean;
  allowStrangers: "everyone" | "contacts" | "none";
  blockedUsers: BlockedUserEntry[];
  language: "vi" | "en";
  timezone: string;
  dateFormat: "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  currency: "VND" | "USD" | "EUR";
  autoDeleteMsg: "off" | "7d" | "30d" | "90d";
};

export type BlockedUserEntry = string | { uid: string; blockedAt?: unknown };

export type NotificationSettings = {
  notiTaskAssigned?: boolean;
  notiTaskDue?: boolean;
  notiPlanInvite?: boolean;
  notiPlanDeadline?: boolean;
  notiChatMention?: boolean;
  notiChatAll?: boolean;
  notiFriendRequest?: boolean;
  notiFriendAccepted?: boolean;
  emailDigest?: "off" | "daily" | "weekly";
  quietHours?: { enabled?: boolean; from?: string; to?: string };
};

export type UserSettings = GeneralSettings & NotificationSettings;

export const DEFAULT_GENERAL_SETTINGS: GeneralSettings = {
  theme: "system",
  accentTask: "blue",
  accentPlan: "green",
  fontSize: "medium",
  compactMode: false,
  reduceMotion: false,
  hideOnline: false,
  hideLastSeen: false,
  hidePhone: false,
  hideEmail: false,
  allowStrangers: "everyone",
  blockedUsers: [],
  language: "vi",
  timezone: "Asia/Ho_Chi_Minh",
  dateFormat: "DD/MM/YYYY",
  currency: "VND",
  autoDeleteMsg: "off",
};

export const TIMEZONE_OPTIONS = [
  { label: "Việt Nam (GMT+7)", value: "Asia/Ho_Chi_Minh" },
  { label: "Bangkok (GMT+7)", value: "Asia/Bangkok" },
  { label: "Singapore (GMT+8)", value: "Asia/Singapore" },
  { label: "Tokyo (GMT+9)", value: "Asia/Tokyo" },
  { label: "Seoul (GMT+9)", value: "Asia/Seoul" },
  { label: "Sydney (GMT+10)", value: "Australia/Sydney" },
  { label: "Dubai (GMT+4)", value: "Asia/Dubai" },
  { label: "London (GMT+0)", value: "Europe/London" },
  { label: "Paris (GMT+1)", value: "Europe/Paris" },
  { label: "New York (GMT-5)", value: "America/New_York" },
  { label: "Los Angeles (GMT-8)", value: "America/Los_Angeles" },
] as const;
