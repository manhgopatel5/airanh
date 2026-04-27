import {
  collection,
  serverTimestamp,
  Timestamp,
  writeBatch,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  increment,
  limit,
  runTransaction,
  onSnapshot,
  orderBy,
  Unsubscribe,
} from "firebase/firestore";
import { getFirebaseDB } from "./firebase";
import { nanoid } from "nanoid";
import {
  Task,
  TaskItem,
  PlanItem,
  PlanParticipant,
  PlanMilestone,
  CreateTaskInput,
  CreatePlanInput,
  UpdateTaskInput,
  UpdatePlanInput,
  TaskListItem,
  PlanListItem,
  ItemListItem,
  generateTaskSearchKeywords,
  isTaskOpen,
  isTask,
  isPlan,
  User,
} from "@/types/task";

class TaskError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "TaskError";
  }
}

/* ================= HELPERS ================= */
const slugify = (str: string): string =>
  str
   .toLowerCase()
   .normalize("NFD")
   .replace(/[\u0300-\u036f]/g, "")
   .replace(/[^a-z0-9]+/g, "-")
   .replace(/^-|-$/g, "")
   .slice(0, 60);

const generateUniqueShortId = async (): Promise<string> => {
  const db = getFirebaseDB();
  let attempts = 0;
  while (attempts < 10) {
    const shortId = nanoid(8).toUpperCase();
    const snap = await getDoc(doc(db, "shortIds", shortId));
    if (!snap.exists()) return shortId;
    attempts++;
  }
  throw new TaskError("Không thể tạo mã ngắn, thử lại sau", "SHORTID_EXHAUSTED");
};

const cleanTags = (tags: string[], title: string, category?: string): string[] => {
  const all = [...tags, category || "",...slugify(title).split("-")]
   .map((t) => t.trim().toLowerCase())
   .filter((t) => t.length >= 2 && t.length <= 20)
   .slice(0, 10);
  return [...new Set(all)];
};

const validateCoords = (lat?: number | null, lng?: number | null) => {
  if (lat!== null && lat!== undefined && (lat < -90 || lat > 90)) {
    throw new TaskError("Vĩ độ không hợp lệ");
  }
  if (lng!== null && lng!== undefined && (lng < -180 || lng > 180)) {
    throw new TaskError("Kinh độ không hợp lệ");
  }
};

/* ================= CREATE TASK ================= */
export async function createTask(
  data: CreateTaskInput,
  user: User
): Promise<{ id: string; slug: string }> {
  const db = getFirebaseDB();

  if (!user?.uid) throw new TaskError("Bạn cần đăng nhập");
  if (!data.title?.trim()) throw new TaskError("Tiêu đề không được trống");
  if (data.title.length < 5) throw new TaskError("Tiêu đề tối thiểu 5 ký tự");
  if (data.title.length > 100) throw new TaskError("Tiêu đề tối đa 100 ký tự");
  if (data.description && data.description.length > 5000) throw new TaskError("Mô tả tối đa 5000 ký tự");
  if (data.price < 0) throw new TaskError("Giá không hợp lệ");
  if (data.totalSlots < 1) throw new TaskError("Số lượng tuyển tối thiểu là 1");
  if (data.images && data.images.length > 5) throw new TaskError("Tối đa 5 ảnh");
  validateCoords(data.location?.lat, data.location?.lng);

  const validImages = (data.images || []).filter((url) => {
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  });

  const slug = `${slugify(data.title)}-${nanoid(6)}`;
  const shortId = await generateUniqueShortId();
  const category = data.category || "other";
  const tags = cleanTags(data.tags || [], data.title, category);

  const taskData: Omit<TaskItem, "id"> = {
    type: "task",
    slug,
    shortId,
    title: data.title.trim(),
    description: data.description?.trim() || "",
    category,
    tags,
    images: validImages,
    attachments: data.attachments || [],
    userId: user.uid,
    userName: user.displayName || "Ẩn danh",
    userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}`,
    status: "open",
    visibility: data.visibility || "public",
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    location: data.location,
    searchKeywords: generateTaskSearchKeywords({
      title: data.title,
      description: data.description || "",
      tags,
      category,
      location: data.location,
    }),
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    bookmarkCount: 0,
    // Task specific
    price: Math.floor(data.price),
    currency: data.currency || "VND",
    budgetType: data.budgetType || "fixed",
    totalSlots: Math.floor(data.totalSlots),
    joined: 0,
    requirements: data.requirements || "",
    isRemote: data.isRemote?? false,
    applicationDeadline: data.applicationDeadline || null,
    deadline: data.deadline || null,
    startDate: data.startDate || null,
    featured: data.featured || false,
  };

  const batch = writeBatch(db);
  const taskRef = doc(collection(db, "tasks"));
  batch.set(taskRef, taskData);
  batch.set(doc(db, "shortIds", shortId), { taskId: taskRef.id });
  await batch.commit();

  return { id: taskRef.id, slug };
}

/* ================= CREATE PLAN ================= */
export async function createPlan(
  data: CreatePlanInput,
  user: User
): Promise<{ id: string; slug: string }> {
  const db = getFirebaseDB();

  if (!user?.uid) throw new TaskError("Bạn cần đăng nhập");
  if (!data.title?.trim()) throw new TaskError("Tiêu đề không được trống");
  if (data.title.length < 5) throw new TaskError("Tiêu đề tối thiểu 5 ký tự");
  if (data.title.length > 100) throw new TaskError("Tiêu đề tối đa 100 ký tự");
  if (data.description && data.description.length > 5000) throw new TaskError("Mô tả tối đa 5000 ký tự");
  if (data.maxParticipants < 2) throw new TaskError("Số người tối thiểu là 2");
  if (data.costType!== "free" && (!data.costAmount || data.costAmount < 0)) {
    throw new TaskError("Số tiền không hợp lệ");
  }
  if (data.images && data.images.length > 10) throw new TaskError("Tối đa 10 ảnh");
  validateCoords(data.location?.lat, data.location?.lng);

  const validImages = (data.images || []).filter((url) => {
    try {
      return new URL(url).protocol === "https:";
    } catch {
      return false;
    }
  });

  const slug = `${slugify(data.title)}-${nanoid(6)}`;
  const shortId = await generateUniqueShortId();
  const category = data.category;
  const tags = cleanTags(data.tags || [], data.title, category);

  const milestones: PlanMilestone[] = (data.milestones || []).map((m, idx) => ({
    id: nanoid(8),
    title: m.title.trim(),
    description: m.description?.trim(),
    dueDate: m.dueDate,
    completed: false,
    assignedTo: m.assignedTo || [],
    order: idx,
  }));

  const ownerParticipant: PlanParticipant = {
    userId: user.uid,
    userName: user.displayName || "Ẩn danh",
    userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}`,
    role: "owner",
    joinedAt: Timestamp.now(),
    permissions: {
      canEdit: true,
      canInvite: true,
      canManageTasks: true,
      canManageMembers: true,
    },
    status: "active",
  };

  const inviteCode = data.visibility === "private"? nanoid(10) : undefined;

  const planData: Omit<PlanItem, "id"> = {
    type: "plan",
    slug,
    shortId,
    title: data.title.trim(),
    description: data.description?.trim() || "",
    category,
    tags,
    images: validImages,
    attachments: data.attachments || [],
    userId: user.uid,
    userName: user.displayName || "Ẩn danh",
    userAvatar: user.photoURL || "",
    status: "open",
    visibility: data.visibility || "public",
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    location: data.location,
    searchKeywords: generateTaskSearchKeywords({
      title: data.title,
      description: data.description || "",
      tags,
      category,
      location: data.location,
    }),
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    bookmarkCount: 0,
    // Plan specific
    eventDate: data.eventDate,
    endDate: data.endDate,
    milestones,
    participants: [ownerParticipant],
    maxParticipants: data.maxParticipants,
    currentParticipants: 1,
    inviteCode,
    allowInvite: data.allowInvite?? true,
    costType: data.costType,
    costAmount: data.costType === "free"? undefined : data.costAmount,
    costDescription: data.costDescription,
    autoAccept: data.autoAccept?? false,
    requireApproval: data.requireApproval?? false,
    featured: data.featured || false,
  };

  const batch = writeBatch(db);
  const planRef = doc(collection(db, "tasks"));
  batch.set(planRef, planData);
  batch.set(doc(db, "shortIds", shortId), { taskId: planRef.id });
  await batch.commit();

  return { id: planRef.id, slug };
}

/* ================= UPDATE TASK ================= */
export async function updateTask(
  taskId: string,
  userId: string,
  updates: UpdateTaskInput
): Promise<void> {
  const db = getFirebaseDB();

  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");

  await runTransaction(db, async (transaction) => {
    const taskRef = doc(db, "tasks", taskId);
    const snap = await transaction.get(taskRef);
    if (!snap.exists()) throw new TaskError("Không tìm thấy công việc");
    const data = snap.data() as Task;

    if (data.userId!== userId) throw new TaskError("Bạn không có quyền sửa", "FORBIDDEN");
    if (data.status === "deleted") throw new TaskError("Đã xóa");
    if (data.banned) throw new TaskError("Đã bị cấm");
    if (!isTask(data)) throw new TaskError("Đây không phải công việc");

    if (updates.totalSlots && updates.totalSlots < data.joined) {
      throw new TaskError("Số slot không được nhỏ hơn đã tham gia");
    }
    if (updates.deadline && updates.deadline.toMillis() < Date.now()) {
      throw new TaskError("Hạn chót đã qua");
    }

    const newSearchKeywords = updates.title || updates.description || updates.tags || updates.category
     ? generateTaskSearchKeywords({
          title: updates.title || data.title,
          description: updates.description || data.description,
          tags: updates.tags || data.tags,
          category: updates.category || data.category,
          location: updates.location || data.location,
        })
      : data.searchKeywords;

    transaction.update(taskRef, {
     ...updates,
      searchKeywords: newSearchKeywords,
      edited: true,
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

/* ================= UPDATE PLAN ================= */
export async function updatePlan(
  planId: string,
  userId: string,
  updates: UpdatePlanInput
): Promise<void> {
  const db = getFirebaseDB();

  if (!planId ||!userId) throw new TaskError("Thiếu thông tin");

  await runTransaction(db, async (transaction) => {
    const planRef = doc(db, "tasks", planId);
    const snap = await transaction.get(planRef);
    if (!snap.exists()) throw new TaskError("Không tìm thấy kế hoạch");
    const data = snap.data() as Task;

    if (!isPlan(data)) throw new TaskError("Đây không phải kế hoạch");

    const participant = data.participants.find((p) => p.userId === userId);
    if (!participant) throw new TaskError("Bạn không tham gia kế hoạch này");
    if (!participant.permissions.canEdit && participant.role!== "owner") {
      throw new TaskError("Bạn không có quyền sửa", "FORBIDDEN");
    }
    if (data.status === "deleted") throw new TaskError("Đã xóa");

    if (updates.maxParticipants && updates.maxParticipants < data.currentParticipants) {
      throw new TaskError("Số người tối đa không được nhỏ hơn hiện tại");
    }
    if (updates.eventDate && updates.eventDate.toMillis() < Date.now()) {
      throw new TaskError("Ngày diễn ra đã qua");
    }

    const newSearchKeywords = updates.title || updates.description || updates.tags || updates.category
     ? generateTaskSearchKeywords({
          title: updates.title || data.title,
          description: updates.description || data.description,
          tags: updates.tags || data.tags,
          category: updates.category || data.category,
          location: updates.location || data.location,
        })
      : data.searchKeywords;

    transaction.update(planRef, {
     ...updates,
      searchKeywords: newSearchKeywords,
      edited: true,
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
}

/* ================= DELETE ================= */
export async function deleteItem(taskId: string, userId: string): Promise<void> {
  const db = getFirebaseDB();

  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");

  const taskRef = doc(db, "tasks", taskId);
  const snap = await getDoc(taskRef);

  if (!snap.exists()) throw new TaskError("Không tồn tại");
  const data = snap.data() as Task;
  if (data.userId!== userId) throw new TaskError("Bạn không có quyền xóa", "FORBIDDEN");
  if (data.status === "deleted") return;

  if (isTask(data) && data.joined > 0) {
    throw new TaskError("Không thể xóa công việc đã có người tham gia");
  }
  if (isPlan(data) && data.currentParticipants > 1) {
    throw new TaskError("Không thể xóa kế hoạch đã có người tham gia");
  }

  const batch = writeBatch(db);
  batch.update(taskRef, {
    status: "deleted",
    deletedAt: serverTimestamp(),
  });

  const collections = ["task_comments", "task_likes", "task_participants"];
  for (const col of collections) {
    const q = query(collection(db, col), where("taskId", "==", taskId), limit(500));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => batch.delete(d.ref));
  }

  await batch.commit();
  await deleteDoc(taskRef);
}

/* ================= GET BY SLUG ================= */
export const getTaskBySlug = async (slug: string): Promise<Task | null> => {
  const db = getFirebaseDB();
  const q = query(
    collection(db, "tasks"),
    where("slug", "==", slug),
    where("status", "in", ["open", "full", "completed", "in_progress"]),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id,...docSnap.data() } as Task;
};

/* ================= LISTEN ================= */
export const listenItems = (
  callback: (items: ItemListItem[]) => void,
  options?: {
    userId?: string;
    category?: string;
    type?: "task" | "plan";
    status?: TaskStatus;
    limit?: number;
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
    onError?: (err: Error) => void;
  }
): Unsubscribe => {
  const db = getFirebaseDB();

  const constraints: any[] = [
    where("status", "==", options?.status || "open"),
    where("visibility", "==", "public"),
    where("banned", "==", false),
    orderBy("createdAt", "desc"),
    limit(options?.limit || 20),
  ];

  if (options?.userId) constraints.push(where("userId", "==", options.userId));
  if (options?.category) constraints.push(where("category", "==", options.category));
  if (options?.type) constraints.push(where("type", "==", options.type));
  if (options?.startAfterDoc) constraints.push(startAfter(options.startAfterDoc));

  const q = query(collection(db, "tasks"),...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id,...d.data() } as ItemListItem));
      callback(data);
    },
    (err) => {
      console.error("listenItems:", err);
      options?.onError?.(err);
    }
  );
};

/* ================= JOIN TASK ================= */
export async function joinTask(taskId: string, user: User): Promise<void> {
  const db = getFirebaseDB();

  if (!taskId ||!user?.uid) throw new TaskError("Thiếu thông tin");

  await runTransaction(db, async (transaction) => {
    const taskRef = doc(db, "tasks", taskId);
    const participantRef = doc(db, "task_participants", `${taskId}_${user.uid}`);

    const [taskSnap, participantSnap] = await Promise.all([
      transaction.get(taskRef),
      transaction.get(participantRef),
    ]);

    if (!taskSnap.exists()) throw new TaskError("Không tìm thấy công việc");
    const task = taskSnap.data() as Task;

    if (!isTask(task)) throw new TaskError("Đây không phải công việc");
    if (!isTaskOpen(task)) throw new TaskError("Công việc đã đóng hoặc hết hạn");
    if (task.userId === user.uid) throw new TaskError("Không thể tham gia công việc của chính mình");
    if (participantSnap.exists()) throw new TaskError("Bạn đã tham gia");

    const participant = {
      taskId,
      userId: user.uid,
      userName: user.displayName || "Ẩn danh",
      userAvatar: user.photoURL || "",
      joinedAt: Timestamp.now(),
      status: "joined" as const,
    };

    transaction.set(participantRef, participant);
    transaction.update(taskRef, {
      joined: increment(1),
      status: task.joined + 1 >= task.totalSlots? "full" : "open",
      updatedAt: serverTimestamp(),
    });
  });
}

/* ================= JOIN PLAN ================= */
export async function joinPlan(taskId: string, user: User, inviteCode?: string): Promise<void> {
  const db = getFirebaseDB();

  if (!taskId ||!user?.uid) throw new TaskError("Thiếu thông tin");

  await runTransaction(db, async (transaction) => {
    const planRef = doc(db, "tasks", taskId);
    const participantRef = doc(db, "task_participants", `${taskId}_${user.uid}`);

    const [planSnap, participantSnap] = await Promise.all([
      transaction.get(planRef),
      transaction.get(participantRef),
    ]);

    if (!planSnap.exists()) throw new TaskError("Không tìm thấy kế hoạch");
    const plan = planSnap.data() as Task;

    if (!isPlan(plan)) throw new TaskError("Đây không phải kế hoạch");
    if (!isTaskOpen(plan)) throw new TaskError("Kế hoạch đã đóng hoặc đã diễn ra");
    if (plan.userId === user.uid) throw new TaskError("Bạn là chủ kế hoạch");
    if (participantSnap.exists()) throw new TaskError("Bạn đã tham gia");

    if (plan.currentParticipants >= plan.maxParticipants) {
      throw new TaskError("Kế hoạch đã đủ người");
    }

    if (plan.visibility === "private" &&!plan.allowInvite) {
      throw new TaskError("Kế hoạch riêng tư không cho phép tham gia");
    }

    if (plan.visibility === "private" && plan.inviteCode && plan.inviteCode!== inviteCode) {
      throw new TaskError("Mã mời không đúng");
    }

    if (plan.requireApproval) {
      // TODO: tạo request thay vì join trực tiếp
      throw new TaskError("Kế hoạch cần duyệt, chưa hỗ trợ");
    }

    const planParticipant: PlanParticipant = {
      userId: user.uid,
      userName: user.displayName || "Ẩn danh",
      userAvatar: user.photoURL || "",
      role: "member",
      joinedAt: Timestamp.now(),
      permissions: {
        canEdit: false,
        canInvite: plan.allowInvite,
        canManageTasks: false,
        canManageMembers: false,
      },
      status: "active",
    };

    const participant = {
      taskId,
      userId: user.uid,
      userName: user.displayName || "Ẩn danh",
      userAvatar: user.photoURL || "",
      joinedAt: Timestamp.now(),
      status: "joined" as const,
    };

    transaction.set(participantRef, participant);
    transaction.update(planRef, {
      participants: [...plan.participants, planParticipant],
      currentParticipants: increment(1),
      updatedAt: serverTimestamp(),
    });
  });
}

/* ================= UPDATE MILESTONE ================= */
export async function toggleMilestone(
  planId: string,
  userId: string,
  milestoneId: string
): Promise<void> {
  const db = getFirebaseDB();

  await runTransaction(db, async (transaction) => {
    const planRef = doc(db, "tasks", planId);
    const snap = await transaction.get(planRef);
    if (!snap.exists()) throw new TaskError("Không tìm thấy kế hoạch");
    const plan = snap.data() as PlanItem;

    if (!isPlan(plan)) throw new TaskError("Đây không phải kế hoạch");

    const participant = plan.participants.find((p) => p.userId === userId);
    if (!participant) throw new TaskError("Bạn không tham gia kế hoạch");

    const milestones = plan.milestones.map((m) => {
      if (m.id === milestoneId) {
        const canToggle = participant.role === "owner" ||
                          participant.role === "admin" ||
                          m.assignedTo?.includes(userId);
        if (!canToggle) throw new TaskError("Bạn không có quyền thay đổi mốc này");

        return {
         ...m,
          completed:!m.completed,
          completedAt: m.completed? undefined : Timestamp.now(),
        };
      }
      return m;
    });

    transaction.update(planRef, { milestones, updatedAt: serverTimestamp() });
  });
}

/* ================= LIKE/REACTION ================= */
export const toggleLikeTask = async (taskId: string, userId: string): Promise<void> => {
  const db = getFirebaseDB();

  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");
  const likeRef = doc(db, "task_likes", `${taskId}_${userId}`);
  const taskRef = doc(db, "tasks", taskId);

  await runTransaction(db, async (transaction) => {
    const [likeSnap, taskSnap] = await Promise.all([
      transaction.get(likeRef),
      transaction.get(taskRef),
    ]);

    if (!taskSnap.exists()) throw new TaskError("Không tồn tại");

    const currentCount = (taskSnap.data() as Task).likeCount || 0;

    if (likeSnap.exists()) {
      transaction.delete(likeRef);
      transaction.update(taskRef, {
        likeCount: Math.max(0, currentCount - 1),
        updatedAt: serverTimestamp(),
      });
    } else {
      transaction.set(likeRef, { taskId, userId, createdAt: serverTimestamp() });
      transaction.update(taskRef, {
        likeCount: currentCount + 1,
        updatedAt: serverTimestamp(),
      });
    }
  });
};

export const addReactionToTask = async (taskId: string, userId: string, type: string): Promise<void> => {
  const db = getFirebaseDB();

  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");
  const taskRef = doc(db, "tasks", taskId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(taskRef);
    if (!snap.exists()) throw new TaskError("Không tồn tại");

    const data = snap.data() as Task;
    const reactions = data.reactions || {};
    const users = reactions[type] || [];

    if (users.includes(userId)) {
      reactions[type] = users.filter((id) => id!== userId);
    } else {
      reactions[type] = [...users, userId];
    }

    transaction.update(taskRef, {
      reactions,
      updatedAt: serverTimestamp(),
    });
  });
};

/* ================= VIEW ================= */
export const incrementTaskView = async (taskId: string): Promise<void> => {
  const db = getFirebaseDB();
  if (!taskId) return;
  await updateDoc(doc(db, "tasks", taskId), { viewCount: increment(1) }).catch(() => {});
};

/* ================= AUTO EXPIRE ================= */
export async function expireTasks(): Promise<void> {
  const db = getFirebaseDB();
  const q = query(
    collection(db, "tasks"),
    where("status", "==", "open"),
    where("type", "==", "task"),
    where("deadline", "<=", Timestamp.now())
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { status: "expired", updatedAt: serverTimestamp() });
  });
  await batch.commit();
}