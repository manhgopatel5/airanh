"use server"

import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase-admin"; // dùng admin
import { FieldValue } from "firebase-admin/firestore";

export async function applyToTask(taskId: string, userId: string) {
  try {
    const db = adminDb();
    
    await db.collection("tasks").doc(taskId).update({
      applicants: FieldValue.arrayUnion(userId),
      appliedCount: FieldValue.increment(1),
    });

    revalidatePath("/");
    revalidatePath(`/task/${taskId}`);
  } catch (err) {
    console.error("applyToTask error:", err);
    throw new Error("Ứng tuyển thất bại");
  }
}