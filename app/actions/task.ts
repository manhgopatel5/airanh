"use server"

import { revalidatePath } from "next/cache";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";

export async function applyToTask(taskId: string, userId: string) {
  const db = getFirebaseDB();
  
  await updateDoc(doc(db, "tasks", taskId), {
    applicants: arrayUnion(userId),
  });

  // Revalidate lại trang chủ để list update 1/1
  revalidatePath("/");
  revalidatePath("/task"); // Nếu có trang /task
  revalidatePath(`/task/${taskId}`); // Revalidate cả detail
}