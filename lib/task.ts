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
import { db } from "./firebase";
import { nanoid } from "nanoid";
import {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskListItem,
  generateTaskSearchKeywords,
  isTaskOpen,
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
  .slice(0, 50);

const generateUniqueShortId = async (): Promise<string> => {
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
  if (!user?.uid) throw new TaskError("Bạn cần đăng nhập để tạo công việc");
  if (!data.title?.trim()) throw new TaskError("Tiêu đề không được để trống");
  if (data.title.length < 10) throw new TaskError("Tiêu đề tối thiểu 10 ký tự");
  if (data.title.length > 100) throw new TaskError("Tiêu đề tối đa 100 ký tự");
  if (!data.description?.trim()) throw new TaskError("Mô tả không được để trống");
  if (data.description.length < 20) throw new TaskError("Mô tả tối thiểu 20 ký tự");
  if (data.description.length > 5000) throw new TaskError("Mô tả tối đa 5000 ký tự");
  if (!data.price || data.price < 1000) throw new TaskError("Giá tối thiểu 1.000đ");
  if (data.price > 100000000) throw new TaskError("Giá tối đa 100.000.000đ");
  if (!data.totalSlots || data.totalSlots < 1) throw new TaskError("Số người tối thiểu là 1");
  if (data.totalSlots > 100) throw new TaskError("Số người tối đa là 100");
  if (data.images && data.images.length > 5) throw new TaskError("Tối đa 5 ảnh");
  validateCoords(data.location?.lat, data.location?.lng);

  const validImages = (data.images || []).filter((url) => {
    try {
      const u = new URL(url);
      return u.protocol === "https:";
    } catch {
      return false;
    }
  });

  const slug = `${slugify(data.title)}-${nanoid(6)}`;
  const shortId = await generateUniqueShortId();
  const tags = cleanTags(data.tags || [], data.title, data.category);

  const taskData: Omit<Task, "id"> = {
    slug,
    shortId,
    title: data.title.trim(),
    description: data.description.trim(),
    price: Math.floor(data.price),
    currency: data.currency || "VND",
    budgetType: data.budgetType || "fixed",
    totalSlots: Math.floor(data.totalSlots),
    joined: 0,
    status: "open",
    visibility: data.visibility || "public",
    userId: user.uid,
    userName: user.displayName || user.email?.split("@")[0] || "Ẩn danh",
    userAvatar:
      user.photoURL ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || "U")}&background=random`,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  ...(data.deadline && { deadline: data.deadline }),
  ...(data.applicationDeadline && { applicationDeadline: data.applicationDeadline }),
  ...(data.startDate && { startDate: data.startDate }),
  ...(data.category && { category: data.category }),
    tags,
    images: validImages,
  ...(data.attachments && { attachments: data.attachments }),
  ...(data.requirements?.trim() && { requirements: data.requirements.trim() }),
  ...(data.location && { location: data.location }),
    isRemote: data.isRemote || false,
    searchKeywords: generateTaskSearchKeywords({
      title: data.title,
      description: data.description,
      tags,
    ...(data.category && { category: data.category }),
    ...(data.location && { location: data.location }),
    }),
    viewCount: 0,
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
    bookmarkCount: 0,
    featured: data.featured && user.role === "admin"? true : false,
  };

  const batch = writeBatch(db);
  const taskRef = doc(collection(db, "tasks"));

  batch.set(taskRef, taskData);
  batch.set(doc(db, "shortIds", shortId), { taskId: taskRef.id });

  await batch.commit();

  return { id: taskRef.id, slug };
}

/* ================= UPDATE TASK ================= */
export async function updateTask(
  taskId: string,
  userId: string,
  updates: UpdateTaskInput
): Promise<void> {
  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");

  await runTransaction(db, async (transaction) => {
    const taskRef = doc(db, "tasks", taskId);
    const snap = await transaction.get(taskRef);
    if (!snap.exists()) throw new TaskError("Không tìm thấy công việc");
    const data = snap.data() as Task;

    if (data.userId!== userId) throw new TaskError("Bạn không có quyền sửa");
    if (data.status!== "open") throw new TaskError("Chỉ sửa được công việc đang mở");
    if (data.deadline && data.deadline.toMillis() < Date.now()) throw new TaskError("Công việc đã hết hạn");
    if (data.banned) throw new TaskError("Công việc đã bị cấm");

    if (updates.title && updates.title.length < 10) throw new TaskError("Tiêu đề quá ngắn");
    if (updates.description && updates.description.length < 20) throw new TaskError("Mô tả quá ngắn");
    if (updates.price && (updates.price < 1000 || updates.price > 100000000)) throw new TaskError("Giá không hợp lệ");
    if (updates.totalSlots && (updates.totalSlots < 1 || updates.totalSlots > 100)) throw new TaskError("Số người không hợp lệ");
    if (updates.totalSlots && updates.totalSlots < data.joined) throw new TaskError("Số người không được nhỏ hơn đã tham gia");
    if (updates.images && updates.images.length > 5) throw new TaskError("Tối đa 5 ảnh");

    const newTags = updates.title || updates.description || updates.category
    ? cleanTags(updates.tags || data.tags || [], updates.title || data.title, updates.category || data.category)
      : data.tags;

    const updateData: any = {
      tags: newTags,
      searchKeywords: generateTaskSearchKeywords({
        title: updates.title || data.title,
        description: updates.description || data.description,
        tags: newTags,
      ...(updates.category? { category: updates.category } : data.category? { category: data.category } : {}),
      ...(updates.location? { location: updates.location } : data.location? { location: data.location } : {}),
      }),
      edited: true,
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.price) updateData.price = updates.price;
    if (updates.currency) updateData.currency = updates.currency;
    if (updates.budgetType) updateData.budgetType = updates.budgetType;
    if (updates.totalSlots) updateData.totalSlots = updates.totalSlots;
    if (updates.deadline) updateData.deadline = updates.deadline;
    if (updates.applicationDeadline) updateData.applicationDeadline = updates.applicationDeadline;
    if (updates.startDate) updateData.startDate = updates.startDate;
    if (updates.category) updateData.category = updates.category;
    if (updates.images) updateData.images = updates.images;
    if (updates.attachments) updateData.attachments = updates.attachments;
    if (updates.requirements) updateData.requirements = updates.requirements;
    if (updates.location) updateData.location = updates.location;
    if (updates.isRemote!== undefined) updateData.isRemote = updates.isRemote;
    if (updates.visibility) updateData.visibility = updates.visibility;

    transaction.update(taskRef, updateData);
  });
}

/* ================= DELETE TASK ================= */
export async function deleteTask(taskId: string, userId: string): Promise<void> {
  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");

  await runTransaction(db, async (transaction) => {
    const taskRef = doc(db, "tasks", taskId);
    const snap = await transaction.get(taskRef);
    if (!snap.exists()) throw new TaskError("Không tìm thấy công việc");
    const data = snap.data() as Task;
    if (data.userId!== userId) throw new TaskError("Bạn không có quyền xóa");
    if (data.joined > 0) throw new TaskError("Không thể xóa công việc đã có người tham gia");

    const participantsQuery = query(
      collection(db, "taskParticipants"),
      where("taskId", "==", taskId),
      limit(500)
    );
    const participantsSnap = await getDocs(participantsQuery);

    transaction.update(taskRef, {
      status: "cancelled",
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.delete(doc(db, "shortIds", data.shortId));

    participantsSnap.docs.forEach((d) => {
      transaction.delete(d.ref);
    });
  });
}

/* ================= GET TASK ================= */
export async function getTaskById(id: string): Promise<Task | null> {
  const snap = await getDoc(doc(db, "tasks", id));
  if (!snap.exists()) return null;
  const data = snap.data() as Task;
  if (data.banned || data.hidden) return null;
  return { id: snap.id,...data };
}

export async function getTaskBySlug(slug: string): Promise<Task | null> {
  const q = query(
    collection(db, "tasks"),
    where("slug", "==", slug),
    where("status", "in", ["open", "full", "completed"]),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data() as Task;
  if (data.banned || data.hidden) return null;
  return { id: snap.docs[0].id,...data };
}

export async function getTaskByShortId(shortId: string): Promise<Task | null> {
  const q = query(
    collection(db, "tasks"),
    where("shortId", "==", shortId.toUpperCase()),
    where("status", "in", ["open", "full", "completed"]),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data() as Task;
  if (data.banned || data.hidden) return null;
  return { id: snap.docs[0].id,...data };
}

/* ================= LISTEN TASKS ================= */
export function listenTasks(
  callback: (tasks: TaskListItem[]) => void,
  options?: {
    userId?: string;
    category?: string;
    keyword?: string;
    status?: Task["status"][];
    limit?: number;
    featured?: boolean;
  }
): Unsubscribe {
  const constraints: any[] = [
    where("status", "in", options?.status || ["open", "full"]),
    where("visibility", "==", "public"),
    where("banned", "==", false),
  ];

  if (options?.userId) constraints.push(where("userId", "==", options.userId));
  if (options?.category) constraints.push(where("category", "==", options.category));
  if (options?.keyword) {
    constraints.push(where("searchKeywords", "array-contains", options.keyword.toLowerCase()));
  }
  if (options?.featured) {
    constraints.push(where("featured", "==", true));
    constraints.push(orderBy("featuredUntil", "desc"));
  }

  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(options?.limit || 20));

  const q = query(collection(db, "tasks"),...constraints);

  return onSnapshot(
    q,
    (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id,...d.data() } as TaskListItem));
      callback(data);
    },
    (err) => {
      console.error("listenTasks error:", err);
      callback([]);
    }
  );
}

/* ================= JOIN TASK ================= */
export async function joinTask(taskId: string, user: User): Promise<void> {
  if (!taskId ||!user?.uid) throw new TaskError("Thiếu thông tin");

  await runTransaction(db, async (transaction) => {
    const taskRef = doc(db, "tasks", taskId);
    const participantRef = doc(db, "taskParticipants", `${taskId}_${user.uid}`);

    const [taskSnap, participantSnap] = await Promise.all([
      transaction.get(taskRef),
      transaction.get(participantRef),
    ]);

    if (!taskSnap.exists()) throw new TaskError("Không tìm thấy công việc");
    const task = taskSnap.data() as Task;

    if (!isTaskOpen(task)) throw new TaskError("Công việc đã đóng hoặc hết hạn");
    if (task.userId === user.uid) throw new TaskError("Không thể tham gia công việc của chính mình");
    if (participantSnap.exists()) throw new TaskError("Bạn đã tham gia công việc này");

    const participant = {
      id: `${taskId}_${user.uid}`,
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

/* ================= INCREMENT VIEW ================= */
export async function incrementTaskView(taskId: string): Promise<void> {
  if (!taskId) return;
  try {
    await updateDoc(doc(db, "tasks", taskId), { viewCount: increment(1) });
  } catch (e) {
    console.warn("Increment view failed:", e);
  }
}

/* ================= AUTO EXPIRE ================= */
export async function expireTasks(): Promise<void> {
  const q = query(
    collection(db, "tasks"),
    where("status", "==", "open"),
    where("deadline", "<=", Timestamp.now())
  );
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.docs.forEach((d) => {
    batch.update(d.ref, { status: "expired", updatedAt: serverTimestamp() });
  });
  await batch.commit();
}

/* ================= LIKE & REACTION ================= */
export async function toggleLikeTask(taskId: string, userId: string): Promise<boolean> {
  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");

  return await runTransaction(db, async (transaction) => {
    const taskRef = doc(db, "tasks", taskId);
    const likeRef = doc(db, "taskLikes", `${taskId}_${userId}`);

    const [taskSnap, likeSnap] = await Promise.all([
      transaction.get(taskRef),
      transaction.get(likeRef),
    ]);

    if (!taskSnap.exists()) throw new TaskError("Không tìm thấy công việc");

    if (likeSnap.exists()) {
      transaction.delete(likeRef);
      transaction.update(taskRef, {
        likeCount: increment(-1),
        updatedAt: serverTimestamp()
      });
      return false;
    } else {
      transaction.set(likeRef, {
        taskId,
        userId,
        createdAt: Timestamp.now()
      });
      transaction.update(taskRef, {
        likeCount: increment(1),
        updatedAt: serverTimestamp()
      });
      return true;
    }
  });
}

export async function addReactionToTask(taskId: string, userId: string, type: string = "like"): Promise<void> {
  await toggleLikeTask(taskId, userId);
}