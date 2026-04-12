import {
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// 📤 SEND MESSAGE
export const sendMessage = async (
  conversationId: string,
  user: any,
  text: string
) => {
  await addDoc(
    collection(db, "conversations", conversationId, "messages"),
    {
      text,
      senderId: user.uid,
      createdAt: serverTimestamp(),
    }
  );
};

// 📥 LISTEN MESSAGE
export const listenMessages = (
  conversationId: string,
  callback: (msgs: any[]) => void
) => {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("createdAt")
  );

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(data);
  });
};
