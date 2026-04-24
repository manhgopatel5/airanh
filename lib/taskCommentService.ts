import {
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
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
} from "firebase/firestore";
import { db } from "./firebase";
import { User } from "@/types/task";

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  parentId?: string | null; // null = comment gốc, có id = reply
  replyToUserId?: string;
  replyToUserName?: string;
  likeCount: number;
  likedBy: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  edited?: boolean;
  deleted?: boolean;
};

class TaskCommentError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "TaskCommentError";
  }
}

/* ================= CREATE COMMENT ================= */
export const createComment = async (
  taskId: string,
  user: User,
  data: {
    text: string;
    parentId?: string; // reply cho comment nào
    replyToUserId?: string;
    replyToUserName?: string;
  }
): Promise<string> => {
  if (!taskId ||!user?.uid) throw new TaskCommentError("Thiếu thông tin");
  if (!data.text.trim()) throw new TaskCommentError("Nội dung trống");
  if (data.text.length > 1000) throw new TaskCommentError("Tối đa 1000 ký tự");

  const batch = writeBatch(db);
  const commentRef = doc(collection(db, "task_comments"));
  const taskRef = doc(db, "tasks", taskId);

  batch.set(commentRef, {
    taskId,
    userId: user.uid,
    userName: user.displayName || "Ẩn danh",
    userAvatar: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || "U")}`,
    text: data.text.trim(),
    parentId: data.parentId || null,
    replyToUserId: data.replyToUserId || null,
    replyToUserName: data.replyToUserName || null,
    likeCount: 0,
    likedBy: [],
    createdAt: serverTimestamp(),
    deleted: false,
  });

  // Tăng commentCount của task
  batch.update(taskRef, { commentCount: increment(1) });

  await batch.commit();
  return commentRef.id;
};

/* ================= EDIT COMMENT ================= */
export const editComment = async (
  commentId: string,
  userId: string,
  newText: string
): Promise<void> => {
  if (!commentId ||!userId) throw new TaskCommentError("Thiếu thông tin");
  if (!newText.trim()) throw new TaskCommentError("Nội dung trống");
  if (newText.length > 1000) throw new TaskCommentError("Tối đa 1000 ký tự");

  const commentRef = doc(db, "task_comments", commentId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(commentRef);
    if (!snap.exists()) throw new TaskCommentError("Comment không tồn tại");
    const data = snap.data() as TaskComment;
    if (data.userId!== userId) throw new TaskCommentError("Không có quyền sửa", "FORBIDDEN");
    if (data.deleted) throw new TaskCommentError("Comment đã xóa");

    transaction.update(commentRef, {
      text: newText.trim(),
      edited: true,
      updatedAt: serverTimestamp(),
    });
  });
};

/* ================= DELETE COMMENT ================= */
export const deleteComment = async (commentId: string, userId: string): Promise<void> => {
  if (!commentId ||!userId) throw new TaskCommentError("Thiếu thông tin");

  const commentRef = doc(db, "task_comments", commentId);
  const snap = await getDoc(commentRef);

  if (!snap.exists()) throw new TaskCommentError("Comment không tồn tại");
  const data = snap.data() as TaskComment;
  if (data.userId!== userId) throw new TaskCommentError("Không có quyền xóa", "FORBIDDEN");
  if (data.deleted) return;

  const batch = writeBatch(db);
  const taskRef = doc(db, "tasks", data.taskId);

  // Soft delete: đánh dấu deleted=true thay vì xóa hẳn để giữ reply
  batch.update(commentRef, {
    text: "Bình luận đã bị xóa",
    deleted: true,
    updatedAt: serverTimestamp(),
  });

  // Giảm commentCount
  batch.update(taskRef, { commentCount: increment(-1) });

  await batch.commit();

  // Nếu là comment gốc, xóa luôn các reply con
  if (!data.parentId) {
    const repliesQuery = query(
      collection(db, "task_comments"),
      where("parentId", "==", commentId),
      limit(500)
    );
    const repliesSnap = await getDocs(repliesQuery);
    if (!repliesSnap.empty) {
      const deleteBatch = writeBatch(db);
      repliesSnap.docs.forEach((d) => deleteBatch.delete(d.ref));
      await deleteBatch.commit();
      // Giảm thêm commentCount cho số reply bị xóa
      await updateDoc(taskRef, { commentCount: increment(-repliesSnap.size) });
    }
  }
};

/* ================= LISTEN COMMENTS ================= */
export const listenComments = (
  taskId: string,
  callback: (comments: TaskComment[], hasMore: boolean) => void,
  options?: {
    limit?: number;
    startAfterDoc?: QueryDocumentSnapshot<DocumentData>;
    onError?: (err: Error) => void;
  }
): Unsubscribe => {
  if (!taskId) return () => {};

  const constraints = [
    where("taskId", "==", taskId),
    where("deleted", "==", false),
    orderBy("createdAt", "asc"), // asc để comment cũ lên trước
    limit(options?.limit || 50),
  ];

  if (options?.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }

  const q = query(collection(db, "task_comments"),...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id,...d.data() } as TaskComment));
      callback(data, snapshot.docs.length === (options?.limit || 50));
    },
    (err) => {
      console.error("listenComments:", err);
      options?.onError?.(err);
    }
  );
};

/* ================= TOGGLE LIKE COMMENT ================= */
export const toggleLikeComment = async (
  commentId: string,
  userId: string
): Promise<{ liked: boolean; newCount: number }> => {
  if (!commentId ||!userId) throw new TaskCommentError("Thiếu thông tin");

  const commentRef = doc(db, "task_comments", commentId);
  let liked = false;
  let newCount = 0;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(commentRef);
    if (!snap.exists()) throw new TaskCommentError("Comment không tồn tại");

    const data = snap.data() as TaskComment;
    const likedBy = data.likedBy || [];
    const currentCount = data.likeCount || 0;

    if (likedBy.includes(userId)) {
      // Unlike
      transaction.update(commentRef, {
        likedBy: likedBy.filter((id) => id!== userId),
        likeCount: Math.max(0, currentCount - 1),
      });
      liked = false;
      newCount = Math.max(0, currentCount - 1);
    } else {
      // Like
      transaction.update(commentRef, {
        likedBy: [...likedBy, userId],
        likeCount: currentCount + 1,
      });
      liked = true;
      newCount = currentCount + 1;
    }
  });

  return { liked, newCount };
};

/* ================= GET COMMENT BY ID ================= */
export const getCommentById = async (commentId: string): Promise<TaskComment | null> => {
  if (!commentId) return null;
  const snap = await getDoc(doc(db, "task_comments", commentId));
  if (!snap.exists()) return null;
  return { id: snap.id,...snap.data() } as TaskComment;
};