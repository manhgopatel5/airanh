import {
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
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
import type { TaskComment } from "@/types/task";

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
  // ✅ Sửa: comments là subcollection của tasks
  const commentRef = doc(collection(db, "tasks", taskId, "comments"));
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
  newText: string,
  taskId: string // ✅ Thêm taskId để tìm đúng path
): Promise<void> => {
  const db = getFirebaseDB();
  
  if (!commentId || !userId || !taskId) throw new TaskCommentError("Thiếu thông tin");
  if (!newText.trim()) throw new TaskCommentError("Nội dung trống");
  if (newText.length > 1000) throw new TaskCommentError("Tối đa 1000 ký tự");

  // ✅ Sửa path
  const commentRef = doc(db, "tasks", taskId, "comments", commentId);

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
export const deleteComment = async (
  commentId: string, 
  userId: string, 
  taskId: string // ✅ Thêm taskId
): Promise<void> => {
  const db = getFirebaseDB();
  
  if (!commentId || !userId || !taskId) throw new TaskCommentError("Thiếu thông tin");

  await runTransaction(db, async (transaction) => {
    // ✅ Sửa path
    const commentRef = doc(db, "tasks", taskId, "comments", commentId);
    const snap = await transaction.get(commentRef);

    if (!snap.exists()) throw new TaskCommentError("Comment không tồn tại");
    const data = snap.data() as TaskComment;
    if (data.userId !== userId) throw new TaskCommentError("Không có quyền xóa", "FORBIDDEN");
    if (data.deleted) return;

    const taskRef = doc(db, "tasks", taskId);

    transaction.update(commentRef, {
      text: "Bình luận đã bị xóa",
      deleted: true,
      updatedAt: serverTimestamp(),
    });

    let deleteCount = 1;

    if (!data.parentId) {
      // ✅ Sửa path query replies
      const repliesQuery = query(
        collection(db, "tasks", taskId, "comments"),
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
    where("deleted", "==", false), // ✅ Bỏ where taskId vì đã là subcollection
    orderBy("createdAt", "asc"),
    limit(options?.limit || 50),
  ];

  if (options?.startAfterDoc) {
    constraints.push(startAfter(options.startAfterDoc));
  }

  // ✅ Sửa path: subcollection
  const q = query(collection(db, "tasks", taskId, "comments"), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id,...d.data() } as TaskComment));
      callback(data, snapshot.docs.length === (options?.limit || 50));
    },
    (err) => {
      console.error("listenComments:", err.code, err.message);
      options?.onError?.(err);
    }
  );
};

/* ================= TOGGLE LIKE COMMENT ================= */
export const toggleLikeComment = async (
  commentId: string,
  userId: string,
  taskId: string // ✅ Thêm taskId
): Promise<{ liked: boolean; newCount: number }> => {
  const db = getFirebaseDB();
  
  if (!commentId || !userId || !taskId) throw new TaskCommentError("Thiếu thông tin");

  // ✅ Sửa path
  const commentRef = doc(db, "tasks", taskId, "comments", commentId);
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
export const getCommentById = async (commentId: string, taskId: string): Promise<TaskComment | null> => {
  const db = getFirebaseDB();
  
  if (!commentId || !taskId) return null;
  // ✅ Sửa path
  const snap = await getDoc(doc(db, "tasks", taskId, "comments", commentId));
  if (!snap.exists() || snap.data().deleted) return null;
  return { id: snap.id,...snap.data() } as TaskComment;
};

/* ================= GET COMMENTS COUNT ================= */
export const getTaskCommentsCount = async (taskId: string): Promise<number> => {
  const db = getFirebaseDB();
  
  const snap = await getDoc(doc(db, "tasks", taskId));
  if (!snap.exists()) return 0;
  return (snap.data() as any).commentCount || 0;
};