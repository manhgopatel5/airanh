import { Timestamp } from "firebase/firestore";

/* ================= ENUMS ================= */
export type AppMode = "task" | "plan";

export type TaskStatus =
  | "open"
  | "full"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "deleted"
  | "expired";

export type Visibility = "public" | "private" | "friends";
export type BudgetType = "fixed" | "hourly" | "negotiable";
export type CostType = "free" | "share" | "host";

/* ================= USER ================= */
export type User = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: "admin" | "user";
};

/* ================= BASE ITEM ================= */
export type BaseItem = {
  id: string;
  slug: string;
  shortId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  images: string[];
  attachments?: string[];
  
  // Owner
  userId: string;
  userName: string;
  userAvatar: string;
  userShortId?: string;
  userUsername?: string;

  // Status
  status: TaskStatus;
  visibility: Visibility;
  banned?: boolean;
  hidden?: boolean;
  featured?: boolean;
  featuredUntil?: Timestamp;

  // Time
  createdAt: Timestamp;
  updatedAt: Timestamp;
  edited?: boolean;
  editedAt?: Timestamp;
  deletedAt?: Timestamp;

  // Location
  location?: {
    country?: string;
    city?: string;
    address?: string;
    lat?: number;
    lng?: number;
  };

  // Search
  searchKeywords: string[];

  // Stats
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  bookmarkCount: number;

  // Relations
  applicants?: string[];
  likes?: string[];
  reactions?: Record<string, string[]>;
};

/* ================= TASK TYPE ================= */
export type TaskItem = BaseItem & {
  type: "task";
  price: number;
  currency: string;
  budgetType: BudgetType;
  totalSlots: number;
  joined: number;
  requirements?: string;
  isRemote: boolean;
  applicationDeadline?: Timestamp | null;
  deadline?: Timestamp | null;
  startDate?: Timestamp | null;
};

/* ================= PLAN TYPE ================= */
export type PlanItem = BaseItem & {
  type: "plan";
  eventDate: Timestamp; // Ngày giờ diễn ra
  maxParticipants: number;
  currentParticipants: number;
  costType: CostType;
  costAmount?: number; // Nếu costType = share/host
  allowInvite: boolean;
};

/* ================= UNION TYPE ================= */
export type Task = TaskItem | PlanItem;

/* ================= CREATE DTO ================= */
export type CreateTaskInput = {
  type: "task";
  title: string;
  description: string;
  price: number;
  currency?: string;
  budgetType?: BudgetType;
  totalSlots: number;
  visibility?: Visibility;
  category?: string;
  tags?: string[];
  images?: string[];
  attachments?: string[];
  requirements?: string;
  location?: BaseItem["location"];
  isRemote?: boolean;
  applicationDeadline?: Timestamp | null;
  deadline?: Timestamp | null;
  startDate?: Timestamp | null;
  featured?: boolean;
};

export type CreatePlanInput = {
  type: "plan";
  title: string;
  description: string;
  category: string;
  eventDate: Timestamp;
  maxParticipants: number;
  costType: CostType;
  costAmount?: number;
  allowInvite?: boolean;
  visibility?: Visibility;
  tags?: string[];
  images?: string[];
  location?: BaseItem["location"];
  featured?: boolean;
};

export type CreateItemInput = CreateTaskInput | CreatePlanInput;

/* ================= UPDATE DTO ================= */
export type UpdateTaskInput = Partial<CreateTaskInput>;
export type UpdatePlanInput = Partial<CreatePlanInput>;
export type UpdateItemInput = Partial<CreateItemInput>;

/* ================= LIST ITEM ================= */
export type TaskListItem = Pick<
  TaskItem,
  | "id"
  | "slug"
  | "title"
  | "price"
  | "currency"
  | "totalSlots"
  | "joined"
  | "status"
  | "userName"
  | "userAvatar"
  | "userShortId"
  | "userUsername"
  | "createdAt"
  | "category"
  | "tags"
  | "images"
  | "viewCount"
  | "likeCount"
  | "commentCount"
  | "location"
  | "isRemote"
  | "likes"
  | "budgetType"
  | "userId"
  | "description"
  | "type"
> | Pick<
  PlanItem,
  | "id"
  | "slug"
  | "title"
  | "type"
  | "status"
  | "userName"
  | "userAvatar"
  | "userShortId"
  | "userUsername"
  | "createdAt"
  | "category"
  | "tags"
  | "images"
  | "viewCount"
  | "likeCount"
  | "commentCount"
  | "location"
  | "likes"
  | "userId"
  | "description"
  | "eventDate"
  | "maxParticipants"
  | "currentParticipants"
  | "costType"
  | "costAmount"
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

/* ================= TYPE GUARDS ================= */
export const isTask = (item: Task): item is TaskItem => item.type === "task";
export const isPlan = (item: Task): item is PlanItem => item.type === "plan";

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

  return [...new Set(text.split(/[\s,.-]+/).filter((w) => w.length > 2))].slice(
    0,
    20
  );
};

export const isTaskOpen = (task: Task): boolean => {
  if (!task) return false;
  if (task.status!== "open") return false;
  if (task.banned || task.hidden) return false;
  
  if (isTask(task)) {
    if (task.deadline && task.deadline.toMillis() < Date.now()) return false;
    if (task.joined >= task.totalSlots) return false;
  }
  
  if (isPlan(task)) {
    if (task.eventDate.toMillis() < Date.now()) return false;
    if (task.currentParticipants >= task.maxParticipants) return false;
  }
  
  return true;
};

export const formatTaskPrice = (
  price: number,
  currency = "VND"
): string => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
};

export const formatTaskDeadline = (
  deadline: Timestamp | null | undefined
): string => {
  if (!deadline) return "";
  const date = deadline.toDate();
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const formatEventDate = (date: Timestamp): string => {
  const d = date.toDate();
  return d.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};