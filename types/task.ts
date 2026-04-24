import { Timestamp } from "firebase/firestore";

/* ================= ENUMS ================= */
export type TaskStatus = "open" | "full" | "in_progress" | "completed" | "cancelled" | "deleted" | "expired";
export type TaskVisibility = "public" | "private" | "friends";
export type BudgetType = "fixed" | "hourly" | "negotiable";

/* ================= USER ================= */
export type User = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: "admin" | "user";
};

/* ================= MAIN TYPE ================= */
export type Task = {
  id: string;
  slug: string;
  shortId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  budgetType: BudgetType;
  totalSlots: number;
  joined: number;
  status: TaskStatus;
  visibility: TaskVisibility;

  // Owner
  userId: string;
  userName: string;
  userAvatar: string;
  userShortId?: string;
  userUsername?: string;

  // Time
  createdAt: Timestamp;
  updatedAt: Timestamp;
  applicationDeadline: Timestamp | null;
  deadline: Timestamp | null;
  startDate: Timestamp | null;
  edited?: boolean;
  editedAt?: Timestamp;
  deletedAt?: Timestamp;

  // Meta
  category: string;
  tags: string[];
  images: string[];
  attachments: string[];
  requirements: string;
  location?: { 
    country?: string; 
    city?: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  isRemote: boolean;

  // Search
  searchKeywords: string[];

  // Stats
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;

  // Moderation
  banned?: boolean;
  hidden?: boolean;
  featured?: boolean;
  featuredUntil?: Timestamp;

  // Relations
  applicants?: string[];
  likes?: string[];
  reactions?: Record<string, string[]>;
};

/* ================= CREATE DTO ================= */
export type CreateTaskInput = Pick<Task, 
  | "title" | "description" | "price" | "currency" | "budgetType" 
  | "totalSlots" | "visibility" | "category" | "tags" | "images" 
  | "attachments" | "requirements" | "location" | "isRemote"
  | "applicationDeadline" | "deadline" | "startDate"
> & {
  featured?: boolean;
};

/* ================= UPDATE DTO ================= */
export type UpdateTaskInput = Partial<CreateTaskInput>;

/* ================= LIST ITEM ================= */
export type TaskListItem = Pick<Task,
  | "id" | "slug" | "title" | "price" | "currency" | "totalSlots" 
  | "joined" | "status" | "userName" | "userAvatar" | "userShortId"
  | "userUsername" | "createdAt" | "category" | "tags" | "images"
  | "viewCount" | "likeCount" | "commentCount" | "location" | "isRemote"
  | "likes"
  | "budgetType"
  | "userId"
  | "description" // <-- thêm dòng này
>;

/* ================= PARTICIPANT ================= */
export type TaskParticipant = {
  taskId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  joinedAt: Timestamp;
  status: "joined" | "left" | "kicked" | "completed";
  note?: string;
};

/* ================= COMMENT ================= */
export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  edited?: boolean;
  parentId?: string;
  likeCount: number;
};

/* ================= HELPERS ================= */
export const generateTaskSearchKeywords = ({
  title,
  description,
  tags = [],
  category,
  location,
}: {
  title: string;
  description: string;
  tags?: string[];
  category?: string;
  location?: any;
}): string[] => {
  const text = [
    title,
    description,
    category,
    location?.city,
    location?.country,
    location?.address,
    ...tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return [...new Set(text.split(/[\s,.-]+/).filter((w) => w.length > 2))].slice(0, 20);
};

export const isTaskOpen = (task: Task): boolean => {
  if (!task) return false;
  if (task.status !== "open") return false;
  if (task.banned || task.hidden) return false;
  if (task.deadline && task.deadline.toMillis() < Date.now()) return false;
  if (task.joined >= task.totalSlots) return false;
  return true;
};

export const formatTaskPrice = (price: number, currency = "VND"): string => {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
};

export const formatTaskDeadline = (deadline: Timestamp | null | undefined): string => {
  if (!deadline) return "";
  const date = deadline.toDate();
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};