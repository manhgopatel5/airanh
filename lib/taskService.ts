import {
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp,
  Unsubscribe,
  limit,
  where,
  runTransaction,
  getDoc,
  getDocs,
  writeBatch,
  increment,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDB } from "./firebase";
import { nanoid } from "nanoid";
import { Task, CreateTaskInput, UpdateTaskInput, TaskListItem, TaskStatus } from "@/types/task";

export class TaskError extends Error {
  const db = getFirebaseDB();
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

const generateSearchKeywords = (title: string, description?: string, tags?: string[]): string[] => {
  const words = [
...title.toLowerCase().split(" "),
...(description?.toLowerCase().split(" ").slice(0, 20) || []),
...(tags?.map((t) => t.toLowerCase()) || []),
  ].filter(Boolean);
  return [...new Set(words)].slice(0, 20);
};

const generateUniqueShortId = async (): Promise<string> => {
  let attempts = 0;
  while (attempts < 10) {
    const shortId = nanoid(8).toUpperCase();
    const q = query(collection(db, "tasks"), where("shortId", "==", shortId), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return shortId;
    attempts++;
  }
  throw new TaskError("Không tạo được shortId duy nhất");
};

/* ================= CREATE TASK ================= */
export const createTask = async (
  user: { uid: string; displayName?: string | null; photoURL?: string | null; shortId?: string; username?: string },
  data: CreateTaskInput
): Promise<{ id: string; slug: string }> => {
  if (!user?.uid) throw new TaskError("Bạn cần đăng nhập");
  if (!data.title?.trim()) throw new TaskError("Tiêu đề không được trống");
  if (data.title.length > 100) throw new TaskError("Tiêu đề tối đa 100 ký tự");
  if (data.description && data.description.length > 5000) throw new TaskError("Mô tả tối đa 5000 ký tự");
  if (data.price < 0) throw new TaskError("Giá không hợp lệ");
  if (data.totalSlots < 1) throw new TaskError("Số lượng tuyển tối thiểu là 1");

  const baseSlug = slugify(data.title);
  let slug = `${baseSlug}-${nanoid(6)}`;

  // Check slug unique trước transaction để tránh lỗi getDocs trong transaction
  let attempts = 0;
  while (attempts < 3) {
    const slugQuery = query(collection(db, "tasks"), where("slug", "==", slug), limit(1));
    const slugSnap = await getDocs(slugQuery);
    if (slugSnap.empty) break;
    slug = `${baseSlug}-${nanoid(6)}`;
    attempts++;
    if (attempts === 3) throw new TaskError("Không tạo được slug duy nhất");
  }

  const shortId = await generateUniqueShortId();

  const taskId = await runTransaction(db, async (transaction) => {
    const taskRef = doc(collection(db, "tasks"));
    const now = serverTimestamp() as Timestamp;

    const taskData: Omit<Task, "id"> = {
      slug,
      shortId,
      title: data.title.trim(),
      description: data.description?.trim() || "",
      price: data.price,
      currency: data.currency || "VND",
      budgetType: data.budgetType || "fixed",
      totalSlots: data.totalSlots,
      joined: 0,
      status: "open",
      visibility: data.visibility || "public",

      userId: user.uid,
      userName: user.displayName || "Ẩn danh",
      userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}`,
    ...(user.shortId && { userShortId: user.shortId }),
    ...(user.username && { userUsername: user.username }),

      createdAt: now,
      updatedAt: now,
      applicationDeadline: data.applicationDeadline || null,
      deadline: data.deadline || null,
      startDate: data.startDate || null,

    ...(data.category && { category: data.category }),
      tags: data.tags || [],
      images: data.images || [],
      attachments: data.attachments || [],
      requirements: data.requirements || "",
    ...(data.location && { location: data.location }),
      isRemote: data.isRemote || false,

      searchKeywords: generateSearchKeywords(data.title, data.description, data.tags),

      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      bookmarkCount: 0,

      banned: false,
      hidden: false,
      applicants: [],
      reactions: {},
    };

    transaction.set(taskRef, taskData);
    return taskRef.id;
  });

  return { id: taskId, slug };
};

/* ================= UPDATE TASK ================= */
export const updateTask = async (
  taskId: string,
  userId: string,
  updates: UpdateTaskInput
): Promise<void> => {
  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");

  const taskRef = doc(db, "tasks", taskId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(taskRef);
    if (!snap.exists()) throw new TaskError("Task không tồn tại");
    const data = snap.data() as Task;
    if (data.userId!== userId) throw new TaskError("Bạn không có quyền sửa", "FORBIDDEN");
    if (data.status === "deleted") throw new TaskError("Task đã xóa");
    if (data.banned) throw new TaskError("Task đã bị cấm");

    const newSearchKeywords = updates.title || updates.description || updates.tags
? generateSearchKeywords(
          updates.title || data.title,
          updates.description || data.description,
          updates.tags || data.tags
        )
      : data.searchKeywords;

    transaction.update(taskRef, {
...updates,
      searchKeywords: newSearchKeywords,
      edited: true,
      editedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
};

/* ================= DELETE TASK ================= */
export const deleteTask = async (taskId: string, userId: string): Promise<void> => {
  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");

  const taskRef = doc(db, "tasks", taskId);
  const snap = await getDoc(taskRef);

  if (!snap.exists()) throw new TaskError("Task không tồn tại");
  const data = snap.data() as Task;
  if (data.userId!== userId) throw new TaskError("Bạn không có quyền xóa", "FORBIDDEN");
  if (data.status === "deleted") return;

  const batch = writeBatch(db);

  batch.update(taskRef, {
    status: "deleted",
    deletedAt: serverTimestamp(),
  });

  // Xóa cascade: comments, likes, participants
  const collections = ["task_comments", "task_likes", "task_participants"];
  for (const col of collections) {
    const q = query(collection(db, col), where("taskId", "==", taskId), limit(500));
    const snap = await getDocs(q);
    snap.docs.forEach((d) => batch.delete(d.ref));
  }

  await batch.commit();
  await deleteDoc(taskRef);
};

/* ================= GET BY SLUG ================= */
export const getTaskBySlug = async (slug: string): Promise<Task | null> => {
  const q = query(
    collection(db, "tasks"),
    where("slug", "==", slug),
    where("status", "in", ["open", "full", "completed"]),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0]!;
  return { id: docSnap.id,...docSnap.data() } as Task;
};

/* ================= LISTEN TASKS ================= */
export const listenTasks = (
  callback: (tasks: TaskListItem[]) => void,
  options?: {
    userId?: string;
    category?: string;
    status?: TaskStatus;
    limit?: number;
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
    onError?: (err: Error) => void;
  }
): Unsubscribe => {
  const constraints: QueryConstraint[] = [
    where("status", "==", options?.status || "open"),
    where("visibility", "==", "public"),
    where("banned", "==", false),
    orderBy("createdAt", "desc"),
    limit(options?.limit || 20),
  ];

  if (options?.userId) constraints.push(where("userId", "==", options.userId));
  if (options?.category) constraints.push(where("category", "==", options.category));
  if (options?.startAfterDoc) constraints.push(startAfter(options.startAfterDoc));

  const q = query(collection(db, "tasks"),...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id,...d.data() } as TaskListItem));
      callback(data);
    },
    (err) => {
      console.error("listenTasks:", err);
      options?.onError?.(err);
    }
  );
};

/* ================= JOIN TASK ================= */
export const joinTask = async (
  taskId: string,
  user: { uid: string; displayName?: string | null; photoURL?: string | null }
): Promise<void> => {
  if (!taskId ||!user?.uid) throw new TaskError("Thiếu thông tin");

  const taskRef = doc(db, "tasks", taskId);
  const participantRef = doc(db, "task_participants", `${taskId}_${user.uid}`);

  await runTransaction(db, async (transaction) => {
    const [taskSnap, participantSnap] = await Promise.all([transaction.get(taskRef), transaction.get(participantRef)]);
    if (!taskSnap.exists()) throw new TaskError("Task không tồn tại");

    const task = taskSnap.data() as Task;
    if (task.status!== "open") throw new TaskError("Task đã đóng");
    if (task.joined >= task.totalSlots) throw new TaskError("Task đã đủ người");
    if (task.userId === user.uid) throw new TaskError("Bạn là chủ task");
    if (participantSnap.exists()) throw new TaskError("Bạn đã ứng tuyển rồi");

    transaction.set(participantRef, {
      taskId,
      userId: user.uid,
      userName: user.displayName || "Ẩn danh",
      userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}`,
      joinedAt: serverTimestamp(),
      status: "joined",
    });

    transaction.update(taskRef, {
      joined: increment(1),
      applicants: [...(task.applicants || []), user.uid],
      status: task.joined + 1 >= task.totalSlots? "full" : "open"
    });
  });
};

/* ================= LIKE/REACTION ================= */
export const toggleLikeTask = async (taskId: string, userId: string): Promise<void> => {
  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");
  const likeRef = doc(db, "task_likes", `${taskId}_${userId}`);
  const taskRef = doc(db, "tasks", taskId);

  await runTransaction(db, async (transaction) => {
    const [likeSnap, taskSnap] = await Promise.all([transaction.get(likeRef), transaction.get(taskRef)]);
    if (!taskSnap.exists()) throw new TaskError("Task không tồn tại");

    const currentCount = (taskSnap.data() as Task).likeCount || 0;

    if (likeSnap.exists()) {
      transaction.delete(likeRef);
      transaction.update(taskRef, { likeCount: Math.max(0, currentCount - 1) });
    } else {
      transaction.set(likeRef, { taskId, userId, createdAt: serverTimestamp() });
      transaction.update(taskRef, { likeCount: currentCount + 1 });
    }
  });
};

export const addReactionToTask = async (taskId: string, userId: string, type: string): Promise<void> => {
  if (!taskId ||!userId) throw new TaskError("Thiếu thông tin");
  const taskRef = doc(db, "tasks", taskId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(taskRef);
    if (!snap.exists()) throw new TaskError("Task không tồn tại");

    const data = snap.data() as Task;
    const reactions = data.reactions || {};
    const users = reactions[type] || [];

    if (users.includes(userId)) {
      reactions[type] = users.filter((id) => id!== userId);
    } else {
      reactions[type] = [...users, userId];
    }

    transaction.update(taskRef, { reactions });
  });
};

/* ================= VIEW ================= */
export const incrementTaskView = async (taskId: string): Promise<void> => {
  if (!taskId) return;
  await updateDoc(doc(db, "tasks", taskId), { viewCount: increment(1) }).catch(() => {});
};