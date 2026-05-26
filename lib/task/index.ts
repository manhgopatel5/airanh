import { doc, updateDoc, increment } from "firebase/firestore";
import { getFirebaseDB } from "@/lib/firebase";

export async function incrementTaskView(taskId: string) {
  const db = getFirebaseDB();
  try {
    await updateDoc(doc(db, "tasks", taskId), {
      views: increment(1)
    });
  } catch (err) {
    console.error("Increment view failed:", err);
  }
}