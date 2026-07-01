import { Timestamp } from "firebase/firestore";

/* ================= ENUMS ================= */
export type AppMode = "task" | "plan";

export type TaskStatus =
  | "open"
  | "full"
  | "doing"
  | "completed"
  | "cancelled"
  | "deleted"
  | "expired"
  | "pending"; 

export type Visibility = "public" | "private" | "friends" | "unlisted";
export type BudgetType = "fixed" | "hourly" | "negotiable";
export type CostType = "free" | "share" | "host" | "ticket";
export type PaymentMethod = "app" | "cash"; 

export type PlanParticipantRole = "owner" | "admin" | "member";
export type PlanStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled";

/* ================= USER ================= */
export type User = {
  uid: string;
  email?: string | null;
  displayName?: string | null; // Đổi từ displayName? -> đúng rồi
  photoURL?: string | null; // Đổi từ photoURL? -> đúng rồi
  role?: "admin" | "user";
  shortId?: string;
  username?: string;
  verified?: boolean; // Thêm
  onboardingCompleted: boolean;
};

/* ================= BASE ITEM ================= */
export type BaseItem = {
  id: string;
  slug: string;
  shortId: string;
  title: string;
  assignees?: string[]; 
  savedBy?: string[]; 
  description: string;
  category: string;
  tags: string[]; 
  images: string[];
  attachments?: string[];
  
  // Owner - DENORMALIZED SNAPSHOT
  userId: string;
  userName: string; // Snapshot: lấy từ users.displayName lúc tạo
  userAvatar: string | null; // Snapshot: lấy từ users.photoURL lúc tạo
  userVerified?: boolean; 
  userShortId?: string;
  userUsername?: string;
authorVipTier?: 'pro' | 'elite' | null;
  authorVipExpiresAt?: Timestamp | null;
  // Status
  status: TaskStatus;
  visibility: Visibility;
  banned?: boolean;
  hidden?: boolean;
  featured?: boolean;
  allowedViewerIds?: string[];
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
    district?: string;
    ward?: string;
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
  hotScore?: number; // THÊM DÒNG NÀY
  priceRange?: string; // THÊM DÒNG NÀY

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
  paymentMethod?: PaymentMethod;
  totalSlots: number;
  joined: number;
  appliedCount?: number;  
  requirements?: string;

  rating?: number;
  xpClaimed?: boolean;
  isRemote: boolean;
  applicationDeadline?: Timestamp | null;
  deadline?: Timestamp | null;
  startDate?: Timestamp | null;
  urgency?: "once" | "urgent" | "flexible";
  milestones?: boolean;
  autoMatch?: boolean;
  allowBids?: boolean;
  nda?: boolean;
  invites?: string[];
  needApproval?: boolean;
  recurring?: string;
};

/* ================= PLAN TYPE ================= */
export type PlanMilestone = {
  id: string;
  title: string;
  description?: string;
  dueDate?: Timestamp;
  completed: boolean;
  completedAt?: Timestamp;
  assignedTo?: string[]; 
  order: number;
};

export type PlanParticipant = {
  userId: string;
  userName: string; // Snapshot từ users.displayName
  userAvatar: string | null; // Snapshot từ users.photoURL
  role: PlanParticipantRole;
  joinedAt: Timestamp;
  permissions: {
    canEdit: boolean;
    canInvite: boolean;
    canManageTasks: boolean;
    canManageMembers: boolean;
  };
  invitedBy?: string;
  status: "active" | "left" | "kicked";
};

export type PlanItem = BaseItem & {
  type: "plan";
  
  // Timeline
  eventDate: Timestamp; 
  endDate?: Timestamp; 
  milestones: PlanMilestone[];

  // Participants
  participants: PlanParticipant[];
  maxParticipants: number;
  currentParticipants: number;
  totalSlots: number; 
  appliedCount?: number;
  inviteCode?: string; 
  allowInvite: boolean;
  rating?: number; // Thêm dòng này - đánh giá 1-5 sao
  xpClaimed?: boolean;
  // Cost
  costType: CostType;
  costAmount?: number; 
  costDescription?: string; 
  paymentMethod?: PaymentMethod; 

  // Settings
  autoAccept?: boolean; 
  requireApproval?: boolean; 
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
  paymentMethod?: PaymentMethod; 
  totalSlots: number;
  visibility?: Visibility;
  category?: string;
  tags?: string[];
  images?: string[];
  attachments?: string[];
  requirements?: string;
  location?: BaseItem["location"];
  isRemote?: boolean;
authorVipTier?: 'pro' | 'elite' | null;
  authorVipExpiresAt?: any; // Firestore Timestamp
  applicationDeadline?: Timestamp | null;
  deadline?: Timestamp | null;
  startDate?: Timestamp | null;
  featured?: boolean;
  urgency?: "once" | "urgent" | "flexible";
  milestones?: boolean;
  autoMatch?: boolean;
  allowBids?: boolean;
  nda?: boolean;
  invites?: string[];
  needApproval?: boolean;
  allowInvite?: boolean;
  recurring?: string;
  allowedViewerIds?: string[];
};

export type CreatePlanInput = {
  type: "plan";
  title: string;
  description: string;
  category: string;
  eventDate: Timestamp;
  endDate?: Timestamp;
  maxParticipants: number;
  totalSlots: number; 
  costType: CostType;
  costAmount?: number;
  costDescription?: string;
authorVipTier?: 'pro' | 'elite' | null;
  authorVipExpiresAt?: any;
  paymentMethod?: PaymentMethod; 
  allowInvite?: boolean;
  autoAccept?: boolean;
  requireApproval?: boolean;
  visibility?: Visibility;
  tags?: string[];
  images?: string[];
  attachments?: string[];
  location?: BaseItem["location"];
  milestones?: Omit<PlanMilestone, "id" | "completedAt" | "order">[];
  featured?: boolean;
  allowedViewerIds?: string[];
};

export type CreateItemInput = CreateTaskInput | CreatePlanInput;

/* ================= UPDATE DTO ================= */
export type UpdateTaskInput = Partial<Omit<CreateTaskInput, "type">>;
export type UpdatePlanInput = Partial<Omit<CreatePlanInput, "type">>;
export type UpdateItemInput = Partial<CreateItemInput>;

/* ================= LIST ITEM ================= */
export type TaskListItem = Pick<
  TaskItem,
  | "id"
  | "slug"
  | "shortId"
  | "title"
  | "price"
  | "currency"
  | "totalSlots"
  | "joined"
  | "status"
  | "userName"
  | "userVerified" 
  | "rating" 
  | "xpClaimed" 
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
  | "hotScore" // THÊM DÒNG NÀY
  | "priceRange" // THÊM DÒNG NÀY
  | "location"
  | "isRemote"
  | "likes"
  | "budgetType"
  | "paymentMethod" 
  | "userId"
  | "description"
  | "type"
  | "deadline"
  | "startDate"
  | "savedBy"     
  | "applicants"
  | "assignees"
  | "appliedCount"
  | "banned"
  | "hidden"
>;

export type PlanListItem = Pick<
  PlanItem,
  | "id"
  | "slug"
  | "shortId"
  | "title"
  | "type"
  | "status"
  | "userName"
  | "userAvatar"
  | "userShortId"
  | "userUsername"
  | "createdAt"
  | "category"
  | "userVerified" 
  | "tags"
  | "images"
  | "rating" 
  | "xpClaimed" 
  | "viewCount"
  | "likeCount"
  | "commentCount"
  | "hotScore" // THÊM DÒNG NÀY
  | "priceRange" // THÊM DÒNG NÀY
  | "location"
  | "likes"
  | "userId"
  | "description"
  | "eventDate"
  | "endDate"
  | "maxParticipants"
  | "currentParticipants"
  | "totalSlots" 
  | "appliedCount"
  | "costType"
  | "costAmount"
  | "paymentMethod" 
  | "milestones"
  | "participants"
  | "savedBy"      
  | "applicants"
  | "assignees"
  | "banned"
  | "hidden"
>;

export type ItemListItem = TaskListItem | PlanListItem;

/* ================= FEED TYPE CHO ISR ================= */
export type FeedTask = (TaskListItem | PlanListItem) & {
  createdAt: string | null;
  updatedAt?: string | null;
  deadline?: string | null;
  eventDate?: string | null;
  endDate?: string | null;
  startDate?: string | null;
authorVipTier?: 'pro' | 'elite' | null;
  authorVipExpiresAt?: any;
  applicationDeadline?: string | null;
  visibility?: 'public' | 'private' | 'friends'
  shortId?: string;
  hotScore?: number; // THÊM DÒNG NÀY
  priceRange?: string; // THÊM DÒNG NÀY
  rating?: number; // Thêm dòng này
  xpClaimed?: boolean; //
};

/* ================= PARTICIPANT ================= */
export type TaskParticipant = {
  taskId: string;
  userId: string;
  userName: string; // Snapshot từ users.displayName
  userAvatar: string | null; // Snapshot từ users.photoURL
  joinedAt: Timestamp;
  status: "joined" | "left" | "kicked" | "completed";
  note?: string;
};

/* ================= COMMENT ================= */
export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  userName: string; // Snapshot từ users.displayName
  userAvatar: string | null; // Snapshot từ users.photoURL
  text: string; 
  createdAt: Timestamp;
  taskOwnerId?: string;
  updatedAt?: Timestamp;
  edited?: boolean;
  parentId?: string | null; 
  replyToUserId?: string;
  replyToUserName?: string;
  likeCount: number;
  likedBy: string[]; 
  deleted?: boolean; 
};

/* ================= TYPE GUARDS ================= */
export const isTask = (item: Task | TaskListItem | PlanListItem): item is TaskItem | TaskListItem => item.type === "task";
export const isPlan = (item: Task | TaskListItem | PlanListItem): item is PlanItem | PlanListItem => item.type === "plan";

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

export function dateValueToMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "string") {
    const ms = new Date(value).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "object" && value !== null) {
    if ("toMillis" in value && typeof (value as Timestamp).toMillis === "function") {
      return (value as Timestamp).toMillis();
    }
    if ("toDate" in value && typeof (value as Timestamp).toDate === "function") {
      return (value as Timestamp).toDate().getTime();
    }
  }
  return null;
}

export function getFeedItemDueMillis(
  item: Pick<FeedTask, "type" | "deadline" | "eventDate">
): number | null {
  if (item.type === "plan") {
    return dateValueToMillis(item.eventDate);
  }
  return dateValueToMillis(item.deadline);
}

/** Ẩn task/plan hết hạn khỏi feed công khai (giống nhau cho cả hai loại). */
export function isActiveFeedItem(
  item: Pick<FeedTask, "type" | "status" | "deadline" | "eventDate" | "banned" | "hidden">
): boolean {
  if (item.banned || item.hidden) return false;
  if (["expired", "completed", "cancelled", "deleted"].includes(item.status)) {
    return false;
  }

  const dueMs = getFeedItemDueMillis(item);
  if (dueMs !== null && dueMs < Date.now()) return false;

  return true;
}

export const isTaskOpen = (task: Task): boolean => {
  if (!task) return false;
  if (task.banned || task.hidden) return false;
  
  if (isTask(task)) {
    if (task.status !== "open" && task.status !== "doing") return false;
    if (task.deadline && task.deadline.toMillis() < Date.now()) return false;
    if (task.joined >= task.totalSlots) return false;
  }
  
  if (isPlan(task)) {
    if (task.status !== "open" && task.status !== "doing") return false;
    if (task.eventDate.toMillis() < Date.now()) return false;
    if (task.currentParticipants >= task.totalSlots) return false; 
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getPlanProgress = (plan: PlanItem): number => {
  if (plan.milestones.length === 0) return 0;
  const completed = plan.milestones.filter((m) => m.completed).length;
  return Math.round((completed / plan.milestones.length) * 100);
};

export const canUserEditPlan = (plan: PlanItem, userId: string): boolean => {
  const participant = plan.participants.find((p) => p.userId === userId);
  return participant?.permissions.canEdit || participant?.role === "owner" || false;
};

export const canUserInvitePlan = (plan: PlanItem, userId: string): boolean => {
  const participant = plan.participants.find((p) => p.userId === userId);
  return participant?.permissions.canInvite || participant?.role === "owner" || false;
};