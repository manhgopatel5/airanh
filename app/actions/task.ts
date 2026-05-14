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

  const taskData = taskSnap.data()!;
  const userData = userSnap.data()!;

  // Check đã apply chưa
  if (taskData.applicants?.includes(userId)) throw new Error("Already applied");

  const currentApplied = taskData.appliedCount || 0;
  const totalSlots = taskData.totalSlots || 1;
  if (currentApplied >= totalSlots) throw new Error("Task is full");

  await db.runTransaction(async (tx) => {
    const freshTask = await tx.get(taskRef);
    const freshData = freshTask.data()!;
    
    // Check lại trong transaction
    if ((freshData.appliedCount || 0) >= (freshData.totalSlots || 1)) {
      throw new Error("Task is full");
    }

    tx.update(taskRef, {
      applicants: FieldValue.arrayUnion(userId),
      appliedCount: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(appRef, {
      taskId,
      taskOwnerId: taskData.userId,
      userId,
      userName: userData.name || "User",
      userAvatar: userData.avatar || "",
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  revalidatePath("/");
  revalidatePath(`/task/${taskId}`);
  revalidatePath("/tasks");
}

export async function cancelToTask(taskId: string, userId: string) {
  const db = adminDb();
  const taskRef = db.collection("tasks").doc(taskId);

  // Query phải chạy ngoài transaction
  const q = db.collection('applications')
    .where('taskId', '==', taskId)
    .where('userId', '==', userId)
    .where('status', 'in', ['pending', 'accepted']);
  
  const snap = await q.get();

  await db.runTransaction(async (tx) => {
    // Xóa applications
    snap.docs.forEach(d => tx.delete(d.ref));

    // Update task
    tx.update(taskRef, {
      applicants: FieldValue.arrayRemove(userId),
      appliedCount: FieldValue.increment(-1),
      assignees: FieldValue.arrayRemove(userId), // thêm dòng này nếu đã accept
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  revalidatePath("/");
  revalidatePath(`/task/${taskId}`);
  revalidatePath("/tasks");
}