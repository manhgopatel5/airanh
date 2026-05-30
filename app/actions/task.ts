"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function applyToTask(taskId: string, userId: string) {
  const db = adminDb();
  const taskRef = db.collection("tasks").doc(taskId);
  const appRef = db.collection("applications").doc(`${taskId}_${userId}`); // ID cố định

  await db.runTransaction(async (tx) => {
    const [taskSnap, userSnap, appSnap] = await Promise.all([
      tx.get(taskRef),
      tx.get(db.collection("users").doc(userId)),
      tx.get(appRef)
    ]);

    if (!taskSnap.exists) throw new Error("Task not found");
    if (!userSnap.exists) throw new Error("User not found");
    if (appSnap.exists && ['pending', 'accepted'].includes(appSnap.data()?.status)) {
      throw new Error("Already applied");
    }

    const taskData = taskSnap.data()!;
    const userData = userSnap.data()!;

    // Check slot trong transaction để tránh race
    const currentApplied = taskData.appliedCount || 0;
    const totalSlots = taskData.totalSlots || 1;
    if (currentApplied >= totalSlots) throw new Error("Task is full");
    if (taskData.status !== 'open') throw new Error("Task is not open");

    tx.update(taskRef, {
      applicants: FieldValue.arrayUnion(userId),
      appliedCount: FieldValue.increment(1),
    });

    tx.set(appRef, {
      taskId,
      taskOwnerId: taskData.userId,
      userId,
      userName: userData.name || "User",
      userAvatar: userData.avatar || "",
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  revalidatePath("/");
  revalidatePath(`/task/${taskId}`);
}

export async function cancelToTask(taskId: string, userId: string) {
  const db = adminDb();
  const taskRef = db.collection("tasks").doc(taskId);
  const appRef = db.collection("applications").doc(`${taskId}_${userId}`);

  await db.runTransaction(async (tx) => {
    const [taskSnap, appSnap] = await Promise.all([
      tx.get(taskRef),
      tx.get(appRef)
    ]);

    if (!taskSnap.exists) throw new Error("Task not found");
    if (!appSnap.exists) throw new Error("Application not found");

    const appData = appSnap.data()!;
    if (!['pending', 'accepted'].includes(appData.status)) {
      throw new Error("Cannot cancel this application");
    }

    // Chỉ giảm count nếu app đang active
    tx.update(taskRef, {
      applicants: FieldValue.arrayRemove(userId),
      appliedCount: FieldValue.increment(-1),
    });

    tx.update(appRef, {
      status: 'cancelled',
      updatedAt: FieldValue.serverTimestamp()
    });
  });

  revalidatePath("/");
  revalidatePath(`/task/${taskId}`);
}
