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
export type CostType = "free" | "share" | "host";
export type PaymentMethod = "app" | "cash"; 

export type PlanParticipantRole = "owner" | "admin" | "member";
export type PlanStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled";

/* ================= USER ================= */
export type User = {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  role?: "admin" | "user";
  shortId?: string;
  username?: string;
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
  
  // Owner
  userId: string;
  userName: string;
  userAvatar: string;
  userVerified?: boolean; 
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
  paymentMethod?: PaymentMethod;
  totalSlots: number;
  joined: number;
  appliedCount?: number;  
  requirements?: string;
  isRemote: boolean;
  applicationDeadline?: Timestamp | null;
  deadline?: Timestamp | null;
  startDate?: Timestamp | null;
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
  userName: string;
  userAvatar: string;
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
  endDate?: Timestamp;
  maxParticipants: number;
  totalSlots: number; 
  costType: CostType;
  costAmount?: number;
  costDescription?: string;
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
  | "shortId" // THÊM
  | "title"
  | "price"
  | "currency"
  | "totalSlots"
  | "joined"
  | "status"
  | "userName"
  | "userVerified" 
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
  | "paymentMethod" 
  | "userId"
  | "description"
  | "type"
  | "deadline"
  | "startDate"
  | "savedBy"     
  | "applicants"  
  | "appliedCount"
  | "banned"
  | "hidden"
>;

export type PlanListItem = Pick<
  PlanItem,
  | "id"
  | "slug"
  | "shortId" // THÊM
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
  | "viewCount"
  | "likeCount"
  | "commentCount"
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
  | "savedBy"      
  | "applicants"  
  | "banned"
  | "hidden"
>;

export type ItemListItem = TaskListItem | PlanListItem;

/* ================= FEED TYPE CHO ISR ================= */
// Dùng cho Server Component: Timestamp -> string để serialize qua RSC
export type FeedTask = (TaskListItem | PlanListItem) & {
  createdAt: string | null;
  updatedAt?: string | null;
  deadline?: string | null;
  eventDate?: string | null;
  endDate?: string | null;
  startDate?: string | null;
  
  applicationDeadline?: string | null;
  shortId?: string; // FIX: Thêm để build pass
};

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