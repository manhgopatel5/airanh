import {
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  where,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/* ================= GET OR CREATE CONVERSATION ================= */
export const getOrCreateConversation = async (
  user1: string,
  user2: string
) => {
  const q = query(
    collection(db, "conversations"),
    where("members", "array-contains", user1)
  );

  const snap = await getDocs(q);

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.members.includes(user2)) {
      return docSnap.id;
    }
  }

  // 👉 chưa có → tạo mới
  const ref = doc(collection(db, "conversations"));

  await setDoc(ref, {
    members: [user1, user2],
    lastMessage: "",
    updatedAt: serverTimestamp(),
  });

  return ref.id;
};

/* ================= SEND MESSAGE ================= */
export const sendMessage = async (
  conversationId: string,
  user: any,
  text: string
) => {
  if (!text.trim()) return;

  await addDoc(
    collection(db, "conversations", conversationId, "messages"),
    {
      text,
      senderId: user.uid,
      senderName: user.email || "User",
      createdAt: serverTimestamp(),
    }
  );

  // 🔥 update conversation (để hiện inbox)
  await setDoc(
    doc(db, "conversations", conversationId),
    {
      lastMessage: text,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

/* ================= LISTEN MESSAGE ================= */
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

/* ================= LISTEN CONVERSATIONS (INBOX) ================= */
export const listenConversations = (
  userId: string,
  callback: (data: any[]) => void
) => {
  const q = query(
    collection(db, "conversations"),
    where("members", "array-contains", userId),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(data);
  });
};
