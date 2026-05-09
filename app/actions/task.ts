"use server"

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function applyToTask(taskId: string, userId: string) {
  const db = adminDb();
  const taskRef = db.collection("tasks").doc(taskId);
  const appRef = db.collection("applications").doc();

  // Lấy data để lưu vào applications
  const [taskSnap, userSnap] = await Promise.all([
    taskRef.get(),
    db.collection("users").doc(userId).get()
  ]);

  if (!taskSnap.exists) throw new Error("Task not found");
  if (!userSnap.exists) throw new Error("User not found");

  const taskData = taskSnap.data();
  const userData = userSnap.data();

  // Transaction để đảm bảo cả 2 ghi cùng thành công
  await db.runTransaction(async (tx) => {
    // 1. Update task.applicants để check isApplied nhanh
    tx.update(taskRef, {
      applicants: FieldValue.arrayUnion(userId),
      appliedCount: FieldValue.increment(1),
    });

    // 2. Tạo doc applications để owner duyệt
    tx.set(appRef, {
      taskId,
      taskOwnerId: taskData?.userId,
      userId,
      userName: userData?.name || "User",
      userAvatar: userData?.avatar || "",
      status: 'pending',
      createdAt: FieldValue.serverTimestamp()
    });
  });

  revalidatePath("/");
  revalidatePath(`/task/${taskId}`);
}