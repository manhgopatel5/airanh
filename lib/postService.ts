import {
  addDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";

// 📝 CREATE POST
export const createPost = async (user: any, content: string) => {
  if (!user) return;

  await addDoc(collection(db, "posts"), {
    content,
    userId: user.uid,
    userName: user.displayName || "Ẩn danh",
    userAvatar: user.photoURL || "",
    likes: 0,
    createdAt: serverTimestamp(),
  });
};

// 📥 READ POSTS (REALTIME)
export const listenPosts = (callback: (posts: any[]) => void) => {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(data);
  });
};

// ❌ DELETE POST
export const deletePost = async (postId: string) => {
  await deleteDoc(doc(db, "posts", postId));
};
