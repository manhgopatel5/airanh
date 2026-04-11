import {
  doc,
  runTransaction,
  collection,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export async function joinTask(task: any, user: any) {
  const taskRef = doc(db, "tasks", task.id);

  // 🔥 transaction chống bug nhiều người click cùng lúc
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(taskRef);

    if (!snap.exists()) throw "Task không tồn tại";

    const data = snap.data();

    if (data.joined >= data.totalSlots) {
      throw "Task đã đủ người";
    }

    transaction.update(taskRef, {
      joined: data.joined + 1,
    });
  });

  // 👥 lưu người tham gia
  await addDoc(collection(db, "task_participants"), {
    taskId: task.id,
    userId: user.uid,
    joinedAt: Date.now(),
  });

  // 💬 tạo chat
  const chatRef = await addDoc(collection(db, "chats"), {
    taskId: task.id,
    members: [user.uid, task.userId],
    lastMessage: "",
    updatedAt: Date.now(),
  });

  return chatRef.id;
}
