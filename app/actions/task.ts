"use server"

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function applyToTask(taskId: string, userId: string) {
  const db = adminDb();
  const taskRef = db.collection("tasks").doc(taskId);
  const appRef = db.collection("applications").doc();

  const [taskSnap, userSnap] = await Promise.all([
    taskRef.get(),
    db.collection("users").doc(userId).get()
  ]);

  if (!taskSnap.exists) throw new Error("Task not found");
  if (!userSnap.exists) throw new Error("User not found");

  const taskData = taskSnap.data();
  const userData = userSnap.data();

  // Check đã đủ slot chưa
  const currentApplied = taskData?.appliedCount || 0;
  const totalSlots = taskData?.totalSlots || 1;
  if (currentApplied >= totalSlots) throw new Error("Task is full");

  await db.runTransaction(async (tx) => {
    // 1. Update count trong tasks - đây là source cho cả list + detail
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

export async function cancelToTask(taskId: string, userId: string) {
  const db = adminDb();
  const taskRef = db.collection("tasks").doc(taskId);

  await db.runTransaction(async (tx) => {
    // 1. Tìm và xóa doc applications
    const q = db.collection('applications')
      .where('taskId', '==', taskId)
      .where('userId', '==', userId)
      .where('status', 'in', ['pending', 'accepted']);
    const snap = await tx.get(q);
    snap.docs.forEach(d => tx.delete(d.ref));

    // 2. Update count trong tasks
    tx.update(taskRef, {
      applicants: FieldValue.arrayRemove(userId),
      appliedCount: FieldValue.increment(-1),
    });
  });

  revalidatePath("/");
  revalidatePath(`/task/${taskId}`);
}