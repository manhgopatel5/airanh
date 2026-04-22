import { Timestamp } from "firebase/firestore";

/* ================= ENUMS ================= */
export type TaskStatus = "open" | "full" | "in_progress" | "completed" | "cancelled" | "deleted";
export type TaskVisibility = "public" | "private" | "friends";
export type BudgetType = "fixed" | "hourly" | "negotiable";

/* ================= MAIN TYPE ================= */
export type Task = {
  id: string;
  slug: string;
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
  location?: { country?: string; city?: string };
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
  banned: boolean;
  hidden: boolean;

  // Relations
  applicants?: string[];
  reactions?: Record<string, string[]>; // { like: ["uid1"], heart: ["uid2"] }
};

/* ================= CREATE DTO ================= */
export type CreateTaskInput = Pick<Task, 
  | "title" | "description" | "price" | "currency" | "budgetType" 
  | "totalSlots" | "visibility" | "category" | "tags" | "images" 
  | "attachments" | "requirements" | "location" | "isRemote"
  | "applicationDeadline" | "deadline" | "startDate"
>;

/* ================= UPDATE DTO ================= */
export type UpdateTaskInput = Partial<CreateTaskInput>;

/* ================= LIST ITEM - Tối ưu cho card ================= */
export type TaskListItem = Pick<Task,
  | "id" | "slug" | "title" | "price" | "currency" | "totalSlots" 
  | "joined" | "status" | "userName" | "userAvatar" | "userShortId"
  | "userUsername" | "createdAt" | "category" | "tags" | "images"
  | "viewCount" | "likeCount" | "commentCount" | "location" | "isRemote"
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
  parentId?: string; // reply
  likeCount: number;
};
