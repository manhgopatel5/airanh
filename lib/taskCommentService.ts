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
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDB } from "./firebase";
import { User } from "@/types/task";

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  parentId?: string | null;
  replyToUserId?: string;
  replyToUserName?: string;
  likeCount: number;
  likedBy: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  edited?: boolean;
  deleted?: boolean;
};

export class TaskCommentError extends Error {
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
    parentId?: string;
    replyToUserId?: string;
    replyToUserName?: string;
  }
): Promise<string> => {
  const db = getFirebaseDB();
  
  if (!taskId || !user?.uid) throw new TaskCommentError("Thiếu thông tin");
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
  const db = getFirebaseDB();
  
  if (!commentId || !userId) throw new TaskCommentError("Thiếu thông tin");
  if (!newText.trim()) throw new TaskCommentError("Nội dung trống");
  if (newText.length > 1000) throw new TaskCommentError("Tối đa 1000 ký tự");

  const commentRef = doc(db, "task_comments", commentId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(commentRef);
    if (!snap.exists()) throw new TaskCommentError("Comment không tồn tại");
    const data = snap.data() as TaskComment;
    if (data.userId !== userId) throw new TaskCommentError("Không có quyền sửa", "FORBIDDEN");
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
  const db = getFirebaseDB();
  
  if (!commentId || !userId) throw new TaskCommentError("Thiếu thông tin");

  await runTransaction(db, async (transaction) => {
    const commentRef = doc(db, "task_comments", commentId);
    const snap = await transaction.get(commentRef);

    if (!snap.exists()) throw new TaskCommentError("Comment không tồn tại");
    const data = snap.data() as TaskComment;
    if (data.userId !== userId) throw new TaskCommentError("Không có quyền xóa", "FORBIDDEN");
    if (data.deleted) return;

    const taskRef = doc(db, "tasks", data.taskId);

    // Soft delete comment gốc
    transaction.update(commentRef, {
      text: "Bình luận đã bị xóa",
      deleted: true,
      updatedAt: serverTimestamp(),
    });

    let deleteCount = 1;

    // Nếu là comment gốc, xóa reply con trong cùng transaction
    if (!data.parentId) {
      const repliesQuery = query(
        collection(db, "task_comments"),
        where("parentId", "==", commentId),
        where("deleted", "==", false)
      );
      const repliesSnap = await getDocs(repliesQuery);
      
      repliesSnap.docs.forEach((d) => {
        transaction.update(d.ref, { 
          deleted: true, 
          updatedAt: serverTimestamp(),
          text: "Bình luận đã bị xóa"
        });
        deleteCount++;
      });
    }

    // Giảm commentCount đúng số lượng đã xóa
    transaction.update(taskRef, { commentCount: increment(-deleteCount) });
  });
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
  const db = getFirebaseDB();
  
  if (!taskId) return () => {};

  const constraints: QueryConstraint[] = [
    where("taskId", "==", taskId),
    where("deleted", "==", false),
    orderBy("createdAt", "asc"),
    limit(options?.limit || 50),
  ];

  if (options?.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }

  const q = query(collection(db, "task_comments"), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TaskComment));
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
  const db = getFirebaseDB();
  
  if (!commentId || !userId) throw new TaskCommentError("Thiếu thông tin");

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
      transaction.update(commentRef, {
        likedBy: likedBy.filter((id) => id !== userId),
        likeCount: Math.max(0, currentCount - 1),
      });
      liked = false;
      newCount = Math.max(0, currentCount - 1);
    } else {
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
  const db = getFirebaseDB();
  
  if (!commentId) return null;
  const snap = await getDoc(doc(db, "task_comments", commentId));
  if (!snap.exists() || snap.data().deleted) return null;
  return { id: snap.id, ...snap.data() } as TaskComment;
};

/* ================= GET COMMENTS COUNT ================= */
export const getTaskCommentsCount = async (taskId: string): Promise<number> => {
  const db = getFirebaseDB();
  
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) return 0;
  return (snap.data() as any).commentCount || 0;
};