"use server"

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function applyToTask(taskId: string, userId: string) {
  const db = adminDb();

  await db.collection("tasks").doc(taskId).update({
    applicants: FieldValue.arrayUnion(userId),
    appliedCount: FieldValue.increment(1),
  });

  revalidatePath("/"); // list task
  revalidatePath(`/task/${taskId}`); // detail
}